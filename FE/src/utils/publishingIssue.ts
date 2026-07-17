/** Kỳ xếp hạng kiểu tạp chí — encode từ ngày XB (khớp backend PublishingIssueNumbers). */
const WEEKLY_OFFSET = 1_000_000;
const MONTHLY_OFFSET = 2_000_000;

export function formatPublishingIssueLabel(issueNumber?: number | null): string {
  if (issueNumber == null || issueNumber <= 0) return '—';

  if (issueNumber >= MONTHLY_OFFSET) {
    const body = issueNumber - MONTHLY_OFFSET;
    const year = Math.floor(body / 100);
    const month = body % 100;
    return `${year} · Tháng ${String(month).padStart(2, '0')}`;
  }

  if (issueNumber >= WEEKLY_OFFSET) {
    const body = issueNumber - WEEKLY_OFFSET;
    const year = Math.floor(body / 100);
    const week = body % 100;
    return `${year} · Tuần ${String(week).padStart(2, '0')}`;
  }

  // Dữ liệu cũ (kỳ = số chương).
  return `Kỳ ${issueNumber}`;
}

/** Preview kỳ từ ngày XB + tần suất (FE), trước khi lưu. */
export function computePublishingIssueNumber(
  publishDateIso: string,
  frequency: 'weekly' | 'monthly' | string
): number | null {
  if (!publishDateIso || publishDateIso.length < 10) return null;
  const date = new Date(`${publishDateIso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  if (frequency?.toLowerCase() === 'monthly') {
    return MONTHLY_OFFSET + date.getFullYear() * 100 + (date.getMonth() + 1);
  }

  // ISO week (Thứ Hai là ngày đầu tuần).
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const isoYear = tmp.getUTCFullYear();
  return WEEKLY_OFFSET + isoYear * 100 + week;
}
