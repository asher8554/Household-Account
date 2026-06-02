// 달력 화면에 필요한 날짜 계산과 문자열 변환을 제공합니다.
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type MonthGridDay = {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export const weekdayLabels = ["월", "화", "수", "목", "금", "토", "일"];

export function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function fromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getTodayKey() {
  return toDateKey(new Date());
}

export function formatMonthTitle(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

export function formatDateLabel(dateKey: string) {
  const date = fromDateKey(dateKey);
  const week = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${week}요일`;
}

export function getMonthGridDays(monthDate: Date): MonthGridDay[] {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days: MonthGridDay[] = [];

  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    days.push({
      date: cursor,
      dateKey: toDateKey(cursor),
      dayNumber: cursor.getDate(),
      isCurrentMonth: isSameMonth(cursor, monthDate),
      isToday: isToday(cursor),
    });
  }

  return days;
}

export function isDateKeyInMonth(dateKey: string, monthDate: Date) {
  return isSameMonth(fromDateKey(dateKey), monthDate);
}
