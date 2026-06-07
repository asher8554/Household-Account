## Notion 캘린더 title 표시를 name으로 변경

- [x] Notion 캘린더 view의 표시 속성 설정을 확인한다.
- [x] view 표시 속성에 `name`을 추가한다.
- [x] Notion 백업 row title이 `name`으로 보이고 실제 동기화 키는 `recordId`로 유지되도록 테스트한다.
- [x] Worker 백업 변환과 기존 row 매칭 로직을 수정한다.
- [x] 관련 테스트와 빌드, Worker 배포를 완료한다.
- [x] 변경사항을 커밋하고 GitHub에 push한다.

## 현재 PC 기록 push 진행 상태 표시

- [x] 멈춘 문구가 나오는 UI와 호출 흐름을 확인한다.
- [x] GitHub와 Notion 단계 진행 콜백 테스트를 추가한다.
- [x] 현재 PC 기록 push UI가 단계별 진행 메시지를 표시하도록 수정한다.
- [x] 관련 테스트와 빌드를 통과시킨다.
- [x] 변경사항을 커밋하고 GitHub에 push한다.

## Notion 백업 진행 상태 표시

- [x] 멈춘 문구가 나오는 UI와 호출 흐름을 확인한다.
- [x] batch 진행률 콜백 테스트를 추가한다.
- [x] Notion 백업 UI가 batch 완료마다 메시지를 갱신하도록 수정한다.
- [x] 관련 테스트와 빌드를 통과시킨다.
- [x] 변경사항을 커밋하고 GitHub에 push한다.

## Notion 백업 캘린더 날짜 연동

- [x] Notion data source와 캘린더 뷰 schema를 확인한다.
- [x] 백업 row가 `날짜` date 속성을 채우는 테스트를 추가한다.
- [x] Worker 백업 변환 로직에 `날짜` date 속성을 추가한다.
- [x] Notion 캘린더 뷰를 `날짜` 기준 거래 row로 정리한다.
- [x] 관련 테스트와 빌드를 통과시킨다.
- [x] 변경사항을 커밋하고 GitHub에 push한다.

## GitHub Pages 공유 안내 문구 정리

- [x] 혼동되는 GitHub token 안내 문구 위치를 확인한다.
- [x] GitHub 패널이 Pages 공개 공유 파일 정책을 설명하는지 테스트한다.
- [x] UI 문구를 GitHub Pages 공개 공유 방식에 맞게 수정한다.
- [x] 관련 테스트와 빌드를 통과시킨다.
- [x] 변경사항을 커밋하고 GitHub에 push한다.

## 현재 PC 기록 push와 Notion 기록 동시 실행

- [x] 현재 GitHub push와 Notion 기록 흐름을 확인한다.
- [x] 버튼 동시 동작을 검증하는 테스트를 추가한다.
- [x] `현재 PC 기록 push`에서 Notion 백업도 실행한다.
- [x] GitHub Pages `public/shared-data.json` push와 자동 로드를 다시 허용한다.
- [x] 관련 테스트와 빌드를 실행한다.
- [x] 브라우저 smoke를 확인하고 커밋한다.

## CSO 보안 및 모듈 구조 리팩토링

- [x] 저장소 구조와 런타임 진입점을 확인한다.
- [x] 의존성, 비밀값, 공개 데이터, Worker API 보안 표면을 확인한다.
- [x] 유지보수에 부담이 큰 결합 지점을 하나 골라 최소 범위로 리팩토링한다.
- [x] 관련 테스트, 빌드, audit를 실행한다.
- [x] 보안 보고서와 결정 기록을 남긴다.

# Household Account Checklist

## 1차 MVP

- [x] 요구사항 확정.
- [x] GitHub Pages 정적 앱 방식 확정.
- [x] IndexedDB 로컬 저장 방식 확정.
- [x] JSON 내보내기/가져오기 방식 확정.
- [x] 간단 거래 입력 필드 확정.
- [x] 기본 카테고리 프리셋 및 사용자 편집 정책 확정.
- [x] 달력 날짜 셀 표시 정책 확정.
- [x] 지출 강도 기준 확정.
- [x] 단일 화면 중심, 페이지 분리 가능한 모듈 구조 확정.
- [x] Vite + React + TypeScript 프로젝트 골격 생성.
- [x] Tailwind CSS 스타일 시스템 구성.
- [x] Dexie 기반 IndexedDB 저장소 구현.
- [x] 기본 카테고리 프리셋 초기화 구현.
- [x] 거래 수동 입력 구현.
- [x] 월간 달력 시각화 구현.
- [x] 날짜별 상세 거래 패널 구현.
- [x] 월간 요약 구현.
- [x] 카테고리별 지출 차트 구현.
- [x] JSON 내보내기 구현.
- [x] JSON 가져오기 병합 구현.
- [x] 거래 삭제 구현.
- [x] 카테고리 비활성화 구현.
- [x] 전체 데이터 초기화 구현.
- [x] 빌드 검증.
- [x] 브라우저 시각 검증.

## 2차 첫 기능

- [ ] CSV 업로드.
- [ ] CSV 컬럼 매핑.
- [ ] CSV 미리보기.
- [ ] 중복 제거.
- [ ] 규칙 기반 카테고리 자동분류.

## 신한카드 가져오기 안내

- [x] 앱 내부에 신한카드 가져오기 안내 화면 추가.
- [x] 신한카드 CSV 파일 파싱.
- [x] 신한카드 xlsx 엑셀 파일 파싱.
- [x] 신한카드 xls HTML/XML 엑셀 파일 파싱.
- [x] 신한카드 바이너리 xls 파일 파싱.
- [x] 신한카드 파일 드래그앤드롭 업로드.
- [x] 가져오기 미리보기와 중복 후보 제외.
- [x] 신한카드 알림 텍스트 붙여넣기 파싱.
- [x] 신한카드 가져오기 결과를 IndexedDB 거래로 저장.
- [x] 신한카드 PC 홈페이지 CSV/엑셀 다운로드 절차 안내.
- [x] 신한 SOL페이 앱 이용내역 다운로드 절차 안내.
- [x] CSV/엑셀 파일에서 확인할 컬럼 안내.
- [x] 다음 구현 순서로 신한카드 CSV/엑셀 가져오기, 알림 텍스트 붙여넣기, Win 알림 수집 앱 로드맵 표시.
- [x] 빌드 검증.
- [ ] 브라우저 시각 검증.
- [x] GitHub Pages 재배포 확인.

## 은행 거래내역 가져오기

- [x] 국민은행 홈페이지 링크 버튼 추가.
- [x] 하나은행 홈페이지 링크 버튼 추가.
- [x] 토스뱅크 홈페이지 링크 버튼 추가.
- [x] 현대카드 홈페이지 링크 버튼 추가.
- [x] 현대카드 파일명 기반 카드 source 매핑.
- [x] 은행 거래내역 입금액/출금액 컬럼 매핑.
- [x] 은행 거래내역을 IndexedDB 거래로 저장.
- [x] 기존 대시보드 월간/달력/상세 반영 확인.
- [x] 빌드 검증.
- [x] GitHub Pages 재배포 확인.

## 카드 데이터 로드 상태

- [x] 현대카드 HTML 기반 xls 헤더 인식 수정.
- [x] 신한카드와 현대카드 마지막 파일 로드 시각 저장.
- [x] 15일 이상 미로드 카드 경고 메시지 표시.
- [x] 빌드 검증.
- [x] GitHub Pages 재배포 확인.

## 신한카드 거래일 xls 보완

- [x] 신한카드 `거래일` 헤더 인식 추가.
- [x] 카드 승인번호 기반 중복 판정 보완.
- [x] 같은 중복 후보를 미리보기에서 1개로 묶기.
- [x] 빌드 검증.
- [x] GitHub Pages 재배포 확인.

## 다크모드

- [x] CSS 변수 기반 라이트/다크 토큰 추가.
- [x] 시스템 테마 감지와 사용자 선택 저장 구현.
- [x] 헤더에 다크모드 토글 추가.
- [x] 달력 지출 강도 색상 다크모드 대응.
- [x] 입력, 패널, 차트 UI 다크모드 대비 확인.
- [x] 빌드 검증.
- [x] 브라우저 시각 검증.
- [x] GitHub Pages 재배포 확인.

## 날짜 상세 카테고리 편집

- [x] 날짜 상세 거래 항목을 클릭하면 전체 메모와 상세 정보가 펼쳐진다.
- [x] 날짜 상세 지출 항목에서 카테고리를 바로 변경할 수 있다.
- [x] 같은 사용처 이름으로 판정되는 기존 거래가 함께 카테고리 변경된다.
- [x] 빌드 검증을 통과한다.
- [x] 로컬 개발 서버 HTTP 응답을 확인한다.
- [ ] 자동 렌더링 상호작용 검증은 Playwright와 gstack browse 런타임 부재로 미수행.

## 기존 중복 거래 정리

- [x] 같은 날짜, 구분, 금액, 사용처, 승인번호 거래를 중복 키로 판정한다.
- [x] 이미 저장된 중복 거래를 앱 진입 시 1건만 남기고 삭제한다.
- [x] 카드/은행 파일 저장 뒤에도 중복 거래를 한 번 더 정리한다.
- [x] 삭제 시 사용자 카테고리 변경이 반영된 최신 카테고리를 보존한다.
- [x] 빌드와 audit 검증을 통과한다.
- [x] GitHub Pages 배포를 확인한다.

## 현대카드 xls 오류 2건 개선

- [x] 현대카드 샘플 파일의 구조와 오류 2건을 실제 파서로 재현한다.
- [x] 오류 행의 원인을 확인하고 최소 범위로 파서를 수정한다.
- [x] 샘플 파일 재파싱 결과 오류 0건을 확인한다.
- [x] 빌드와 audit 검증을 통과한다.
- [x] 로컬 개발 서버 HTTP 응답을 확인한다.
- [ ] 자동 브라우저 클릭 검증은 Playwright 부재로 미수행.
- [x] GitHub Pages 배포를 확인한다.

## Playwright 설치와 현대카드 가져오기 브라우저 검증

- [x] Browser plugin 설치 가능 여부를 확인한다.
- [x] Playwright 패키지와 Chromium 브라우저를 설치한다.
- [x] 현대카드 샘플 파일 가져오기 UI에서 오류 0건을 확인한다.
- [x] 빌드와 audit 검증을 통과한다.
- [x] 로컬 개발 서버 HTTP 응답을 확인한다.
- [x] GitHub Pages 배포를 확인한다.

## 신한카드 바이너리 xls 오류 개선

- [x] 샘플 파일의 오류 81건 원인을 실제 파서로 재현한다.
- [x] BIFF SST CONTINUE 문자열 분할 처리 누락을 수정한다.
- [x] 샘플 파일 재파싱 결과 오류가 줄어드는지 확인한다.
- [x] 빌드와 audit 검증을 통과한다.
- [x] 로컬 개발 서버 HTTP 응답을 확인한다.
- [ ] 자동 브라우저 클릭 검증은 Playwright 부재로 미수행.
- [x] GitHub Pages 배포를 확인한다.

## 승인번호 우선 중복 거래 정리

- [x] 승인번호가 있으면 사용처 이름 차이를 무시하고 중복 키로 판정한다.
- [x] 기존 저장분과 가져오기 미리보기의 중복 판정 기준을 맞춘다.
- [x] 승인번호 `18765669` 예시가 같은 중복 키로 잡히는지 검증한다.
- [x] 빌드와 audit 검증을 통과한다.
- [x] GitHub Pages 배포를 확인한다.

## 카테고리별 지출 상세 수정

- [x] 카테고리별 지출 막대에 금액 라벨을 표시한다.
- [x] 차트 막대 클릭 시 해당 카테고리 상세 거래 목록을 아래에 표시한다.
- [x] 상세 거래 목록에서 카테고리를 바로 수정할 수 있다.
- [x] 날짜 상세과 카테고리 상세이 같은 거래 행 UI를 재사용한다.
- [x] 빌드와 audit 검증을 통과한다.
- [x] 로컬 개발 서버 HTTP 응답을 확인한다.
- [ ] 자동 브라우저 클릭 검증은 Playwright 부재로 미수행.
- [x] GitHub Pages 배포를 확인한다.

## 카테고리 색상 Random 버튼

- [x] 카테고리 추가 폼 색상 입력 옆에 Random 버튼을 추가한다.
- [x] Random 버튼 클릭 시 새 hex 색상을 생성해 color input에 반영한다.
- [x] 빌드와 audit 검증을 통과한다.
- [x] 로컬 개발 서버 HTTP 응답을 확인한다.
- [ ] 자동 브라우저 클릭 검증은 Playwright 부재로 미수행.
- [x] GitHub Pages 배포를 확인한다.

## 카테고리별 지출 원형 분배 차트

- [x] 카테고리별 지출을 막대 그래프에서 원형 분배 차트로 변경한다.
- [x] 이번 달 총 지출 금액을 차트 영역에 표시한다.
- [x] 각 카테고리별 금액과 비율을 범례에서 확인할 수 있게 한다.
- [x] 차트 조각이나 범례 클릭 시 기존 상세 거래 목록을 표시한다.
- [x] 빌드와 audit 검증을 통과한다.
- [x] 로컬 개발 서버 HTTP 응답을 확인한다.
- [ ] 자동 브라우저 클릭 검증은 Playwright 부재로 미수행.
- [x] GitHub Pages 배포를 확인한다.

## 카테고리별 지출 월 이동 버튼

- [x] 카테고리별 지출 헤더에 이전달, 이번달, 다음달 버튼을 추가한다.
- [x] 버튼은 월간 달력과 같은 currentMonth 상태를 변경한다.
- [x] 카테고리별 지출의 현재 월 라벨을 표시한다.
- [x] 빌드와 audit 검증을 통과한다.
- [x] 로컬 개발 서버 HTTP 응답을 확인한다.
- [ ] 자동 브라우저 클릭 검증은 Playwright 부재로 미수행.
- [x] GitHub Pages 배포를 확인한다.

## 공개 Pages 공유 데이터

- [x] `public/shared-data.json`을 Pages 공유 데이터 파일로 추가한다.
- [x] 앱 시작 시 공유 데이터 파일을 읽어 IndexedDB에 반영한다.
- [x] 더 최신 로컬 거래가 있으면 오래된 공유 데이터로 덮어쓰지 않는다.
- [x] 백업 패널에 `shared-data.json` 공유용 내보내기 버튼을 추가한다.
- [x] 빌드와 audit 검증을 통과한다.
- [x] 로컬 개발 서버 HTTP 응답을 확인한다.
- [ ] 자동 브라우저 클릭 검증은 Playwright 부재로 미수행.
- [x] GitHub Pages 배포를 확인한다.

## 기타 상세 단일 항목 카테고리 변경

- [x] 단일 거래 1건만 카테고리를 변경하는 저장소 함수를 추가한다.
- [x] 거래 목록에 `한 항목만 변경` 체크박스를 추가한다.
- [x] 체크박스는 카테고리별 지출의 `기타` 상세에서만 보이게 한다.
- [x] 체크하지 않으면 기존처럼 같은 사용처 전체 카테고리를 변경한다.
- [x] 빌드와 audit 검증을 통과한다.
- [x] 로컬 개발 서버 HTTP 응답을 확인한다.
- [ ] 자동 브라우저 클릭 검증은 Playwright 부재로 미수행.
- [x] GitHub Pages 배포를 확인한다.

## 파일 가져오기 후 GitHub 공유 데이터 push

- [x] GitHub 토큰과 repo 설정을 PC 브라우저 localStorage에 저장하는 UI를 추가한다.
- [x] 현재 IndexedDB 데이터를 `shared-data.json` 형식으로 만들고 GitHub Contents API로 커밋한다.
- [x] 파일 거래 저장 버튼을 누른 뒤 자동으로 `public/shared-data.json`을 GitHub에 push한다.
- [x] 토큰이 없거나 push가 실패해도 파일 거래 저장 자체는 유지한다.
- [x] 빌드와 audit 검증을 통과한다.
- [x] 로컬 개발 서버 HTTP 응답을 확인한다.
- [ ] 자동 브라우저 클릭 검증은 Playwright 부재로 미수행.
- [x] GitHub Pages 배포를 확인한다.

## 현재 PC 기록 수동 공유 push

- [x] 공개 `shared-data.json`이 빈 파일인 원인을 확인한다.
- [x] GitHub 공유 설정 패널에 현재 PC 기록을 즉시 push하는 버튼을 추가한다.
- [x] 버튼은 현재 IndexedDB 데이터를 `public/shared-data.json`으로 커밋한다.
- [x] GitHub push 성공 후 Pages 반영 대기 안내를 표시한다.
- [x] 빌드와 audit 검증을 통과한다.
- [x] 로컬 개발 서버 HTTP 응답을 확인한다.
- [ ] 자동 브라우저 클릭 검증은 Playwright 부재로 미수행.
- [x] GitHub Pages 배포를 확인한다.

## 연간 소비 추세 페이지

- [x] 대시보드 옆에 연간 소비 추세 화면 전환 버튼을 추가한다.
- [x] IndexedDB 거래 데이터를 연도별 월간 지출 추세로 집계한다.
- [x] 연도 이동과 올해 복귀 컨트롤을 추가한다.
- [x] 월별 지출 차트와 월별 상세 목록을 표시한다.
- [x] 빌드 검증을 통과한다.
- [x] Playwright로 렌더와 화면 전환을 검증한다.

## 연간 카테고리별 소비 변화

- [x] Superpowers 설계와 구현 계획을 기록한다.
- [x] 카테고리별 연간 집계 테스트를 먼저 작성하고 실패를 확인한다.
- [x] 연간 소비 추세 집계 함수를 별도 파일로 분리한다.
- [x] 월별 카테고리 누적 막대 차트를 추가한다.
- [x] 카테고리별 요약 목록을 추가한다.
- [x] 단위 테스트와 빌드 검증을 통과한다.
- [x] Playwright로 렌더와 화면 전환을 검증한다.

## iPhone private GitHub API 동기화 설계

- [x] iPhone에서도 데이터 입력과 GitHub push가 필요하다는 목표를 확정한다.
- [x] 동기화 방식을 private GitHub API 동기화로 확정한다.
- [x] push 방식을 수동 push로 확정한다.
- [x] token은 브라우저 저장으로 확정한다.
- [x] 데이터 저장소는 앱 저장소와 분리된 별도 private repo로 확정한다.
- [x] private sync 설계 문서를 작성한다.
- [ ] 사용자가 설계 문서를 검토하고 구현 계획 작성 여부를 승인한다.

## Notion 금융기관 CMS 설계

- [x] Notion은 거래 데이터가 아니라 금융기관 안내 CMS로 사용한다는 범위를 확정한다.
- [x] Notion에는 안내 문구와 읽기 전용 파서 힌트만 둔다고 확정한다.
- [x] iPhone에서도 GitHub Pages UI가 최신 Notion 기준으로 보여야 한다고 확정한다.
- [x] Notion token은 iPhone에 입력하지 않고 Worker secret으로 보관한다고 확정한다.
- [x] `Notion 금융기관 CMS + Worker` 설계 문서를 작성한다.
- [x] 사용자가 설계 문서를 검토하고 구현 계획 작성 여부를 승인한다.
- [x] 구현 계획 문서를 작성한다.
- [x] 사용자가 구현 실행 방식을 선택한다.

## Notion 금융기관 CMS 구현

- [x] Cloudflare Worker tooling과 `wrangler.toml`을 추가했다.
- [x] Notion 금융기관 페이지를 공개 catalog JSON으로 정규화하는 normalizer를 추가했다.
- [x] Worker `/institutions` API를 추가했다.
- [x] Worker 오류 응답이 Notion 원문 메시지를 public caller에게 반사하지 않게 했다.
- [x] React 앱에 Worker catalog client, localStorage cache, 내장 fallback catalog를 추가했다.
- [x] fallback catalog의 모바일 링크를 iPhone 친화 링크로 맞췄다.
- [x] 파일 파서가 선택 기관의 읽기 전용 column hint를 받을 수 있게 했다.
- [x] 가져오기 화면이 선택 기관 기준으로 링크, 안내 단계, 필수 컬럼, parser hint 요약을 렌더링한다.
- [x] Notion CMS 설정 문서를 작성했다.
- [x] normalizer, catalog service, parser hint 단위 테스트를 통과했다.
- [x] Worker TypeScript 명시 검증을 통과했다.
- [x] 앱 production build를 통과했다.
- [x] Worker secret 없는 local smoke에서 `worker_not_configured` 응답을 확인했다.
- [x] Browser와 Playwright로 desktop/mobile 가져오기 화면 렌더와 기관 선택 상호작용을 검증했다.

## 네이버페이 가져오기 추가

- [x] 네이버페이 소비자 결제내역 다운로드 가능 경로를 확인한다.
- [x] 네이버페이를 내장 금융기관 목록에 추가한다.
- [x] 네이버페이 CSV/TXT 파서 기대 동작 테스트를 먼저 작성하고 실패를 확인한다.
- [x] 네이버페이 거래 출처 라벨과 백업 schema를 맞춘다.
- [x] 가져오기 화면 안내 문구와 검색어를 네이버페이까지 포함하도록 조정한다.
- [x] 관련 Playwright 테스트를 통과한다.
- [x] 앱 production build를 통과한다.
- [x] Browser로 로컬 가져오기 화면에서 네이버페이 선택과 안내 표시를 확인한다.

## 파일 업로드 자동 카드사 판정

- [x] Notion 기관 선택값이 현대카드 파일을 신한카드로 덮어쓰는 실패 테스트를 추가한다.
- [x] 파일명과 헤더 기반 카드사 자동 판정이 Notion 힌트보다 우선하도록 수정한다.
- [x] 파일 업로드 UI에서 Notion 금융기관 선택 의존성을 제거한다.
- [x] 관련 Playwright 테스트를 통과한다.
- [x] 앱 production build를 통과한다.
- [x] 변경사항을 커밋하고 GitHub에 push한다.

## Notion 백업 JSON 기록

- [x] 백업 JSON을 Notion data source page 생성 payload로 변환하는 실패 테스트를 추가한다.
- [x] Worker에 `POST /backups` endpoint를 추가한다.
- [x] 앱 백업 패널에 현재 백업 JSON을 Notion으로 보내는 버튼을 추가한다.
- [x] Notion 백업 요청은 기존 Worker secret만 사용하고 브라우저에 Notion token을 노출하지 않는다.
- [x] 관련 Playwright 테스트와 앱 빌드를 통과한다.
- [x] Worker TypeScript 검증을 통과한다.
- [x] 변경사항을 커밋하고 GitHub에 push한다.

## Notion 백업 행 단위 동기화

- [x] 백업 category와 transaction을 Notion row properties로 변환하는 실패 테스트를 추가한다.
- [x] Worker가 백업용 data source 컬럼을 보강하도록 수정한다.
- [x] Worker가 기존 id row는 업데이트하고 없는 id row는 생성하도록 수정한다.
- [x] 텍스트 JSON page 생성 방식을 제거하고 의미 있는 컬럼 값으로 기록한다.
- [x] 관련 Playwright 테스트와 앱 빌드를 통과한다.
- [x] Worker TypeScript 검증을 통과한다.
- [x] 변경사항을 커밋하고 GitHub에 push한다.

## Notion 백업 실패 진단 개선

- [x] `/backups` Notion schema update 실패가 일반 실패 문구로 뭉개지는 현상을 테스트로 재현했다.
- [x] Worker가 Notion 실패 단계를 안전한 error code로 반환하도록 수정했다.
- [x] GitHub Pages UI가 단계별 Notion 백업 실패 문구를 보여주도록 수정했다.
- [x] 전체 테스트와 빌드를 통과시킨다.
- [x] 변경사항을 커밋하고 푸시한다.

## Notion 백업 HTTP 400 수정

- [x] 기존 select 컬럼의 option 누락을 테스트로 재현한다.
- [x] Worker가 기존 select option을 보존하면서 필요한 option을 보강하도록 수정한다.
- [x] Notion HTTP 400 원문 code/message를 안전하게 UI에 표시한다.
- [x] 전체 테스트와 빌드를 통과시킨다.
- [x] 변경사항을 커밋하고 푸시한다.

## Notion 백업 multi-select 컬럼 대응

- [x] `type is expected to be multi_select` 오류를 기존 Notion 컬럼 타입 불일치로 해석했다.
- [x] `recordType`, `type`, `source`가 multi-select 컬럼이면 multi-select 값으로 쓰도록 테스트를 추가했다.
- [x] 기존 multi-select option을 보존하면서 필요한 option을 보강하도록 수정했다.
- [x] 전체 테스트와 빌드를 통과시킨다.
- [x] 변경사항을 커밋하고 푸시한다.

## Notion 거래 전용 백업과 중복 정리

- [x] category row를 더 이상 Notion 백업 대상으로 만들지 않도록 테스트를 추가했다.
- [x] 기존 category 백업 row를 새 백업 실행 중 휴지통으로 보내도록 테스트를 추가했다.
- [x] 같은 거래 id의 Notion row가 여러 개면 최신 1개만 남기고 중복을 정리하도록 테스트를 추가했다.
- [x] 전체 테스트와 빌드를 통과시킨다.
- [x] 변경사항을 커밋하고 푸시한다.

## Notion 백업 실패 원인 표시 보강

- [x] Worker 내부 예외가 일반 실패 문구로 가려지는 상황을 테스트로 재현한다.
- [x] Worker가 안전한 내부 오류 코드와 메시지를 반환하도록 수정한다.
- [x] GitHub Pages UI가 새 오류 코드를 조치 가능한 문구로 표시한다.
- [x] 관련 테스트와 빌드를 통과시킨다.
- [x] 변경사항을 커밋하고 push한다.

## Notion 백업 subrequest 한도 대응

- [x] Worker가 한 요청에서 Notion 변경 요청을 제한하도록 실패 테스트를 추가한다.
- [x] Worker `/backups`가 cursor 기반 chunk 응답을 반환하도록 수정한다.
- [x] GitHub Pages UI 호출부가 cursor를 따라 여러 번 백업 요청을 이어 보내도록 수정한다.
- [x] 관련 테스트와 빌드를 통과시킨다.
- [x] 변경사항을 커밋하고 push한다.

## 백업 패널 위치 이동

- [x] 현재 백업 화면과 금융기관 가져오기 화면 구조를 확인한다.
- [x] 백업 패널이 금융기관 가져오기 화면에 배치되는 테스트를 추가한다.
- [x] 대시보드 사이드바에서 백업 패널을 제거한다.
- [x] 금융기관 가져오기 화면에 기존 백업 패널 전체를 배치한다.
- [x] 관련 테스트, 빌드, 브라우저 QA를 통과시킨다.
- [x] 변경사항을 커밋하고 push한다.

## 대시보드 push 버튼과 숨김 가져오기 진입

- [x] 거래 입력 폼 아래에 현재 PC 기록 push 버튼을 추가한다.
- [x] 금융기관 가져오기 화면을 일반 내비게이션에서 숨기고 비밀 경로로만 접근하게 한다.
- [x] 상단 설명 문구를 `가계부 달력`으로 정리한다.
- [x] 관련 테스트와 production build를 통과시킨다.
- [x] 변경사항을 커밋하고 push한다.

## Notion title migration 재시작 개선

- [x] Notion 캘린더에서 아직 `tx_...` title 행이 남아 있는지 확인한다.
- [x] 기존 `recordId`가 비어 있는 legacy row가 남아 있는지 확인한다.
- [x] 이미 name title로 migration된 row는 다음 push에서 다시 업데이트하지 않도록 Worker를 수정한다.
- [x] 관련 테스트와 production build를 통과시킨다.
- [x] Worker를 배포하고 변경사항을 커밋, push한다.

## 반응형 화면 개선

- [x] 데스크톱, iPhone 16, iPhone 15 Pro viewport에서 현재 깨짐을 캡처한다.
- [x] 대시보드 상단, 달력, 거래 입력/상세 영역이 작은 폭에서 겹치지 않도록 레이아웃을 조정한다.
- [x] iPhone 16과 iPhone 15 Pro 크기에서 overflow, clipping, console error가 없는지 확인한다.
- [x] 관련 테스트와 production build를 통과시킨다.
- [x] 변경사항을 커밋하고 push한다.
