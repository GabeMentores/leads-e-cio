import * as React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type Tone = 'default' | 'success' | 'danger';
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = React.createContext<(message: string, tone?: Tone) => void>(() => {});

/** App-wide toast feedback. Wrap the shell once; call useToast() anywhere. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const push = React.useCallback((message: string, tone: Tone = 'default') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={push}>
      {children}
      {/* z-70: acima dos drawers (z-60/61) — o footer do TicketDrawer dispara
          toasts que ficavam ATRÁS do painel (achado da rodada de estética). */}
      <div className="fixed bottom-[var(--space-lg)] right-[var(--space-lg)] z-[70] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-[var(--space-xs)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="flex items-start gap-[var(--space-sm)] rounded-[var(--radius-md)] border border-border-subtle bg-surface-1 p-[var(--space-sm)] text-[length:var(--body-sm-size)]"
            style={{ boxShadow: 'var(--elevation-3)' }}
          >
            <ToneIcon tone={t.tone} />
            <span className="min-w-0 flex-1 text-text-primary">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Fechar"
              className="grid h-5 w-5 shrink-0 place-items-center rounded-[var(--radius-sm)] text-text-muted hover:bg-surface-2"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return React.useContext(ToastContext);
}

function ToneIcon({ tone }: { tone: Tone }) {
  if (tone === 'success')
    return <CheckCircle2 size={18} className="mt-[1px] shrink-0 text-status-on-track" aria-hidden="true" />;
  if (tone === 'danger') return <AlertCircle size={18} className="mt-[1px] shrink-0 text-status-critical" aria-hidden="true" />;
  return <Info size={18} className="mt-[1px] shrink-0 text-accent-bela" aria-hidden="true" />;
}
