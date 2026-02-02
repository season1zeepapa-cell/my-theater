// ====================================
// 1단계: 필요한 라이브러리 불러오기
// ====================================
// dotenv: 환경변수(.env 파일)를 읽어오는 도구
require('dotenv').config();

// express: 웹 서버를 만드는 프레임워크
const express = require('express');

// pg: PostgreSQL 데이터베이스와 연결하는 도구
const { Pool } = require('pg');

// cors: 다른 도메인에서 접근할 수 있게 해주는 도구
const cors = require('cors');

// path: 파일 경로를 다루는 도구
const path = require('path');

// ====================================
// 2단계: 서버와 데이터베이스 초기화
// ====================================
const app = express(); // Express 서버 생성
const PORT = process.env.PORT || process.env.AVAILABLE_PORT || 3001; // 포트 번호 설정 (Vercel 호환)

// PostgreSQL 데이터베이스 연결 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Supabase는 SSL 연결 필요
  }
});

// ====================================
// 3단계: 미들웨어 설정
// ====================================
// 미들웨어란? 요청과 응답 사이에서 동작하는 중간 처리 함수들이에요

app.use(cors()); // 다른 도메인에서도 API 호출 가능하게
app.use(express.json()); // JSON 데이터를 받을 수 있게
app.use(express.static(path.join(__dirname))); // HTML, CSS, JS 파일 서빙

// ====================================
// 4단계: 데이터베이스 테이블 초기화
// ====================================
// 서버가 시작될 때 필요한 테이블을 자동으로 생성해요
async function initializeDatabase() {
  try {
    // contents 테이블: 영화와 도서 정보를 저장하는 곳
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contents (
        id SERIAL PRIMARY KEY,
        type VARCHAR(10) NOT NULL,
        title VARCHAR(255) NOT NULL,
        poster_url TEXT,
        release_date VARCHAR(50),
        genre VARCHAR(100),
        author VARCHAR(255),
        publisher VARCHAR(255),
        description TEXT,
        external_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // reviews 테이블: 리뷰와 별점을 저장하는 곳
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        one_liner TEXT,
        detailed_review TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ 데이터베이스 테이블이 준비되었습니다!');
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 오류:', error);
  }
}

// ====================================
// 5단계: API 엔드포인트 - 영화 검색
// ====================================
// TMDB API를 사용해서 영화 정보를 검색해요
app.get('/api/search/movies', async (req, res) => {
  const { query } = req.query; // 사용자가 입력한 검색어

  if (!query) {
    return res.status(400).json({ error: '검색어를 입력해주세요' });
  }

  if (!process.env.TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB API 키가 설정되지 않았습니다' });
  }

  try {
    // fetch를 사용해서 TMDB API에 요청을 보내요
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&language=ko-KR&query=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    // 검색 결과를 우리가 사용하기 쉬운 형태로 변환
    const movies = data.results.map(movie => ({
      type: 'movie',
      title: movie.title,
      poster_url: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      release_date: movie.release_date,
      genre: movie.genre_ids.join(', '), // 장르 ID들을 문자열로 변환
      description: movie.overview,
      external_id: movie.id.toString()
    }));

    res.json(movies);
  } catch (error) {
    console.error('영화 검색 오류:', error);
    res.status(500).json({ error: '영화 검색 중 오류가 발생했습니다' });
  }
});

// ====================================
// 6단계: API 엔드포인트 - 도서 검색
// ====================================
// Google Books API를 사용해서 도서 정보를 검색해요
app.get('/api/search/books', async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: '검색어를 입력해주세요' });
  }

  if (!process.env.GOOGLE_BOOKS_API_KEY) {
    return res.status(500).json({ error: 'Google Books API 키가 설정되지 않았습니다' });
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${process.env.GOOGLE_BOOKS_API_KEY}&langRestrict=ko`
    );

    const data = await response.json();

    if (!data.items) {
      return res.json([]);
    }

    // 검색 결과를 우리가 사용하기 쉬운 형태로 변환
    const books = data.items.map(item => ({
      type: 'book',
      title: item.volumeInfo.title,
      poster_url: item.volumeInfo.imageLinks?.thumbnail || null,
      author: item.volumeInfo.authors?.join(', ') || '저자 미상',
      publisher: item.volumeInfo.publisher || '출판사 미상',
      release_date: item.volumeInfo.publishedDate || '',
      description: item.volumeInfo.description || '',
      external_id: item.id
    }));

    res.json(books);
  } catch (error) {
    console.error('도서 검색 오류:', error);
    res.status(500).json({ error: '도서 검색 중 오류가 발생했습니다' });
  }
});

// ====================================
// 7단계: API 엔드포인트 - 콘텐츠 저장
// ====================================
// 검색한 영화/도서를 내 아카이브에 추가해요
app.post('/api/contents', async (req, res) => {
  const { type, title, poster_url, release_date, genre, author, publisher, description, external_id } = req.body;

  try {
    // 데이터베이스에 INSERT (삽입) 명령 실행
    const result = await pool.query(
      `INSERT INTO contents (type, title, poster_url, release_date, genre, author, publisher, description, external_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [type, title, poster_url, release_date, genre, author, publisher, description, external_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('콘텐츠 저장 오류:', error);
    res.status(500).json({ error: '콘텐츠 저장 중 오류가 발생했습니다' });
  }
});

// ====================================
// 8단계: API 엔드포인트 - 콘텐츠 목록 조회
// ====================================
// 저장된 모든 콘텐츠를 가져오거나 필터링해서 가져와요
app.get('/api/contents', async (req, res) => {
  const { type, genre, sort } = req.query; // 필터 조건들

  try {
    let query = `
      SELECT c.*,
             COALESCE(AVG(r.rating), 0) as avg_rating,
             COUNT(r.id) as review_count
      FROM contents c
      LEFT JOIN reviews r ON c.id = r.content_id
    `;

    const conditions = [];
    const values = [];
    let paramCount = 1;

    // 타입 필터 (영화 또는 도서)
    if (type) {
      conditions.push(`c.type = $${paramCount}`);
      values.push(type);
      paramCount++;
    }

    // 장르 필터
    if (genre) {
      conditions.push(`c.genre LIKE $${paramCount}`);
      values.push(`%${genre}%`);
      paramCount++;
    }

    // WHERE 조건이 있으면 추가
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // GROUP BY: 같은 콘텐츠끼리 묶어요
    query += ' GROUP BY c.id';

    // 정렬 옵션
    if (sort === 'rating') {
      query += ' ORDER BY avg_rating DESC, c.created_at DESC';
    } else if (sort === 'date') {
      query += ' ORDER BY c.created_at DESC';
    } else {
      query += ' ORDER BY c.created_at DESC'; // 기본: 최신순
    }

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('콘텐츠 조회 오류:', error);
    res.status(500).json({ error: '콘텐츠 조회 중 오류가 발생했습니다' });
  }
});

// ====================================
// 9단계: API 엔드포인트 - 특정 콘텐츠 상세 조회
// ====================================
app.get('/api/contents/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 콘텐츠 정보 가져오기
    const contentResult = await pool.query(
      'SELECT * FROM contents WHERE id = $1',
      [id]
    );

    if (contentResult.rows.length === 0) {
      return res.status(404).json({ error: '콘텐츠를 찾을 수 없습니다' });
    }

    // 해당 콘텐츠의 리뷰들 가져오기
    const reviewsResult = await pool.query(
      'SELECT * FROM reviews WHERE content_id = $1 ORDER BY created_at DESC',
      [id]
    );

    res.json({
      content: contentResult.rows[0],
      reviews: reviewsResult.rows
    });
  } catch (error) {
    console.error('콘텐츠 상세 조회 오류:', error);
    res.status(500).json({ error: '콘텐츠 조회 중 오류가 발생했습니다' });
  }
});

// ====================================
// 10단계: API 엔드포인트 - 리뷰 작성
// ====================================
app.post('/api/reviews', async (req, res) => {
  const { content_id, rating, one_liner, detailed_review } = req.body;

  // 입력값 검증
  if (!content_id || !rating) {
    return res.status(400).json({ error: '콘텐츠 ID와 별점은 필수입니다' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: '별점은 1~5 사이여야 합니다' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO reviews (content_id, rating, one_liner, detailed_review)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [content_id, rating, one_liner, detailed_review]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('리뷰 저장 오류:', error);
    res.status(500).json({ error: '리뷰 저장 중 오류가 발생했습니다' });
  }
});

// ====================================
// 10-1단계: API 엔드포인트 - 리뷰 목록 조회
// ====================================
// GET /api/reviews?sort=date&limit=6
// 리뷰 목록을 최신순 또는 별점순으로 조회하는 엔드포인트
app.get('/api/reviews', async (req, res) => {
  try {
    // 쿼리 파라미터 파싱
    const { sort = 'date', limit = 10 } = req.query;

    // 정렬 조건 (SQL 인젝션 방지를 위해 검증)
    const orderBy = sort === 'rating'
      ? 'r.rating DESC, r.created_at DESC'
      : 'r.created_at DESC';

    // 제한 개수 (최대 100개로 제한)
    const limitCount = Math.min(parseInt(limit) || 10, 100);

    // 쿼리 실행: 리뷰와 콘텐츠 정보를 JOIN
    // r: reviews 테이블
    // c: contents 테이블
    const result = await pool.query(
      `SELECT
         r.id,
         r.content_id,
         r.rating,
         r.one_liner,
         r.detailed_review,
         r.created_at,
         c.title as content_title,
         c.type as content_type,
         c.poster_url
       FROM reviews r
       INNER JOIN contents c ON r.content_id = c.id
       ORDER BY ${orderBy}
       LIMIT $1`,
      [limitCount]
    );

    // JSON 형태로 응답
    res.json(result.rows);

  } catch (error) {
    console.error('리뷰 목록 조회 오류:', error);
    res.status(500).json({ error: '리뷰 목록 조회 중 오류가 발생했습니다' });
  }
});

// ====================================
// 11단계: API 엔드포인트 - 리뷰 수정
// ====================================
app.put('/api/reviews/:id', async (req, res) => {
  const { id } = req.params;
  const { rating, one_liner, detailed_review } = req.body;

  try {
    const result = await pool.query(
      `UPDATE reviews
       SET rating = $1, one_liner = $2, detailed_review = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [rating, one_liner, detailed_review, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '리뷰를 찾을 수 없습니다' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('리뷰 수정 오류:', error);
    res.status(500).json({ error: '리뷰 수정 중 오류가 발생했습니다' });
  }
});

// ====================================
// 12단계: API 엔드포인트 - 리뷰 삭제
// ====================================
app.delete('/api/reviews/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM reviews WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '리뷰를 찾을 수 없습니다' });
    }

    res.json({ message: '리뷰가 삭제되었습니다' });
  } catch (error) {
    console.error('리뷰 삭제 오류:', error);
    res.status(500).json({ error: '리뷰 삭제 중 오류가 발생했습니다' });
  }
});

// ====================================
// 13단계: API 엔드포인트 - 콘텐츠 삭제
// ====================================
app.delete('/api/contents/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // ON DELETE CASCADE 덕분에 리뷰도 자동으로 삭제됩니다
    const result = await pool.query(
      'DELETE FROM contents WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '콘텐츠를 찾을 수 없습니다' });
    }

    res.json({ message: '콘텐츠가 삭제되었습니다' });
  } catch (error) {
    console.error('콘텐츠 삭제 오류:', error);
    res.status(500).json({ error: '콘텐츠 삭제 중 오류가 발생했습니다' });
  }
});

// ====================================
// 14단계: 메인 페이지 서빙
// ====================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ====================================
// 15단계: 서버 시작
// ====================================
async function startServer() {
  await initializeDatabase(); // 데이터베이스 테이블 생성

  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║   🎬 My Theater 서버가 시작되었습니다!   ║
╚═══════════════════════════════════════╝

📍 접속 주소: http://localhost:${PORT}
🗄️  데이터베이스: PostgreSQL (Supabase)
🎥 TMDB API: ${process.env.TMDB_API_KEY ? '✅ 설정됨' : '❌ 미설정'}
📚 Google Books API: ${process.env.GOOGLE_BOOKS_API_KEY ? '✅ 설정됨' : '❌ 미설정'}

💡 API 키가 미설정된 경우 .env 파일을 확인해주세요!
    `);
  });
}

startServer();
