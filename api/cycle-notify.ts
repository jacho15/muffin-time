import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { format, parseISO } from 'date-fns'
import { groupIntoEpisodes, computePhase, computeStats, predictCycle } from '../src/lib/cycle'

// Checks each enabled user's cycle phase and pushes to ntfy.sh when it changes.
// Called two ways with the same effect (idempotent via cycle_last_notified_phase):
//  - daily Vercel Cron, authorized with CRON_SECRET
//  - fire-and-forget from the app when a period day is logged, authorized with
//    the user's own Supabase JWT

interface SettingsRow {
  id: string
  user_id: string
  cycle_last_notified_phase: string | null
}

function todayInTz(): string {
  // en-CA formats as yyyy-MM-dd
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.CYCLE_TZ || 'America/New_York',
  }).format(new Date())
}

const NTFY_TIMEOUT_MS = 10_000

async function checkUser(supabase: SupabaseClient, row: SettingsRow, today: string): Promise<boolean> {
  const { data: logs, error } = await supabase
    .from('period_logs')
    .select('date')
    .eq('user_id', row.user_id)
    .order('date', { ascending: false })
    .limit(500)
  if (error) throw error

  const episodes = groupIntoEpisodes((logs ?? []).map(log => log.date))
  const phase = computePhase(episodes, today)
  if (!phase || phase === row.cycle_last_notified_phase) return false

  const { currentCycleDay } = computeStats(episodes, today)
  const { nextPeriodStart } = predictCycle(episodes, today)
  let body = `New phase: ${phase}${currentCycleDay ? ` (cycle day ${currentCycleDay})` : ''}.`
  if (nextPeriodStart) body += ` Next period est. ${format(parseISO(nextPeriodStart), 'MMM d')}.`

  const res = await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
    method: 'POST',
    headers: { Title: 'Cycle update', Tags: 'crescent_moon' },
    body,
    signal: AbortSignal.timeout(NTFY_TIMEOUT_MS),
  })
  // Non-2xx: skip the state update so the next run retries the notification
  if (!res.ok) return false

  // Recording the phase only after a successful send is what keeps reruns from
  // notifying twice for the same phase.
  const { error: updateError } = await supabase
    .from('user_settings')
    .update({ cycle_last_notified_phase: phase, cycle_last_notified_on: today })
    .eq('id', row.id)
  if (updateError) throw updateError
  return true
}

// Named method export so Vercel passes a web Request (a default export gets Node's req/res).
export async function GET(req: Request): Promise<Response> {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, NTFY_TOPIC } = process.env
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !NTFY_TOPIC) {
    return Response.json({ error: 'Missing server configuration' }, { status: 500 })
  }

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const settingsQuery = supabase
    .from('user_settings')
    .select('id, user_id, cycle_last_notified_phase')
    .eq('period_tracker_enabled', true)

  let query = settingsQuery
  if (!CRON_SECRET || token !== CRON_SECRET) {
    const { data: userData, error } = await supabase.auth.getUser(token)
    if (error || !userData.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    query = settingsQuery.eq('user_id', userData.user.id)
  }
  const { data, error: queryError } = await query
  if (queryError) {
    console.error('Failed to load settings:', queryError)
    return Response.json({ error: 'Failed to load settings' }, { status: 500 })
  }
  const rows: SettingsRow[] = data ?? []

  const today = todayInTz()
  let notified = 0
  let failed = 0
  // One user's failure (network, DB) shouldn't stop the others; the failed ones
  // retry on the next run because their phase wasn't recorded.
  for (const row of rows) {
    try {
      if (await checkUser(supabase, row, today)) notified++
    } catch (err) {
      failed++
      console.error(`Cycle check failed for settings row ${row.id}:`, err)
    }
  }

  return Response.json({ checked: rows.length, notified, failed })
}
