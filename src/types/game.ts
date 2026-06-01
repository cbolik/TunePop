export type Category = 'song' | 'artist' | 'album' | 'year'
export type Difficulty = 'novice' | 'fan' | 'expert' | 'genius'
export type GameStatus = 'login' | 'setup' | 'round' | 'round-result' | 'game-over'

export interface GameConfig {
  difficulty: Difficulty
  rounds: number | null  // null = open-ended
  speedMode: boolean
}

export interface RoundOption {
  id: string
  label: string
  isCorrect: boolean
}

export interface CategoryResult {
  category: Category
  options: RoundOption[]
  userAnswerId: string | null
  botAnswerId: string | null
  userCorrect: boolean
  botCorrect: boolean
  userElapsedMs: number | null
  botElapsedMs: number | null
}

export interface CompletedRound {
  trackId: string
  trackName: string
  artistName: string
  albumName: string
  releaseYear: string
  albumArtUrl: string | null
  results: CategoryResult[]
  userPoints: number
  botPoints: number
}

export interface BotPersonality {
  name: string
  emoji: string
  accuracy: number
  minDelayMs: number
  maxDelayMs: number
  tagline: string
}

export const BOT_PERSONALITIES: Record<Difficulty, BotPersonality> = {
  novice: {
    name: 'Rex',
    emoji: '🐣',
    accuracy: 0.4,
    minDelayMs: 8000,
    maxDelayMs: 16000,
    tagline: 'Still learning the classics',
  },
  fan: {
    name: 'Melody',
    emoji: '🎵',
    accuracy: 0.65,
    minDelayMs: 4000,
    maxDelayMs: 10000,
    tagline: 'Knows most of the hits',
  },
  expert: {
    name: 'The Archivist',
    emoji: '📼',
    accuracy: 0.85,
    minDelayMs: 1000,
    maxDelayMs: 6000,
    tagline: 'Has memorised every track',
  },
  genius: {
    name: 'ARIA-1',
    emoji: '🤖',
    accuracy: 0.95,
    minDelayMs: 600,
    maxDelayMs: 3000,
    tagline: 'Resistance is futile',
  },
}

export const DEFAULT_CONFIG: GameConfig = {
  difficulty: 'fan',
  rounds: 10,
  speedMode: false,
}
