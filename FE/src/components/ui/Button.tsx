import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';

    const variants = {
      primary: 'bg-primary text-primary-foreground hover:bg-[#B81E2E] active:scale-[0.98] shadow-sm',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-[#3A2F5E] active:scale-[0.98] shadow-sm',
      outline: 'border border-border bg-card text-foreground hover:bg-muted hover:border-foreground/30 active:scale-[0.98]',
      ghost: 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.98]',
      danger: 'bg-destructive text-destructive-foreground hover:bg-red-700 active:scale-[0.98] shadow-sm',
      accent: 'bg-accent text-accent-foreground hover:bg-[#E0B930] active:scale-[0.98] shadow-sm',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-2.5 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        <span className="inline-flex items-center gap-2">{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
