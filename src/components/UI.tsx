import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Check,
  CheckCircle2,
  Coffee,
  Info,
  PartyPopper,
  PawPrint,
  ShoppingBag,
  Sparkles,
  Star,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { Category } from '../types';
import { cn, initials } from '../utils';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand" aria-label="周末职得">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
      </span>
      {!compact && (
        <span className="brand-text">
          周末职得
          <small>WEEKEND WORTH</small>
        </span>
      )}
    </span>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  full = false,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
}) {
  return (
    <button className={cn('btn', `btn-${variant}`, `btn-${size}`, full && 'btn-full', className)} {...props}>
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className={cn('icon-btn', className)} aria-label={label} {...props}>
      {children}
    </button>
  );
}

export function Avatar({
  name,
  color = '#D9F0DF',
  size = 40,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function CategoryIcon({ category, size = 18 }: { category: Category; size?: number }) {
  const map: Record<Category, LucideIcon> = {
    餐饮: Coffee,
    零售: ShoppingBag,
    活动: PartyPopper,
    宠物: PawPrint,
    其他: Sparkles,
  };
  const Icon = map[category] ?? Sparkles;
  return <Icon size={size} strokeWidth={1.8} />;
}

type Tone = 'green' | 'amber' | 'blue' | 'red' | 'gray' | 'purple';

export function Badge({
  children,
  tone = 'gray',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return <span className={cn('badge', `badge-${tone}`, className)}>{children}</span>;
}

const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  active: { label: '招募中', tone: 'green' },
  paused: { label: '已暂停', tone: 'amber' },
  closed: { label: '已结束', tone: 'gray' },
  pending: { label: '待审核', tone: 'amber' },
  rejected: { label: '已下架', tone: 'red' },
  open: { label: '可报名', tone: 'green' },
  full: { label: '已满员', tone: 'amber' },
  in_progress: { label: '进行中', tone: 'blue' },
  completed: { label: '已完成', tone: 'gray' },
  cancelled: { label: '已取消', tone: 'gray' },
  applied: { label: '待确认', tone: 'amber' },
  waitlisted: { label: '候补中', tone: 'purple' },
  accepted: { label: '已录用', tone: 'green' },
  withdrawn: { label: '已撤回', tone: 'gray' },
  expired: { label: '已过期', tone: 'gray' },
  confirmed: { label: '待上岗', tone: 'blue' },
  checked_in: { label: '工作中', tone: 'green' },
  cancelled_by_student: { label: '学生取消', tone: 'gray' },
  cancelled_by_merchant: { label: '商家取消', tone: 'gray' },
  no_show: { label: '已爽约', tone: 'red' },
  disputed: { label: '纠纷中', tone: 'red' },
  resolved: { label: '已处理', tone: 'gray' },
  escrowed: { label: '工资已托管', tone: 'green' },
  pending_release: { label: '待确认工时', tone: 'amber' },
  released: { label: '已结算', tone: 'green' },
  refunded: { label: '已退款', tone: 'gray' },
  partial_refund: { label: '部分结算', tone: 'amber' },
  held: { label: '结算冻结', tone: 'red' },
  verified: { label: '已认证', tone: 'green' },
  approved: { label: '已通过', tone: 'green' },
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const item = STATUS_MAP[status] ?? { label: status, tone: 'gray' as Tone };
  return (
    <span className={cn('status-pill', `status-${item.tone}`, className)}>
      <span className="status-dot" />
      {item.label}
    </span>
  );
}

export function MatchRing({ score, size = 46 }: { score: number; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circuit = 2 * Math.PI * radius;
  const offset = circuit - (Math.max(0, Math.min(100, score)) / 100) * circuit;
  const tone = score >= 85 ? 'high' : score >= 70 ? 'mid' : 'low';
  return (
    <span className={cn('match-ring', `match-${tone}`)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="match-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" />
        <circle
          className="match-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circuit}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <strong>{score}</strong>
    </span>
  );
}

export function Stars({
  value,
  size = 14,
  onChange,
}: {
  value: number;
  size?: number;
  onChange?: (value: 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <span className={cn('stars', onChange && 'stars-input')} aria-label={`${value} 星`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={cn('star-btn', n <= value && 'is-on')}
          onClick={onChange ? () => onChange(n as 1 | 2 | 3 | 4 | 5) : undefined}
          disabled={!onChange}
          aria-label={`${n} 星`}
        >
          <Star size={size} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon ?? <Sparkles size={26} />}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section
        className={cn('modal', `modal-${size}`)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="modal-head">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <IconButton label="关闭" autoFocus onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: 'right' | 'bottom';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn('drawer-backdrop', side === 'bottom' && 'drawer-backdrop-bottom')}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside className={cn('drawer', `drawer-${side}`)} role="dialog" aria-modal="true" aria-label={title}>
        <header className="drawer-head">
          <h2>{title}</h2>
          <IconButton label="关闭" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<{ push: (message: string, tone?: ToastTone) => void } | null>(
  null,
);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const push = useCallback((message: string, tone: ToastTone = 'success') => {
    counter.current += 1;
    const id = counter.current;
    setItems((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 2800);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="true">
        {items.map((item) => (
          <div key={item.id} className={cn('toast', `toast-${item.tone}`)}>
            {item.tone === 'success' ? (
              <CheckCircle2 size={18} />
            ) : item.tone === 'error' ? (
              <Info size={18} />
            ) : (
              <Info size={18} />
            )}
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}

export function CheckRow({ children, checked = true }: { children: ReactNode; checked?: boolean }) {
  return (
    <div className="check-row">
      <span className={cn('check-mark', !checked && 'is-muted')}>
        {checked ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
      </span>
      <span>{children}</span>
    </div>
  );
}

export function Progress({ value, tone = 'green' }: { value: number; tone?: 'green' | 'amber' | 'red' }) {
  return (
    <span className={cn('progress', `progress-${tone}`)}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      {children}
    </label>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'green' | 'amber' | 'blue';
}) {
  return (
    <div className={cn('stat', tone && `stat-${tone}`)}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function BookIcon({ size = 22 }: { size?: number }) {
  return <BookOpen size={size} />;
}
