import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BotAvatar } from '../components/BotAvatar'
import { CategoryTabs } from '../components/CategoryTabs'
import { OptionCard } from '../components/OptionCard'
import { ScoreBoard } from '../components/ScoreBoard'
import { useGameStore } from '../store/gameStore'
import { Category, CategoryResult, RoundOption, BOT_PERSONALITIES } from '../types/game'
import { getBotAnswer, getBotDelay } from '../utils/bot'
import { buildOptions, getViableCategories } from '../utils/options'

interface TabState {
  options: RoundOption[]
  userAnswerId: string | null
  botAnswerId: string | null
  userAnsweredAt: number | null
}

export function Round() {
  const navigate = useNavigate()
  const {
    currentTrack,
    trackPool,
    config,
    addCompletedRound,
  } = useGameStore()

  const startTimeRef = useRef<number>(Date.now())
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const botDoneRef = useRef(false)

  const viableCategories = useMemo(() => {
    if (!currentTrack) return ['song' as Category]
    return getViableCategories(currentTrack, trackPool)
  }, [currentTrack, trackPool])

  const [tabStates, setTabStates] = useState<Partial<Record<Category, TabState>>>(() => {
    const { currentTrack: track, trackPool: pool } = useGameStore.getState()
    if (!track) return {}
    const viable = getViableCategories(track, pool)
    const states: Partial<Record<Category, TabState>> = {}
    for (const cat of viable) {
      states[cat] = {
        options: buildOptions(track, pool, cat),
        userAnswerId: null,
        botAnswerId: null,
        userAnsweredAt: null,
      }
    }
    return states
  })

  // Keep a ref in sync so the bot timer can read the latest user answers
  const tabStatesRef = useRef(tabStates)
  tabStatesRef.current = tabStates

  const [activeCategory, setActiveCategory] = useState<Category>('song')
  const [botAnswered, setBotAnswered] = useState(false)
  const [botDone, setBotDone] = useState(false)

  function finalizeRound(currentTabStates: Partial<Record<Category, TabState>>) {
    if (!currentTrack) return
    if (botTimerRef.current) clearTimeout(botTimerRef.current)

    const results: CategoryResult[] = viableCategories.flatMap(cat => {
      const tab = currentTabStates[cat]
      if (!tab) return []
      const userAnswered = tab.userAnswerId !== null
      const botAnswered = tab.botAnswerId !== null
      // Speed mode: include any tab either player answered
      // Normal mode: only include tabs the user chose to answer
      if (!config.speedMode && !userAnswered) return []
      if (config.speedMode && !userAnswered && !botAnswered) return []

      const userCorrect = userAnswered
        ? tab.options.find(o => o.id === tab.userAnswerId)?.isCorrect ?? false
        : false
      const botCorrect = botAnswered
        ? tab.options.find(o => o.id === tab.botAnswerId)?.isCorrect ?? false
        : false

      return [{
        category: cat,
        options: tab.options,
        userAnswerId: tab.userAnswerId,
        botAnswerId: tab.botAnswerId,
        userCorrect,
        botCorrect,
        userElapsedMs: tab.userAnsweredAt ? tab.userAnsweredAt - startTimeRef.current : null,
        botElapsedMs: null,
      }]
    })

    let userPoints: number
    let botPoints: number
    if (config.speedMode) {
      // First correct answer wins the category — bot can't score where user was already correct
      userPoints = results.filter(r => r.userCorrect).length
      botPoints = results.filter(r => r.botCorrect && !r.userCorrect).length
    } else {
      userPoints = results.filter(r => r.userCorrect).length
      botPoints = results.filter(r => r.botCorrect).length
    }

    addCompletedRound({
      trackId: currentTrack.id,
      trackName: currentTrack.name,
      artistName: currentTrack.artists[0]?.name ?? '',
      albumName: currentTrack.album.name,
      releaseYear: currentTrack.album.release_date.substring(0, 4),
      albumArtUrl: currentTrack.album.images[0]?.url ?? null,
      results,
      userPoints,
      botPoints,
    })

    navigate('/result', { replace: true })
  }

  // Bot answers one tab at a time, in random order, each with its own delay
  useEffect(() => {
    const shuffled = [...viableCategories].sort(() => Math.random() - 0.5)
    let cancelled = false

    function fireNextTab(remaining: Category[]) {
      if (cancelled || remaining.length === 0) return
      const [cat, ...rest] = remaining
      botTimerRef.current = setTimeout(() => {
        if (cancelled) return
        setBotAnswered(true)
        const tab = tabStatesRef.current[cat]

        // Skip: tab missing, or user already answered in speed mode (they own it)
        if (!tab || (config.speedMode && tab.userAnswerId !== null)) {
          if (rest.length === 0 && config.speedMode) {
            botDoneRef.current = true
            setBotDone(true)
            finalizeRound(tabStatesRef.current)
          } else {
            fireNextTab(rest)
          }
          return
        }

        const botAns = getBotAnswer(tab.options, config.difficulty)
        const nextStates = {
          ...tabStatesRef.current,
          [cat]: { ...tab, botAnswerId: botAns?.id ?? null },
        }
        setTabStates(nextStates)
        if (rest.length === 0 && config.speedMode) {
          botDoneRef.current = true
          setBotDone(true)
          finalizeRound(nextStates)
        } else {
          fireNextTab(rest)
        }
      }, getBotDelay(config.difficulty))
    }

    fireNextTab(shuffled)
    return () => {
      cancelled = true
      if (botTimerRef.current) clearTimeout(botTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleAnswer(option: RoundOption) {
    const tab = tabStates[activeCategory]
    if (!tab || tab.userAnswerId !== null) return
    if (config.speedMode && (botDoneRef.current || tab.botAnswerId !== null)) return
    setTabStates(prev => ({
      ...prev,
      [activeCategory]: {
        ...prev[activeCategory]!,
        userAnswerId: option.id,
        userAnsweredAt: Date.now(),
      },
    }))
  }

  function getOptionState(option: RoundOption): 'default' | 'correct' | 'wrong' | 'dimmed' {
    const tab = tabStates[activeCategory]
    if (!tab) return 'default'
    // Bot locked this tab before user answered — dim everything to match the disabled state
    if (config.speedMode && tab.botAnswerId !== null && tab.userAnswerId === null) return 'dimmed'
    if (tab.userAnswerId === null) return 'default'
    if (option.isCorrect) return 'correct'
    if (option.id === tab.userAnswerId) return 'wrong'
    return 'dimmed'
  }

  function handleSubmit() {
    finalizeRound(tabStates)
  }

  if (!currentTrack) return <Navigate to="/setup" replace />

  const bot = BOT_PERSONALITIES[config.difficulty]
  const activeTab = tabStates[activeCategory]
  const options = activeTab?.options ?? []
  const answeredCategories = viableCategories.filter(cat => tabStates[cat]?.userAnswerId !== null)
  const botLockedCategories = config.speedMode
    ? viableCategories.filter(cat => tabStates[cat]?.botAnswerId !== null)
    : []

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-md mx-auto">
      <header className="pt-12 pb-2">
        <ScoreBoard />
      </header>

      <main className="flex-1 flex flex-col gap-4 px-4 pb-6">
        <CategoryTabs
          active={activeCategory}
          onChange={setActiveCategory}
          viableCategories={viableCategories}
          answeredCategories={answeredCategories}
          botLockedCategories={botLockedCategories}
        />

        {config.speedMode && activeTab?.botAnswerId !== null && activeTab?.userAnswerId === null && (
          <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            <span>{bot.emoji}</span>
            <span>{bot.name} locked this in</span>
          </div>
        )}

        <div className={`grid gap-2.5 ${activeCategory === 'cover' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {options.map(option => (
            <OptionCard
              key={option.id}
              label={option.label}
              imageUrl={option.imageUrl}
              state={getOptionState(option)}
              onClick={() => handleAnswer(option)}
              disabled={activeTab?.userAnswerId !== null || (config.speedMode && (botDone || activeTab?.botAnswerId !== null))}
            />
          ))}
        </div>

        <div className="mt-auto pt-2 flex flex-col gap-3">
          <BotAvatar difficulty={config.difficulty} phase={botAnswered ? 'locked' : 'thinking'} />
          <button
            onClick={handleSubmit}
            disabled={config.speedMode && botDone}
            className="w-full bg-spotify hover:bg-spotify-dark active:scale-95 disabled:opacity-60 disabled:scale-100 transition-all text-white font-bold py-4 rounded-2xl text-base"
          >
            {config.speedMode ? 'Lock in →' : 'Submit →'}
          </button>
        </div>
      </main>
    </div>
  )
}
