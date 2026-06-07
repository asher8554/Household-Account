# Notion 금융기관 CMS 설정

이 문서는 Notion을 금융기관 안내문과 파서 힌트 CMS로 쓰고, GitHub Pages UI가 Cloudflare Worker를 통해 최신 설정을 읽는 절차를 정리합니다.

## 역할

- Notion은 금융기관별 안내 문구와 읽기 전용 파서 힌트만 저장합니다.
- 거래 데이터, 카드번호, 계좌번호, 로그인 정보, Notion token은 Notion 데이터베이스에 넣지 않습니다.
- GitHub Pages 앱은 `VITE_INSTITUTION_CMS_URL`로 지정된 Worker의 `/institutions` JSON만 읽습니다.
- Notion token은 Cloudflare Worker secret에만 저장합니다.

## Notion 데이터베이스

데이터베이스 이름은 `Financial Institutions`를 권장합니다.

필수 속성.

- `Name`. Title. 예: `신한카드`.
- `Institution Type`. Select. 값은 `card`, `bank`, `pay`.
- `Enabled`. Checkbox. 꺼진 항목은 UI에 표시하지 않습니다.
- `Sort Order`. Number. 낮을수록 먼저 표시합니다.
- `Parser Key`. Text. 예: `shinhan-card`, `hyundai-card`, `bank-file`.
- `Homepage URL`. URL.
- `Mobile App URL`. URL. iPhone 사용을 위해 App Store 또는 iOS 친화 링크를 권장합니다.
- `Supported Formats`. Multi-select. 예: `csv`, `xls`, `xlsx`.
- `Required Columns`. Multi-select. 사용자가 파일에서 확인할 주요 컬럼입니다.
- `Date Column Hints`. Multi-select. 날짜 컬럼 별칭입니다.
- `Amount Column Hints`. Multi-select. 금액 컬럼 별칭입니다.
- `Merchant Column Hints`. Multi-select. 가맹점 또는 거래내용 컬럼 별칭입니다.
- `Status Column Hints`. Multi-select. 승인, 취소, 상태 컬럼 별칭입니다.
- `PC Steps`. Text. 줄바꿈으로 단계 구분.
- `Mobile Steps`. Text. 줄바꿈으로 단계 구분.
- `Notes`. Text. 화면에 표시할 주의사항.

## 예시 행

| Name | Institution Type | Parser Key | Supported Formats | Date Column Hints | Amount Column Hints | Merchant Column Hints |
| --- | --- | --- | --- | --- | --- | --- |
| 신한카드 | card | shinhan-card | csv, xls, xlsx | 이용일자, 승인일자 | 이용금액, 승인금액 | 가맹점명, 사용처 |
| 현대카드 | card | hyundai-card | csv, xls, xlsx | 이용일자, 매출일자 | 이용금액, 청구금액 | 가맹점명, 사용처 |
| 국민은행 | bank | bank-file | csv, xls, xlsx | 거래일시, 거래일자 | 출금액, 입금액 | 거래내용, 적요 |

## Notion connection

1. Notion developer portal에서 internal connection을 만듭니다.
2. connection capability는 읽기 권한만 부여합니다.
3. `Financial Institutions` 데이터베이스 또는 상위 페이지를 connection에 공유합니다.
4. 데이터베이스의 data source ID를 확인합니다.

## Cloudflare Worker local secrets

로컬 개발용 `.dev.vars`를 만듭니다. 이 파일은 `.gitignore`에 포함되어야 하며 커밋하지 않습니다.

```dotenv
NOTION_TOKEN=ntn_your_local_token
NOTION_DATA_SOURCE_ID=your_notion_data_source_id
NOTION_VERSION=2026-03-11
ALLOWED_ORIGIN=http://localhost:5173
```

로컬 Worker 실행.

```powershell
npm run worker:dev
```

상태 확인.

```powershell
Invoke-WebRequest -Uri http://localhost:8787/institutions | Select-Object -ExpandProperty StatusCode
```

## Cloudflare Worker production secrets

```powershell
npx wrangler secret put NOTION_TOKEN
npx wrangler secret put NOTION_DATA_SOURCE_ID
```

`wrangler.toml`의 production origin은 GitHub Pages 주소로 제한합니다.

```toml
[vars]
NOTION_VERSION = "2026-03-11"
ALLOWED_ORIGIN = "https://asher8554.github.io"
```

## React app environment

로컬 앱에서 Worker를 보려면 `.env.local`을 만듭니다.

```dotenv
VITE_INSTITUTION_CMS_URL=http://localhost:8787/institutions
```

GitHub Pages build 환경에는 production Worker URL을 넣습니다.

```dotenv
VITE_INSTITUTION_CMS_URL=https://household-account-institution-cms.<account>.workers.dev/institutions
```

## iPhone 사용 흐름

1. iPhone Safari에서 GitHub Pages 앱을 엽니다.
2. 금융기관 가져오기 화면에서 최신 Notion catalog가 자동 로드됩니다.
3. Worker가 실패하면 브라우저 캐시를 쓰고, 캐시도 없으면 내장 기본값을 씁니다.
4. 금융기관을 선택하면 안내 문구, 필수 컬럼, 파서 힌트가 선택 기관 기준으로 바뀝니다.
5. 카드사나 은행 앱에서 내려받거나 공유한 `csv`, `xls`, `xlsx` 파일을 업로드합니다.
6. 파일은 브라우저 안에서 파싱되고, 거래 데이터는 기존 IndexedDB와 private GitHub sync 흐름으로만 처리합니다.

## 보안 기준

- Notion token을 GitHub Pages, 브라우저 localStorage, IndexedDB에 저장하지 않습니다.
- Worker 응답에는 Notion raw page id, raw `properties`, token, integration 정보가 포함되지 않아야 합니다.
- Notion에는 개인 거래 데이터와 금융 인증 정보를 저장하지 않습니다.
- Browser localStorage cache에는 공개 가능한 금융기관 catalog만 저장합니다.
- Parser hints는 컬럼을 찾기 위한 별칭일 뿐이며, 거래 저장 규칙을 우회하지 않습니다.
