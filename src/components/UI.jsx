export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]'
  const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-4 py-2.5 text-sm min-h-[44px]',
    lg: 'px-5 py-3.5 text-base min-h-[52px]',
  }
  const variants = {
    primary: 'bg-primary hover:bg-primary-hover text-primary-fg shadow-sm',
    secondary: 'bg-surface2 hover:bg-surface2 text-body dark:bg-surface2 dark:hover:bg-surface2 dark:text-body',
    ghost: 'text-body hover:bg-surface2 dark:text-body dark:hover:bg-surface2',
    danger: 'bg-danger hover:bg-danger/90 text-danger-fg',
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
      className={`w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-border bg-surface dark:border-border dark:text-body placeholder:text-subtle dark:placeholder:text-muted ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full px-3 py-2.5 min-h-[44px] rounded-xl border border-border bg-surface dark:border-border dark:text-body ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-surface dark:bg-surface rounded-2xl shadow-sm border border-border ${className}`} {...props}>
      {children}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className={`bg-bg w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} rounded-t-3xl sm:rounded-2xl shadow-xl safe-bottom max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="sticky top-0 bg-bg px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-body">{title}</h2>
            <button onClick={onClose} className="text-muted hover:text-body dark:text-muted text-2xl leading-none w-8 h-8">×</button>
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
      {Icon && <Icon className="mx-auto w-12 h-12 text-subtle mb-4" />}
      <h3 className="text-lg font-medium text-body mb-1">{title}</h3>
      {description && <p className="text-sm text-muted mb-4">{description}</p>}
      {action}
    </div>
  )
}
