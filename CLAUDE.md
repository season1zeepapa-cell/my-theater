# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**My Theater**는 개인 영화/도서 아카이브 시스템입니다. Node.js + Express 백엔드와 Vanilla JavaScript + Tailwind CSS 프론트엔드로 구성된 풀스택 웹 애플리케이션입니다.

- **백엔드**: Express 서버 (server.js / api/index.js)
- **프론트엔드**: 단일 HTML 파일 (index.html) + 클라이언트 JavaScript (client.js)
- **데이터베이스**: PostgreSQL (Supabase 호스팅)
- **외부 API**: TMDB (영화 정보), Google Books (도서 정보)
- **배포**: Vercel (Serverless Function + 정적 파일)

## 개발 명령어

```bash
# 의존성 설치
npm install

# 로컬 서버 실행 (http://localhost:3001)
npm run dev
# 또는
npm start
```

## 환경 설정

`.env` 파일 필수 설정:
- `DATABASE_URL`: Supabase PostgreSQL 연결 문자열
- `AVAILABLE_PORT`: 서버 포트 (기본값: 3001)
- `TMDB_API_KEY`: The Movie Database API 키
- `GOOGLE_BOOKS_API_KEY`: Google Books API 키

## 아키텍처

### 이중 배포 모델

| 환경 | 진입점 | 특징 |
|------|--------|------|
| 로컬 개발 | `server.js` | Express 서버, `.env` 파일 사용 |
| Vercel 프로덕션 | `api/index.js` | Serverless Function, Dashboard 환경변수 |

### 데이터베이스 스키마

```
contents 테이블
├── id, type (movie|book), title, poster_url
├── release_date, genre, description, external_id
└── author, publisher (도서 전용)

reviews 테이블
├── id, content_id (FK → contents.id)
├── rating (1-5), one_liner, detailed_review
└── CASCADE 삭제: 콘텐츠 삭제 시 리뷰 자동 삭제
```

### API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/search/movies?query=` | TMDB 영화 검색 |
| GET | `/api/search/books?query=` | Google Books 도서 검색 |
| GET | `/api/contents` | 콘텐츠 목록 (필터: type, sort) |
| GET | `/api/contents/:id` | 콘텐츠 상세 + 리뷰 목록 |
| POST | `/api/contents` | 콘텐츠 추가 |
| DELETE | `/api/contents/:id` | 콘텐츠 삭제 |
| GET | `/api/reviews` | 리뷰 목록 (필터: sort, limit) |
| POST | `/api/reviews` | 리뷰 작성 |
| PUT | `/api/reviews/:id` | 리뷰 수정 |
| DELETE | `/api/reviews/:id` | 리뷰 삭제 |

## 클라이언트 구조 (client.js)

### 전역 상태

```javascript
currentSearchType      // 'movie' | 'book'
currentRating          // 선택한 별점 (1-5)
currentEditingReviewId // 수정 중인 리뷰 ID (null: 작성 모드)
rollerPausedState      // 각 롤러 일시정지 상태
heroContents           // 히어로 슬라이드쇼 콘텐츠 배열
heroCurrentIndex       // 현재 히어로 인덱스
heroIntervalId         // 슬라이드쇼 타이머 ID
```

### 핵심 함수 흐름

```
페이지 로드
├── loadContents()      → 아카이브 (리뷰 없는 콘텐츠)
├── loadMoviesSection() → 내가 본 영화 (리뷰 있는 영화)
├── loadBooksSection()  → 내가 읽은 책 (리뷰 있는 책)
├── loadReviewsSection()→ 내가 쓴 리뷰
├── setupStarRating()   → 별점 클릭 이벤트
└── setupRollerClickControl() → 롤러 클릭 제어

검색 → addToArchive() 또는 addToArchiveAndReview() → 섹션 새로고침
리뷰 작성 → submitReview() → 섹션 새로고침 + 모달 닫기
```

### 이벤트 위임 패턴

롤러 카드는 `innerHTML` 복제로 생성되므로 `onclick` 속성이 손실됨.
대신 `data-content-id` 속성과 이벤트 위임 사용:

```javascript
// setupRollerClickControl()에서 처리
inner.addEventListener('click', function(event) {
  const card = event.target.closest('[data-content-id]');
  if (card) {
    viewContentDetail(card.getAttribute('data-content-id'));
  }
}, true);
```

## 프론트엔드 스타일

### 컬러 팔레트 (Netflix 스타일)

- 배경: `#141414` (bg-[#141414])
- 카드 배경: `#181818` (bg-[#181818])
- 강조색: `#E50914` (bg-[#E50914])
- 버튼 호버: `#333` (bg-[#333])

### 주요 UI 섹션

1. **헤더**: 로고 + 필터(타입/정렬) + 콘텐츠 추가 버튼
2. **히어로 섹션**: 5초 자동 슬라이드쇼, 페이드 전환
3. **내 아카이브**: 리뷰 없는 콘텐츠 (가로 스크롤)
4. **내가 본 영화/읽은 책**: 리뷰 있는 콘텐츠 (자동 롤링)
5. **내가 쓴 리뷰**: 리뷰 카드 (자동 롤링)

### 모달

- `#searchModal`: 영화/도서 검색 및 추가
- `#reviewModal`: 리뷰 작성/수정
- `#reviewDetailModal`: 리뷰 상세 보기

## 코드 수정 시 주의사항

1. **SQL 인젝션 방지**: 파라미터화된 쿼리 (`$1, $2`) 필수
2. **UI 동기화**: 데이터 변경 후 관련 섹션 새로고침 함수 호출
3. **모달 닫기**: `resumeAllRollers()` 호출하여 롤러 재생
4. **한글 주석**: 모든 주석은 한국어, 초보자 친화적 스타일 유지
5. **이벤트 위임**: 동적 생성 요소는 `data-*` 속성 + 이벤트 위임 사용

## Vercel 배포

### vercel.json 설정

```json
{
  "version": 2,
  "builds": [
    { "src": "index.html", "use": "@vercel/static" },
    { "src": "client.js", "use": "@vercel/static" },
    { "src": "api/index.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.js" },
    { "src": "/(.*)", "dest": "/$1" }
  ]
}
```

### 환경 변수 설정

```bash
# Vercel CLI로 환경 변수 추가
echo 'value' | vercel env add VARIABLE_NAME production
vercel --prod  # 재배포
```

### 필수 파일 (삭제 금지)

- `vercel.json` - 빌드 설정
- `api/index.js` - Serverless Function
- `index.html` - 메인 UI
- `client.js` - 클라이언트 로직
- `package.json` - 의존성

## 외부 API 제약사항

- **TMDB**: `language=ko-KR` 파라미터로 한국어 결과
- **Google Books**: `langRestrict=ko` 파라미터로 한국어 도서
- **Supabase PostgreSQL**: SSL 연결 필수 (`rejectUnauthorized: false`)
