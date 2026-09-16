export function EmptyState({
  icon,
  title,
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-4xl bg-ink-50 flex items-center justify-center text-ink-300 mb-5">
        {icon}
      </div>

      <h3 className="font-display font-bold text-xl text-ink-900 mb-2">
        {title}
      </h3>

      <p className="text-sm text-ink-500 max-w-sm leading-relaxed mb-6">
        {description}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function ErrorState({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-4xl bg-error-50 flex items-center justify-center text-error-400 mb-5">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 9v4M12 17h.01" />

          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
      </div>

      <h3 className="font-display font-bold text-xl text-ink-900 mb-2">
        Something went sideways.
      </h3>

      <p className="text-sm text-ink-500 max-w-sm leading-relaxed mb-6">
        We couldn't load this page. Please try again.
      </p>

      <button
        onClick={onRetry}
        className="btn-primary"
      >
        Try Again
      </button>
    </div>
  );
}
