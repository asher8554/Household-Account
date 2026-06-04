// 거래 메모에서 같은 사용처를 비교할 키를 만듭니다.
export function normalizeTransactionMerchantKey(value: string) {
  return value
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/신한\s*(카드|체크|SOL페이|플레이)?/gi, " ")
    .replace(/현대\s*카드|국민은행|KB국민은행|하나은행|토스뱅크|은행거래/gi, " ")
    .replace(/승인번호\s*[:：]?\s*[A-Za-z0-9-]+/gi, " ")
    .replace(/상태\s*[:：]?\s*[^/|]+/gi, " ")
    .replace(/카드\s*[:：]?\s*[^/|]+/gi, " ")
    .replace(/승인취소|매출취소|승인|취소|일시불|할부|국내|해외/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
}
