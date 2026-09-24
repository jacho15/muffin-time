import { createClient } from '@supabase/supabase-js'

// Emails a complaint from a signed-in user to Jacob via Resend.
// Authorized with the user's Supabase JWT; their email becomes the reply-to.

const MAX_LENGTH = 5000

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Named method export: Vercel passes a web Request only to these, while a
// default-exported function gets Node's (req, res) signature.
export async function POST(req: Request): Promise<Response> {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY } = process.env
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
    return Response.json({ error: 'Missing server configuration' }, { status: 500 })
  }

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { data: userData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !userData.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { subject?: string; message?: string }
  const message = body.message?.trim() ?? ''
  const subject = body.subject?.trim().slice(0, 120) || 'No subject'
  if (!message) return Response.json({ error: 'Message is required' }, { status: 400 })
  if (message.length > MAX_LENGTH) {
    return Response.json({ error: `Message must be under ${MAX_LENGTH} characters` }, { status: 400 })
  }

  const userEmail = userData.user.email
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Muffin Time <complaints@jacob-a-cho.com>',
      to: ['jacobcho99@gmail.com'],
      subject: `Muffin Time complaint: ${subject}`,
      html: `
        <p><strong>From:</strong> ${escapeHtml(userEmail ?? 'unknown')}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      `,
      ...(userEmail ? { reply_to: userEmail } : {}),
    }),
  })

  if (!res.ok) {
    console.error('Resend error:', res.status, await res.text())
    return Response.json({ error: 'Failed to send' }, { status: 502 })
  }
  return Response.json({ success: true })
}
