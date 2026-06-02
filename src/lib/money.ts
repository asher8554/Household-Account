// 원화 금액 표시와 입력값 정규화를 담당합니다.
const formatter = new Intl.NumberFormat("ko-KR");

export function formatKrw(value: number) {
  return `${formatter.format(value)}원`;
}

export function formatSignedKrw(value: number) {
  if (value === 0) return "0원";
  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${formatKrw(Math.abs(value))}`;
}

export function formatCompactKrw(value: number) {
  if (value === 0) return "0";
  if (value >= 10000) {
    const rounded = Math.round(value / 1000) / 10;
    return `${rounded}만`;
  }

  return formatter.format(value);
}

export function normalizeAmountInput(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}
