# Household-Account

브라우저에 수입·지출을 저장하고, 카드·은행 내역 가져오기와 카테고리별 소비 분석, GitHub 공유 및 Notion 백업을 제공하는 가계부입니다.

- [가계부 열기](https://asher8554.github.io/Household-Account/)
- [가져오기·백업·공유 설정 열기](https://asher8554.github.io/Household-Account/#admin-import)

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| 거래 관리 | 수입·지출과 카테고리를 브라우저 IndexedDB에 저장합니다. |
| 소비 분석 | 대시보드와 연간 소비 추세에서 거래·카테고리별 소비를 확인합니다. |
| 파일 가져오기 | 카드·은행·네이버페이 내역을 가져오고, 저장 전 미리보기와 중복 여부를 확인합니다. |
| JSON 백업 | 현재 기록을 내보내거나 백업 JSON을 병합해 가져옵니다. |
| GitHub 공유 | 현재 기록을 저장소의 공유 JSON으로 업데이트합니다. |
| Notion 기록 | 거래와 카테고리를 행 단위로 동기화하고, 동일 기록을 저장 작업에서 제외합니다. |
| 화면 | 다크·라이트 모드, 반투명 패널과 배경 블러, Pretendard 폰트를 사용합니다. |

## 최근 업데이트

### Notion 카테고리 반영

- 거래의 `categoryId`를 기준으로 실제 카테고리 이름을 연결하고 `categoryName`을 함께 저장합니다.
- 카테고리 정의는 거래와 별도 행으로 보관하며 `recordType`으로 구분합니다.
- Notion의 `카테고리` 수식은 ID에 해당하는 이름을 표시합니다. 같은 이름의 카테고리가 있어도 ID로 구분합니다.
- 카테고리 이름이나 거래의 카테고리를 바꾸면 다음 Notion 기록 작업에서 갱신합니다.

### 동일 기록을 저장 작업에서 제외

1. 실제 Notion 행을 페이지 단위로 조회해 현재 백업과 대조합니다.
2. 같은 `recordId`의 백업 속성이 모두 일치하면 저장 대상에서 제외합니다.
3. 새 기록과 금액·날짜·메모·카테고리 등 속성이 변경된 기록만 생성하거나 업데이트합니다.

브라우저 캐시만으로 생략하지 않으므로 Notion에서 직접 변경한 내용도 다음 실행에서 다시 확인합니다. ID가 다른 거래는 정상 반복 결제일 수 있어 내용이 비슷하다는 이유로 합치지 않습니다. 중복 확인을 위한 조회는 매 실행마다 필요합니다.

저장은 최대 20행 단위로 진행하고, 해당 대상만 재조회합니다. 매 저장 batch마다 전체 Notion 행을 반복해서 읽던 경로를 개선해 대량 백업 중 발생하던 Worker CPU 초과 문제를 해결했습니다.

### 진행률과 글래스 UI

- 첫 응답 대기, 동일 기록 확인, 저장 진행, 완료·오류를 진행률 막대로 구분합니다.
- 실제 확인 건수, 동일 기록 제외 건수, 새로 저장·업데이트·정리 건수를 표시합니다.
- 오류가 발생하면 마지막 진행률을 남기며, 완료 응답을 받은 뒤 100%로 표시합니다.
- 기존 다크 색상을 유지하면서 패널 투명감·배경 블러·빛 반사를 강화했습니다. 모바일 화면과 키보드 포커스를 지원합니다.

### 공유 데이터 암호 제거

공유 데이터 암호 입력과 신규 공유 파일의 암호화를 제거했습니다. **공유 JSON에 포함된 거래와 카테고리는 공개 저장소에서 암호 없이 읽을 수 있습니다.** `#admin-import`는 화면 경로이며 접근 인증 기능이 아닙니다.

GitHub 토큰과 Notion 백업 키는 브라우저 `sessionStorage`에 보관합니다. 공유 데이터 암호 제거와 별개로 Notion 백업 키는 Worker 쓰기 요청을 보호하는 용도로 계속 필요합니다. Notion integration token은 Worker secret에만 저장합니다.

## 사용 방법

### Notion에 기록하기

1. [가져오기·백업 화면](https://asher8554.github.io/Household-Account/#admin-import)을 엽니다.
2. 백업 패널에 Notion 백업 키를 입력하고 **키 저장**을 누릅니다.
3. **Notion 기록**을 누릅니다. GitHub 공유 파일에는 쓰지 않고 현재 브라우저 기록을 Notion으로 동기화합니다.
4. 진행률과 제외·저장 건수를 확인하고 **Notion 기록 완료**를 기다립니다. 진행 중에는 탭을 닫거나 새로고침하지 않습니다.

변경이 없으면 동일 기록을 제외하고 저장 작업을 건너뛰었다는 안내가 나옵니다. 네트워크 오류 후 재실행하면 실제 Notion 내용을 다시 대조해 이미 반영된 행을 제외합니다.

### GitHub와 Notion을 함께 업데이트하기

GitHub 공유 설정의 저장소·브랜치·공유 파일 경로와 쓰기 권한이 있는 토큰을 설정한 뒤 **현재 기록 업데이트**를 누릅니다. GitHub 공유 파일을 먼저 업데이트하고, 이어 같은 브라우저 기록을 Notion에 동기화합니다. 대시보드의 같은 버튼도 이 공통 경로를 사용합니다.

GitHub 업데이트가 성공한 뒤 Notion이 실패하면 두 단계의 결과를 구분해 표시합니다. 원본 보관용 파일이 필요하면 백업 패널의 **내보내기**로 JSON을 별도 보관합니다.

## 개발 환경

React 18, TypeScript, Vite, Tailwind CSS, Dexie, Recharts를 사용합니다. Notion API 연결은 Cloudflare Worker가 담당하고, 프런트엔드는 GitHub Pages에 배포합니다. CI는 Node.js 22를 사용합니다.

```powershell
npm ci
npm run dev
```

터미널에 표시되는 주소로 접속합니다. 로컬 base 경로는 `/`이며 GitHub Pages 빌드에서는 `/Household-Account/`를 사용합니다.

### Notion Worker 연결

앱 환경 변수는 [.env.example](.env.example)을 참고해 `.env.local`에 설정합니다.

```dotenv
VITE_INSTITUTION_CMS_URL=http://localhost:8787/institutions
```

로컬 Worker의 `.dev.vars`에는 다음 값을 설정합니다. 실제 비밀값은 커밋하지 않습니다.

```dotenv
NOTION_TOKEN=your_notion_integration_token
NOTION_DATA_SOURCE_ID=your_data_source_id
NOTION_BACKUP_WRITE_KEY=your_backup_write_key
```

Notion integration에는 대상 data source 접근과 읽기·생성·수정 권한이 필요합니다. 앱에는 `NOTION_TOKEN` 대신 `NOTION_BACKUP_WRITE_KEY`와 같은 백업 키를 입력합니다.

```powershell
npm run worker:dev
```

| 경로 | 용도 |
| --- | --- |
| `GET /institutions` | 기관 카탈로그 조회 |
| `POST /backups` | 쓰기 키로 보호되는 백업 사전 대조·저장 |

## 검증과 배포

```powershell
# 앱 타입 검사와 프로덕션 빌드
npm run build

# Notion·진행률·통합 업데이트 관련 테스트
npx playwright test tests/notion-backup-page.spec.ts tests/notion-backup-service.spec.ts tests/notion-sync-progress.spec.tsx tests/current-pc-record-push-service.spec.ts --workers=1

# 전체 테스트
npx playwright test --workers=1

# Worker 타입 검사
npx tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022 --types @cloudflare/workers-types --skipLibCheck workers/institution-cms-worker.ts
```

2026-10-25 코드 변경 후 검증에서 관련 테스트 30개, 앱 빌드와 Worker 타입 검사가 통과했습니다. 전체 테스트는 70개 중 67개가 통과했으며 다음 기존 실패 3개가 남아 있습니다.

- `category expense layout stays stable when navigating months`
- `GitHub Pages shared-data file is not ignored by git`
- `GitHub shared-data push retries conflicts and explains common API failures`

운영에서도 동일 기록 제외 후 생성·업데이트 0건으로 완료되는 것을 확인했습니다. 다크 모드·실제 배경 블러·Pretendard 로드·키보드 포커스와 390px 모바일 화면을 확인했습니다. 이 내용은 위 날짜의 검증 결과이며 이후 실행 결과를 보장하는 상태 배지가 아닙니다.

프런트엔드는 `main` push 시 [GitHub Pages workflow](.github/workflows/deploy.yml)가 빌드·배포합니다. 저장소 Actions 변수 `VITE_INSTITUTION_CMS_URL`에는 운영 Worker의 `/institutions` URL을 설정합니다.

Worker는 별도로 배포합니다. 운영 secret은 Wrangler의 `secret put`으로 설정하며, 설정 파일에는 비밀값을 넣지 않습니다.

```powershell
npx wrangler secret put NOTION_TOKEN
npx wrangler secret put NOTION_DATA_SOURCE_ID
npx wrangler secret put NOTION_BACKUP_WRITE_KEY
npm run worker:deploy
```

## 관련 문서

- [카테고리 백업 계획](docs/notion-category-backup-plan.md)
- [카테고리 ID 매핑 정정](docs/notion-category-mapping-repair-plan.md)
- [동일 기록 작업 제외](docs/notion-unchanged-skip-plan.md)
- [진행률·글래스 UI 개선](docs/notion-progress-glass-plan.md)
- [공유 데이터 암호 제거](docs/shared-data-password-removal-plan.md)

## 라이선스

Copyright (c) 2026 asher8554. All rights reserved.
적용 시작일은 **2026-09-14 (Asia/Seoul)**이다.

asher8554가 권리를 가진 코드와 자료는 사전 서면 허락 없이 사용·실행·복제·수정·배포·판매·재라이선스·파생물 제작을 할 수 없다. 개인·학습·연구·교육·비상업 목적도 포함한다. 전체 조건과 예외는 [루트 LICENSE](LICENSE)를 따른다.

기존 라이선스로 이미 적법하게 부여된 권리는 소급 철회하지 않는다. 제3자 코드·폰트·이미지·아이콘·학습 자료와 타인 소유 기여분의 권리 및 라이선스는 보존한다. GitHub 약관상 공개 저장소 열람·포크 등 허용되는 권리와 법률상 허용되는 권리는 제한하지 않는다.

패키지의 `UNLICENSED` 표기는 이 프로젝트 자체에 일반 사용 허락을 부여하지 않는다는 의미이며, 제3자 의존성의 라이선스를 변경하지 않는다.

## 제3자 자료

- CDN으로 사용하는 [Pretendard v1.3.9](https://github.com/orioncactus/pretendard/blob/v1.3.9/LICENSE)는 Kil Hyung-jin 및 해당 권리자의 저작물이며 SIL Open Font License 1.1을 따른다.
- npm 의존성과 Lucide 아이콘 등은 각 패키지의 원래 저작권 고지와 라이선스를 따른다. `package-lock.json`의 제3자 라이선스 표기 및 패키지에 포함된 LICENSE·NOTICE를 보존한다. 개발 도구의 간접 의존성인 sharp/libvips의 LGPL 등도 새 제한의 대상이 아니다.
- 외부 문서·이미지·학습 자료 및 인용·연결된 자료의 권리는 각 권리자에게 있으며, 이 저장소의 고지가 해당 자료의 이용 허락을 대신하지 않는다.
