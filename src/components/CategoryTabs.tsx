import { Category } from '../types/game'
import { CATEGORIES, CATEGORY_LABELS } from '../utils/options'

interface Props {
  active: Category
  onChange: (category: Category) => void
  disabled?: boolean
  viableCategories?: Category[]
}

export function CategoryTabs({ active, onChange, disabled, viableCategories }: Props) {
  const visible = viableCategories ?? CATEGORIES

  return (
    <div className="flex gap-1 bg-card rounded-xl p-1">
      {visible.map(cat => (
        <button
          key={cat}
          onClick={() => !disabled && onChange(cat)}
          disabled={disabled}
          className={`
            flex-1 py-2 px-1 rounded-lg text-xs font-semibold transition-colors
            ${active === cat
              ? 'bg-spotify text-white'
              : 'text-gray-400 hover:text-white active:bg-card-hover'
            }
            ${disabled ? 'opacity-50 cursor-default' : 'cursor-pointer'}
          `}
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
    </div>
  )
}
