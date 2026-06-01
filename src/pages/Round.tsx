import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BotAvatar } from '../components/BotAvatar'
import { CategoryTabs } from '../components/CategoryTabs'
import { OptionCard } from '../components/OptionCard'
import { ScoreBoard } from '../components/ScoreBoard'
import { useGameStore } from '../store/gameStore'
import { Category, CategoryResult, RoundOption } from '../types/game'
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
  const botDelayRef = useRef<number>(getBotDelay(config.difficulty))
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        botElapsedMs: botAnswered ? botDelayRef.current : null,
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

  // Bot locks in on all tabs at once after its delay
  useEffect(() => {
    botTimerRef.current = setTimeout(() => {
      // Build next states using the ref so we have the user's latest answers
      const nextStates = { ...tabStatesRef.current }
      for (const cat of Object.keys(nextStates) as Category[]) {
        const tab = nextStates[cat]!
        const botAns = getBotAnswer(tab.options, config.difficulty)
        nextStates[cat] = { ...tab, botAnswerId: botAns?.id ?? null }
      }
      setBotAnswered(true)
      setTabStates(nextStates)

      // In speed mode the bot locking in ends the round for both players
      if (config.speedMode) {
        finalizeRound(nextStates)
      }
    }, botDelayRef.current)
    return () => { if (botTimerRef.current) clearTimeout(botTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleAnswer(option: RoundOption) {
    const tab = tabStates[activeCategory]
    if (!tab || tab.userAnswerId !== null) return
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
    if (!tab || tab.userAnswerId === null) return 'default'
    if (option.isCorrect) return 'correct'
    if (option.id === tab.userAnswerId) return 'wrong'
    return 'dimmed'
  }

  function handleSubmit() {
    finalizeRound(tabStates)
  }

  if (!currentTrack) return <Navigate to="/setup" replace />

  const activeTab = tabStates[activeCategory]
  const options = activeTab?.options ?? []
  const answeredCategories = viableCategories.filter(cat => tabStates[cat]?.userAnswerId !== null)

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
        />

        <div className="grid grid-cols-1 gap-2.5">
          {options.map(option => (
            <OptionCard
              key={option.id}
              label={option.label}
              state={getOptionState(option)}
              onClick={() => handleAnswer(option)}
              disabled={activeTab?.userAnswerId !== null}
            />
          ))}
        </div>

        <div className="mt-auto pt-2 flex flex-col gap-3">
          <BotAvatar difficulty={config.difficulty} phase={botAnswered ? 'locked' : 'thinking'} />
          <button
            onClick={handleSubmit}
            className="w-full bg-spotify hover:bg-spotify-dark active:scale-95 transition-all text-white font-bold py-4 rounded-2xl text-base"
          >
            {config.speedMode ? 'Lock in →' : 'Submit →'}
          </button>
        </div>
      </main>
    </div>
  )
}
