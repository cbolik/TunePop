import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BotAvatar } from '../components/BotAvatar'
import { CategoryTabs } from '../components/CategoryTabs'
import { OptionCard } from '../components/OptionCard'
import { ScoreBoard } from '../components/ScoreBoard'
import { useGameStore } from '../store/gameStore'
import { Category, RoundOption } from '../types/game'
import { getBotAnswer, getBotDelay } from '../utils/bot'
import { buildOptions, getViableCategories, randomCategoryFrom } from '../utils/options'
import { calculatePoints } from '../utils/scoring'

type Phase = 'playing' | 'revealing' | 'done'

const REVEAL_DURATION_MS = 900
const ROUND_TIMEOUT_MS = 30_000

export function Round() {
  const navigate = useNavigate()
  const {
    currentTrack,
    currentCategory,
    trackPool,
    config,
    addCompletedRound,
    setCategory,
  } = useGameStore()

  const startTimeRef = useRef<number>(Date.now())
  const botDelayRef = useRef<number>(getBotDelay(config.difficulty))
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [phase, setPhase] = useState<Phase>('playing')
  const [userAnswerId, setUserAnswerId] = useState<string | null>(null)
  const [botAnswerId, setBotAnswerId] = useState<string | null>(null)
  const [userElapsedMs, setUserElapsedMs] = useState<number | null>(null)

  const viableCategories = useMemo(() => {
    if (!currentTrack) return ['song' as Category]
    return getViableCategories(currentTrack, trackPool)
  }, [currentTrack, trackPool])

  // Ensure the stored category is viable; if not, pick a random viable one
  const [activeCategory, setActiveCategory] = useState<Category>(() => {
    return viableCategories.includes(currentCategory)
      ? currentCategory
      : randomCategoryFrom(viableCategories)
  })

  // Rebuild options when category tab changes
  const options = useMemo<RoundOption[]>(() => {
    if (!currentTrack) return []
    return buildOptions(currentTrack, trackPool, activeCategory)
  }, [currentTrack, trackPool, activeCategory])

  // Derive bot answer for current options (stable per category per round)
  const botAnswerForCategory = useMemo(() => {
    if (!options.length) return null
    return getBotAnswer(options, config.difficulty)
  }, [options, config.difficulty])

  const triggerReveal = useCallback(() => {
    setPhase('revealing')
    revealTimerRef.current = setTimeout(() => {
      setPhase('done')
    }, REVEAL_DURATION_MS)
  }, [])

  // Bot timer
  useEffect(() => {
    botTimerRef.current = setTimeout(() => {
      if (botAnswerForCategory) {
        setBotAnswerId(botAnswerForCategory.id)
      }
    }, botDelayRef.current)

    return () => { if (botTimerRef.current) clearTimeout(botTimerRef.current) }
  }, [botAnswerForCategory])

  // Round timeout (auto-submit miss)
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (phase === 'playing') {
        triggerReveal()
      }
    }, ROUND_TIMEOUT_MS)

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [phase, triggerReveal])

  // When both user and bot have answered → reveal
  useEffect(() => {
    if (phase !== 'playing') return
    if (userAnswerId !== null && botAnswerId !== null) {
      triggerReveal()
    }
  }, [userAnswerId, botAnswerId, phase, triggerReveal])

  // Navigate after reveal
  useEffect(() => {
    if (phase !== 'done' || !currentTrack) return

    const elapsed = userElapsedMs ?? ROUND_TIMEOUT_MS
    const botElapsed = botDelayRef.current

    const userCorrect = options.find(o => o.id === userAnswerId)?.isCorrect ?? false
    const botCorrect = options.find(o => o.id === botAnswerId)?.isCorrect ?? false

    addCompletedRound({
      trackId: currentTrack.id,
      trackName: currentTrack.name,
      artistName: currentTrack.artists[0]?.name ?? '',
      albumName: currentTrack.album.name,
      releaseYear: currentTrack.album.release_date.substring(0, 4),
      albumArtUrl: currentTrack.album.images[0]?.url ?? null,
      category: activeCategory,
      options,
      userAnswerId,
      botAnswerId,
      userCorrect,
      botCorrect,
      userPoints: calculatePoints(userCorrect, elapsed, config.speedMode),
      botPoints: calculatePoints(botCorrect, botElapsed, config.speedMode),
      userElapsedMs: elapsed,
    })

    navigate('/result', { replace: true })
  }, [
    phase,
    currentTrack,
    userAnswerId,
    botAnswerId,
    userElapsedMs,
    options,
    activeCategory,
    config.speedMode,
    addCompletedRound,
    navigate,
  ])

  // Cleanup
  useEffect(() => {
    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
    }
  }, [])

  function handleAnswer(option: RoundOption) {
    if (phase !== 'playing' || userAnswerId !== null) return
    setUserAnswerId(option.id)
    setUserElapsedMs(Date.now() - startTimeRef.current)
  }

  function handleCategoryChange(cat: Category) {
    if (phase !== 'playing') return
    setActiveCategory(cat)
    setCategory(cat)
    setUserAnswerId(null)
    setUserElapsedMs(null)
    if (botAnswerId === null) {
      if (botTimerRef.current) clearTimeout(botTimerRef.current)
      botTimerRef.current = setTimeout(() => {
        if (botAnswerForCategory) setBotAnswerId(botAnswerForCategory.id)
      }, Math.max(0, botDelayRef.current - (Date.now() - startTimeRef.current)))
    }
  }

  function getOptionState(option: RoundOption): 'default' | 'selected' | 'correct' | 'wrong' | 'dimmed' {
    if (phase === 'playing') {
      return userAnswerId === option.id ? 'selected' : 'default'
    }
    if (option.isCorrect) return 'correct'
    if (option.id === userAnswerId) return 'wrong'
    return 'dimmed'
  }

  if (!currentTrack) return null

  const botPhase = botAnswerId !== null ? 'locked' : 'thinking'
  const locked = phase !== 'playing' || userAnswerId !== null

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-md mx-auto">
      <header className="pt-12 pb-2">
        <ScoreBoard />
      </header>

      <main className="flex-1 flex flex-col gap-4 px-4 pb-6">
        <CategoryTabs
          active={activeCategory}
          onChange={handleCategoryChange}
          disabled={locked}
          viableCategories={viableCategories}
        />

        <div className="grid grid-cols-1 gap-2.5">
          {options.map(option => (
            <OptionCard
              key={option.id}
              label={option.label}
              state={getOptionState(option)}
              onClick={() => handleAnswer(option)}
              disabled={locked}
            />
          ))}
        </div>

        <div className="mt-auto pt-2">
          <BotAvatar difficulty={config.difficulty} phase={botPhase} />
        </div>
      </main>
    </div>
  )
}
