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

interface GameState {
  // Persisted
  config: GameConfig

  // Runtime
  status: GameStatus
  trackPool: SpotifyTrack[]
  currentTrack: SpotifyTrack | null
  currentCategory: Category
  completedRounds: CompletedRound[]

  // Actions
  setConfig(patch: Partial<GameConfig>): void
  setDifficulty(d: Difficulty): void
  startGame(pool: SpotifyTrack[], firstTrack: SpotifyTrack): void
  setCategory(category: Category): void
  addCompletedRound(round: CompletedRound): void
  startNextRound(newTrack: SpotifyTrack | null): void
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
        })
      },

      setCategory(category) {
        set({ currentCategory: category })
      },

      addCompletedRound(round) {
        set(s => ({ completedRounds: [...s.completedRounds, round] }))
      },

      // newTrack: the Spotify track now playing, or null to reuse the current one
      startNextRound(newTrack) {
        const { currentTrack } = get()
        set({
          status: 'round',
          currentTrack: newTrack ?? currentTrack,
          currentCategory: randomCategory(),
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
        })
      },

      setStatus(status) {
        set({ status })
      },
    }),
    {
      name: 'tunepop-config',
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
