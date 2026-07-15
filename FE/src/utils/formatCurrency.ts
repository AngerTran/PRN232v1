/** Format amount as Vietnamese đồng (hiển thị). */
export function formatVnd(amount: number): string {
  return `${formatVndDigits(amount)} VNĐ`;
}

/** Chỉ phần số theo locale vi-VN, ví dụ 50000 → "50.000". */
export function formatVndDigits(amount: number): string {
  const n = Math.round(Number(amount));
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('vi-VN');
}

/** Parse chuỗi tiền VN nhập tay: "50.000", "50000", "50 000" → số. */
export function parseVndInput(value: string): number {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

/** Format lại khi gõ trong ô input (chỉ giữ số → thêm dấu chấm ngăn nghìn). */
export function formatVndInput(value: string): string {
  const n = parseVndInput(value);
  if (!value.replace(/[^\d]/g, '')) return '';
  return formatVndDigits(n);
}
