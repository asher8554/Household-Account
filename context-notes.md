## 현재 PC 기록 push와 Notion 기록 동시 실행 계획

- 사용자가 `현재 PC 기록 push`를 누르면 기존 GitHub data repo push 뒤에 Notion 백업도 이어서 실행한다.
- Notion 백업은 별도 버튼과 같은 `pushCurrentBackupToNotion` 흐름을 사용한다.
- Notion 백업 키는 자동 저장하지 않는다. 이미 저장된 키를 읽어서 사용한다.
- GitHub push 성공 뒤 Notion 백업이 실패하면 GitHub 성공 사실과 Notion 실패 사유를 같은 상태 메시지에 표시한다.
- 사용자가 다른 기기에서도 같은 GitHub Pages 앱에서 데이터를 보기를 원한다고 정정했다.
- 따라서 `asher8554/Household-Account/public/shared-data.json` push 차단과 앱 시작 시 공개 shared-data 자동 로드 제거는 되돌린다.
- 이 방식은 거래 내역 JSON이 공개 GitHub Pages asset과 공개 저장소 파일로 노출되는 tradeoff를 갖는다.

## 현재 PC 기록 push와 Notion 기록 동시 실행 결과

- `current-pc-record-push-service`를 추가해 `현재 PC 기록 push` 사용자 행동을 GitHub push와 Notion 기록 순차 실행으로 묶었다.
- GitHub push가 실패하면 Notion 기록은 실행하지 않는다.
- GitHub push가 성공하고 Notion 기록이 실패하면 GitHub 성공 메시지와 Notion 실패 사유를 함께 보여준다.
- GitHub 기본 대상은 다시 `asher8554/Household-Account`의 `public/shared-data.json`로 설정했다.
- 앱 시작 시 `loadPublishedSharedData`를 다시 실행해 다른 기기에서 GitHub Pages 공유 파일을 IndexedDB에 반영한다.
- UI 문구는 `버튼을 누르면 공유 JSON이 커밋되고 Notion에도 기록됩니다.`로 바꿨다.
- 검증은 전체 Playwright 테스트, production build, npm audit, Worker 타입 검증, route mock 기반 브라우저 smoke로 완료했다.

## CSO 보안 및 모듈 구조 리팩토링 계획

- 감사 단계는 `cso` 규칙에 맞춰 읽기 전용으로 진행한다.
- 코드 수정은 감사 뒤 별도 리팩토링 단계에서 최소 범위로 진행한다.
- 보안 표면은 GitHub Pages 정적 앱, IndexedDB 로컬 데이터, GitHub Contents API 연동, Cloudflare Worker Notion API 연동, 공개 `shared-data.json`을 우선 확인한다.
- 구조 리팩토링은 테스트로 검증 가능한 작은 모듈 결합 지점만 다룬다.

## CSO 보안 및 모듈 구조 리팩토링 결과

- `public/shared-data.json`에 실제 거래 날짜, 금액, 메모가 들어 있고 GitHub Pages asset으로 배포될 수 있음을 확인했다.
- 기존 private GitHub sync 설계 문서는 실제 가계부 데이터를 공개 `public/shared-data.json`에 두지 않는다고 정리했지만, 구현은 앱 시작 시 공개 파일을 자동 반영하고 파일 가져오기 뒤 자동 push를 시도하고 있었다.
- 공개 `public/shared-data.json` 파일을 삭제하고 `.gitignore`에 추가했다.
- 앱 시작 시 `loadPublishedSharedData` 자동 실행을 제거했다.
- 금융기관 파일 가져오기는 IndexedDB 저장까지만 담당하게 하고 GitHub push 의존성을 제거했다.
- GitHub push 기본 대상은 `Household-Account-Data`의 `data/household-account.json`로 바꿨고, 기존 `asher8554/Household-Account/public/shared-data.json` 설정은 서비스와 UI에서 차단한다.
- Notion 백업 키는 `Notion 기록` 실행만으로 저장하지 않고 `키 저장` 버튼에서만 저장한다.
- `public/shared-data.json` 삭제는 새 배포와 이후 커밋의 노출을 막지만, 이미 커밋된 Git 히스토리와 이전 GitHub Pages 배포 캐시의 노출은 별도 히스토리 정리와 재배포가 필요하다.
- 검증은 `npx playwright test`, `npm run build`, Worker 전용 `tsc`, `npm audit --audit-level=high`, Playwright 브라우저 smoke로 완료했다.

# Household Account Context Notes

## 결정 사항

- 목적은 개인이 실제로 쓰는 가계부다. 서비스형 금융앱이 아니다.
- 배포는 GitHub Pages 정적 배포로 한다.
- 저장소는 IndexedDB 로컬 저장이다. 서버, 로그인, 원격 DB는 1차에서 제외한다.
- 백업은 JSON 내보내기/가져오기로 제공한다.
- JSON 가져오기는 병합이 기본이다. 동일 id는 `updatedAt` 최신값을 유지한다.
- 가져온 거래의 카테고리 id가 없거나 깨져 있으면 해당 타입의 기타 카테고리로 연결한다.
- 거래 입력은 간단 입력이다. 날짜, 수입/지출, 금액, 카테고리, 메모만 받는다.
- 기본 카테고리 프리셋을 넣고 사용자가 추가/수정할 수 있게 한다.
- 거래에 쓰인 카테고리는 삭제하지 않고 비활성화한다.
- 전체 데이터 초기화는 `초기화` 입력 확인 후 실행한다.
- 달력 날짜 칸에는 날짜, 총지출, 총수입 표시, 최대 지출 카테고리 1개, 지출 강도 배경색을 보여준다.
- 지출 강도는 이번 달 최대 일지출 대비 비율로 계산한다.
- 1차 UX는 단일 화면이다. 단, `features/*` 모듈로 나누어 나중에 라우팅을 붙일 수 있게 한다.
- CSV 업로드는 2차 첫 기능이다.

## 기술 선택

- Vite + React + TypeScript를 사용한다.
- GitHub Pages 정적 배포에 맞춘다.
- Dexie.js로 IndexedDB 접근을 캡슐화한다.
- Zod로 JSON 백업 파일 검증을 한다.
- Recharts로 카테고리별 차트를 그린다.
- date-fns로 월/일 계산을 처리한다.
- Tailwind CSS로 스타일링한다.

## 구현 원칙

- `DashboardScreen`은 화면 조립만 담당한다.
- 달력, 거래 입력, 카테고리 관리, 백업/복원은 feature 단위로 분리한다.
- IndexedDB 접근은 service/repository 계층에 둔다.
- UI 컴포넌트가 Dexie를 직접 호출하지 않게 한다.
- GitHub Pages 정적 앱이라 민감한 API 키나 금융 API 호출을 넣지 않는다.

## 구현 결과

- Vite + React + TypeScript 기반 정적 앱을 구성했다.
- GitHub Pages 배포용 Actions 워크플로를 추가했다.
- GitHub Actions 빌드일 때 Vite `base`를 저장소명 기준으로 자동 설정한다.
- `features/dashboard`, `features/transactions`, `features/categories`, `features/backup` 모듈로 분리했다.
- Dexie 기반 IndexedDB 테이블은 `categories`, `transactions` 두 개다.
- JSON 가져오기는 Zod 검증 후 병합한다.
- 브라우저 검증에서 첫 화면, 거래 추가, 달력 반영, 날짜 상세 표시, 전체 초기화를 확인했다.
- `npm run build`가 통과했다.

## 다크모드 작업 계획

- 앱은 개인 재무 대시보드라 어두운 화면에서도 숫자, 달력 셀, 입력 폼의 판독성이 우선이다.
- `dark` 클래스를 루트에 붙이고 Tailwind 색상은 CSS 변수로 전환한다.
- 사용자 선택은 `localStorage`에 저장한다.
- 저장값이 없으면 `prefers-color-scheme` 시스템 설정을 따른다.
- 다크모드 토글은 헤더 우측에 둔다.

## 다크모드 구현 결과

- Tailwind 색상 토큰을 CSS 변수 기반으로 전환했다.
- 라이트/다크 색상 토큰, 지출 강도 색상 토큰, 패널 shadow 토큰을 추가했다.
- 앱 초기 로드 스크립트로 저장된 테마나 시스템 테마를 React 렌더 전에 반영한다.
- 헤더 우측에 다크/라이트 토글을 추가했다.
- 토글한 테마는 `household-account-theme` 키로 저장한다.
- 입력 필드, 패널, 달력 셀, 차트 tooltip이 다크모드 색상 토큰을 사용한다.
- `npm run build`가 통과했다.
- 브라우저에서 다크모드 렌더링, 토글 동작, 콘솔 오류 없음을 확인했다.
- GitHub Pages 배포 후 공개 URL에서 다크/라이트 전환과 콘솔 오류 없음을 확인했다.

## 신한카드 가져오기 안내 작업 계획

- 현재 앱은 GitHub Pages + IndexedDB 구조라 신한카드 계정/API 직접 연동은 1차 범위가 아니다.
- 우선 앱 안에 신한카드 CSV/엑셀을 어떻게 준비하는지 안내하는 화면을 추가한다.
- 안내 화면에는 PC 홈페이지, 신한 SOL페이 앱, 다운로드 파일 확인 포인트, 앱에 넣을 예정인 가져오기 단계, 이후 알림 텍스트/Win 알림 수집 로드맵을 포함한다.
- 신한카드 메뉴명은 앱/홈페이지 개편에 따라 달라질 수 있으므로 “검색어 기반 대체 경로”를 함께 안내한다.
- 실제 가져오기는 브라우저 안에서만 처리한다.
- 파일 가져오기는 CSV와 xlsx를 지원한다. 오래된 xls는 보안과 파서 안정성 때문에 CSV 또는 xlsx로 다시 저장해서 쓰도록 안내한다.
- 가져온 신한카드 거래는 기본 지출 `기타` 또는 취소/환급용 수입 `기타수입`으로 연결한다.
- 중복 판정은 날짜, 수입/지출 구분, 금액, 가맹점명 정규화 키로 처리한다.
- 신한카드 알림 텍스트는 붙여넣기 후 미리보기에서 저장한다.

## 신한카드 가져오기 안내 구현 결과

- 앱 상단에 `대시보드`, `신한카드 가져오기` 화면 전환 내비게이션을 추가했다.
- `ShinhanImportGuideScreen`을 추가했다.
- PC 신한카드 홈페이지에서 이용내역 조회 후 엑셀 저장하는 절차를 안내한다.
- 신한 SOL페이 앱에서 이용내역/매출전표를 검색하고 파일 저장 가능 여부를 확인하는 절차를 안내한다.
- 다운로드 후 확인할 컬럼과 취소/중복 처리 기준을 안내한다.
- CSV, TSV, TXT, xlsx 파일을 읽어 신한카드 거래 후보로 변환한다.
- 신한카드 알림 텍스트 붙여넣기를 거래 후보로 변환한다.
- 가져오기 전 미리보기에서 저장 가능, 중복 제외, 오류 상태를 표시한다.
- 저장 가능 거래는 IndexedDB에 저장한다.
- `xlsx` 패키지는 npm audit 고위험 경고가 있어 제거했고, 취약점 없는 `read-excel-file`로 xlsx만 지원한다.
- 다음 순서로 Win 알림 수집 앱을 로드맵에 표시한다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 브라우저 MCP 백엔드 연결이 실패해서 자동 시각 검증은 완료하지 못했다.
- GitHub Pages 워크플로우 `26894704572`가 build와 deploy 모두 성공했다.

## 신한카드 xls 드래그앤드롭 작업 계획

- 신한카드 다운로드 파일이 `.xls` 확장자로 내려오는 상황을 반영한다.
- 보안 취약점이 있는 `xlsx` 패키지는 다시 도입하지 않는다.
- 신한카드 `.xls`가 HTML 표 또는 Spreadsheet XML 형태일 때 브라우저에서 직접 행 데이터로 변환한다.
- 진짜 바이너리 Excel 97 `.xls`는 감지해서 CSV 또는 xlsx 재저장 안내를 표시한다.
- 파일 선택과 드래그앤드롭이 같은 파싱/미리보기 흐름을 사용하게 한다.

## 신한카드 xls 드래그앤드롭 구현 결과

- 파일 입력 accept에 `.xls`와 `application/vnd.ms-excel`을 추가했다.
- 파일 가져오기 패널에 드래그앤드롭 업로드 영역을 추가했다.
- 파일 선택과 드래그앤드롭 모두 `processFile` 흐름을 공유한다.
- `.xls` 내부가 HTML table이면 DOMParser로 행 데이터를 추출한다.
- `.xls` 내부가 HTML table이면 여러 table의 행을 모두 추출한다.
- `.xls` 내부가 Spreadsheet XML이면 네임스페이스가 붙은 Row/Cell 구조도 행 데이터로 추출한다.
- EUC-KR, UTF-8, UTF-16 BOM/charset 기반 텍스트 디코딩을 추가했다.
- Compound Binary `.xls`는 감지 후 CSV 또는 xlsx 재저장 안내를 표시한다.
- `npm run build`가 통과했다.

## 신한카드 바이너리 xls 작업 계획

- 첨부 파일 `Shinhancard_20260604003153.xls`는 OLE Compound File Binary 형식이고 내부에 `Workbook` 스트림이 있다.
- 신한카드 샘플 Workbook은 BIFF8이며 `SST`, `CONTINUE`, `LABELSST`, `NUMBER` 레코드로 거래 표를 구성한다.
- 전체 SheetJS `xlsx` 패키지는 취약점 때문에 도입하지 않는다.
- CFB 컨테이너 추출용 `cfb`만 추가하고, 거래 표 복원에 필요한 최소 BIFF 레코드만 직접 파싱한다.
- 샘플 컬럼은 `이용일자`, `카드구분`, `승인번호`, `이용카드`, `가맹점명`, `업종`, `금액`, `이용구분`, `거래통화`, `최초결제일자`, `취소상태`다.

## 신한카드 바이너리 xls 구현 결과

- `cfb@1.2.2`를 추가했다.
- `shinhan-binary-xls-parser`를 추가해 OLE `Workbook` 스트림을 추출한다.
- BIFF8 `SST`, `CONTINUE`, `LABELSST`, `NUMBER`, `RK`, `MULRK`, `LABEL`, `FORMULA`, `BOOLERR` 레코드를 필요한 범위에서 읽는다.
- 바이너리 `.xls`도 기존 파일 선택과 드래그앤드롭 흐름에서 같은 미리보기로 연결된다.
- 첨부 파일 `Shinhancard_20260604003153.xls`를 빌드 산출물 파서로 읽어 242행과 신한카드 이용내역 헤더 복원을 확인했다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.

## 은행 거래내역 가져오기 작업 계획

- 주거래 은행은 국민은행이고, 추가 은행은 하나은행과 토스뱅크다.
- 신한카드 버튼처럼 국민은행, 하나은행, 토스뱅크 홈페이지 바로가기 버튼을 추가한다.
- 현대카드도 같은 금융기관 바로가기 묶음에 추가한다.
- 기존 가져오기 화면을 신한카드 전용에서 금융기관 가져오기 화면으로 확장한다.
- 은행 거래내역은 카드 승인 파일과 달리 `출금액`, `입금액`, `거래내용`, `적요`, `잔액` 같은 컬럼을 가질 수 있다.
- 출금액이 있으면 지출, 입금액이 있으면 수입으로 변환한다.
- 은행 파일로 저장된 거래도 기존 IndexedDB 거래 테이블에 들어가므로 대시보드 월간 요약, 달력, 날짜 상세에 자동 반영된다.
- 현대카드 파일은 카드 거래내역으로 처리하고, 파일명에 `hyundai` 또는 `현대`가 있으면 `현대카드` 출처를 적용한다.

## 은행 거래내역 가져오기 구현 결과

- 상단 바로가기 버튼에 신한카드, 현대카드, 국민은행, 하나은행, 토스뱅크를 함께 표시한다.
- 앱 내비게이션 라벨을 `금융기관 가져오기`로 확장했다.
- 파일 가져오기 안내 문구를 카드/은행 공통으로 확장했다.
- 은행 파일에서 `출금액`, `출금금액`, `지급액`, `찾으신금액` 계열 컬럼을 지출로 매핑한다.
- 은행 파일에서 `입금액`, `입금금액`, `수입액`, `맡기신금액` 계열 컬럼을 수입으로 매핑한다.
- 은행 파일에서 `거래내용`, `적요`, `거래처`, `받는분`, `보낸분`, `상대예금주` 계열 컬럼을 거래명으로 매핑한다.
- 파일명에 `KB`, `kbstar`, `국민`, `hana`, `keb`, `하나`, `toss`, `토스`가 있으면 국민은행, 하나은행, 토스뱅크 메모 prefix를 자동 적용한다.
- 파일명에 `hyundai` 또는 `현대`가 있으면 현대카드 메모 prefix와 `hyundai-card-file` source를 자동 적용한다.
- 은행 파일 저장 source는 `bank-file`로 기록한다.
- `bank-file` 거래도 기존 `transactions` 테이블에 저장되므로 대시보드 월간 요약, 달력, 날짜 상세 계산에 그대로 포함된다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 로컬 개발 서버 `http://localhost:5173/`가 200 응답을 반환했다.
- Node REPL 환경에 Playwright 모듈이 없어 자동 렌더 상호작용 검증은 진행하지 못했다.
- GitHub Pages 워크플로우 `26896916881`이 build와 deploy 모두 성공했다.
- 현대카드 변경 배포 워크플로우 `26897625392`가 build와 deploy 모두 성공했고 공개 URL이 200 응답을 반환했다.

## 카드 데이터 로드 상태 작업 계획

- 현대카드 첨부 파일 `hyundaicard_20260604.xls`는 바이너리 Excel이 아니라 HTML 기반 xls다.
- 해당 파일은 `<html>` 태그가 파일 앞부분 1000자 이후에 있어 기존 HTML 감지 범위에서 빠졌다.
- 현대카드는 날짜 헤더로 `승인일`을 쓰므로 기존 `승인일자` alias만으로는 날짜 컬럼을 찾지 못한다.
- 신한카드와 현대카드만 주기적으로 불러올 카드로 보고, 각 카드의 마지막 파일 로드 시각을 IndexedDB에 별도 저장한다.
- 파일을 성공적으로 읽고 미리보기를 만든 시점을 로드 시각으로 기록한다. 중복만 있는 파일도 로드 상태를 갱신한다.
- 마지막 로드 후 15일 이상 지났거나 기록이 없으면 `데이터 로드 필요` 상태를 화면에서 바로 보이게 한다.

## 카드 데이터 로드 상태 구현 결과

- 현대카드 HTML 기반 xls 감지 범위를 파일 앞 20,000자로 확장했다.
- 현대카드 날짜 헤더 `승인일`과 카드 식별용 `카드종류` alias를 추가했다.
- `cardImportStatuses` IndexedDB 테이블을 추가해 신한카드와 현대카드의 마지막 파일 로드 시각, 파일명, 후보/저장 가능/중복/오류 건수를 저장한다.
- 금융기관 가져오기 화면에 `카드 데이터 로드 상태` 패널을 추가했다.
- 로드 기록이 없거나 마지막 로드 후 15일 이상 지나면 `데이터 로드 필요` 상태를 표시한다.
- 전체 데이터 초기화 시 카드 로드 상태도 함께 초기화한다.
- 첨부 현대카드 파일은 HTML 기반 xls로 감지되며 표 44행, 헤더 11개를 확인했다.
- 현대카드 날짜 예시 `2026년 05월 27일`이 기존 날짜 파서와 맞는 것을 확인했다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 로컬 개발 서버 `http://localhost:5173/`가 200 응답을 반환했다.
- Node REPL 환경에 Playwright 모듈이 없어 자동 렌더 상호작용 검증은 진행하지 못했다.
- GitHub Pages 워크플로우 `26898515064`가 build와 deploy 모두 성공했고 공개 URL이 200 응답을 반환했다.

## 신한카드 거래일 xls 보완 작업 계획

- 첨부 파일 `Shinhancard_20260604112934.xls`는 OLE Compound File Binary 형식이고 내부 `Workbook` 스트림이 있다.
- 이 파일은 BIFF codepage 1200을 쓰지만 ASCII 날짜와 승인번호는 compressed string으로 저장되어 기존 단일바이트 디코딩 경로가 맞다.
- 기존 파서가 230행을 복원했지만 헤더가 `거래일`이라 날짜 alias `이용일자`, `거래일자`, `거래일시`에 걸리지 않았다.
- 헤더는 `거래일`, `카드구분`, `이용카드`, `가맹점명`, `승인번호`, `금액`, `매입구분`, `이용구분`, `거래통화`, `해외이용금액`, `취소상태` 순서다.
- 카드 파일은 승인번호가 있으면 중복 키에 승인번호를 포함한다. 같은 날짜, 같은 금액, 같은 가맹점이어도 승인번호가 다르면 별도 거래로 유지한다.
- 같은 중복 키가 여러 번 나오면 미리보기에는 대표 중복 후보 1개만 표시한다.

## 신한카드 거래일 xls 보완 구현 결과

- 신한카드 바이너리 xls 날짜 alias에 `거래일`을 추가했다.
- 첨부 신한카드 파일에서 BIFF 레코드 2,877개, worksheet 행 230개, codepage 1200, shared string 516개를 확인했다.
- 첨부 신한카드 파일의 헤더 `거래일`, `금액`, `가맹점명` 구조를 확인했다.
- 신한카드 파일의 첫 거래일 문자열이 `2026.04.03 18:33` 형태로 복원되는 것을 확인했다.
- 카드 승인번호가 있으면 중복 키에 `approval` 값을 붙여 같은 날짜, 금액, 가맹점이라도 승인번호가 다른 거래를 보존한다.
- 동일 중복 키가 여러 번 나오면 미리보기에서 대표 중복 후보 1개만 남기고 사유에 묶은 건수를 표시한다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 로컬 개발 서버 `http://localhost:5173/`가 200 응답을 반환했다.
- Node REPL 환경에 Playwright 모듈이 없어 자동 렌더 상호작용 검증은 진행하지 못했다.
- GitHub Pages 워크플로우 `26926849198`이 build와 deploy 모두 성공했고 공개 URL이 200 응답을 반환했다.

## 날짜 상세 카테고리 편집 작업 계획

- 요청 범위는 현대카드 포함 기존 거래가 `기타`로 들어온 뒤 사용처별로 카테고리를 재분류하는 흐름이다.
- 기본 카테고리에 `식비`, `카페`, `교통`, `장보기`, `생활용품`, `의료`, `기타`가 이미 있으므로 새 카테고리 프리셋은 추가하지 않는다.
- 날짜 상세에서 거래 행을 눌러 전체 메모와 출처, 저장 시각을 펼쳐 볼 수 있게 한다.
- 지출 거래의 카테고리 선택을 날짜 상세에 노출한다.
- 카테고리를 바꾸면 같은 사용처로 판정되는 기존 거래 전체의 `categoryId`를 같은 값으로 업데이트한다.
- 사용처 판정은 카드 import 메모의 기관명, 상태, 카드명, 승인번호 같은 부가 정보를 제거한 정규화 값을 사용한다.
- 이번 작업은 기존 거래 일괄 변경까지 구현한다. 향후 가져오는 새 거래의 자동 분류 규칙 저장은 별도 기능으로 남긴다.

## 날짜 상세 카테고리 편집 구현 결과

- `merchant-key.ts`를 추가해 카드사명, 상태, 카드명, 승인번호를 제거한 사용처 비교 키를 만든다.
- 신한카드 import 중복 판정의 기존 `normalizeMatchText`도 같은 사용처 키 함수를 재사용하게 했다.
- 날짜 상세 거래 행에 펼침 버튼과 메모 클릭 펼침을 추가했다.
- 펼친 영역은 전체 메모, 출처, 저장 시각, 수정 시각을 줄바꿈 가능한 텍스트로 표시한다.
- 날짜 상세 거래 행에 카테고리 select를 추가했다.
- 카테고리 변경 시 선택한 거래와 같은 타입, 같은 사용처 키를 가진 기존 거래 전체의 `categoryId`와 `updatedAt`을 갱신한다.
- `[현대카드] 우리아이약국 / 상태 승인 / 카드 ZERO / 승인번호 1234`, `[신한카드] 우리아이약국 / 상태 승인 / 카드 Deep / 승인번호 9999`, `우리아이약국`이 모두 `우리아이약국` 키로 정규화되는 것을 임시 컴파일 검증으로 확인했다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 로컬 개발 서버 `http://127.0.0.1:5173/`가 200 응답을 반환했다.
- Playwright 패키지가 없고 gstack browse 런타임 경로도 없어 자동 브라우저 상호작용 검증은 진행하지 못했다.

## 기존 중복 거래 정리 작업 계획

- 사용자가 확인한 문제는 카테고리 동시 변경이 아니라 이미 저장된 동일 거래 2건이 날짜 상세에 함께 남아 있는 것이다.
- 이전 변경은 같은 사용처의 카테고리를 함께 바꾸지만 기존 중복 row를 삭제하지 않는다.
- 스크린샷의 예시는 같은 날짜, 같은 금액, 같은 사용처 `쿠팡`, 같은 승인번호 `09366385`인 완전 중복이다.
- 중복 기준은 기존 import 안내와 맞춰 날짜, 수입/지출 구분, 금액, 정규화 사용처를 사용하고 승인번호가 있으면 승인번호를 추가한다.
- 중복 그룹에서는 가장 오래된 거래 id를 남겨 안정성을 유지하고, 카테고리는 가장 최근 수정된 거래의 값을 보존한다.
- 앱 진입 시 기존 저장분을 한 번 정리하고, 파일 import 저장 뒤에도 한 번 정리한다.

## 기존 중복 거래 정리 구현 결과

- `merchant-key.ts`에 `createTransactionDuplicateKey`와 `extractTransactionApprovalNo`를 추가했다.
- `removeDuplicateTransactions`는 중복 그룹에서 가장 오래된 거래를 남기고 나머지 id를 삭제한다.
- 남는 거래의 카테고리는 가장 최근 수정된 중복 거래의 카테고리로 갱신한다.
- `DashboardScreen` 진입 시 기존 저장분 중복 정리를 실행한다.
- 파일 import 저장 뒤에도 중복 정리를 실행한다.
- 스크린샷 예시 `[신한카드] 쿠팡 / 상태 신용 / 카드 신용 / 승인번호 09366385`는 `expense|2026-04-01|23620|쿠팡|approval:09366385` 중복 키로 검증됐다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 로컬 개발 서버 `http://127.0.0.1:5173/`가 200 응답을 반환했다.
- GitHub Pages 워크플로우 `26930870577`이 build와 deploy 모두 성공했다.

## 승인번호 우선 중복 거래 정리 작업 계획

- 사용자가 확인한 추가 문제는 같은 승인번호 `18765669`인데 사용처 메모가 `02월 천안역필하우 0112동2402호`와 `아파트관리비`로 달라 중복 삭제가 되지 않은 것이다.
- 기존 중복 키는 승인번호가 있어도 사용처 키를 포함했기 때문에 같은 승인번호의 메모 차이를 별도 거래로 보존했다.
- 카드 승인번호가 있으면 사용처 이름보다 승인번호를 우선한다.
- 승인번호가 있는 거래는 날짜, 구분, 금액, 승인번호로 중복 키를 만들고 사용처는 비교하지 않는다.
- 승인번호가 없는 거래만 기존처럼 날짜, 구분, 금액, 정규화 사용처로 중복 판정한다.
- 기존 저장분 정리와 가져오기 미리보기 중복 판정이 같은 승인번호 우선 기준을 사용해야 한다.

## 승인번호 우선 중복 거래 정리 구현 결과

- `createTransactionDuplicateKey`는 승인번호가 있으면 사용처 키를 만들지 않고 `type|date|amount|approval:{approvalNo}`만 사용한다.
- 승인번호가 없는 거래는 기존처럼 `type|date|amount|merchantKey`를 사용한다.
- 가져오기 미리보기의 기존 거래 키와 신규 후보 키도 같은 승인번호 우선 기준으로 맞췄다.
- 스크린샷 예시 두 거래는 모두 `expense|2026-03-25|283240|approval:18765669` 키로 검증됐다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- GitHub Pages 워크플로우 `26931609963`이 build와 deploy 모두 성공했고 공개 URL이 200 응답을 반환했다.

## 카테고리별 지출 상세 수정 작업 계획

- 사용자는 `카테고리별 지출` 차트에서 각 카테고리 금액을 막대 옆에 바로 보고 싶어 한다.
- 사용자는 그래프 막대를 클릭해 해당 카테고리의 이번 달 거래 목록을 바로 열고 카테고리를 수정하고 싶어 한다.
- 날짜 상세에 이미 전체 메모 펼침, 카테고리 select, 삭제 버튼이 있으므로 거래 행 UI를 공통 컴포넌트로 분리한다.
- 공통 거래 목록은 날짜 상세과 카테고리별 상세 모두에서 같은 `updateSameMerchantCategory` 동작을 사용한다.
- 카테고리 차트는 월간 지출 거래만 대상으로 하며, 선택된 카테고리의 월간 지출 거래를 날짜 최신순으로 보여준다.

## 카테고리별 지출 상세 수정 구현 결과

- `TransactionList`를 추가해 거래 행 펼침, 카테고리 select, 삭제 버튼을 날짜 상세과 카테고리 상세에서 재사용한다.
- 카테고리별 지출 막대 오른쪽에 금액 라벨을 표시한다.
- 막대를 클릭하면 선택된 카테고리명, 총액, 이번 달 해당 카테고리 거래 목록을 차트 아래에 표시한다.
- 카테고리 상세 거래 목록은 날짜를 함께 보여주며, 카테고리 변경 시 기존 `updateSameMerchantCategory`를 사용한다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 로컬 개발 서버 `http://127.0.0.1:5173/`가 200 응답을 반환했다.
- Playwright 패키지가 없어 자동 브라우저 클릭 검증은 진행하지 못했다.

## Playwright 설치와 현대카드 가져오기 브라우저 검증 작업 계획

- 사용자가 Browser plugin 도구와 Playwright 패키지 설치 후 검증과 push를 요청했다.
- `tool_search`와 설치 후보 목록을 확인했지만 Browser plugin 자체는 현재 세션에서 설치 가능한 도구로 나오지 않았다.
- Playwright는 repo dev dependency로 설치하고, Chromium 브라우저까지 설치한 뒤 실제 파일 가져오기 UI에서 `hyundaicard_20260604.xls`를 업로드해 오류 0건을 검증한다.
- 검증 스크립트와 스크린샷은 repo에 커밋하지 않고 임시 경로에 둔다.

## Playwright 설치와 현대카드 가져오기 브라우저 검증 결과

- `@playwright/test`를 dev dependency로 추가하고 `npx playwright install chromium`으로 Chromium 브라우저를 설치했다.
- `npx playwright --version`은 `Version 1.60.0`을 반환했다.
- 데스크톱 1440x1100에서 `hyundaicard_20260604.xls` 업로드 후 `hyundaicard_20260604.xls에서 39건을 읽었습니다.`, `저장 가능 0`, `중복 제외 39`, `오류 0`을 확인했다.
- 모바일 390x844에서도 같은 파일 업로드 후 `오류 0`과 `중복 제외 39`를 확인했다.
- Playwright 스크린샷은 임시 경로 `C:/Users/asher/AppData/Local/Temp/household-hyundai-import-playwright.png`, `C:/Users/asher/AppData/Local/Temp/household-hyundai-import-playwright-mobile.png`에 저장했다.
- 콘솔에는 import 흐름 오류는 없고, 첫 대시보드 렌더 시 Recharts 차트 크기 warning 2건만 기록됐다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 로컬 개발 서버 `http://127.0.0.1:5173/`가 200 응답을 반환했다.
- GitHub Pages 워크플로우 `26940960233`이 build와 deploy 모두 성공했다.
- push 전에 원격에 `data: shared-data 2026-06-04` 커밋 3개가 먼저 올라와 있어 `git fetch` 후 `git rebase origin/main`으로 사용자 공유 데이터 커밋을 보존했다.
- GitHub Pages 워크플로우 `26940413071`이 build와 deploy 모두 성공했고 공개 앱 URL과 `shared-data.json` URL이 200 응답을 반환했다.
- GitHub Pages 워크플로우 `26938893316`이 build와 deploy 모두 성공했고 공개 앱 URL과 `shared-data.json` URL이 200 응답을 반환했다.

## 현대카드 xls 오류 2건 개선 작업 계획

- 샘플 파일 `C:/Users/asher/Downloads/hyundaicard_20260604.xls`를 실제 import 파서로 재현한다.
- 기존 경험상 현대카드 `.xls`는 BIFF 바이너리가 아니라 HTML table 기반일 수 있으므로 파일 구조를 먼저 확인한다.
- 오류 2건의 사유와 원본 행을 확인한 뒤, 거래가 아닌 요약/안내 행이면 후보에서 제외하고 실제 거래 누락이면 컬럼/값 정규화를 보강한다.

## 현대카드 xls 오류 2건 개선 구현 결과

- 샘플 파일은 HTML table 기반 `.xls`다.
- 오류 2건은 실제 거래가 아니라 하단 요약 행 `국내 일시불 소계 39건`, `총 합계 소계 39건`이었다.
- 해당 행은 날짜가 `-`라서 import 미리보기에서 `날짜 없음` 오류로 잡혔다.
- 날짜가 없고 `소계 N건` 형태인 행을 요약 행으로 보고 import 후보에서 제외하도록 `isSummaryRow`를 보강했다.
- 샘플 파일 재파싱 결과는 총 39건, 정상 39건, 오류 0건이다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 로컬 개발 서버 `http://127.0.0.1:5173/`가 200 응답을 반환했다.
- Playwright 패키지가 없어 자동 브라우저 클릭 검증은 진행하지 못했다.
- GitHub Pages 워크플로우 `26932821031`이 build와 deploy 모두 성공했고 공개 URL이 200 응답을 반환했다.
- GitHub Pages 워크플로우 `26932109410`이 build와 deploy 모두 성공했고 공개 URL이 200 응답을 반환했다.

## 카테고리별 지출 원형 분배 차트 작업 계획

- 기존 카테고리별 지출 막대 차트를 원형 분배 차트로 바꾼다.
- 월간 총 지출 금액은 원형 차트 중앙에 표시한다.
- 카테고리별 금액과 비율은 차트 옆 범례에 표시한다.
- 조각이나 범례를 클릭하면 기존처럼 해당 카테고리의 월간 거래 상세 목록을 아래에 보여준다.
- 기존 `TransactionList` 기반 카테고리 수정 흐름은 유지한다.

## 카테고리별 지출 원형 분배 차트 구현 결과

- `CategoryExpenseChart`를 `BarChart` 기반 막대 그래프에서 `PieChart` 기반 도넛형 원형 분배 차트로 변경했다.
- 원형 차트 중앙과 범례 상단에 이번 달 총 지출 금액을 표시한다.
- 범례에는 각 카테고리 이름, 지출 금액, 총액 대비 비율을 표시한다.
- 차트 조각과 범례 항목 모두 클릭 가능하며, 선택 시 기존 월간 카테고리 상세 거래 목록이 아래에 열린다.
- 기존 `TransactionList` 기반 카테고리 변경과 삭제 흐름은 유지했다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 로컬 개발 서버 `http://127.0.0.1:5173/`가 200 응답을 반환했다.
- Playwright 패키지가 없어 자동 브라우저 클릭 검증은 진행하지 못했다.

## 카테고리 색상 Random 버튼 작업 계획

- 카테고리 추가 폼의 색상 input 옆에 `Random` 버튼을 추가한다.
- 버튼은 form submit을 일으키지 않도록 `type="button"`으로 둔다.
- 랜덤 색상은 HSL 기반으로 만들고 hex 문자열로 변환해 기존 color input 값에 바로 넣는다.
- 기존 카테고리 수정 UI는 요청 범위를 넘기지 않기 위해 그대로 둔다.

## 카테고리 색상 Random 버튼 구현 결과

- 카테고리 추가 폼의 color input 옆에 `Random` 버튼을 추가했다.
- Random 버튼은 `Shuffle` 아이콘과 텍스트를 같이 표시하고 form submit을 일으키지 않는다.
- HSL 기반 랜덤 색상을 hex로 변환해 `newColor`에 반영한다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 로컬 개발 서버 `http://127.0.0.1:5173/`가 200 응답을 반환했다.
- Playwright 패키지가 없어 자동 브라우저 클릭 검증은 진행하지 못했다.
- GitHub Pages 워크플로우 `26932381128`이 build와 deploy 모두 성공했고 공개 URL이 200 응답을 반환했다.

## 카테고리별 지출 월 이동 버튼 작업 계획

- 카테고리별 지출 차트에서도 월간 달력처럼 이전달, 이번달, 다음달 이동을 할 수 있게 한다.
- 별도 월 상태를 만들지 않고 `DashboardScreen`의 `currentMonth`를 공유한다.
- 차트 헤더의 eyebrow는 현재 선택 월을 `2026년 6월` 형식으로 표시한다.
- 버튼은 `SectionPanel`의 `action` 영역에 넣어 차트 본문을 밀지 않게 한다.

## 카테고리별 지출 월 이동 버튼 구현 결과

- `CategoryExpenseChart`에 `monthDate`, 이전달, 이번달, 다음달 콜백 props를 추가했다.
- 차트 헤더 오른쪽에 달력과 같은 이전달, 이번달, 다음달 버튼을 추가했다.
- `DashboardScreen`의 월 이동 함수를 달력과 차트가 함께 쓰도록 정리했다.
- 차트 eyebrow는 선택된 월을 `2026년 6월` 형식으로 표시한다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 로컬 개발 서버 `http://127.0.0.1:5173/`가 200 응답을 반환했다.
- Playwright 패키지가 없어 자동 브라우저 클릭 검증은 진행하지 못했다.
- GitHub Pages 워크플로우 `26933131676`이 build와 deploy 모두 성공했고 공개 URL이 200 응답을 반환했다.

## 공개 Pages 공유 데이터 작업 계획

- 사용자가 1번 공개 공유 방식을 선택했으므로 거래 내역 JSON이 Pages에 공개 배포되는 것을 전제로 한다.
- 공유 데이터 파일은 Vite의 정적 파일 경로인 `public/shared-data.json`에 둔다.
- 앱 시작 시 `${BASE_URL}shared-data.json`을 no-cache로 읽고, 유효한 백업 JSON이면 IndexedDB에 반영한다.
- 공유 데이터는 PC에서 만든 공개 snapshot을 source of truth로 본다.
- 다만 PC에서 아직 push하지 않은 최신 로컬 거래가 있으면 오래된 공유 데이터로 덮어쓰지 않는다.
- 백업 패널에는 repo에 반영하기 쉬운 파일명인 `shared-data.json`으로 내보내는 버튼을 추가한다.

## 공개 Pages 공유 데이터 구현 결과

- `public/shared-data.json`을 추가해 GitHub Pages에 공유 snapshot을 함께 배포할 수 있게 했다.
- 앱 시작 시 `shared-data.json`을 no-cache로 읽고 유효한 백업 JSON이면 IndexedDB에 교체 반영한다.
- 공유 데이터 파일이 비어 있으면 기존 로컬 데이터는 건드리지 않는다.
- 공유 데이터보다 최신 로컬 거래가 있으면 오래된 공개 snapshot으로 덮어쓰지 않는다.
- 백업 패널에 `공유용 내보내기` 버튼을 추가해 `shared-data.json` 파일명으로 현재 데이터를 내려받을 수 있게 했다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 로컬 개발 서버 `http://127.0.0.1:5173/`와 `http://127.0.0.1:5173/shared-data.json`가 200 응답을 반환했다.
- Playwright 패키지가 없어 자동 브라우저 클릭 검증은 진행하지 못했다.
- GitHub Pages 워크플로우 `26936941156`이 build와 deploy 모두 성공했고 공개 앱 URL과 `shared-data.json` URL이 200 응답을 반환했다.

## 기타 상세 단일 항목 카테고리 변경 작업 계획

- 사용자는 카테고리별 지출에서 `기타` 상세 수정 시 같은 사용처 전체가 아니라 딱 한 항목만 바꾸는 선택지를 원한다.
- 기존 기본 동작인 같은 사용처 전체 변경은 유지한다.
- `기타` 상세 거래 목록에만 `한 항목만 변경` 체크박스를 노출한다.
- 체크박스가 켜진 거래는 새 단일 거래 업데이트 함수를 호출하고, 꺼진 거래는 기존 `updateSameMerchantCategory`를 호출한다.

## 기타 상세 단일 항목 카테고리 변경 구현 결과

- `updateTransactionCategory`를 추가해 단일 거래 1건만 카테고리를 변경할 수 있게 했다.
- `TransactionList`에 `한 항목만 변경` 체크박스를 추가하고, 체크된 거래는 단일 변경 콜백을 호출하게 했다.
- 카테고리별 지출의 선택 카테고리가 `expense-other` 또는 `기타`일 때만 체크박스가 보이게 했다.
- 체크박스를 켜지 않으면 기존처럼 같은 사용처 전체가 `updateSameMerchantCategory`로 변경된다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 로컬 개발 서버 `http://127.0.0.1:5173/`가 200 응답을 반환했다.
- Playwright 패키지가 없어 자동 브라우저 클릭 검증은 진행하지 못했다.
- GitHub Pages 워크플로우 `26937249490`이 build와 deploy 모두 성공했고 공개 URL이 200 응답을 반환했다.

## 파일 가져오기 후 GitHub 공유 데이터 push 작업 계획

- 브라우저는 `git push` 명령을 직접 실행할 수 없으므로 GitHub Contents API로 `public/shared-data.json` 파일을 커밋한다.
- GitHub 토큰은 앱 코드나 repo에 넣지 않고 사용자가 입력한 값을 PC 브라우저 localStorage에만 저장한다.
- 파일 가져오기 저장 버튼을 누르면 기존 IndexedDB 저장을 먼저 끝내고, 이후 전체 백업 데이터를 만들어 GitHub에 공유 snapshot을 커밋한다.
- GitHub push가 실패해도 가져오기 저장 결과는 롤백하지 않는다.
- 핸드폰은 Pages 앱 시작 시 기존 `shared-data.json` 자동 로드 기능으로 최신 데이터를 확인한다.

## 파일 가져오기 후 GitHub 공유 데이터 push 구현 결과

- `github-shared-data-service`를 추가해 현재 IndexedDB 백업 데이터를 GitHub Contents API로 `public/shared-data.json`에 커밋하게 했다.
- `GitHubSharedDataPanel`을 추가해 owner, repository, branch, file path, GitHub token을 PC 브라우저 localStorage에 저장할 수 있게 했다.
- 금융기관 파일 가져오기 저장 완료 후 `pushCurrentSharedDataToGitHub`를 호출하도록 연결했다.
- GitHub 토큰이 없거나 push가 실패해도 저장된 파일 거래는 유지하고 상태 메시지에 실패 사유를 표시한다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 로컬 개발 서버 `http://127.0.0.1:5173/`와 `http://127.0.0.1:5173/shared-data.json`가 200 응답을 반환했다.
- Playwright 패키지가 없어 자동 브라우저 클릭 검증은 진행하지 못했다.
- 실제 GitHub API 커밋 호출은 사용자 GitHub 토큰이 필요한 흐름이라 자동 실행하지 않았다.
- GitHub Pages 워크플로우 `26937684593`이 build와 deploy 모두 성공했고 공개 앱 URL과 `shared-data.json` URL이 200 응답을 반환했다.

## 현재 PC 기록 수동 공유 push 작업 계획

- 공개 Pages의 `shared-data.json`은 현재 빈 초기 파일이라 핸드폰에서 기록이 보이지 않는다.
- PC 화면에 보이는 기록은 PC 브라우저 IndexedDB 안에 있으므로 GitHub에 한 번 push해야 핸드폰에서 볼 수 있다.
- 기존 구현은 파일 가져오기 저장 후 자동 push만 있어서 이미 저장된 PC 기록을 바로 push하는 버튼이 없다.
- GitHub 공유 설정 패널에 `현재 PC 기록 push` 버튼을 추가해 현재 IndexedDB 전체 백업을 `public/shared-data.json`으로 커밋하게 한다.
- push 성공 메시지에는 GitHub Pages 배포 반영까지 잠시 기다린 뒤 핸드폰에서 새로고침하라는 안내를 포함한다.

## 현재 PC 기록 수동 공유 push 구현 결과

- 공개 `shared-data.json`이 빈 초기 파일임을 HTTP 200 응답 내용으로 확인했다.
- `GitHubSharedDataPanel`에 `현재 PC 기록 push` 버튼을 추가했다.
- 버튼은 저장된 GitHub 설정을 사용해 현재 PC IndexedDB 백업 데이터를 `public/shared-data.json`으로 커밋한다.
- 토큰이 없는 상태에서는 버튼을 비활성화한다.
- 성공 메시지에 Pages 배포가 끝난 뒤 핸드폰에서 새로고침하라는 안내를 넣었다.
- `npm run build`가 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 로컬 개발 서버 `http://127.0.0.1:5173/`와 `http://127.0.0.1:5173/shared-data.json`가 200 응답을 반환했다.
- Playwright 패키지가 없어 자동 브라우저 클릭 검증은 진행하지 못했다.
- GitHub Pages 워크플로우 `26938160716`이 build와 deploy 모두 성공했고 공개 앱 URL과 `shared-data.json` URL이 200 응답을 반환했다.
- 배포 직후 `shared-data.json`은 여전히 빈 초기 파일이므로 PC 화면에서 `현재 PC 기록 push` 버튼을 눌러야 실제 거래가 공개 파일로 커밋된다.

## 신한카드 바이너리 xls 오류 개선 작업 계획

- 샘플 파일 `C:/Users/asher/Downloads/Shinhancard_20260604112934.xls`는 OLE Compound BIFF `.xls` 파일이다.
- 현재 실제 파서 기준 결과는 총 229건, 정상 148건, 오류 81건이며 오류 81건은 모두 `날짜 없음`이다.
- 오류 구간은 공유 문자열이 깨진 뒤 한 셀이 뒤쪽 BIFF 데이터를 과하게 삼키면서 날짜 셀이 비는 형태로 나타난다.
- 원인은 SST 뒤의 CONTINUE 레코드를 단순 연결해 읽어서, CONTINUE 레코드 시작 바이트인 문자열 옵션 플래그를 텍스트로 잘못 해석하는 것이다.
- BIFF SST 문자열을 레코드 경계 기준으로 읽고 문자열 본문이 CONTINUE로 넘어갈 때 새 옵션 플래그를 소비하도록 수정한다.

## 신한카드 바이너리 xls 오류 개선 구현 결과

- `shinhan-binary-xls-parser`에서 SST와 CONTINUE 레코드를 단순 연결하지 않고 `SstReader`로 레코드 경계를 보존해 읽도록 바꿨다.
- 공유 문자열 본문이 CONTINUE 레코드로 넘어갈 때 CONTINUE 시작의 문자열 옵션 플래그를 소비하고, 그 뒤 텍스트 바이트만 디코딩한다.
- 신한카드 파일 하단의 `총 228건 11806663` 합계 행은 실제 거래가 아니므로 후보에서 제외했다.
- 샘플 파일 재파싱 결과는 총 228건, 정상 228건, 오류 0건이다.
- 테스트 스크립트는 없고, `npm run build`가 타입 체크와 프로덕션 빌드를 모두 통과했다.
- `npm audit --audit-level=high`가 취약점 0건으로 통과했다.
- 로컬 개발 서버 `http://127.0.0.1:5173/`가 200 응답을 반환했다.
- Playwright 패키지가 없어 자동 브라우저 클릭 검증은 진행하지 못했다.

## 연간 소비 추세 페이지 작업 계획

- 대시보드 옆 최상위 화면으로 `연간 소비 추세`를 추가한다.
- 새 화면은 기존 IndexedDB 거래 목록만 읽고 저장 동작은 추가하지 않는다.
- 소비 추세는 지출 거래만 월별로 합산해 막대 차트로 보여준다.
- 수입과 순액은 월별 상세 목록 보조 값으로만 표시한다.
- 현재 연도 기준으로 시작하고, 이전 연도, 올해, 다음 연도 이동을 제공한다.
- 검증은 `npm run build`와 Playwright 렌더 확인으로 한다.

## 연간 소비 추세 페이지 구현 결과

- `app-navigation`에 `annual-trend` 화면을 추가해 대시보드 옆 버튼으로 전환하게 했다.
- `AnnualTrendScreen`을 추가해 연간 지출, 소비 월평균, 최고 지출월, 연간 순액을 표시한다.
- 월별 소비 추세는 지출 거래만 월별 합산한 막대 차트로 보여준다.
- 월별 상세 목록에는 지출, 전월 대비 증감, 수입, 순액, 거래 수를 표시한다.
- 연도 이동 버튼과 올해 복귀 버튼을 추가했다.
- Recharts 초기 크기 경고를 막기 위해 월간/연간 차트에 초기 크기를 지정했다.
- `npm run build`가 통과했다.
- Playwright로 `http://127.0.0.1:5175/`에서 대시보드 버튼 확인, 연간 소비 추세 전환, 이전 연도 이동, 올해 복귀, 데스크톱/모바일 스크린샷, 콘솔 오류 없음을 확인했다.

## 연간 카테고리별 소비 변화 작업 계획

- 승인된 방식은 `누적 막대 + 요약 목록`이다.
- 기존 `연간 소비 추세` 화면 안에 새 섹션을 추가한다.
- 월별 카테고리 소비 변화는 지출 거래만 집계한다.
- 카테고리가 많으면 연간 지출 상위 8개를 개별 표시하고 나머지는 `기타 묶음`으로 합친다.
- 요약 목록에는 연간 총액, 연간 비율, 최고 지출월, 최근 3개월 증감을 표시한다.
- 집계 로직은 화면 컴포넌트에서 분리해 Playwright unit test로 검증한다.

## 연간 카테고리별 소비 변화 구현 결과

- `annual-trend-calculations`를 추가해 연간 월별 집계와 카테고리별 집계를 화면 컴포넌트에서 분리했다.
- `buildAnnualCategoryTrends`는 지출 거래만 집계하고, 상위 8개 카테고리 외 항목을 `기타 묶음`으로 합친다.
- `AnnualTrendScreen`에 `카테고리별 소비 변화` 섹션을 추가했다.
- 새 섹션은 월별 카테고리 누적 막대 차트와 카테고리별 요약 목록을 표시한다.
- 요약 목록은 연간 총액, 연간 비율, 최고 지출월, 최근 3개월 증감을 표시한다.
- Playwright unit test를 먼저 작성했고, 구현 전에는 모듈 없음으로 실패했다.
- `npx playwright test tests/annual-trend-calculations.spec.ts`가 1개 테스트 통과로 완료됐다.
- `npm run build`가 타입 체크와 프로덕션 빌드를 통과했다.
- Playwright 렌더 검증에서 연간 소비 추세 진입, 새 섹션 표시, 식비/교통 요약, 최고 지출월, 최근 기간 대비 문구, 콘솔 오류 없음, 데스크톱/모바일 스크린샷을 확인했다.

## iPhone private GitHub API 동기화 설계 결정

- 목표는 iPhone에서 거래를 직접 입력하고 GitHub에 수동 push까지 하는 것이다.
- 동기화 방식은 공개 `public/shared-data.json`이 아니라 별도 private GitHub repo의 JSON 파일을 GitHub Contents API로 읽고 쓰는 방식으로 확정했다.
- push 방식은 자동 push가 아니라 사용자가 누르는 수동 push로 확정했다.
- token은 fine-grained personal access token을 사용하고, 브라우저에 저장하는 1차 구현으로 확정했다.
- token 권한은 데이터 private repo 하나의 `Contents: Read and write`로 제한한다.
- 데이터 파일 기본 경로는 `data/household-account.json`로 계획한다.
- 병합 정책은 같은 id에서 `updatedAt` 최신 승, 다른 id는 유지, 삭제는 tombstone으로 유지하는 방식으로 잡았다.
- 삭제 tombstone은 필수다. tombstone이 없으면 한 기기에서 삭제한 거래가 다른 기기의 병합 과정에서 다시 살아날 수 있다.
- 앱은 기존 GitHub Pages 정적 배포를 유지하되, private 데이터는 인증된 API를 통해서만 접근한다.
- iPhone 입력을 1급 워크플로로 지원하므로 PWA manifest, Apple touch icon, standalone meta, safe-area CSS, iPhone viewport QA가 필요하다.
- 설계 문서는 `docs/superpowers/specs/2026-06-07-private-github-sync-design.md`에 기록했다.

## Notion 금융기관 CMS 설계 결정

- 사용자의 의도는 거래 데이터 저장소를 Notion으로 옮기는 것이 아니라, 금융기관 안내와 가져오기 설정 정보를 Notion에서 관리하고 GitHub Pages UI가 이를 기준으로 화면을 구성하는 것이다.
- Notion에는 안내 문구와 읽기 전용 파서 힌트를 둔다. 예를 들면 기관명, 홈페이지 URL, 지원 파일 형식, 필수 컬럼, 날짜/금액/가맹점 후보 컬럼명, PC와 모바일 안내 단계, 주의사항이다.
- 금액 부호, 승인 취소, 환불, 중복 판단 같은 위험한 파서 규칙은 Notion에 두지 않고 코드에 둔다.
- iPhone에서도 최신 Notion 기준 UI를 보여야 하므로 GitHub Actions 빌드타임 JSON보다 Worker 경유 실시간 조회를 우선 설계로 잡았다.
- Notion token은 iPhone 브라우저에 입력하거나 저장하지 않는다. Worker secret에 저장하고, Worker는 정제된 공개 기관 설정 JSON만 반환한다.
- GitHub Pages UI는 Worker의 기관 설정을 캐시하고, 네트워크 실패 시 마지막 캐시 또는 내장 fallback으로 가져오기 화면을 유지한다.
- 카드사 `xls`, `xlsx`, `csv` 파일 업로드와 실제 파싱은 계속 브라우저 앱이 담당한다.
- 개인 거래 데이터는 Notion으로 가지 않고 private GitHub sync 설계를 따른다.
- 설계 문서는 `docs/superpowers/specs/2026-06-07-notion-institution-cms-design.md`에 기록했다.

## Notion 금융기관 CMS 구현 계획

- 사용자가 설계 문서를 승인했다.
- 구현 계획은 Worker tooling, Notion normalizer, Worker API, React catalog client, parser hint integration, dynamic import guide UI, setup docs, end-to-end verification 순서로 나눴다.
- 구현 계획 파일은 `docs/superpowers/plans/2026-06-07-notion-institution-cms.md`다.
- 계획은 Notion token을 브라우저에 두지 않고 Worker secret으로 보관하는 전제를 유지한다.
- 계획은 Notion 힌트를 header alias 후보로만 사용하고, 거래 저장 검증과 위험한 파싱 규칙은 코드에 남기는 전제를 유지한다.

## Notion 금융기관 CMS 구현 결과

- Cloudflare Worker tooling을 추가하고 `wrangler.toml`에 Worker entry, `NOTION_VERSION`, `ALLOWED_ORIGIN`을 설정했다.
- Notion 금융기관 page properties를 `InstitutionCatalog`로 정규화하는 Worker-side normalizer를 추가했다.
- 정규화 결과에는 raw Notion page id와 raw `properties`를 노출하지 않는다.
- Worker `/institutions` API는 Notion data source query API를 호출하고 정규화된 catalog JSON만 반환한다.
- Notion token과 data source ID는 Worker secret으로만 받으며, GitHub Pages 앱이나 iPhone 브라우저에는 입력하거나 저장하지 않는다.
- Worker는 Notion 429를 `notion_rate_limited`로 반환하고 `Retry-After`만 전달한다.
- Worker는 다른 Notion 오류의 원문 message를 public 응답에 반사하지 않고 고정 문구를 반환한다.
- Worker pagination은 반복 cursor와 50 page cap으로 무한 루프를 방어한다.
- React 앱에는 기관 catalog type, fallback, localStorage cache, Worker client, `useInstitutionCatalog` hook을 추가했다.
- 브라우저 localStorage에는 공개 가능한 기관 catalog cache만 저장한다.
- fallback catalog에는 신한카드, 현대카드, 국민은행, 하나은행, 토스뱅크를 넣었고 모바일 링크는 iPhone 친화 링크로 맞췄다.
- 파일 파서는 선택 기관에서 변환한 parser hints를 받아 날짜, 금액, 가맹점, 상태 컬럼 alias 후보로 사용한다.
- 은행 파일의 출금액, 입금액 처리와 기존 신한카드, 현대카드 alias 기반 파싱은 유지했다.
- 가져오기 화면은 catalog source, fetchedAt, refresh 버튼, 기관 selector, 지원 형식, parser key, parser hint 요약, 필수 컬럼, PC와 iPhone 안내 단계를 표시한다.
- 기관 선택을 바꾸면 안내 문구와 parser hint가 선택 기관 기준으로 즉시 바뀐다.
- 알림 텍스트 붙여넣기 흐름은 기존 신한카드 알림 파서를 그대로 유지한다.
- Notion CMS 설정 문서는 `docs/notion-institution-cms.md`에 기록했다.

## Notion 금융기관 CMS 검증 결과

- `npx playwright test tests/notion-institution-normalizer.spec.ts tests/institution-service.spec.ts tests/shinhan-file-parser-hints.spec.ts`가 7개 테스트 통과로 완료됐다.
- Worker 파일은 repo `tsconfig.json` include 밖이라 별도 `npx tsc --noEmit ... workers/...` 명령으로 검증했다.
- `npm run build`가 TypeScript check와 Vite production build를 통과했다.
- Vite는 기존과 같은 500 kB 초과 chunk warning을 출력했다.
- `.dev.vars`가 없어 실제 Notion API 200 smoke는 수행하지 못했다.
- secret 없는 Worker local smoke는 500 `{"error":"worker_not_configured"}`와 JSON, CORS, no-store header를 반환했다.
- Browser plugin으로 앱 로드, 금융기관 가져오기 화면 진입, 현대카드 선택, 안내 변경, 콘솔 오류 없음까지 확인했다.
- Browser screenshot API가 timeout되어 스크린샷 증거는 repo 밖 임시 폴더의 Playwright headless 캡처로 보완했다.
- Playwright desktop 캡처에서 현대카드 선택 후 기관 설정, parser hint, 파일 입력, 현대카드 PC/iPhone 안내가 표시됨을 확인했다.
- Playwright mobile 390x844 캡처에서 selector, parser hint 요약, 파일 입력이 겹치지 않고 읽히는 것을 확인했다.

## 네이버페이 가져오기 추가 계획

- 목표는 네이버페이를 금융기관 가져오기 선택 목록에 추가하고, 사용자가 만든 CSV/TXT 형태의 네이버페이 내역을 기존 파일 가져오기 흐름으로 저장하게 하는 것이다.
- 네이버 공식 도움말은 `Npay > 결제내역`, `Npay 머니 내역`, 현금영수증 내역 확인 경로를 안내하지만, 소비자용 일괄 CSV/xls 다운로드 안내는 확인하지 못했다.
- 최근 사용자 사례도 공식 다운로드 기능이 없어 네이버페이 머니 내역 화면을 끝까지 펼친 뒤 브라우저 콘솔로 CSV를 생성하는 우회 방식을 사용한다.
- 따라서 앱 안내는 `공식 일괄 파일이 없으면 직접 CSV/TXT로 정리해서 업로드`라는 보수적 기준으로 둔다.
- 파서에는 네이버페이 전용 `TransactionSource`를 추가하되, 파일 형식 자체는 기존 CSV/TSV/TXT/xls/xlsx 처리 경로를 재사용한다.
- 네이버페이 내역은 카드 승인 내역처럼 금액 한 칸 중심의 지출로 보고, 취소/환불/입금 키워드가 있는 경우 기존 `detectTransactionType` 로직으로 수입 처리한다.

## 네이버페이 가져오기 추가 결과

- TDD RED에서 `fallback catalog includes Naver Pay as a pay institution`는 네이버페이 항목 없음으로 실패했다.
- TDD RED에서 `parseShinhanTransactionFile uses Naver Pay parser hints`는 `transactionSource`가 `shinhan-file`로 나와 실패했다.
- 내장 fallback catalog에 `네이버페이`를 `pay` 기관, `naver-pay` parser key, `https://pay.naver.com/`, iOS 네이버페이 앱 링크, `csv/tsv/txt` 지원 형식으로 추가했다.
- `naver-pay-file` 거래 출처를 추가하고 백업 schema와 거래 목록 출처 라벨에 반영했다.
- 파일 파서는 `naver-pay` parser hint 또는 naver/npay/네이버 파일명에서 네이버페이 파일 출처를 사용한다.
- 가져오기 화면은 카드/은행/페이 파일 문구, 네이버페이 링크, `결제내역`, `Npay 머니 내역` 검색어를 포함한다.
- `npx playwright test tests/institution-service.spec.ts tests/shinhan-file-parser-hints.spec.ts`가 7개 테스트 통과로 완료됐다.
- `npx playwright test`가 10개 테스트 통과로 완료됐다.
- `npm run build`가 TypeScript check와 Vite production build를 통과했다. 기존처럼 500 kB 초과 chunk warning은 출력됐다.
- Browser로 `http://localhost:5174/`에서 금융기관 가져오기 화면을 열고 네이버페이 링크, selector 옵션, 선택 후 PC 안내와 `Npay 머니 내역` 문구, 콘솔 오류 없음까지 확인했다.

## 파일 업로드 자동 카드사 판정 계획

- 사용자는 Notion 금융기관 설정을 거래 파일 파싱의 필수 입력으로 쓰는 흐름을 원하지 않는다.
- 파일 업로드는 `Shinhancard_20260607.xlsx`, `hyundaicard_20260607.xls`처럼 파일명과 실제 헤더를 기준으로 신한카드와 현대카드를 자동 판정해야 한다.
- Notion catalog는 홈페이지 링크나 안내 CMS로는 유지할 수 있지만, 파일 파서 선택값으로 쓰지 않는다.
- 파서 내부도 방어적으로 수정한다. UI가 실수로 신한카드 힌트를 넘겨도 `hyundaicard` 파일명은 현대카드 출처로 저장되어야 한다.
- 은행과 네이버페이는 기존 명시 힌트와 파일명 판정 흐름을 유지한다.

## 파일 업로드 자동 카드사 판정 결과

- UI 파일 업로드 경로는 더 이상 선택된 Notion 기관의 parser hint를 `parseShinhanTransactionFile`에 넘기지 않는다.
- 가져오기 화면의 `금융기관 설정`과 `가져올 금융기관` 선택 박스를 제거하고 `파일 자동 판정` 안내로 바꿨다.
- 파서 내부는 파일명에서 `hyundai` 또는 `현대`를 보면 현대카드 출처를, `shinhan` 또는 `신한`을 보면 신한카드 출처를 우선 사용한다.
- 방어 테스트로 `hyundaicard_20260607.csv`가 신한카드 힌트를 받아도 `현대카드`와 `hyundai-card-file`로 저장되는 동작을 고정했다.
- `npx playwright test`는 13개 테스트 통과로 완료됐다.
- `npm run build`가 TypeScript check와 Vite production build를 통과했다. 기존처럼 500 kB 초과 chunk warning은 출력됐다.
- Playwright 화면 스모크에서 자동 판정 문구가 보이고 `금융기관 설정`과 `가져올 금융기관` 선택 박스가 사라진 것을 확인했다.
- 사용자가 제공한 `Shinhancard_20260607.xlsx`는 101건을 읽었고 오류는 0건이었다.
- 사용자가 제공한 `hyundaicard_20260607.xls`는 39건을 읽었고 오류는 0건이었다.

## Notion 백업 JSON 기록 계획

- 사용자는 기존 Notion 연결 data source `3783d76f-8874-8055-af3a-000befc853fc`에 GitHub Pages 앱의 백업 JSON 내용을 채우고 싶어 한다.
- 같은 Worker가 이미 Notion token과 data source ID를 secret으로 갖고 있으므로, 브라우저가 Notion token을 직접 저장하거나 호출하지 않는다.
- 앱은 현재 IndexedDB에서 생성한 `BackupFile` JSON을 Worker의 `POST /backups`로 보낸다.
- Worker는 Notion 공식 create page API처럼 `parent.data_source_id`를 사용해 해당 data source 안에 백업 page를 만든다.
- 현재 data source가 금융기관 CMS 속성을 갖고 있으므로, 백업 JSON은 새 schema 컬럼 강제 추가 없이 page 제목과 page body markdown에 저장한다.
- 기존 `/institutions` 응답에 백업 page가 섞이지 않도록 백업 page는 `Enabled=false`로 생성한다.
- 백업 page 제목은 `Household account backup YYYY-MM-DD HH:mm` 형태로 두고, body에는 거래 수, 카테고리 수, export 시각, JSON 코드 블록을 넣는다.

## Notion 백업 JSON 기록 결과

- Worker에 `POST /backups` endpoint를 추가했다.
- `/backups`는 `NOTION_TOKEN`, `NOTION_DATA_SOURCE_ID`, `NOTION_BACKUP_WRITE_KEY`가 모두 있어야 동작한다.
- 브라우저는 Notion token을 저장하지 않고, `X-Household-Backup-Key` header로 Worker 쓰기 키만 보낸다.
- Worker는 백업 JSON을 Notion create page payload로 바꾸고 `parent.data_source_id`에 `3783d76f-8874-8055-af3a-000befc853fc` 같은 연결 data source ID를 넣는다.
- 생성되는 백업 page는 `Enabled=false`로 만들어 기존 기관 catalog 조회에 섞이지 않게 했다.
- 백업 panel에 `Notion 백업 키`, `키 저장`, `Notion 기록` UI를 추가했다.
- `VITE_INSTITUTION_CMS_URL`은 계속 `/institutions`까지의 URL만 필요하며, 앱이 자동으로 `/backups` endpoint를 계산한다.
- `npx playwright test`는 16개 테스트 통과로 완료됐다.
- `npm run build`가 TypeScript check와 Vite production build를 통과했다. 기존처럼 500 kB 초과 chunk warning은 출력됐다.
- Worker TypeScript 명시 검증도 통과했다.
- 로컬 화면 스모크에서 Notion 백업 키 입력과 `Notion 기록` 버튼이 보이고 콘솔 오류가 없음을 확인했다.
- 이 Codex 환경에는 `CLOUDFLARE_API_TOKEN`이 없어 `wrangler secret list`와 Worker deploy는 실행하지 못했다.

## Notion 백업 행 단위 동기화 계획

- 사용자는 백업 JSON이 Notion page 본문 텍스트로 들어가는 방식이 아니라, Notion 데이터베이스 컬럼에 의미 있게 채워지길 원한다.
- 새 방식은 `categories`와 `transactions`를 각각 Notion data source row로 풀어 쓴다.
- title 컬럼은 data source에서 실제 `title` 타입인 속성을 찾아 사용한다. 화면에서는 `id` 컬럼일 수 있다.
- category row는 `recordType=category`, `id`, `type`, `name`, `color`, `isDefault`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`를 채운다.
- transaction row는 `recordType=transaction`, `id`, `date`, `type`, `amount`, `categoryId`, `name`, `memo`, `source`, `createdAt`, `updatedAt`를 채운다.
- Worker는 data source schema를 조회하고 부족한 백업 컬럼을 추가한다.
- 같은 `id` row가 이미 있으면 update하고, 없으면 create한다.
- 이전 구현으로 생긴 `Household account backup ...` 요약 row는 새 동기화 시 휴지통으로 보낸다.

## Notion 백업 행 단위 동기화 결과

- `buildNotionBackupRows`로 category와 transaction을 Notion page properties로 변환하게 했다.
- `buildNotionBackupSchemaPatch`로 `recordType`, `date`, `amount`, `categoryId`, `memo`, `source` 등 부족한 컬럼 schema를 추가하도록 했다.
- Worker `/backups`는 data source 조회, schema patch, 기존 row 조회, legacy summary row 제거, 행 단위 upsert 순서로 동작한다.
- 응답은 `created`, `updated`, `legacyRemoved`, `categories`, `transactions` 건수를 반환한다.
- 백업 패널 성공 메시지도 생성, 업데이트, 이전 요약 제거 건수를 표시하도록 바꿨다.
- `npx playwright test`는 17개 테스트 통과로 완료됐다.
- `npm run build`가 TypeScript check와 Vite production build를 통과했다. 기존처럼 500 kB 초과 chunk warning은 출력됐다.
- Worker TypeScript 명시 검증도 통과했다.

## Notion 백업 실패 진단 개선

- 사용자가 본 `Notion 백업 기록에 실패했습니다.` 문구는 Worker가 Notion API 실패를 모두 `notion_request_failed`로 숨겨 UI가 다음 조치를 안내하지 못해서 발생했다.
- `/backups` 엔드포인트는 키 없이 호출하면 `401`을 반환하므로 Worker endpoint와 secret 존재는 확인됐다. 실제 실패는 키 인증 이후 Notion schema update, page query, page create/update, legacy cleanup 중 하나다.
- Worker 응답은 token이나 Notion 원문 오류를 노출하지 않고, `notionStatus`와 단계별 `error` 코드만 반환한다.
- UI는 schema read/update, page query/create/update, rate limit을 구분해 권한과 컬럼 타입 확인 문구를 보여준다.

## Notion 백업 HTTP 400 수정

- `Notion 백업 행 수정에 실패했습니다... Notion HTTP 400`은 권한 403이 아니라 page update payload와 Notion data source schema 불일치 가능성이 높다.
- Notion 공식 문서도 page update의 `properties` schema가 parent data source properties와 맞아야 한다고 명시한다.
- 현재 schema patch는 missing property만 추가하고, 이미 존재하는 `select` property의 missing option은 보강하지 않는다. 기존 `source`나 `type` select option 누락이 있으면 page update가 400을 낼 수 있다.
- Worker는 Notion token이나 integration id는 숨기되, Notion의 `code`와 짧은 `message`는 UI에 전달해 다음 원인을 확인할 수 있게 한다.

## Notion 백업 multi-select 컬럼 대응

- Notion 오류 `type is expected to be multi_select`는 data source의 `type` 컬럼이 multi-select인데 Worker가 `{ select: ... }` 값을 보냈다는 뜻이다.
- 사용자가 이미 만든 Notion data source를 존중하기 위해 `type` 컬럼을 select로 바꾸라고 요구하지 않고, Worker가 schema를 읽어 `select` 또는 `multi_select` 값을 맞춰 보낸다.
- 같은 option 계열인 `recordType`, `type`, `source` 모두 기존 컬럼이 multi-select이면 `{ multi_select: [{ name }] }`로 쓰고, select이면 기존처럼 `{ select: { name } }`로 쓴다.
- schema patch도 기존 multi-select option을 보존하면서 누락된 `expense`, `income`, `shinhan-file`, `hyundai-card-file` 등을 보강한다.

## Notion 거래 전용 백업과 중복 정리

- 사용자는 category 설정 row를 Notion 백업 데이터로 원하지 않는다. Notion 백업은 월간 금액, 날짜, 사용처 같은 거래 row만 남긴다.
- `buildNotionBackupRows`는 더 이상 category row를 만들지 않고 transaction row만 만든다.
- 이전 버전이 만든 category row는 `recordType=category` 또는 `expense-`, `income-`, `cat_` id 패턴과 빈 거래 필드로 식별해 휴지통으로 보낸다.
- 같은 거래 id의 Notion row가 여러 개 있으면 `last_edited_time`이 가장 최신인 page를 남기고 나머지는 휴지통으로 보낸 뒤, 남긴 page만 업데이트한다.
- 금융기관 설정 row는 현재 백업 거래 id 집합에 포함되지 않으면 중복 정리 대상이 아니므로 건드리지 않는다.

## Notion 백업 실패 원인 표시 보강 계획

- 사용자가 다시 본 `Notion 백업 기록에 실패했습니다.` 문구는 최신 UI가 받는 Worker 응답에 단계별 `error`, `notionStatus`, `notionMessage`가 없을 때만 나온다.
- Notion 데이터 소스 스키마는 fetch 기준으로 `recordType=select`, `source=select`, `type=multi_select`이며 최신 Worker 코드가 처리 가능한 형태다.
- 공개 GitHub Pages 번들은 최신 오류 처리 코드를 포함한다. 남은 후보는 Worker 미배포, 브라우저 캐시, 또는 Worker 내부 예외가 `notion_timeout`으로 뭉개지는 경로다.
- 이번 변경은 실제 Notion token이나 백업 키를 노출하지 않고, 내부 예외를 안전한 짧은 메시지로 반환해 다음 실패 시 원인을 바로 확인하게 하는 데 집중한다.

## Notion 백업 실패 원인 표시 보강 결과

- Worker `/backups`는 이제 내부 예외를 `notion_backup_worker_exception`으로 반환하고, `workerStage`와 짧게 정리한 `workerMessage`를 포함한다.
- `workerStage`는 `schema_read`, `schema_update`, `page_query`, `row_build`, `legacy_cleanup`, `dedupe`, `upsert` 중 하나로 남겨 어느 단계에서 끊겼는지 알 수 있게 했다.
- GitHub Pages UI는 기존 `notion_timeout`과 새 `notion_backup_worker_exception`을 별도 안내 문구로 표시한다.
- `npx playwright test`는 24개 테스트 통과로 완료됐다.
- `npm run build`가 TypeScript check와 Vite production build를 통과했다. 기존처럼 500 kB 초과 chunk warning은 출력됐다.
- Worker TypeScript 명시 검증도 통과했다.

## Notion 백업 subrequest 한도 대응 계획

- 실제 오류는 `Worker stage upsert · Too many subrequests by single Worker invocation`이다.
- Cloudflare Workers 공식 limits 기준 Free 플랜은 subrequest가 50/request이며, Notion 거래 row 하나당 `POST /v1/pages` 또는 `PATCH /v1/pages/{id}`가 1개 이상 들어간다.
- 현재 Worker는 schema read, page query, legacy cleanup, dedupe, 전체 upsert를 한 invocation에서 모두 수행하므로 거래가 50건 안팎만 되어도 한도에 걸린다.
- 한도 설정을 올리는 방법은 유료 플랜이나 설정 의존이 생긴다. 현재 요구에는 Free 플랜에서도 동작하는 cursor 기반 chunk 처리가 더 적합하다.
- Worker는 한 번에 최대 20개 Notion 변경만 수행하고, 응답의 `hasMore`와 `nextCursor`로 다음 요청을 안내한다.
- 브라우저는 같은 백업 JSON을 유지한 채 `nextCursor`가 없어질 때까지 `/backups`를 반복 호출하고 결과 건수를 합산한다.

## Notion 백업 subrequest 한도 대응 결과

- Worker `/backups`는 이제 한 invocation에서 Notion 변경 요청을 최대 20개만 수행한다.
- legacy summary, category row, duplicate row 정리도 20개 단위로 끊고, 정리가 남으면 `nextCursor={ phase: "cleanup" }`를 반환한다.
- 거래 upsert는 `nextCursor={ phase: "upsert", offset }`로 이어가며, GitHub Pages UI 호출부는 cursor가 없어질 때까지 같은 백업 JSON을 반복 전송한다.
- 브라우저 호출부는 각 batch의 `created`, `updated`, `legacyRemoved`, `processed`를 합산하고, Worker가 `hasMore`만 주고 cursor를 누락하면 실패 처리한다.
- `npx playwright test`는 28개 테스트 통과로 완료됐다.
- `npm run build`가 TypeScript check와 Vite production build를 통과했다. 기존처럼 500 kB 초과 chunk warning은 출력됐다.
- Worker TypeScript 명시 검증도 통과했다.

## 백업 패널 위치 이동 계획

- 사용자는 대시보드 사이드바에 있는 `JSON / 백업` 패널 전체를 금융기관 가져오기 화면으로 옮기길 원한다.
- 백업 패널에는 JSON 내보내기, 공유용 내보내기, JSON 가져오기, Notion 백업 키와 기록, 전체 초기화가 포함된다.
- 구현은 `BackupPanel` 컴포넌트를 유지하고, import/use 위치만 `DashboardScreen`에서 `ShinhanImportGuideScreen`으로 옮긴다.
- 기존 백업 동작은 그대로 유지하고 화면 배치만 바꾼다.

## 백업 패널 위치 이동 결과

- `DashboardScreen` 사이드바에서 `BackupPanel`을 제거하고 `ShinhanImportGuideScreen`의 GitHub 공유 설정 아래에 배치했다.
- `tests/backup-panel-placement.spec.ts`로 `BackupPanel`이 대시보드가 아니라 금융기관 가져오기 화면에 있는지 고정했다.
- `npx playwright test`는 29개 테스트 통과로 완료됐다.
- `npm run build`가 TypeScript check와 Vite production build를 통과했다. 기존처럼 500 kB 초과 chunk warning은 출력됐다.
- Browser QA에서 `http://127.0.0.1:5173/` 데스크톱과 390px 모바일 폭 모두 백업 패널, `Notion 백업 키`, `Notion 기록` 버튼 렌더링을 확인했고 콘솔 오류는 없었다.
## Notion 캘린더 title 표시 name 변경 계획

- 사용자는 Notion calendar view `3783d76f-8874-80cb-8afd-000c6b9638ec`에서 id 대신 name이 보이기를 원한다.
- 해당 view는 `displayProperties`가 `userDefined:id` 중심이고, data source의 title property 자체도 `id`다.
- Notion calendar card는 title property를 항상 보여주므로 view에서 `id`를 숨기는 것만으로는 id 노출이 사라지지 않는다.
- view에는 `SHOW "name"`을 적용했지만 MCP 응답상 title property `userDefined:id`는 계속 displayProperties에 남는다.
- 지속적인 해결은 title property 값에는 거래 name/memo를 쓰고, 실제 upsert 식별자는 별도 `recordId` rich_text 속성에 보관하는 것이다.
- 기존 row는 `recordId`가 없으므로 Worker 매칭은 `recordId` 우선, 없으면 기존 title id fallback으로 해야 다음 백업 때 기존 row를 업데이트할 수 있다.

## Notion 캘린더 title 표시 name 변경 결과

- Notion view `3783d76f-8874-80cb-8afd-000c6b9638ec`에 `SHOW "name"`을 적용했다.
- 백업 row title 값은 거래 memo/name으로 쓰고, 실제 transaction id는 `recordId` rich_text 속성에 저장하도록 바꿨다.
- 기존 row 매칭은 `recordId`를 우선 사용하고, 없으면 기존 title id를 fallback으로 사용한다.
- 다음 Notion 백업 실행 때 기존 row도 같은 id로 찾아 title이 name/memo로 갱신된다.
- `npx playwright test` 37개, `npm run build`, Worker TypeScript 명시 검증을 통과했다.
- Cloudflare Worker `household-account-institution-cms`를 배포했다. Version ID는 `0be9a300-99a6-4005-9304-f5afbb17f734`이다.

## 현재 PC 기록 push 진행 상태 표시 계획

- 사용자는 `현재 PC 기록을 GitHub 공유 데이터로 push 중입니다.` 상태에서 변화가 없다고 보고했다.
- 해당 문구는 `GitHubSharedDataPanel`의 `현재 PC 기록 push` 버튼에서 나온다.
- `pushCurrentPcRecords`는 GitHub push 완료 전, GitHub 완료 후 Notion 시작 전, Notion batch 처리 중 상태를 UI에 전달하지 않는다.
- GitHub API 조회/커밋 또는 Notion batch가 오래 걸리면 정상 처리 중이어도 같은 문구가 유지되어 멈춘 것처럼 보인다.
- `pushCurrentPcRecords`에 단계별 progress callback을 추가하고 UI에서 GitHub 대기, GitHub 완료, Notion 시작, Notion batch 진행 상태를 표시한다.

## 현재 PC 기록 push 진행 상태 표시 결과

- `pushCurrentPcRecords`에 `onProgress`를 추가해 `github_start`, `github_success`, `notion_start`, `notion_batch` 단계를 전달한다.
- `GitHubSharedDataPanel`은 GitHub API가 10초 이상 응답하지 않으면 공유 파일 조회나 커밋이 오래 걸릴 수 있다는 안내로 바꾼다.
- GitHub push 완료 후 Notion 기록 시작과 Notion batch 완료 메시지를 표시한다.
- `tests/current-pc-record-push-service.spec.ts`, 전체 Playwright 37개, `npm run build`, 로컬 브라우저 smoke를 통과했다.

## Notion 백업 진행 상태 표시 계획

- 사용자는 `백업 JSON을 Notion에 기록 중입니다.` 상태에서 변화가 없다고 보고했다.
- 해당 문구는 `BackupPanel`의 단독 `Notion 기록` 버튼에서 나온다.
- 현재 `pushBackupToNotion`은 Worker가 여러 batch를 반환해도 전체 루프가 끝난 뒤에만 UI 결과를 갱신한다.
- 거래 수나 기존 Notion row가 많으면 정상 처리 중이어도 화면이 멈춘 것처럼 보인다.
- 서비스에 batch 완료 콜백을 추가하고, BackupPanel에서 처리 건수와 정리 건수를 표시한다.

## Notion 백업 진행 상태 표시 결과

- `pushBackupToNotion`에 `onBatchComplete` 옵션을 추가해 batch 완료마다 누적 처리 결과를 받을 수 있게 했다.
- `BackupPanel`은 10초 동안 첫 응답이 없으면 첫 batch 대기 안내를 표시한다.
- batch가 끝날 때마다 `batch N 완료`, 거래 처리 건수, 생성/업데이트/정리 건수를 표시한다.
- `tests/notion-backup-service.spec.ts`, 전체 Playwright 37개, `npm run build`, 로컬 브라우저 smoke를 통과했다.

## Notion 백업 캘린더 날짜 연동 계획

- 사용자는 Notion data source `3783d76f-8874-8055-af3a-000befc853fc`가 `https://app.notion.com/p/3783d76f887480299913e7fe4231957a?v=3783d76f887480179dfc000c486c0dbd&source=copy_link` 캘린더에 정리되기를 원한다.
- Notion fetch 결과 해당 database에는 data source `Household account`, date 타입 속성 `날짜`, calendar view `캘린더 보기`가 이미 있다.
- 현재 Worker는 거래일을 text 속성 `date`에만 쓰고 있으므로 calendar view가 쓰는 `날짜` date 속성을 백업 row에 같이 채워야 한다.
- 캘린더 view는 `CALENDAR BY "날짜"`와 `recordType = transaction` 기준으로 정리한다.

## Notion 백업 캘린더 날짜 연동 결과

- `buildNotionBackupRows`가 기존 text `date`와 함께 date 타입 `날짜` 속성도 `transaction.date`로 채우게 했다.
- `buildNotionBackupSchemaPatch`가 `날짜` date 속성이 없는 Notion data source에는 `{ date: {} }` schema patch를 추가한다.
- Notion view `3783d76f-8874-8017-9dfc-000c486c0dbd` 이름을 `거래 캘린더`로 바꾸고 `CALENDAR BY "날짜"`, `recordType = transaction` 기준으로 설정했다.
- 기존 Notion row는 다음 Notion 백업 실행 때 `날짜` 속성이 채워져 캘린더에 표시된다.
- Notion connector의 structured query 도구는 내부 `notion-query-data-sources not found` 오류로 row 조회가 막혀 기존 row 직접 backfill은 진행하지 못했다.
- 현재 환경은 `CLOUDFLARE_API_TOKEN`과 Wrangler 로그인 세션이 없어 Worker deploy를 바로 실행할 수 없다.
- `npx playwright test` 37개, `npm run build`, Worker TypeScript 명시 검증을 통과했다.

## GitHub Pages 공유 안내 문구 정리 계획

- 사용자가 GitHub 공유 설정 하단의 token 권한 문구가 GitHub Pages 공유 방식과 혼동된다고 지적했다.
- 현재 정책은 `public/shared-data.json`을 `asher8554/Household-Account` repo에 커밋하고 GitHub Pages가 공개 파일로 배포하는 방식이다.
- UI 안내는 private repo 동기화처럼 읽히지 않게, Pages 공개 공유 파일로 커밋된다는 점과 token 저장 위치만 짧게 설명한다.

## GitHub Pages 공유 안내 문구 정리 결과

- GitHub 패널의 보조 문구를 `GitHub Pages 공유 파일로 커밋하고 Notion에도 기록됩니다.`로 바꿨다.
- 하단 token 안내는 `public/shared-data.json`을 이 repo에 공개 커밋한다는 점을 먼저 말하고, token은 localStorage에만 저장되며 Contents read/write 권한만 필요하다고 정리했다.
- `tests/public-shared-data-security.spec.ts`에 Pages 공개 공유 안내 문구 회귀 테스트를 추가했다.
- `npx playwright test` 37개와 `npm run build`를 통과했다.

## GitHub Pages 공유 파일 추적 정책

- 사용자는 iPhone과 다른 기기에서도 GitHub Pages 페이지가 같은 거래 내역을 볼 수 있어야 한다고 정정했다.
- 따라서 `public/shared-data.json`은 다시 GitHub Pages 공개 동기화 파일로 취급한다.
- `.gitignore`에서 `public/shared-data.json` 제외 규칙을 제거해 GitHub API push 이후 로컬에서도 추적 가능한 공유 데이터 파일로 남도록 했다.

## 대시보드 push 버튼과 숨김 가져오기 진입 계획

- 사용자는 거래 입력 아래에서 바로 `현재 PC 기록 push`를 실행하길 원한다.
- 새 버튼은 별도 구현이 아니라 기존 `pushCurrentPcRecords` 경로를 재사용해 GitHub Pages 공유 파일 커밋과 Notion 백업을 같은 순서로 실행한다.
- 금융기관 가져오기는 일반 사용자 화면에 노출하지 않는다. GitHub Pages SPA에서 새 서버 라우팅 없이 접근 가능하도록 hash 기반 비밀 진입 `#admin-import`를 사용한다.
- 상단 설명 문구는 `로컬 저장 가계부 달력`에서 `가계부 달력`로 줄인다.

## 대시보드 push 버튼과 숨김 가져오기 진입 결과

- `CurrentPcRecordPushButton`을 추가하고 `TransactionForm`의 `거래 추가` 버튼 아래에 배치했다.
- 새 버튼은 저장된 GitHub 공유 설정을 읽어 `pushCurrentPcRecords`를 실행하므로 GitHub Pages 공유 파일 커밋과 Notion 백업이 함께 실행된다.
- `visibleAppViews`를 도입해 상단 메뉴에서 `금융기관 가져오기`를 숨겼고, `#admin-import` hash로 직접 접근하면 기존 가져오기 화면을 열도록 했다.
- 헤더 보조 문구를 `가계부 달력`로 변경했다.
- `npx playwright test` 41개, `npm run build`, Playwright 브라우저 smoke를 통과했다.

## Notion title migration 재시작 개선 계획

- 사용자는 Notion 캘린더의 `tx_...` title이 name으로 바뀌다가 멈췄다고 보고했다.
- Notion fetch 결과 data source에는 `recordId` 컬럼이 생겼고, 아직 `recordId`가 비어 있으며 title이 `tx_...`인 legacy 거래 row가 남아 있다.
- 기존 Worker는 cursor offset 기준으로 앞쪽 row부터 계속 처리한다. 사용자가 중간에 멈춘 뒤 다시 push하면 이미 migration된 앞쪽 row도 다시 PATCH해 Notion rate limit과 시간 소모가 커진다.
- Worker는 매 batch마다 기존 page 값을 읽고, 이미 title, `recordId`, 날짜, 금액 등 row 속성이 최신이면 mutation 대상에서 제외해야 한다.
- 남은 pending row만 앞에서부터 최대 20개 처리하고, 다음 cursor는 offset 대신 pending row 재계산을 의미하는 `{ phase: "upsert", offset: 0 }`로 유지한다.

## Notion title migration 재시작 개선 결과

- Worker가 기존 Notion page의 title, `recordId`, 날짜, 금액, category, memo, source 값이 이미 최신이면 PATCH 대상에서 제외하도록 수정했다.
- 중간에 멈춘 뒤 다시 `현재 PC 기록 push`를 눌러도 이미 name으로 바뀐 row는 건너뛰고 남은 `tx_...` legacy row부터 업데이트한다.
- Notion 캘린더 view `3783d76f-8874-80cb-8afd-000c6b9638ec`는 `SHOW "id"`로 되돌려 title만 표시되게 했다.
- `npx playwright test` 42개, `npm run build`, Worker TypeScript 검증을 통과했다.
- Cloudflare Worker `household-account-institution-cms`를 배포했다. Version ID는 `c615c98e-f51f-4398-b838-73d518378452`이다.

## 반응형 화면 개선 계획

- 사용자는 웹페이지, iPhone 16, iPhone 15 Pro에서 보기 적절하도록 화면 크기 조정이 유연하길 원한다.
- iPhone 16과 iPhone 15 Pro의 일반 CSS viewport는 393px 폭 기준으로 검증한다.
- 우선 대시보드 첫 화면을 대상으로 한다. 이 화면에는 요약 카드, 달력, 소비 차트, 거래 입력, 현재 기록 업데이트 버튼, 날짜 상세, 카테고리 관리가 함께 있어 모바일 overflow 위험이 가장 높다.
- 변경은 Tailwind class 중심으로 제한한다. 데이터 구조나 동기화 로직은 건드리지 않는다.

## 반응형 화면 개선 결과

- 데스크톱 1440px, iPhone 16 393px, iPhone 15 Pro 393px에서 Playwright로 캡처했다.
- 수정 전에는 달력과 우측 패널 때문에 `documentElement.scrollWidth > clientWidth` 상태였고, iPhone 화면에서 일요일 열이 잘렸다.
- `AppShell`, `SectionPanel`, 대시보드 그리드, 달력, 차트, 거래 입력, 카테고리 관리에 `min-w-0`, `overflow-hidden`, 모바일 padding, 모바일 grid stack을 적용했다.
- 수정 후 데스크톱 1440px은 `scrollWidth=1440`, iPhone 16과 iPhone 15 Pro는 `scrollWidth=393`으로 모두 가로 overflow가 사라졌다.
- 수정 후 세 viewport 모두 console error가 없었고, 달력 `다음 달` 버튼 클릭 시 `2026년 6월`에서 `2026년 7월`로 변경되는 상호작용을 확인했다.
- 거래 입력 영역까지 스크롤한 iPhone 16과 iPhone 15 Pro 화면에서도 `현재 기록 업데이트` 버튼이 폭 343px로 잘리지 않고 표시되는 것을 확인했다.
- `npx playwright test` 42개와 `npm run build`를 통과했다. Vite는 기존 chunk size 경고만 표시했다.

## 카테고리별 소비 변화 표시 개수 조절 계획

- 사용자는 `카테고리별 소비 변화`의 표시 개수를 up/down 버튼으로 조절하길 원한다.
- 기존 집계 함수 `buildAnnualCategoryTrends`는 네 번째 인자로 `topCategoryLimit`을 이미 받는다. 새 계산 로직을 만들지 않고 이 값을 UI 상태로 연결한다.
- 표시 개수는 현재 선택 연도의 실제 지출 카테고리 개수 이하로 제한한다. 제한보다 낮은 카테고리는 기존처럼 `기타 묶음`으로 집계한다.
- 이 설정은 화면 표시 전용이다. IndexedDB, 백업, GitHub 공유 데이터, Notion 동기화 데이터는 변경하지 않는다.

## 카테고리별 소비 변화 표시 개수 조절 결과

- `AnnualTrendScreen`에 `categoryTrendLimit` 상태를 추가하고 `buildAnnualCategoryTrends`의 `topCategoryLimit` 인자로 연결했다.
- `카테고리별 소비 변화` 패널 action에 `상위 N개` 표시와 감소, 증가 아이콘 버튼을 추가했다.
- 표시 개수는 최소 1개, 선택 연도의 실제 지출 카테고리 수 이하로 제한한다. 데이터가 없으면 표시 개수는 0개로 보이고 버튼은 비활성화된다.
- Playwright 임시 컨텍스트에 2026년 지출 카테고리 10개를 넣어 데스크톱 1280px과 iPhone 16 393px에서 검증했다.
- 두 viewport 모두 `상위 8개`에서 감소 버튼 클릭 시 `상위 7개`, 증가 버튼 클릭 시 다시 `상위 8개`로 바뀌었다. 카드 수는 9개, 8개, 9개로 함께 바뀌었다.
- `npm run build`와 `npx playwright test` 42개를 통과했다. Vite는 기존 chunk size 경고만 표시했다.

## iPhone 카테고리 변화 차트 legend 간격 조정 계획

- 사용자는 iPhone 16에서 `카테고리별 소비 변화` 하단 legend가 x축 월 표시 구간과 겹쳐 불편하다고 보고했다.
- 원인은 Recharts 기본 `Legend`가 차트 내부 하단 영역을 사용하면서 모바일 폭에서 여러 줄로 접히는 구조다.
- legend를 차트 내부에서 제거하고 차트 아래 별도 flex-wrap 영역으로 렌더링한다. x축에는 하단 margin과 tick margin을 추가한다.
- 데이터 계산, 표시 개수 조절 상태, 공유 데이터 동기화 로직은 변경하지 않는다.

## iPhone 카테고리 변화 차트 legend 간격 조정 결과

- `AnnualTrendScreen`의 카테고리 변화 차트에서 Recharts 기본 `Legend`를 제거하고 `CategoryTrendLegend`를 차트 아래 별도 영역으로 렌더링했다.
- 카테고리 변화 차트의 `BarChart` 하단 margin을 16px로 늘리고 `XAxis`에 `tickMargin=8`을 적용했다.
- iPhone 16 393px Playwright 검증에서 SVG 텍스트 하단과 legend 상단 사이 간격이 약 48px로 확보됐다.
- iPhone 16 393px과 데스크톱 1280px 모두 가로 overflow와 console error가 없었다.
- in-app Browser로도 `127.0.0.1:5173`의 앱 로딩, 연간 소비 추세 이동, console error 없음, 가로 overflow 없음 상태를 확인했다.
- `npx playwright test` 42개와 `npm run build`를 통과했다. Vite는 기존 chunk size 경고만 표시했다.
