import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BotAvatar } from '../components/BotAvatar'
import { CategoryTabs } from '../components/CategoryTabs'
import { OptionCard } from '../components/OptionCard'
import { ScoreBoard } from '../components/ScoreBoard'
import { useGameStore } from '../store/gameStore'
import { Category, CategoryResult, RoundOption } from '../types/game'
import { getBotAnswer, getBotDelay } from '../utils/bot'
import { buildOptions, getViableCategories, randomCategoryFrom } from '../utils/options'
import { calculatePoints } from '../utils/scoring'

const ROUND_TIMEOUT_MS = 30_000

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
    currentCategory,
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
    if (!currentTrack) return {}
    const viable = getViableCategories(currentTrack, trackPool)
    const states: Partial<Record<Category, TabState>> = {}
    for (const cat of viable) {
      states[cat] = {
        options: buildOptions(currentTrack, trackPool, cat),
        userAnswerId: null,
        botAnswerId: null,
        userAnsweredAt: null,
      }
    }
    return states
  })

  const [activeCategory, setActiveCategory] = useState<Category>(() => {
    if (!currentTrack) return 'song'
    const viable = getViableCategories(currentTrack, trackPool)
    return viable.includes(currentCategory) ? currentCategory : randomCategoryFrom(viable)
  })

  const [botAnswered, setBotAnswered] = useState(false)

  // Bot locks in on all tabs at once after its delay
  useEffect(() => {
    botTimerRef.current = setTimeout(() => {
      setBotAnswered(true)
      setTabStates(prev => {
        const next = { ...prev }
        for (const cat of Object.keys(next) as Category[]) {
          const tab = next[cat]!
          const botAns = getBotAnswer(tab.options, config.difficulty)
          next[cat] = { ...tab, botAnswerId: botAns?.id ?? null }
        }
        return next
      })
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

  function handleNextRound() {
    if (!currentTrack) return
    if (botTimerRef.current) clearTimeout(botTimerRef.current)

    const results: CategoryResult[] = viableCategories.flatMap(cat => {
      const tab = tabStates[cat]
      if (!tab || tab.userAnswerId === null) return []
      const userCorrect = tab.options.find(o => o.id === tab.userAnswerId)?.isCorrect ?? false
      const botCorrect = tab.options.find(o => o.id === tab.botAnswerId)?.isCorrect ?? false
      return [{
        category: cat,
        options: tab.options,
        userAnswerId: tab.userAnswerId,
        botAnswerId: tab.botAnswerId,
        userCorrect,
        botCorrect,
        userElapsedMs: tab.userAnsweredAt ? tab.userAnsweredAt - startTimeRef.current : null,
      }]
    })

    const userPoints = results.reduce((sum, r) => {
      const elapsed = r.userElapsedMs ?? ROUND_TIMEOUT_MS
      return sum + calculatePoints(r.userCorrect, elapsed, config.speedMode)
    }, 0)

    const botPoints = results.reduce((sum, r) => {
      return sum + calculatePoints(r.botCorrect, botDelayRef.current, config.speedMode)
    }, 0)

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

  if (!currentTrack) return null

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
            onClick={handleNextRound}
            className="w-full bg-spotify hover:bg-spotify-dark active:scale-95 transition-all text-white font-bold py-4 rounded-2xl text-base"
          >
            Next Round →
          </button>
        </div>
      </main>
    </div>
  )
}
