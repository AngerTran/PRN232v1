/** Kỳ chi trả cố định — khớp DAL.Common.PayrollRules */
export const PAYROLL_PAYOUT_DAY = 5;

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function vnTodayParts(now = new Date()): { year: number; month: number; day: number } {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  return {
    year: vn.getUTCFullYear(),
    month: vn.getUTCMonth() + 1,
    day: vn.getUTCDate(),
  };
}

export function getPayoutDate(year: number, month: number): Date {
  const payoutYear = month === 12 ? year + 1 : year;
  const payoutMonth = month === 12 ? 1 : month + 1;
  return new Date(Date.UTC(payoutYear, payoutMonth - 1, PAYROLL_PAYOUT_DAY));
}

export function formatPayoutDate(year: number, month: number): string {
  const d = getPayoutDate(year, month);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const y = d.getUTCFullYear();
  return `${day}/${m}/${y}`;
}

export function canMarkPeriodPaid(year: number, month: number, now = new Date()): boolean {
  const today = vnTodayParts(now);
  const payout = getPayoutDate(year, month);
  const payoutY = payout.getUTCFullYear();
  const payoutM = payout.getUTCMonth() + 1;
  const payoutD = payout.getUTCDate();

  if (today.year !== payoutY) return today.year > payoutY;
  if (today.month !== payoutM) return today.month > payoutM;
  return today.day >= payoutD;
}

export function getNextPayoutDate(now = new Date()): Date {
  const { year, month, day } = vnTodayParts(now);
  if (day < PAYROLL_PAYOUT_DAY) {
    return new Date(Date.UTC(year, month - 1, PAYROLL_PAYOUT_DAY));
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return new Date(Date.UTC(nextYear, nextMonth - 1, PAYROLL_PAYOUT_DAY));
}

export function formatNextPayoutLabel(now = new Date()): string {
  const next = getNextPayoutDate(now);
  const day = String(next.getUTCDate()).padStart(2, '0');
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const y = next.getUTCFullYear();
  return `${day}/${m}/${y}`;
}

export const PAYROLL_POLICY_SUMMARY =
  'Thù lao được gom theo tháng. Kế toán chuyển khoản vào ngày 5 tháng sau; trước đó số tiền hiển thị là chờ chi trả.';

export function periodPayoutMessage(year: number, month: number, now = new Date()): string {
  const payoutLabel = formatPayoutDate(year, month);
  if (canMarkPeriodPaid(year, month, now)) {
    return `Kỳ tháng ${month}/${year} — có thể chi trả (dự kiến ngày ${payoutLabel}).`;
  }
  return `Kỳ tháng ${month}/${year} — chưa đến ngày chi trả (${payoutLabel}). Thù lao vẫn được ghi nhận và tích lũy trong tháng.`;
}
