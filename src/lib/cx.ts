// 조건부 CSS 클래스 문자열을 안전하게 합칩니다.
export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
