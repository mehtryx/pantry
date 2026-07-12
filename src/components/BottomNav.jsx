import { NavLink } from 'react-router-dom'
import { Home, ShoppingCart, Package, CalendarDays, Settings } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Pantry', icon: Home },
  { to: '/grocery', label: 'Grocery', icon: ShoppingCart },
  { to: '/putaway', label: 'Put Away', icon: Package },
  { to: '/meals', label: 'Meals', icon: CalendarDays },
  { to: '/settings', label: 'More', icon: Settings },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-cream-100/95 dark:bg-sage-900/95 backdrop-blur border-t border-cream-200 dark:border-sage-700 safe-bottom z-30">
      <div className="max-w-2xl mx-auto grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors min-h-[56px] ${
                isActive
                  ? 'text-sage-500 dark:text-sage-200'
                  : 'text-sage-400 dark:text-sage-500'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
