# Repository Guidelines

## 프로젝트 구조 & 모듈 구성
- `server.js`: Express API 서버 및 DB 초기화/스키마 생성 로직.
- `client.js`: 브라우저에서 실행되는 UI/상태 관리 로직.
- `index.html`: 단일 페이지 UI (Tailwind CDN 사용).
- `.env` / `.env.example`: 환경 변수(포트, DB, 외부 API 키) 설정.

## 빌드, 테스트, 개발 명령
- `npm install`: 의존성 설치.
- `npm run dev`: 로컬 서버 실행(`server.js` 실행). 기본 포트는 `AVAILABLE_PORT`(기본 3001).
- `npm start`: 운영/로컬 실행용 동일 명령.
예: `npm run dev` 후 `http://localhost:3001` 접속.

## 코딩 스타일 & 네이밍 규칙
- 언어: Node.js + Vanilla JS.
- 포매터/린터: 현재 설정 없음(ESLint/Prettier 미사용).
- 스타일 가이드: 기존 파일과 동일한 형식 유지(들여쓰기, 주석 스타일 등).  
  예: 함수/변수는 `camelCase`, 상수는 `UPPER_SNAKE_CASE`.
- 주석: 기존 코드와 동일하게 한글 설명형 주석을 유지.

## 테스트 가이드라인
- 테스트 프레임워크가 아직 없습니다.
- 신규 기능 추가 시, 최소한 수동 테스트 절차를 PR에 명시하세요.
  예: “검색 → 추가 → 리뷰 작성 → 삭제” 경로 재현.
- 자동 테스트를 도입한다면 `tests/` 또는 `__tests__/` 디렉터리를 권장합니다.

## 커밋 & PR 가이드
- Git 히스토리가 없어 커밋 규칙을 확정할 수 없습니다.
- 권장 형식: `feat: ...`, `fix: ...`, `chore: ...` 등 간결한 접두사 사용.
- PR에는 다음을 포함하세요:
  - 변경 요약(무엇/왜).
  - 관련 이슈 번호(있다면).
  - UI 변경 시 스크린샷 또는 간단한 GIF.

## 보안 & 환경 설정
- `.env`에 `DATABASE_URL`, `TMDB_API_KEY`, `GOOGLE_BOOKS_API_KEY`가 필수입니다.
- 외부 API 호출 실패 시 사용자 메시지가 노출되므로 키 유효성을 먼저 확인하세요.
- 프로덕션 배포 시 `.env` 파일 대신 호스팅 플랫폼의 환경 변수 설정을 사용하세요.
