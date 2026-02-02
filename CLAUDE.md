# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**My Theater**는 개인 영화/도서 아카이브 시스템입니다. Node.js + Express 백엔드와 Vanilla JavaScript + Tailwind CSS 프론트엔드로 구성된 풀스택 웹 애플리케이션입니다.

- **백엔드**: Express 서버 (server.js)
- **프론트엔드**: 단일 HTML 파일 (index.html) + 클라이언트 JavaScript (client.js)
- **데이터베이스**: PostgreSQL (Supabase 호스팅)
- **외부 API**: TMDB (영화 정보), Google Books (도서 정보)

## 개발 명령어

### 서버 실행
```bash
npm run dev
# 또는
npm start
```

서버는 기본적으로 `http://localhost:3001`에서 실행됩니다 (포트는 `.env`의 `AVAILABLE_PORT`로 변경 가능).

### 의존성 설치
```bash
npm install
```

## 환경 설정

`.env` 파일 설정이 필수입니다. `.env.example`을 참고하여 다음 항목을 설정하세요:

- `DATABASE_URL`: Supabase PostgreSQL 연결 문자열
- `AVAILABLE_PORT`: 서버 포트 (기본값: 3001)
- `TMDB_API_KEY`: The Movie Database API 키
- `GOOGLE_BOOKS_API_KEY`: Google Books API 키

## 아키텍처 및 코드 구조

### 1. 서버 구조 (server.js)

**초기화 단계 (1-4단계)**:
- 라이브러리 로드 (Express, PostgreSQL, CORS, dotenv)
- PostgreSQL 연결 풀 설정 (SSL 필수)
- 미들웨어 설정 (CORS, JSON 파싱, 정적 파일 서빙)
- 데이터베이스 테이블 자동 생성 (`initializeDatabase`)

**데이터베이스 스키마**:
- `contents` 테이블: 영화/도서 메타데이터 저장
  - 공통 필드: id, type, title, poster_url, release_date, description, external_id
  - 영화 전용: genre
  - 도서 전용: author, publisher
- `reviews` 테이블: 사용자 리뷰 저장
  - content_id (FK), rating (1-5), one_liner, detailed_review
  - CASCADE 삭제: 콘텐츠 삭제 시 관련 리뷰 자동 삭제

**API 엔드포인트** (5-13단계):
- `GET /api/search/movies?query=`: TMDB API를 통한 영화 검색
- `GET /api/search/books?query=`: Google Books API를 통한 도서 검색
- `POST /api/contents`: 콘텐츠 아카이브에 추가
- `GET /api/contents`: 콘텐츠 목록 조회 (필터링/정렬 지원)
  - 쿼리 파라미터: `type` (movie|book), `genre`, `sort` (date|rating)
  - LEFT JOIN으로 평균 평점 계산
- `GET /api/contents/:id`: 특정 콘텐츠 상세 정보 + 리뷰 목록
- `POST /api/reviews`: 리뷰 작성
- `PUT /api/reviews/:id`: 리뷰 수정
- `DELETE /api/reviews/:id`: 리뷰 삭제
- `DELETE /api/contents/:id`: 콘텐츠 삭제 (리뷰 CASCADE)

### 2. 클라이언트 구조 (client.js)

**전역 상태 관리**:
- `currentSearchType`: 현재 검색 타입 ('movie' | 'book')
- `currentRating`: 리뷰 작성 시 선택한 별점

**핵심 함수 흐름**:
```
페이지 로드 → loadContents() → displayHeroContent() + displayContents()
                                    ↓
검색 → searchContent() → displaySearchResults() → addToArchive() → loadContents()
                                                                       ↓
리뷰 작성 → openReviewModal() → submitReview() → loadContents()
```

**모달 관리**:
- `#searchModal`: 영화/도서 검색 및 추가
- `#reviewModal`: 리뷰 작성

**UI 업데이트 로직**:
- `loadContents()`: 필터에 따라 콘텐츠 목록 로드
  - 첫 번째 콘텐츠를 히어로 섹션에 표시
  - 나머지를 그리드로 표시
- 별점 표시: `'★'.repeat(rating) + '☆'.repeat(5 - rating)` 패턴 사용

### 3. 프론트엔드 구조 (index.html)

**스타일링**: Tailwind CSS CDN 사용
- 다크 테마: `bg-gray-900`, `text-white`
- 그라데이션: `bg-gradient-to-r from-purple-400 to-pink-600`
- 반응형: `md:`, `lg:` 브레이크포인트 활용

**주요 섹션**:
1. **헤더** (`<header>`): 로고 + 콘텐츠 추가 버튼
2. **검색 모달**: 타입 선택 → 검색 → 결과 표시 → 추가
3. **리뷰 모달**: 별점 선택 → 한줄평/상세평 입력
4. **히어로 섹션**: 추천 콘텐츠 대형 배너 (첫 번째 콘텐츠 자동 표시)
5. **필터 바**: 타입/정렬 필터 (sticky 위치)
6. **메인 그리드**: 저장된 콘텐츠 카드 그리드

## 주요 개발 패턴

### API 통신 패턴
모든 API 호출은 `async/await` + `try/catch` 패턴을 따릅니다:
```javascript
try {
  const response = await fetch('/api/endpoint', options);
  if (!response.ok) throw new Error('에러 메시지');
  const data = await response.json();
  // 성공 처리
} catch (error) {
  console.error('에러:', error);
  alert('사용자 친화적 에러 메시지');
}
```

### 데이터 변환
- **TMDB → contents**: `movie.poster_path`를 `https://image.tmdb.org/t/p/w500/` 경로로 변환
- **Google Books → contents**: `volumeInfo.imageLinks.thumbnail` 사용, 없으면 null

### 에러 처리
- 클라이언트: `alert()`로 사용자에게 알림 (간단한 UI)
- 서버: `console.error()` + HTTP 상태 코드 (400, 404, 500)

## 코드 수정 시 주의사항

1. **API 키 검증**: 서버 시작 시 API 키 유무를 콘솔에 표시하므로, 새로운 외부 API 추가 시 동일한 패턴 유지
2. **SQL 인젝션 방지**: 모든 쿼리는 파라미터화된 쿼리 (`$1, $2, ...`) 사용
3. **데이터베이스 스키마 변경**: `initializeDatabase()` 함수에서 `CREATE TABLE IF NOT EXISTS` 사용 → 서버 재시작으로 자동 적용
4. **프론트엔드 동적 업데이트**: 데이터 변경 후 반드시 `loadContents()` 호출하여 UI 동기화
5. **한글 주석**: 모든 주석은 한국어로 작성되어 있으며, 초보자 친화적 설명 스타일 유지

## 외부 API 제약사항

- **TMDB API**: `language=ko-KR` 파라미터로 한국어 결과 요청
- **Google Books API**: `langRestrict=ko` 파라미터로 한국어 도서만 검색
- **Supabase PostgreSQL**: SSL 연결 필수 (`rejectUnauthorized: false`)

## Vercel 배포 아키텍처

### 이중 배포 모델 (Dual Deployment)

이 프로젝트는 **로컬 개발**과 **Vercel 프로덕션**에서 서로 다른 진입점을 사용합니다:

**로컬 개발 (Local Development):**
- **진입점**: `server.js` - 전통적인 Express 서버
- **포트**: `process.env.AVAILABLE_PORT` 또는 3001
- **정적 파일**: `express.static(__dirname)`로 서빙
- **실행**: `npm run dev`

**Vercel 프로덕션 (Production):**
- **진입점**: `api/index.js` - Vercel Serverless Function
- **정적 파일**: `index.html`, `client.js` - @vercel/static으로 CDN 배포
- **API**: `api/index.js` - @vercel/node로 Serverless Function 배포
- **환경 변수**: Vercel Dashboard에서 설정 (`.env` 파일 사용 안 함)

### vercel.json 설정 구조

**중요**: 이 프로젝트는 **명시적 builds 설정**을 사용합니다. Vercel Zero Config가 아닙니다.

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.html",
      "use": "@vercel/static"
    },
    {
      "src": "client.js",
      "use": "@vercel/static"
    },
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

**왜 명시적 builds를 사용하나요?**
- Zero Config는 정적 파일을 자동 감지하지 못하는 문제 발생
- `builds` 없이는 `index.html`과 `client.js`가 404 에러
- 명시적 설정으로 정적 파일과 Serverless Function을 명확히 분리

### api/index.js vs server.js 차이점

**api/index.js:**
- Vercel Serverless Function으로 export (`module.exports = app`)
- Express 앱을 생성하지만 `.listen()`을 호출하지 않음
- 각 요청마다 콜드 스타트 가능성 있음
- 환경 변수는 Vercel Dashboard에서 주입됨

**server.js:**
- 전통적인 Node.js 서버 (`app.listen(PORT)` 호출)
- `.env` 파일에서 환경 변수 로드
- 로컬 개발 전용
- Vercel에 배포되지 않음 (정적 파일만 배포)

## 환경 변수 관리

### 로컬 개발 환경

`.env` 파일을 프로젝트 루트에 생성:

```env
DATABASE_URL=postgresql://...
AVAILABLE_PORT=3001
TMDB_API_KEY=your_key_here
GOOGLE_BOOKS_API_KEY=your_key_here
```

### Vercel 프로덕션 환경

**CLI를 통한 설정:**

```bash
# DATABASE_URL 추가
echo 'postgresql://...' | vercel env add DATABASE_URL production

# TMDB_API_KEY 추가
echo 'your_tmdb_key' | vercel env add TMDB_API_KEY production

# GOOGLE_BOOKS_API_KEY 추가
echo 'your_books_key' | vercel env add GOOGLE_BOOKS_API_KEY production

# 설정 확인
vercel env ls production

# 재배포하여 환경 변수 적용
vercel --prod
```

**Dashboard를 통한 설정:**
1. https://vercel.com/dashboard 접속
2. my-theater 프로젝트 선택
3. Settings → Environment Variables
4. 3개 변수 추가: `DATABASE_URL`, `TMDB_API_KEY`, `GOOGLE_BOOKS_API_KEY`
5. Environment: Production 선택
6. 저장 후 재배포

**주의사항:**
- 환경 변수 변경 시 **반드시 재배포** 필요
- `.env` 파일은 Vercel에 업로드되지 않음
- `AVAILABLE_PORT`는 Vercel에서 불필요 (자동 할당)

## 배포 문제 해결 (Troubleshooting)

### 1. client.js 404 에러

**증상:**
```
Failed to load resource: client.js:1 404
Uncaught ReferenceError: loadContents is not defined
```

**원인:** 정적 파일이 Vercel에 배포되지 않음

**해결:**
1. `vercel.json`에 명시적 builds 설정 확인:
   ```json
   {
     "src": "client.js",
     "use": "@vercel/static"
   }
   ```
2. 파일이 Git에 커밋되었는지 확인: `git ls-files | grep client.js`
3. `.gitignore`에서 제외되지 않았는지 확인

### 2. API 에러: "TMDB API 키가 설정되지 않았습니다"

**원인:** 환경 변수가 Vercel에 설정되지 않음

**해결:**
```bash
# 환경 변수 확인
vercel env ls production

# 없으면 추가
echo 'your_key' | vercel env add TMDB_API_KEY production
vercel --prod  # 재배포
```

### 3. 빌드 에러: "Missing script: build"

**원인:** package.json에 build 스크립트가 없을 때 발생

**해결:** 이 프로젝트는 빌드 스크립트가 필요 없습니다 (정적 파일만 배포)
- vercel.json에서 builds를 명시적으로 설정했으므로 문제없음

### 4. Deployment Protection 인증 요구

**증상:** 배포된 사이트 접속 시 "Authentication Required" 페이지

**해결:**
1. Vercel Dashboard → my-theater 프로젝트
2. Settings → Deployment Protection
3. Standard Protection 또는 Vercel Authentication 비활성화
4. 프로덕션 도메인(https://my-theater.vercel.app)은 인증 없음

## 핵심 파일 설명

### 배포에 필수적인 파일

**절대 삭제하면 안 되는 파일:**
1. **vercel.json** - Vercel 빌드 설정 (builds와 routes 명시)
2. **api/index.js** - Serverless Function 진입점 (모든 API 처리)
3. **index.html** - 메인 UI (정적 파일)
4. **client.js** - 클라이언트 로직 (정적 파일)
5. **package.json** - 의존성 및 Node.js 버전 명시

**로컬 개발 전용 (Vercel에서 무시됨):**
- **server.js** - 로컬 Express 서버 (Vercel에서 사용 안 함)
- **.env** - 로컬 환경 변수 (Git 제외, Vercel Dashboard 사용)
- **.env.local** - Vercel CLI가 생성하는 로컬 환경 변수 캐시

### 파일 간 관계

```
로컬 개발:
  server.js → PostgreSQL (Supabase)
           → TMDB/Google Books API
           → index.html, client.js (정적 서빙)

Vercel 프로덕션:
  index.html ──┐
  client.js  ──┼─→ CDN (정적 배포)
               │
  api/index.js ─→ Serverless Function
               → PostgreSQL (Supabase)
               → TMDB/Google Books API
```
