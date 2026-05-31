import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SpotifyTrack } from '../api/spotify'
import {
  Category,
  CompletedRound,
  DEFAULT_CONFIG,
  Difficulty,
  GameConfig,
  GameStatus,
} from '../types/game'
import { randomCategory } from '../utils/options'

interface PrefetchedRound {
  track: SpotifyTrack
  category: Category
}

interface GameState {
  // Persisted
  config: GameConfig

  // Runtime
  status: GameStatus
  trackPool: SpotifyTrack[]
  currentTrack: SpotifyTrack | null
  currentCategory: Category
  completedRounds: CompletedRound[]
  nextRoundData: PrefetchedRound | null

  // Actions
  setConfig(patch: Partial<GameConfig>): void
  setDifficulty(d: Difficulty): void
  startGame(pool: SpotifyTrack[], firstTrack: SpotifyTrack): void
  setCategory(category: Category): void
  addCompletedRound(round: CompletedRound): void
  setNextRoundData(data: PrefetchedRound | null): void
  startNextRound(fallbackTrack: SpotifyTrack): void
  endGame(): void
  resetToSetup(): void
  setStatus(status: GameStatus): void
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,

      status: 'login',
      trackPool: [],
      currentTrack: null,
      currentCategory: 'song',
      completedRounds: [],
      nextRoundData: null,

      setConfig(patch) {
        set(s => ({ config: { ...s.config, ...patch } }))
      },

      setDifficulty(d) {
        set(s => ({ config: { ...s.config, difficulty: d } }))
      },

      startGame(pool, firstTrack) {
        set({
          status: 'round',
          trackPool: pool,
          currentTrack: firstTrack,
          currentCategory: randomCategory(),
          completedRounds: [],
          nextRoundData: null,
        })
      },

      setCategory(category) {
        set({ currentCategory: category })
      },

      addCompletedRound(round) {
        set(s => ({ completedRounds: [...s.completedRounds, round] }))
      },

      setNextRoundData(data) {
        set({ nextRoundData: data })
      },

      startNextRound(fallbackTrack) {
        const { nextRoundData, config, completedRounds } = get()
        const track = nextRoundData?.track ?? fallbackTrack
        const category = nextRoundData?.category ?? randomCategory()
        const nextRoundNumber = completedRounds.length + 1

        if (config.rounds !== null && nextRoundNumber >= config.rounds) {
          set({ status: 'game-over', nextRoundData: null })
          return
        }

        set({
          status: 'round',
          currentTrack: track,
          currentCategory: category,
          nextRoundData: null,
        })
      },

      endGame() {
        set({ status: 'game-over' })
      },

      resetToSetup() {
        set({
          status: 'setup',
          trackPool: [],
          currentTrack: null,
          currentCategory: 'song',
          completedRounds: [],
          nextRoundData: null,
        })
      },

      setStatus(status) {
        set({ status })
      },
    }),
    {
      name: 'spotpop-config',
      partialize: state => ({ config: state.config }),
    },
  ),
)

export function useScores() {
  const rounds = useGameStore(s => s.completedRounds)
  return {
    userScore: rounds.reduce((sum, r) => sum + r.userPoints, 0),
    botScore: rounds.reduce((sum, r) => sum + r.botPoints, 0),
  }
}
