# iPhone Private GitHub Sync Design

## 목표

iPhone에서 거래를 직접 입력하고, 사용자가 누르는 수동 push로 별도 private GitHub 저장소의 JSON 데이터 파일에 동기화한다.

앱 자체는 기존 GitHub Pages 정적 웹앱으로 유지한다. 실제 가계부 데이터는 공개 `public/shared-data.json`에 두지 않고, GitHub Contents API 인증을 거쳐 private 저장소에서만 읽고 쓴다.

## 확정 사항

- 동기화 방식은 private GitHub API 동기화다.
- push는 자동이 아니라 사용자가 누르는 수동 push다.
- GitHub token은 사용자가 앱 설정 화면에 입력하고 해당 브라우저에 저장한다.
- 데이터는 앱 저장소와 분리된 별도 private GitHub 저장소에 둔다.
- token 권한은 데이터 저장소 하나에 대한 fine-grained personal access token의 `Contents: Read and write`로 제한한다.
- iPhone은 데이터 입력, 로컬 저장, pull 병합, 수동 push를 모두 지원해야 한다.

## 아키텍처

공개 앱과 private 데이터를 분리한다.

- 앱 배포 저장소는 현재 `Household-Account`를 유지한다.
- 데이터 저장소는 별도 private repo를 사용한다.
- 기본 데이터 파일 경로는 `data/household-account.json`로 둔다.
- 앱은 GitHub Contents API로 데이터 파일을 `GET`하고, push 시 `PUT`한다.
- 앱 시작 시 token과 설정이 있으면 원격 데이터를 pull해서 IndexedDB와 병합한다.
- 입력은 항상 IndexedDB에 먼저 저장하고, push 전까지 `동기화 필요` 상태로 표시한다.

GitHub Contents API는 파일 조회와 생성 또는 수정에 모두 사용한다. `PUT`에는 현재 파일의 `sha`가 필요하므로 push 직전에 원격 최신 파일을 다시 조회한다.

## 데이터 모델

private JSON 파일은 기존 백업 데이터 구조를 기반으로 한다.

```ts
type PrivateSyncFile = {
  schemaVersion: 1;
  exportedAt: string;
  categories: Category[];
  transactions: Transaction[];
  tombstones: Tombstone[];
};

type Tombstone = {
  id: string;
  entityType: "category" | "transaction";
  deletedAt: string;
};
```

`schemaVersion`은 이후 암호화 저장, 다중 사용자, 추가 entity가 필요할 때 마이그레이션 기준으로 쓴다.

## 병합 정책

병합은 단순하고 예측 가능하게 유지한다.

- 같은 `transaction.id`가 양쪽에 있으면 `updatedAt`이 최신인 쪽을 남긴다.
- 다른 `transaction.id`는 모두 유지한다.
- 같은 `category.id`가 양쪽에 있으면 `updatedAt`이 최신인 쪽을 남긴다.
- tombstone의 `deletedAt`이 entity의 `updatedAt`보다 최신이면 삭제 상태를 유지한다.
- entity의 `updatedAt`이 tombstone의 `deletedAt`보다 최신이면 복구된 것으로 보고 entity를 유지한다.
- 파일 가져오기 중 생긴 중복 거래는 기존 duplicate key 정리 로직으로 제거한다.

삭제 tombstone은 필수다. 실제 삭제만 하면 PC에서 삭제한 거래가 iPhone 병합 후 다시 살아날 수 있다.

## 동기화 흐름

앱 시작 시.

1. IndexedDB의 로컬 데이터를 읽는다.
2. GitHub sync 설정과 token이 있으면 private repo 파일을 읽는다.
3. 원격 파일이 없으면 로컬 데이터를 기준으로 초기 push 가능 상태를 표시한다.
4. 원격 파일이 있으면 로컬 데이터와 병합한다.
5. 병합 결과를 IndexedDB에 반영한다.
6. 마지막 pull 시각과 원격 `sha`를 저장한다.

사용자가 거래를 입력할 때.

1. 거래를 IndexedDB에 저장한다.
2. 로컬 dirty 상태를 표시한다.
3. 자동 push는 하지 않는다.

사용자가 push를 누를 때.

1. 원격 파일의 최신 `sha`와 내용을 조회한다.
2. 원격 내용과 로컬 내용을 다시 병합한다.
3. 병합 결과를 IndexedDB에 저장한다.
4. 병합 결과를 GitHub Contents API `PUT`으로 업로드한다.
5. 성공하면 dirty 상태를 해제하고 마지막 push 시각과 commit 정보를 표시한다.

## 보안

정적 웹앱은 서버가 없으므로 token을 서버에 숨길 수 없다. 1차 구현은 사용자가 입력한 fine-grained token을 해당 브라우저에 저장하는 현실적인 방식으로 간다.

필수 보안 기준.

- token은 코드, 문서 샘플, `public` asset, GitHub 커밋에 절대 포함하지 않는다.
- token 권한은 데이터 private repo 하나로 제한한다.
- token 권한은 `Contents: Read and write`만 부여한다.
- token 만료일을 설정한다.
- 설정 화면에는 token 저장 범위와 권한 제한 안내를 표시한다.
- push 실패 메시지에는 token 전체값을 표시하지 않는다.

2차 보안 개선 후보.

- token을 저장하지 않고 매 세션 입력한다.
- WebCrypto와 사용자 passcode로 token을 암호화 저장한다.
- GitHub API를 호출하는 작은 서버리스 프록시를 둔다.

## UI

기존 `GitHubSharedDataPanel` 개념을 private sync 설정과 상태 패널로 바꾼다.

설정 항목.

- owner.
- repo.
- branch.
- path.
- token.

상태 표시.

- 마지막 pull 시각.
- 마지막 push 시각.
- 로컬 변경 있음.
- 원격 파일 없음.
- push 성공 commit 링크.
- pull 또는 push 실패 사유.

주요 액션.

- 설정 저장.
- 설정 지우기.
- GitHub에서 pull.
- GitHub에 push.

수동 push가 확정 사항이므로 거래 입력 직후 자동 네트워크 요청은 하지 않는다.

## PWA와 iPhone 고려사항

iPhone 입력을 1급 워크플로로 지원하기 위해 홈 화면 PWA를 목표로 한다.

- `manifest.webmanifest`를 추가한다.
- Apple touch icon을 추가한다.
- `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style` meta를 추가한다.
- safe-area CSS를 추가한다.
- service worker는 앱 shell 캐시까지만 담당한다.
- GitHub API 응답과 private 데이터 JSON은 캐시하지 않는다.
- 파일 import의 drag/drop UX는 iPhone에서 보조 기능으로만 취급하고, 파일 선택과 텍스트 붙여넣기를 우선한다.
- 달력 7열, Recharts 차트, import preview table은 iPhone 폭에서 별도 QA한다.

## 공개 shared-data 처리

기존 `public/shared-data.json` 기반 자동 로드는 private sync와 충돌한다.

1차 구현에서는 공개 shared data 자동 로드를 비활성화한다. 기존 파일은 마이그레이션이나 데모가 필요할 때만 수동으로 가져오는 대상으로 남길 수 있다.

## 검증 기준

- `npm run build`가 통과한다.
- private sync 병합 함수 단위 테스트가 통과한다.
- tombstone 삭제 병합 테스트가 통과한다.
- token 없는 상태에서 앱이 깨지지 않고 설정 안내를 표시한다.
- 원격 파일이 없을 때 초기 push 가능 상태를 표시한다.
- iPhone Safari 또는 WebKit 모바일 viewport에서 거래 입력 UI가 사용 가능하다.
- iPhone에서 거래 입력 후 수동 push를 누르면 private repo JSON이 갱신된다.
- PC에서 pull하면 iPhone에서 입력한 거래가 보인다.
- PC에서 삭제 후 push하고 iPhone에서 pull하면 삭제된 거래가 다시 살아나지 않는다.

## 참고 문서

- GitHub REST API repository contents. https://docs.github.com/en/rest/repos/contents
- Apple Safari web application configuration. https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
- WebKit storage policy updates. https://webkit.org/blog/14403/updates-to-storage-policy/
