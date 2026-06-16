# GitHub push 실패 재발 방지 계획

## 목표

아내 휴대폰에서 `GitHub push 실패`로 보이는 문제를 원격 상태와 앱의 GitHub Contents API 처리 흐름으로 진단하고, 실제 실패 원인을 사용자가 알 수 있게 하며 충돌성 실패는 자동 재시도한다.

## 확인한 사실

- `fix: 공유 데이터 자동 반영 병합 처리` 배포 뒤 `data: shared-data 2026-06-16` run `27590239145`가 성공했다.
- 최신 `origin/main`은 `84b29e6 data: shared-data 2026-06-16`이고 `public/shared-data.json`은 `exportedAt=2026-06-16T02:35:28.344Z`, 거래 555건이다.
- 따라서 서버 배포 자체는 성공했으며, 폰에서 본 실패는 브라우저가 GitHub API에 쓰기 요청을 보내는 단계의 실패로 본다.

## 성공 기준

1. GitHub Contents API update가 409 충돌을 받으면 최신 sha를 다시 조회해 재시도한다.
2. 401, 403, 404, 409 같은 흔한 실패는 사용자가 조치 가능한 한국어 메시지로 보여준다.
3. 관련 테스트와 production build를 통과시킨다.
4. main에 push하고 Pages deploy 성공을 확인한다.
