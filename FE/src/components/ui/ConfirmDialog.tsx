import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>(opts => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    setOpen(false);
    resolverRef.current?.(value);
    resolverRef.current = null;
  }, []);

  const isDanger = (options.variant ?? 'danger') === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={open} onClose={() => settle(false)} size="sm">
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`flex items-center justify-center w-12 h-12 rounded-full ${isDanger ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>
            <AlertTriangle size={22} />
          </div>
          <div className="space-y-1.5">
            {options.title && <h3 className="font-semibold text-base">{options.title}</h3>}
            <div className="text-sm text-muted-foreground">{options.message}</div>
          </div>
          <div className="flex items-center gap-2 w-full mt-1">
            <Button variant="outline" className="flex-1" onClick={() => settle(false)}>
              {options.cancelText ?? 'Hủy'}
            </Button>
            <Button variant={isDanger ? 'danger' : 'primary'} className="flex-1" onClick={() => settle(true)}>
              {options.confirmText ?? 'Xác nhận'}
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
