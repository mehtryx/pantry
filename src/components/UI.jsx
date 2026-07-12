export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]'
  const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-4 py-2.5 text-sm min-h-[44px]',
    lg: 'px-5 py-3.5 text-base min-h-[52px]',
  }
  const variants = {
    primary: 'bg-sage-400 hover:bg-sage-500 text-white shadow-sm',
    secondary: 'bg-cream-200 hover:bg-cream-300 text-sage-800 dark:bg-sage-800 dark:hover:bg-sage-700 dark:text-cream-100',
    ghost: 'text-sage-700 hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-sage-800',
    danger: 'bg-terracotta-500 hover:bg-terracotta-600 text-white',
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-cream-300 bg-cream-50 dark:bg-sage-800 dark:border-sage-700 dark:text-cream-100 placeholder:text-sage-400 dark:placeholder:text-sage-500 ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-cream-300 bg-cream-50 dark:bg-sage-800 dark:border-sage-700 dark:text-cream-100 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-white dark:bg-sage-800/60 rounded-2xl shadow-sm border border-cream-200 dark:border-sage-700 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className={`bg-cream-100 dark:bg-sage-900 w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} rounded-t-3xl sm:rounded-2xl shadow-xl safe-bottom max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="sticky top-0 bg-cream-100 dark:bg-sage-900 px-5 py-4 border-b border-cream-200 dark:border-sage-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-sage-800 dark:text-cream-100">{title}</h2>
            <button onClick={onClose} className="text-sage-500 hover:text-sage-700 dark:text-cream-300 text-2xl leading-none w-8 h-8">×</button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-16 px-6">
      {Icon && <Icon className="mx-auto w-12 h-12 text-sage-300 dark:text-sage-600 mb-4" />}
      <h3 className="text-lg font-medium text-sage-800 dark:text-cream-100 mb-1">{title}</h3>
      {description && <p className="text-sm text-sage-500 dark:text-cream-300 mb-4">{description}</p>}
      {action}
    </div>
  )
}
