# 체크리스트 앱 인수인계 (v32 · 2026-10-24 기준)

새 세션에서 이어서 작업할 때 이 문서부터 읽으세요. 사용자는 한국어로 대화하고, Claude를 "코딩 엔지니어"로 대합니다. 요청을 받으면 바로 구현 → 테스트 → 배포까지 하고, 결과를 짧게 한국어로 설명하는 흐름이 익숙합니다.

## 1. 한눈에 보기
- **무엇**: 개인용 할 일·습관·분량 목표 체크리스트 PWA. 갤럭시 S25 홈 화면에 설치해서 씀 (PC에서도 같은 데이터).
- **주소**: https://choo1014.github.io/checklist/
- **저장소**: GitHub `Choo1014/checklist` (main 브랜치에 push하면 GitHub Pages로 바로 배포)
- **구조**: 빌드 없음. `index.html` 한 파일 안에 CSS + JS(IIFE) 전부. `sw.js`(서비스 워커), `manifest.webmanifest`, 아이콘, `vendor/`(Firebase compat SDK 10.14.1 직접 포함).
- **현재 버전**: `index.html`의 `APP_VERSION="v32"` 과 `sw.js`의 `VERSION = "v32"` — **배포할 때마다 둘 다 올려야** 폰에서 새 버전을 받음 (sw는 network-first + no-cache, 새 SW가 잡히면 자동 새로고침).

## 2. 배포·테스트 방법
- 커밋: `git -c user.name="Choo1014" -c user.email="Choo1014@users.noreply.github.com" commit -m "…"` 후 `git push`. 커밋 메시지는 한국어 한 줄 요약.
- 문법 확인: `<script>` 내용을 뽑아 `node --check`.
- 동작 확인: 저장소 폴더에서 `python3 -m http.server 8765` → Playwright(Chromium 설치돼 있음)로 시나리오 실행. `page.clock.install()`로 날짜 고정, `add_init_script`로 `window.firebase`와 `fetch`(구글 캘린더 API)를 가짜로 바꿔서 테스트. 캘린더 DELETE 가짜 응답은 `new Response(null,{status:204})`.
- 컨테이너에서는 외부 사이트 접속이 막혀 있음 (npm·GitHub만 됨). 구글 폰트 요청 실패 경고는 무시해도 됨.

## 3. 데이터
- 기기 저장: `localStorage["checklist-v4"]` 에 상태 `S` 전체(JSON). 최근 7일 스냅샷 `checklist-snapshots`, 불러오기 실패 시 덮어쓰기 방지(loadFailed).
- `S` 주요 필드: `items`(할 일: text, group, sub, due, done, doneAt, prio, mission, dur, u), `quests`(반복 퀘스트: title, days[요일], start, end, log{날짜:true}, read?, plan?, dur, mission), `missions`, `wishes`, `wishKinds`, `subs`(그룹별 세부 카테고리), `catMeta`(아이콘·색), `routine`(기상·취침·식사 시간), `sched`(스케쥴: `{ "YYYY-MM-DD": [{key:"items/ID"|"quests/ID", s:분, e:분}] }`), `tomb`(삭제 표시), `setU`.
- 분량 목표 `q.read = {unit:"page"|"min"|"ep", total, cur, start, end, epMin?, hist:{날짜:{from,to}}}` — 매일 목표 = 남은 분량 ÷ 남은 요일 수 (자동 재조정).
- 그룹: `input`(인풋) / `output`(아웃풋) / `etc`(기타) + 위시리스트.

## 4. 클라우드 동기화 (Firebase)
- 프로젝트 `todolist-a61b5`, Google 로그인, Firestore 문서 `users/{uid}/state/main` = `{json, at, v}`.
- 항목별 `u`(수정 시각)로 병합, 삭제는 `S.tomb`, 설정 묶음은 `S.setU`로 병합. 승인된 도메인에 `choo1014.github.io` 등록돼 있음.

## 5. 구글 캘린더 연동
- 설정 → 구글 캘린더에서 연결. `reauthenticateWithPopup`으로 `calendar.events` 권한 토큰(약 55분, sessionStorage `checklist-caltok`).
- 이벤트 ID는 날짜+할 일로 고정(`evId`) → PUT, 없으면 POST. 기본 캘린더면 colorId "2"(세이지), 전용 캘린더 ID(`checklist-calid`)를 넣으면 그 캘린더 색(사용자는 '투두리스트' 캘린더를 유칼립투스 색으로 만들어 씀).
- **스케쥴러에서 바꾼 것은 임시** → 아래 "미등록 스케쥴 n개 [적용]" 바로만 전송(`checklist-cal-q` 큐). 적용 없이 나가면 경고 창(적용하고 나가기/취소하고 나가기/계속 편집), 그냥 나가면 들어오기 전 상태로 되돌림(`checklist-sched-draft`).
- 알림: 기본 10분 전 (`checklist-cal-remind`, 설정에서 변경).
- 사용자 원칙: **푸시 알림 등 비용이 드는 기능은 만들지 않음** → 알림은 구글 캘린더 앱에 맡김.

## 6. 화면 구성 (route = location.hash)
- `home`: 브랜드, 메인 미션 버튼, 그룹 타일(인풋/아웃풋/기타/위시), 탭 [오늘(날짜 바뀜)/전체/메인 미션] + 스와이프. '오늘' 탭에 날짜 제목·주간 띠(다른 날짜 보기)·진한 초록 **스케쥴러** 버튼.
- `schedule`: 구글 캘린더식 하루 시간표. 위쪽 고정(날짜▾ 달력, 주간 띠, '안 넣은 일' 가로 칩). 빈 칸 누르기=넣을 일 고르기, 일정 누르기=수정 창(날짜, 시작·끝 = 오전/오후 버튼+시·분 선택), **꾹 눌러 끌기**로 이동, 좌우 스와이프로 날짜 이동. 생활 시간(수면·식사) 회색 표시.
- `input`/`output`/`etc`: 그룹 화면. 맨 위 **티끌 모아 태산** 카드(작은 유리병) → `done/{그룹}`.
- `done/{그룹}`: 완료 보관함. 큰 유리병(끝낸 일 하나 = 알갱이 하나, 세부 카테고리 색, 오래된 것부터 아래에 쌓임, 새로 생긴 건 떨어지는 애니메이션), 카테고리 칩 필터, 달별 목록. 할 일은 체크를 풀면 되돌아감.
- 완료 판정: 할 일 `done`, 분량 목표 `cur>=total`, plan 다 채움, 일반 반복 퀘스트는 `end` 지남 (`questDoneAt`).
- `hold`: 홀드된 일정. 분량 목표·반복 퀘스트를 `q.hold={at:날짜}`로 멈춤 → 오늘/스케쥴러/그룹 목록/보관함에서 빠지고 진행도는 유지. 앞으로의 스케쥴 블록은 홀드 때 제거. '다시 시작'하면 멈춘 날 수만큼 start(아직 안 지난 경우)·end를 뒤로 밀고 hold 삭제(`resumeQuest`). 진입: 홈 타일 아래·그룹 화면의 '홀드된 일정 n개', 기록 창/수정 창의 '홀드' 버튼.
- `missions`, `mission/{id}`(트로피 진열장, XP/레벨), `wish`, `settings`(세부 카테고리, 동기화, 구글 캘린더, 생활 시간, 앱 정보/업데이트, 백업·복원).
- 추가 시트(+): 모듈식 — 언제(한 번/반복), 분량 목표(책·쪽 / 영상·분 / 시리즈·화, 제목 검색: Google Books·Wikidata·Jikan·TVmaze), 시간 배정(분), 메인 미션. 세부 카테고리별 기본 형식(FORMATS: 독서=쪽, 시리즈/드라마/애니=화, 영화=영상·분 분량 목표). 분 단위 입력칸(영상 총·지금까지, 시간 배정)은 모두 [시간][분] 두 칸(hmPair).
- 분량 기록 시트: "지금 몇 쪽까지 읽었나요?" (영상은 시간·분 칸 따로), 노랑(부족)/초록(달성) 게이지.

## 7. 사용자가 없애 달라고 한 것 (다시 넣지 말 것)
난이도, 자동 시간 배정, 앱 내 알림/ICS, AI 추천, 분량 나누기, 옛 '독서 계획' 모듈, 로마 숫자, 홈의 '오늘 일정' 카드.

## 8. 사용자 취향·작업 방식
- 실제 폰(갤럭시 S25, 다크 모드)으로 써 보고 스크린샷으로 피드백 줌. 모바일 UX·한눈에 보이는 상태 표시를 중요하게 봄.
- 서버 호출 낭비 싫어함, 공짜로 되는 방법 선호.
- 디자인은 차분한 초록 톤, 선 아이콘(Lucide 스타일), 다크 모드에서 너무 밝은 요소 싫어함. 투박하면 "세련되게" 다시 해 달라고 함.
- 설명은 한국어로 쉽게, 무엇이 바뀌었는지 위주로.

## 9. 다음에 해 볼 만한 것 (요청은 아직 없음)
- 마감일 없는 할 일도 스케쥴러에 넣기.
- 아웃풋/기타 그룹 보관함의 알갱이 개수가 아주 많아질 때(수백 개) 병을 더 크게 보여 주거나 층별 달 표시.
