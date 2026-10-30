import type { Category, DayKey, Shift } from './types';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function money(cents: number, withSymbol = true): string {
  const value = cents / 100;
  const text = Number.isInteger(value)
    ? String(value)
    : value.toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return withSymbol ? `¥${text}` : text;
}

export const formatMoney = money;

export function minutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function shiftMinutes(shift: Pick<Shift, 'startTime' | 'endTime'>): number {
  return Math.max(0, minutes(shift.endTime) - minutes(shift.startTime));
}

export function shiftHours(shift: Pick<Shift, 'startTime' | 'endTime'>): number {
  return Math.round((shiftMinutes(shift) / 60) * 10) / 10;
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function nextWeekend(): { sat: string; sun: string } {
  const now = new Date();
  const day = now.getDay();
  const satOffset = day === 6 ? 0 : (6 - day + 7) % 7;
  const sat = new Date(now.getFullYear(), now.getMonth(), now.getDate() + satOffset, 12);
  const sun = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 1, 12);
  return { sat: toISODate(sat), sun: toISODate(sun) };
}

export function lastWeekend(): { sat: string; sun: string } {
  const { sat, sun } = nextWeekend();
  const s = parseISODate(sat);
  const u = parseISODate(sun);
  s.setDate(s.getDate() - 7);
  u.setDate(u.getDate() - 7);
  return { sat: toISODate(s), sun: toISODate(u) };
}

export function weekdayLabel(value: string): string {
  const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return labels[parseISODate(value).getDay()] ?? '';
}

export function dayKey(value: string): DayKey {
  return parseISODate(value).getDay() === 6 ? 'sat' : 'sun';
}

export function formatDate(value: string): string {
  const d = parseISODate(value);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdayLabel(value)}`;
}

export function formatDateShort(value: string): string {
  const d = parseISODate(value);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function shiftWhen(shift: Pick<Shift, 'date' | 'startTime' | 'endTime'>): string {
  return `${formatDate(shift.date)} ${shift.startTime}–${shift.endTime}`;
}

export function shortWhen(shift: Pick<Shift, 'date' | 'startTime' | 'endTime'>): string {
  return `${formatDateShort(shift.date)} ${shift.startTime}–${shift.endTime}`;
}

export function relativeTime(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(delta / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

export function coverForCategory(category: Category): string {
  switch (category) {
    case '餐饮':
      return 'linear-gradient(135deg, #F4E3D2 0%, #D8AE85 55%, #B97C4B 100%)';
    case '宠物':
      return 'linear-gradient(135deg, #E8F1E4 0%, #A9CCA4 55%, #6F9E6A 100%)';
    case '零售':
      return 'linear-gradient(135deg, #FBE5EA 0%, #EAB0BF 55%, #D68098 100%)';
    case '活动':
      return 'linear-gradient(135deg, #E7EBF9 0%, #A7B4E3 55%, #7A8AC9 100%)';
    default:
      return 'linear-gradient(135deg, #EEF1EA 0%, #C9D2C0 55%, #9BAE91 100%)';
  }
}

export function initials(name: string): string {
  return name.slice(0, 1);
}

export function maskPhone(phone: string): string {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function minutesToText(total: number): string {
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  if (h <= 0) return `${m} 分钟`;
  if (m === 0) return `${h} 小时`;
  return `${h} 小时 ${m} 分钟`;
}

export function isWeekend(value: string): boolean {
  const day = parseISODate(value).getDay();
  return day === 0 || day === 6;
}
