/**
 * Formats from the design system (content fundamentals): DD/MM/YYYY dates, 24-hour times,
 * thousands separators, and the currency after the number in Lao, before it in English.
 * Everything is shown in Vientiane time, whatever the viewer's computer is set to.
 */
const TZ = 'Asia/Vientiane';

const dateFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const numberFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export const formatDate = (value: string | Date) => dateFmt.format(new Date(value));
export const formatTime = (value: string | Date) => timeFmt.format(new Date(value));
export const formatDateTime = (value: string | Date) => `${formatDate(value)} ${formatTime(value)}`;
export const formatNumber = (value: number | string) => numberFmt.format(Number(value));

export const formatMoney = (value: number | string, currency: string, locale: string) => {
  const n = formatNumber(value);
  if (locale === 'lo') return `${n} ${currency === 'LAK' ? 'ກີບ' : currency}`;
  return `${currency} ${n}`;
};

/** 2026, 11 → "11/2026" */
export const formatPeriod = (year: number, month: number) => `${String(month).padStart(2, '0')}/${year}`;

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
/** The calendar day (YYYY-MM-DD) in Vientiane of an instant; today by default. */
export const localDay = (value: string | Date = new Date()) => dayFmt.format(new Date(value));
/** YYYY-MM-DD plus n days (n may be negative). */
export const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/** Minutes after midnight → "08:00". */
export const formatMinutes = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
/** Worked minutes → "8:15" (hours:minutes). */
export const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
