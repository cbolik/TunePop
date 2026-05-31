import { SpotifyTrack } from '../api/spotify'
import { Category, RoundOption } from '../types/game'

export function getValueForCategory(track: SpotifyTrack, category: Category): string {
  switch (category) {
    case 'song':   return track.name
    case 'artist': return track.artists[0]?.name ?? 'Unknown Artist'
    case 'album':  return track.album.name
    case 'year':   return track.album.release_date.substring(0, 4)
  }
}

export function buildOptions(
  correctTrack: SpotifyTrack,
  pool: SpotifyTrack[],
  category: Category,
): RoundOption[] {
  const correctValue = getValueForCategory(correctTrack, category)

  const falseSet = new Set<string>()
  const shuffledPool = [...pool].sort(() => Math.random() - 0.5)

  for (const track of shuffledPool) {
    if (falseSet.size >= 3) break
    const val = getValueForCategory(track, category)
    if (val !== correctValue && !falseSet.has(val)) {
      falseSet.add(val)
    }
  }

  // Fill remaining slots for year with nearby values
  if (category === 'year') {
    const correctYear = parseInt(correctValue, 10)
    let offset = 1
    while (falseSet.size < 3) {
      const candidates = [
        String(correctYear + offset),
        String(correctYear - offset),
      ]
      for (const c of candidates) {
        if (falseSet.size < 3 && c !== correctValue && !falseSet.has(c)) {
          falseSet.add(c)
        }
      }
      offset++
      if (offset > 20) break
    }
  }

  const options: RoundOption[] = [
    { id: 'correct', label: correctValue, isCorrect: true },
    ...[...falseSet].slice(0, 3).map((label, i) => ({
      id: `false-${i}`,
      label,
      isCorrect: false,
    })),
  ]

  return options.sort(() => Math.random() - 0.5)
}

export const CATEGORIES: Category[] = ['song', 'artist', 'album', 'year']

export const CATEGORY_LABELS: Record<Category, string> = {
  song:   'Song',
  artist: 'Artist',
  album:  'Album',
  year:   'Year',
}

export function randomCategory(): Category {
  return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
}
