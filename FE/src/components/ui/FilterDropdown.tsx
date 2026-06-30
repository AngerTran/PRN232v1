import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface FilterDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Hiển thị nhãn tiếng Việt; giá trị lọc vẫn là `options` gốc. */
  formatOptionLabel?: (value: string) => string;
}

export default function FilterDropdown({ label, options, value, onChange, className, formatOptionLabel }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayLabel = (opt: string) => {
    if (opt === 'All') return 'Tất cả';
    return formatOptionLabel?.(opt) ?? opt;
  };

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg transition-colors hover:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring/50',
          value !== 'All' && 'border-primary/50 bg-primary/5 text-primary'
        )}
      >
        <span className="font-medium">{value === 'All' ? label : displayLabel(value)}</span>
        <ChevronDown size={14} className={clsx('text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[160px] py-1 overflow-hidden">
          {['All', ...options].map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={clsx(
                'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors text-left',
                value === opt ? 'text-primary font-semibold' : 'text-foreground'
              )}
            >
              <span>{displayLabel(opt)}</span>
              {value === opt && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
