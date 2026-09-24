import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFocusTimer } from '../../hooks/useFocusTimer'
import { useSubjects } from '../../hooks/useSubjects'
import { useSubsections } from '../../hooks/useSubsections'
import { useFocusSessions } from '../../hooks/useFocusSessions'
import { TimerCat } from './TimerCat'
import { getCatMood, formatKeyLabel } from './timerUtils'
import { TimerDisplay } from './TimerDisplay'
import { PomodoroSettingsPanel, PacingSettingsPanel } from './TimerSettingsPanels'
import SubjectsPanel from './SubjectsPanel'
import RecentSessionsPanel from './RecentSessionsPanel'

export default function FocusView() {
  const {
    timerState,
    pausedAtElapsed,
    selectedSubjectId,
    setSelectedSubject,
    selectedSubsectionId,
    setSelectedSubsection,
    handleStart,
    handlePause,
    handleResume,
    handleFinish,
    timerMode,
    setTimerMode,
    pomodoroSettings,
    setPomodoroSettings,
    pomodoroPhase,
    pomodoroWaiting,
    pomodoroCycle,
    pomodoroCycles,
    handleStartBreak,
    handleStartNextFocus,
    pacingSettings,
    setPacingSettings,
    pacerActive,
    pacerQuestion,
    pacerSecondsRemaining,
    handleStartPacer,
    handleStopPacer,
    handleAdvanceQuestion,
  } = useFocusTimer()
  const { subjects, createSubject, updateSubject, deleteSubject } = useSubjects()
  const { sessions, deleteSession, createManualSession, updateSession } = useFocusSessions()
  const { subsections, createSubsection, deleteSubsection } = useSubsections()

  const selectedSubject = selectedSubjectId ? subjects.find(s => s.id === selectedSubjectId) : undefined
  const selectedSubsection = selectedSubsectionId ? subsections.find(s => s.id === selectedSubsectionId) : undefined
  const selectedSubjectSubsections = selectedSubjectId
    ? subsections.filter(s => s.subject_id === selectedSubjectId)
    : []
  const isActive = timerState !== 'idle' || pomodoroWaiting !== 'none'

  const [hasFinishedSession, setHasFinishedSession] = useState(false)
  // Mark a session as finished on the active -> idle transition (adjusting
  // state during render instead of in an effect).
  const [wasActive, setWasActive] = useState(isActive)
  if (wasActive !== isActive) {
    setWasActive(isActive)
    if (wasActive) setHasFinishedSession(true)
  }

  const onStart = () => {
    setHasFinishedSession(false)
    void handleStart()
  }

  const catMood = getCatMood({
    timerState,
    timerMode,
    pomodoroPhase,
    pomodoroWaiting,
    hasFinishedSession,
  })

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Focus</h1>
      </div>
      <div className="flex flex-col xl:flex-row flex-1 min-h-0 gap-6 overflow-y-auto xl:overflow-visible">
        <SubjectsPanel
          subjects={subjects}
          subsections={subsections}
          selectedSubjectId={selectedSubjectId}
          selectedSubsectionId={selectedSubsectionId}
          isTimerActive={isActive}
          onSelectSubject={setSelectedSubject}
          onSelectSubsection={setSelectedSubsection}
          createSubject={createSubject}
          updateSubject={updateSubject}
          deleteSubject={deleteSubject}
          createSubsection={createSubsection}
          deleteSubsection={deleteSubsection}
        />

        <div className="flex-1 order-1 xl:order-none shrink-0 xl:shrink grid grid-cols-1 sm:grid-cols-2 items-center gap-y-6 py-4 xl:py-0">
          <div className="flex flex-col items-center justify-center 2xl:pl-32">
            {/* Timer mode toggle — only when idle */}
            {!isActive && (
              <div className="flex items-center gap-1 mb-5 p-1 rounded-lg bg-glass border border-glass-border">
                <button
                  onClick={() => setTimerMode('stopwatch')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    timerMode === 'stopwatch'
                      ? 'bg-stardust/25 text-star-white'
                      : 'text-star-white/70 hover:text-star-white/90'
                  }`}
                >
                  Stopwatch
                </button>
                <button
                  onClick={() => setTimerMode('pomodoro')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    timerMode === 'pomodoro'
                      ? 'bg-stardust/25 text-star-white'
                      : 'text-star-white/70 hover:text-star-white/90'
                  }`}
                >
                  Pomodoro
                </button>
                <button
                  onClick={() => setTimerMode('pacing')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    timerMode === 'pacing'
                      ? 'bg-stardust/25 text-star-white'
                      : 'text-star-white/70 hover:text-star-white/90'
                  }`}
                >
                  Test Pacing
                </button>
              </div>
            )}

            {/* Pomodoro settings — only when idle and pomodoro selected */}
            {!isActive && timerMode === 'pomodoro' && (
              <PomodoroSettingsPanel
                focusMinutes={pomodoroSettings.focusMinutes}
                shortBreakMinutes={pomodoroSettings.shortBreakMinutes}
                longBreakMinutes={pomodoroSettings.longBreakMinutes}
                cycles={pomodoroSettings.cycles}
                onChange={setPomodoroSettings}
              />
            )}

            {/* Pacing settings — only when idle and pacing selected */}
            {!isActive && timerMode === 'pacing' && (
              <PacingSettingsPanel settings={pacingSettings} onChange={setPacingSettings} />
            )}

            {selectedSubject ? (
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedSubject.color }} />
                <span className="text-star-white/70 text-sm font-medium tracking-wide uppercase">
                  {selectedSubject.name}
                  {isActive && selectedSubsection && (
                    <span className="text-star-white/50"> · {selectedSubsection.name}</span>
                  )}
                </span>
              </div>
            ) : (
              <p className="text-star-white/70 mb-6 text-sm">Select a subject to begin</p>
            )}

            {/* Subsection picker — only when idle and the subject has subsections */}
            {selectedSubject && !isActive && selectedSubjectSubsections.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 -mt-3 mb-6 max-w-xs">
                {[{ id: null, name: 'General' }, ...selectedSubjectSubsections].map(sub => (
                  <button
                    key={sub.id ?? 'none'}
                    onClick={() => setSelectedSubsection(sub.id)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-all duration-200 ${
                      selectedSubsectionId === sub.id
                        ? 'bg-stardust/25 border-stardust/40 text-star-white'
                        : 'bg-glass border-glass-border text-star-white/60 hover:text-star-white/90'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}

            <TimerDisplay
              timerState={timerState}
              pausedAtElapsed={pausedAtElapsed}
              timerMode={timerMode}
              pomodoroPhase={pomodoroPhase}
              pomodoroWaiting={pomodoroWaiting}
              pomodoroCycle={pomodoroCycle}
              pomodoroCycles={pomodoroCycles}
              pacerActive={pacerActive}
              pacerQuestion={pacerQuestion}
              pacerSecondsRemaining={pacerSecondsRemaining}
              pacingQuestionCount={pacingSettings.questionCount}
            />

            {/* Question-pacer controls (run alongside the session) */}
            {timerMode === 'pacing' && timerState === 'running' && (
              <div className="flex items-center gap-3 mb-4">
                {!pacerActive ? (
                  <button
                    onClick={handleStartPacer}
                    className="gold-btn min-w-[160px] py-3 rounded-xl text-midnight font-semibold cursor-pointer text-sm tracking-wide border-none text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985] transition-transform duration-200"
                  >
                    Start Questions
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleAdvanceQuestion(true)}
                      className="min-w-[150px] py-3 rounded-xl bg-stardust/15 border border-stardust/30 text-stardust hover:bg-stardust/25 transition-all duration-200 cursor-pointer text-sm font-semibold tracking-wide text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985]"
                    >
                      Next ({formatKeyLabel(pacingSettings.shortcutKey)})
                    </button>
                    <button
                      onClick={handleStopPacer}
                      className="min-w-[150px] py-3 rounded-xl bg-glass border border-glass-border text-star-white/70 hover:bg-glass-hover transition-all duration-200 cursor-pointer text-sm font-semibold tracking-wide text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985]"
                    >
                      Stop Questions
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-4">
              <AnimatePresence mode="wait">
                {/* Pomodoro waiting states */}
                {pomodoroWaiting === 'break' && (
                  <motion.div
                    key="pomo-break"
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <button
                      onClick={handleStartBreak}
                      className="gold-btn min-w-[160px] py-4 rounded-xl text-midnight font-semibold cursor-pointer text-sm tracking-wide border-none text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985] transition-transform duration-200"
                    >
                      Start Break
                    </button>
                    <button
                      onClick={handleFinish}
                      className="min-w-[160px] py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200 cursor-pointer text-sm font-semibold tracking-wide text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985]"
                    >
                      Finish
                    </button>
                  </motion.div>
                )}
                {pomodoroWaiting === 'focus' && (
                  <motion.div
                    key="pomo-focus"
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <button
                      onClick={handleStartNextFocus}
                      className="gold-btn min-w-[160px] py-4 rounded-xl text-midnight font-semibold cursor-pointer text-sm tracking-wide border-none text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985] transition-transform duration-200"
                    >
                      Start Focus
                    </button>
                    <button
                      onClick={handleFinish}
                      className="min-w-[160px] py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200 cursor-pointer text-sm font-semibold tracking-wide text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985]"
                    >
                      Finish
                    </button>
                  </motion.div>
                )}
                {/* Normal idle state */}
                {timerState === 'idle' && pomodoroWaiting === 'none' && (
                  <motion.button
                    key="start"
                    onClick={onStart}
                    disabled={!selectedSubjectId}
                    className="gold-btn min-w-[160px] py-4 rounded-xl text-midnight font-semibold text-sm tracking-wide border-none text-center cursor-pointer hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985] transition-transform duration-200"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    Start
                  </motion.button>
                )}
                {timerState === 'running' && (
                  <motion.div
                    key="running"
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <button
                      onClick={handlePause}
                      className="min-w-[160px] py-4 rounded-xl bg-glass border border-glass-border text-star-white hover:bg-glass-hover transition-all duration-200 cursor-pointer text-sm font-semibold tracking-wide text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985]"
                    >
                      Pause
                    </button>
                    <button
                      onClick={handleFinish}
                      className="min-w-[160px] py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200 cursor-pointer text-sm font-semibold tracking-wide text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985]"
                    >
                      Finish
                    </button>
                  </motion.div>
                )}
                {timerState === 'paused' && (
                  <motion.div
                    key="paused"
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <button
                      onClick={handleResume}
                      className="gold-btn min-w-[160px] py-4 rounded-xl text-midnight font-semibold cursor-pointer text-sm tracking-wide border-none text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985] transition-transform duration-200"
                    >
                      Resume
                    </button>
                    <button
                      onClick={handleFinish}
                      className="min-w-[160px] py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200 cursor-pointer text-sm font-semibold tracking-wide text-center hover:scale-[1.015] hover:-translate-y-px active:scale-[0.985]"
                    >
                      Finish
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <TimerCat mood={catMood} />
          </div>
        </div>

        <RecentSessionsPanel
          sessions={sessions}
          subjects={subjects}
          subsections={subsections}
          selectedSubjectId={selectedSubjectId}
          selectedSubsectionId={selectedSubsectionId}
          createManualSession={createManualSession}
          updateSession={updateSession}
          deleteSession={deleteSession}
        />
      </div>
    </div>
  )
}
