import { SpotifyTrack } from '../api/spotify'
import { Category, RoundOption } from '../types/game'

export function getValueForCategory(track: SpotifyTrack, category: Category): string {
  switch (category) {
    case 'song':   return track.name
    case 'artist': return track.artists[0]?.name ?? 'Unknown Artist'
    case 'album':  return track.album.name
    case 'year':   return track.album.release_date.substring(0, 4)
    case 'cover':  return track.album.id
  }
}

function albumImageUrl(track: SpotifyTrack): string {
  // Prefer 300px (index 1); fall back to any size available
  return track.album.images[1]?.url ?? track.album.images[0]?.url ?? ''
}

function buildCoverOptions(correctTrack: SpotifyTrack, pool: SpotifyTrack[]): RoundOption[] {
  const correctAlbumId = correctTrack.album.id
  const seenIds = new Set<string>([correctAlbumId])
  const falseTracks: SpotifyTrack[] = []

  for (const track of [...pool].sort(() => Math.random() - 0.5)) {
    if (falseTracks.length >= 3) break
    if (!seenIds.has(track.album.id)) {
      seenIds.add(track.album.id)
      falseTracks.push(track)
    }
  }

  const options: RoundOption[] = [
    { id: 'correct', label: correctTrack.album.name, imageUrl: albumImageUrl(correctTrack), isCorrect: true },
    ...falseTracks.map((track, i) => ({
      id: `false-${i}`,
      label: track.album.name,
      imageUrl: albumImageUrl(track),
      isCorrect: false,
    })),
  ]
  return options.sort(() => Math.random() - 0.5)
}

export function buildOptions(
  correctTrack: SpotifyTrack,
  pool: SpotifyTrack[],
  category: Category,
): RoundOption[] {
  if (category === 'cover') return buildCoverOptions(correctTrack, pool)

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

  // Fill remaining year slots with nearby past years
  if (category === 'year') {
    const correctYear = parseInt(correctValue, 10)
    const currentYear = new Date().getFullYear()
    let offset = 1
    while (falseSet.size < 3 && offset <= 50) {
      // Prefer going backwards to avoid future years
      for (const candidate of [String(correctYear - offset), String(correctYear + offset)]) {
        const y = parseInt(candidate)
        if (falseSet.size < 3 && y >= 1950 && y <= currentYear && candidate !== correctValue && !falseSet.has(candidate)) {
          falseSet.add(candidate)
        }
      }
      offset++
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

export const CATEGORIES: Category[] = ['song', 'artist', 'album', 'year', 'cover']

export const CATEGORY_LABELS: Record<Category, string> = {
  song:   'Song',
  artist: 'Artist',
  album:  'Album',
  year:   'Year',
  cover:  'Cover',
}

export function getViableCategories(correctTrack: SpotifyTrack, pool: SpotifyTrack[]): Category[] {
  const viable = CATEGORIES.filter(cat => {
    if (cat === 'year') return true  // always viable via year fallback
    const correctValue = getValueForCategory(correctTrack, cat)
    const uniqueFalse = new Set(
      pool.map(t => getValueForCategory(t, cat)).filter(v => v !== correctValue)
    )
    return uniqueFalse.size >= 3
  })
  return viable.length > 0 ? viable : ['song']
}

export function randomCategoryFrom(categories: Category[]): Category {
  return categories[Math.floor(Math.random() * categories.length)]
}

export function randomCategory(): Category {
  return randomCategoryFrom(CATEGORIES)
}
