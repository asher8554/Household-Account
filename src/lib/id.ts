// 브라우저 환경에서 안정적인 id를 생성합니다.
export function createId(prefix: string) {
  if ("randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
