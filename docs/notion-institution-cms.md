# Notion 금융기관 CMS 설정

이 문서는 Notion을 금융기관 안내문과 파서 힌트 CMS로 쓰고, 필요할 때 GitHub Pages UI의 백업 데이터를 Cloudflare Worker를 통해 Notion data source 행으로 동기화하는 절차를 정리합니다.

## 역할

- Notion은 기본적으로 금융기관별 안내 문구와 읽기 전용 파서 힌트를 저장합니다.
- 사용자가 백업 패널에서 실행한 경우에만 현재 가계부 거래를 Notion data source 행으로 기록합니다.
- 카드번호, 계좌번호, 로그인 정보, Notion token은 Notion 데이터베이스에 넣지 않습니다.
- GitHub Pages 앱은 Notion-backed 원격 데이터를 `VITE_INSTITUTION_CMS_URL`로 지정된 Worker의 `/institutions` JSON을 통해서만 읽고, 실패 시 공개 가능한 브라우저 캐시 또는 내장 기본값을 사용합니다.
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
2. connection capability는 기관 catalog 조회만 쓸 경우 읽기 권한으로 충분합니다. 백업 행 동기화까지 쓰려면 Insert Content와 Update Content 권한도 켭니다.
3. `Financial Institutions` 데이터베이스 또는 상위 페이지를 connection에 공유합니다.
4. 데이터베이스의 data source ID를 확인합니다.

## Cloudflare Worker local secrets

로컬 개발용 `.dev.vars`를 만듭니다. 이 파일은 `.gitignore`에 포함되어야 하며 커밋하지 않습니다.

```powershell
Copy-Item .dev.vars.example .dev.vars
```

`.dev.vars`의 key 이름은 아래처럼 고정입니다. `NOTION_TOKEN` 자리에 token 값을 넣는 것이 아니라, `NOTION_TOKEN=` 오른쪽에 token 값을 넣습니다.

```dotenv
NOTION_TOKEN=ntn_your_local_token
NOTION_DATA_SOURCE_ID=your_notion_data_source_id
NOTION_BACKUP_WRITE_KEY=random_backup_write_key
NOTION_VERSION=2026-03-11
ALLOWED_ORIGIN=http://localhost:5173
```

로컬 Worker 실행.

```powershell
npm run worker:dev
```

기관 catalog 상태 확인.

```powershell
Invoke-WebRequest -Uri http://localhost:8787/institutions | Select-Object -ExpandProperty StatusCode
```

백업 endpoint는 `POST /backups`입니다. 이 endpoint는 `X-Household-Backup-Key` header가 `NOTION_BACKUP_WRITE_KEY`와 일치해야 동작합니다.

백업 동기화는 data source schema를 조회하고, 부족한 컬럼을 추가한 뒤 같은 `id` 거래 행은 업데이트하고 없는 `id` 거래 행은 새로 만듭니다. 이전 텍스트 백업 방식으로 생긴 `Household account backup ...` 요약 행, 이전 버전에서 만든 category 행, 같은 거래 id 중복 행은 새 동기화 시 휴지통으로 보냅니다.

백업용 권장 컬럼.

| 속성 | 타입 | 용도 |
| --- | --- | --- |
| `id` | Title | 거래 고유 id. 실제 title 속성명이 다르면 Worker가 title 속성을 찾아 사용합니다. |
| `recordType` | Select | `transaction`. |
| `type` | Select | `expense`, `income`. |
| `name` | Text | 거래 메모. |
| `date` | Text | 거래 날짜. |
| `amount` | Number | 거래 금액. |
| `categoryId` | Text | 거래가 연결된 카테고리 id. |
| `memo` | Text | 거래 메모. |
| `source` | Select | `manual`, `shinhan-file`, `hyundai-card-file`, `bank-file`, `naver-pay-file` 등. |
| `createdAt` | Text | 생성 시각. |
| `updatedAt` | Text | 수정 시각. |

## Cloudflare Worker production secrets

production secret도 key 이름을 먼저 명령에 넣고, 프롬프트가 뜨면 값을 입력합니다. 성공 메시지는 `NOTION_TOKEN`, `NOTION_DATA_SOURCE_ID`, `NOTION_BACKUP_WRITE_KEY` 이름으로 보여야 합니다.

```powershell
npx wrangler secret put NOTION_TOKEN
npx wrangler secret put NOTION_DATA_SOURCE_ID
npx wrangler secret put NOTION_BACKUP_WRITE_KEY
```

`wrangler.toml`의 production origin은 GitHub Pages 주소로 제한합니다.

```toml
[vars]
NOTION_VERSION = "2026-03-11"
ALLOWED_ORIGIN = "https://asher8554.github.io"
```

## React app environment

로컬 앱에서 Worker를 보려면 `.env.local`을 만듭니다.

```powershell
Copy-Item .env.example .env.local
```

```dotenv
VITE_INSTITUTION_CMS_URL=http://localhost:8787/institutions
```

GitHub Pages build 환경에는 production Worker URL을 넣습니다.

```dotenv
VITE_INSTITUTION_CMS_URL=https://household-account-institution-cms.<account>.workers.dev/institutions
```

백업 패널의 Notion 기록 버튼은 이 URL에서 `/institutions`를 `/backups`로 바꿔 호출합니다. 별도 Vite 환경 변수는 필요 없습니다.

## Notion 백업 오류 확인

- `Notion data source를 읽지 못했습니다.`가 나오면 `NOTION_DATA_SOURCE_ID` 값과 Notion data source 공유 상태를 확인합니다.
- `Notion data source 컬럼 추가에 실패했습니다.`가 나오면 integration의 `Update Content` 권한을 켜고 Worker를 다시 배포합니다.
- `Notion 백업 행 생성에 실패했습니다.`가 나오면 integration의 `Insert Content` 권한과 Notion 컬럼 타입을 확인합니다.
- `Notion 백업 행 수정에 실패했습니다.`가 나오면 integration의 `Update Content` 권한과 기존 컬럼 타입을 확인합니다.
- 문구 끝의 `Notion HTTP 403`은 대체로 integration 권한 문제이고, `Notion HTTP 404`는 ID 오류나 공유 누락 가능성이 큽니다.
- `type is expected to be multi_select`가 나오면 Worker가 최신 배포인지 확인합니다. 최신 Worker는 기존 `type`, `source`, `recordType` 컬럼이 multi-select여도 해당 타입에 맞춰 기록합니다.

## iPhone 사용 흐름

1. iPhone Safari에서 GitHub Pages 앱을 엽니다.
2. 금융기관 가져오기 화면에서 최신 Notion catalog가 자동 로드됩니다.
3. Worker가 실패하면 브라우저 캐시를 쓰고, 캐시도 없으면 내장 기본값을 씁니다.
4. 금융기관을 선택하면 안내 문구, 필수 컬럼, 파서 힌트가 선택 기관 기준으로 바뀝니다.
5. 카드사나 은행 앱에서 내려받거나 공유한 `csv`, `xls`, `xlsx` 파일을 업로드합니다.
6. 파일은 브라우저 안에서 파싱되고, 거래 데이터는 IndexedDB에 저장됩니다.
7. 백업 패널에서 `NOTION_BACKUP_WRITE_KEY`와 같은 Notion 백업 키를 입력하고 `Notion 기록`을 누르면 현재 거래가 Notion data source 행으로 동기화됩니다.

## 보안 기준

- Notion token을 GitHub Pages, 브라우저 localStorage, IndexedDB에 저장하지 않습니다.
- `NOTION_BACKUP_WRITE_KEY`는 Notion token이 아니라 Worker 쓰기 요청 보호용 키입니다. 그래도 브라우저 localStorage에 저장되므로 무작위 긴 값으로 만들고 필요하면 회전합니다.
- Worker 응답에는 Notion raw page id, raw `properties`, token, integration 정보가 포함되지 않아야 합니다.
- Notion 백업 행에는 현재 거래 데이터만 들어갑니다. 금융 인증 정보와 Notion token은 넣지 않습니다.
- Browser localStorage cache에는 공개 가능한 금융기관 catalog만 저장합니다.
- Parser hints는 컬럼을 찾기 위한 별칭일 뿐이며, 거래 저장 규칙을 우회하지 않습니다.
