# Notion Institution CMS Design

## 목표

금융기관 안내 문구와 읽기 전용 파서 힌트를 Notion 데이터베이스에서 관리하고, GitHub Pages UI가 항상 최신 Notion 기준으로 가져오기 화면을 구성하게 한다.

사용자는 GitHub Pages UI에서 지금처럼 카드사 `xls`, `xlsx`, `csv` 파일을 업로드한다. 앱은 Notion에서 받은 기관별 안내와 힌트를 기준으로 UI를 구성하고, 실제 파일 파싱과 거래 저장 전 검증은 브라우저 앱 코드에서 수행한다.

거래 데이터는 Notion으로 보내지 않는다. 개인 거래 데이터는 별도 private GitHub sync 설계의 저장소를 사용한다.

## 확정 사항

- Notion은 거래 데이터 저장소가 아니라 금융기관 안내 CMS로 사용한다.
- Notion에는 안내 문구와 읽기 전용 파서 힌트만 둔다.
- GitHub Pages UI는 카드사 파일 업로드와 파싱을 계속 담당한다.
- iPhone에서도 GitHub Pages UI가 최신 Notion 금융기관 정보를 기준으로 보여야 한다.
- Notion token은 iPhone 브라우저에 입력하거나 저장하지 않는다.
- 최신 Notion 데이터를 위해 Cloudflare Worker 같은 작은 backend를 둔다.
- Worker는 Notion token을 서버 측 secret으로 보관하고, 브라우저에는 정제된 공개 설정 JSON만 반환한다.

## 아키텍처

```text
Notion Financial Institutions DB
        |
        | Notion API
        v
Cloudflare Worker
        |
        | public institution config JSON
        v
GitHub Pages React UI
        |
        | local file parsing, preview, transaction save
        v
IndexedDB and private GitHub sync
```

GitHub Pages는 계속 정적 배포로 유지한다. Notion API는 브라우저에서 직접 호출하지 않고 Worker가 대신 호출한다. Worker 응답은 개인 거래 데이터가 아니라 금융기관 안내와 파서 힌트만 포함한다.

## Notion 데이터 모델

1차 Notion 데이터베이스 이름은 `Financial Institutions`로 둔다.

권장 속성.

- `Name`. 기관 이름.
- `Institution Type`. 카드, 은행, 간편결제.
- `Enabled`. UI 노출 여부.
- `Sort Order`. UI 정렬 순서.
- `Parser Key`. 코드에 있는 파서 선택 키. 예. `shinhan-card`.
- `Homepage URL`. PC 홈페이지 URL.
- `Mobile App URL`. 모바일 앱 또는 안내 URL.
- `Supported Formats`. `csv`, `xls`, `xlsx`, `txt`.
- `Required Columns`. 사용자가 파일에서 확인해야 하는 필수 컬럼 문구.
- `Date Column Hints`. 날짜 후보 컬럼명.
- `Amount Column Hints`. 금액 후보 컬럼명.
- `Merchant Column Hints`. 가맹점 후보 컬럼명.
- `Status Column Hints`. 승인, 취소, 상태 후보 컬럼명.
- `PC Steps`. PC에서 파일을 받는 안내 단계.
- `Mobile Steps`. 모바일 앱에서 파일이나 텍스트를 찾는 안내 단계.
- `Notes`. 기관별 주의사항.
- `Updated At`. Notion 마지막 수정 시각 또는 수동 관리 값.

Notion 속성은 사람이 편집하기 쉽게 유지한다. 복잡한 조건식, 금액 부호 규칙, 중복 제거 규칙은 Notion에 두지 않는다.

## Worker API

Worker는 단일 읽기 API부터 시작한다.

```http
GET /institutions
```

응답 예시.

```json
{
  "version": 1,
  "fetchedAt": "2026-06-07T00:00:00.000Z",
  "institutions": [
    {
      "name": "신한카드",
      "institutionType": "card",
      "enabled": true,
      "sortOrder": 10,
      "parserKey": "shinhan-card",
      "homepageUrl": "https://www.shinhancard.com",
      "mobileAppUrl": "",
      "supportedFormats": ["xls", "xlsx", "csv"],
      "requiredColumns": ["이용일자", "승인금액", "가맹점명"],
      "dateColumnHints": ["이용일자", "승인일자", "거래일시"],
      "amountColumnHints": ["이용금액", "승인금액", "출금액"],
      "merchantColumnHints": ["가맹점명", "이용처", "적요"],
      "statusColumnHints": ["승인/취소", "상태"],
      "pcSteps": [
        "신한카드 홈페이지에 로그인합니다.",
        "카드 이용내역 화면에서 기간을 선택합니다.",
        "Excel 파일로 저장합니다."
      ],
      "mobileSteps": [
        "신한 SOL페이 앱을 엽니다.",
        "카드 이용내역을 검색합니다.",
        "파일 저장 또는 공유 기능이 있으면 파일로 저장합니다."
      ],
      "notes": "승인취소 거래는 미리보기에서 확인하세요."
    }
  ]
}
```

Worker 책임.

- Notion token을 secret으로 보관한다.
- Notion 데이터베이스를 조회한다.
- Notion property shape를 앱 친화적인 JSON으로 변환한다.
- disabled 기관을 기본 응답에서 제외한다.
- Notion API가 429를 반환하면 Worker도 429와 `Retry-After`를 전달한다.
- Notion API 조회 실패는 502, 응답 정규화 실패는 500, Notion timeout은 504로 반환한다.
- 응답에 token, Notion page raw content, 불필요한 내부 식별자를 포함하지 않는다.

## GitHub Pages UI 동작

앱 시작 시.

1. Worker의 `/institutions`를 호출한다.
2. 성공하면 IndexedDB 또는 localStorage에 기관 설정 캐시를 저장한다.
3. 가져오기 화면은 최신 Worker 응답으로 렌더링한다.
4. 실패하면 마지막 캐시를 사용하고 `오프라인 캐시` 상태를 표시한다.
5. 캐시도 없으면 기본 내장 기관 정보를 fallback으로 사용한다.

파일 업로드 시.

1. 사용자가 기관 또는 파일을 선택한다.
2. 앱은 `parserKey`로 기존 코드 파서를 선택한다.
3. 앱은 column hints를 헤더 탐색 후보로 사용한다.
4. 앱은 파일을 브라우저에서 파싱한다.
5. 미리보기에서 날짜, 금액, 가맹점, 상태 오류를 표시한다.
6. 사용자가 확인하면 거래를 IndexedDB에 저장한다.
7. 거래 데이터 push는 private GitHub sync 흐름을 따른다.

Notion 힌트는 파서 입력 보조값이다. 실제 금액 부호, 승인 취소 처리, 중복 판단, 거래 저장 검증은 코드가 책임진다.

## 안전 기준

- Notion token은 브라우저, `localStorage`, IndexedDB, GitHub Pages asset에 저장하지 않는다.
- Worker secret에만 Notion token을 저장한다.
- Notion integration은 `Financial Institutions` 데이터베이스와 필요한 parent page에만 공유한다.
- Notion에는 개인 거래 데이터, 계좌번호, 카드번호, 로그인 정보, API token을 넣지 않는다.
- Worker 응답은 공개되어도 되는 금융기관 안내와 파서 힌트만 포함한다.
- 파서 힌트가 틀려도 거래 저장 전 미리보기와 검증이 막아야 한다.

## 캐시와 최신성

iPhone에서도 최신 Notion 기준 UI를 보여주기 위해 앱 시작과 가져오기 화면 진입 시 Worker를 호출한다.

- 성공 응답은 로컬 캐시에 저장한다.
- 캐시에는 `fetchedAt`을 함께 저장한다.
- 화면에는 마지막 기관 정보 동기화 시각을 표시한다.
- 사용자는 `Notion 정보 새로고침` 버튼으로 수동 갱신할 수 있다.
- Worker 실패 시 마지막 캐시를 사용한다.

항상 최신이라는 요구는 네트워크가 정상일 때 최신 Notion 데이터를 즉시 반영한다는 의미로 정의한다. 오프라인이나 Worker 장애 시에는 마지막 캐시로 graceful fallback한다.

## 기존 private GitHub sync와의 관계

이 설계는 `2026-06-07-private-github-sync-design.md`를 대체하지 않는다.

- Notion Institution CMS는 금융기관 안내와 파서 힌트를 관리한다.
- Private GitHub sync는 개인 거래 데이터를 관리한다.
- IndexedDB는 로컬 캐시와 입력 작업 저장소로 유지한다.
- GitHub Pages UI는 두 데이터 흐름을 연결하는 클라이언트다.

## 범위 제외

1차 범위에서 제외한다.

- Notion에 거래 데이터 저장.
- Notion에서 거래 입력.
- Notion token을 iPhone UI에 입력하고 저장하는 기능.
- Notion parser hint만으로 완전히 새로운 파서를 동적으로 실행하는 기능.
- Notion에서 금액 부호, 취소, 환불, 중복 판단 규칙을 편집하는 기능.
- Worker에서 거래 파일을 업로드받아 파싱하는 기능.

## 검증 기준

- Worker가 Notion `Financial Institutions` 데이터베이스를 읽어 정규화된 JSON을 반환한다.
- GitHub Pages UI가 Worker 응답으로 기관 링크, 안내 단계, 필수 컬럼 문구를 렌더링한다.
- iPhone viewport에서 가져오기 화면이 최신 기관 정보를 보여준다.
- Notion에서 안내 문구를 수정하면 iPhone 새로고침 후 반영된다.
- Worker 장애 시 마지막 캐시 또는 내장 fallback으로 화면이 깨지지 않는다.
- 기존 신한카드 `xls` 파싱이 Notion 힌트를 사용해도 동일하게 동작한다.
- Notion 힌트가 틀린 경우 저장 전에 미리보기 오류가 표시된다.
- Notion token이 브라우저 번들, localStorage, IndexedDB에 남지 않는다.
- `npm run build`가 통과한다.

## 참고 문서

- Notion API overview. https://developers.notion.com/guides/get-started/overview
- Notion API key handling. https://developers.notion.com/guides/get-started/handling-api-keys
- Notion request limits. https://developers.notion.com/reference/request-limits
- Notion create page API. https://developers.notion.com/reference/post-page
