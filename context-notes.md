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
