// ====================================
// Vercel Serverless Function으로 변환된 My Theater API
// ====================================

// dotenv: 환경변수 로드
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const fetch = require('node-fetch'); // node-fetch를 CommonJS 방식으로 로드

const app = express();

// ====================================
// 데이터베이스 연결 설정
// ====================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// ====================================
// 미들웨어 설정
// ====================================
app.use(cors());
app.use(express.json());

// ====================================
// 데이터베이스 초기화 (한 번만 실행)
// ====================================
let isInitialized = false;

async function initializeDatabase() {
  if (isInitialized) return;

  try {
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

    isInitialized = true;
    console.log('✅ 데이터베이스 테이블이 준비되었습니다!');
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 오류:', error);
  }
}

// ====================================
// API 엔드포인트 - 영화 검색
// ====================================
app.get('/api/search/movies', async (req, res) => {
  await initializeDatabase();

  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: '검색어를 입력해주세요' });
  }

  if (!process.env.TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB API 키가 설정되지 않았습니다' });
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&language=ko-KR&query=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    const movies = data.results.map(movie => ({
      type: 'movie',
      title: movie.title,
      poster_url: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      release_date: movie.release_date,
      genre: movie.genre_ids.join(', '),
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
// API 엔드포인트 - 도서 검색
// ====================================
app.get('/api/search/books', async (req, res) => {
  await initializeDatabase();

  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: '검색어를 입력해주세요' });
  }

  if (!process.env.GOOGLE_BOOKS_API_KEY) {
    return res.status(500).json({ error: 'Google Books API 키가 설정되지 않았습니다' });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${process.env.GOOGLE_BOOKS_API_KEY}&langRestrict=ko`
    );

    const data = await response.json();

    if (!data.items) {
      return res.json([]);
    }

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
// API 엔드포인트 - 콘텐츠 저장
// ====================================
app.post('/api/contents', async (req, res) => {
  await initializeDatabase();

  const { type, title, poster_url, release_date, genre, author, publisher, description, external_id } = req.body;

  try {
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
// API 엔드포인트 - 콘텐츠 목록 조회
// ====================================
app.get('/api/contents', async (req, res) => {
  await initializeDatabase();

  const { type, genre, sort } = req.query;

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

    if (type) {
      conditions.push(`c.type = $${paramCount}`);
      values.push(type);
      paramCount++;
    }

    if (genre) {
      conditions.push(`c.genre LIKE $${paramCount}`);
      values.push(`%${genre}%`);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY c.id';

    if (sort === 'rating') {
      query += ' ORDER BY avg_rating DESC, c.created_at DESC';
    } else if (sort === 'date') {
      query += ' ORDER BY c.created_at DESC';
    } else {
      query += ' ORDER BY c.created_at DESC';
    }

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('콘텐츠 조회 오류:', error);
    res.status(500).json({ error: '콘텐츠 조회 중 오류가 발생했습니다' });
  }
});

// ====================================
// API 엔드포인트 - 특정 콘텐츠 상세 조회
// ====================================
app.get('/api/contents/:id', async (req, res) => {
  await initializeDatabase();

  const { id } = req.params;

  try {
    const contentResult = await pool.query(
      'SELECT * FROM contents WHERE id = $1',
      [id]
    );

    if (contentResult.rows.length === 0) {
      return res.status(404).json({ error: '콘텐츠를 찾을 수 없습니다' });
    }

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
// API 엔드포인트 - 리뷰 작성
// ====================================
app.post('/api/reviews', async (req, res) => {
  await initializeDatabase();

  const { content_id, rating, one_liner, detailed_review } = req.body;

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
// API 엔드포인트 - 리뷰 목록 조회 (최신순, 제한 개수)
// ====================================
app.get('/api/reviews', async (req, res) => {
  await initializeDatabase();
  try {
    const { sort = 'date', limit = 10 } = req.query;

    // 정렬 조건
    const orderBy = sort === 'rating'
      ? 'r.rating DESC, r.created_at DESC'
      : 'r.created_at DESC';

    // 제한 개수 (최대 100개)
    const limitCount = Math.min(parseInt(limit) || 10, 100);

    // 쿼리: 리뷰 + 콘텐츠 정보 조인
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

    res.json(result.rows);

  } catch (error) {
    console.error('리뷰 목록 조회 오류:', error);
    res.status(500).json({ error: '리뷰 목록 조회 중 오류가 발생했습니다' });
  }
});

// ====================================
// API 엔드포인트 - 리뷰 수정
// ====================================
app.put('/api/reviews/:id', async (req, res) => {
  await initializeDatabase();

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
// API 엔드포인트 - 리뷰 삭제
// ====================================
app.delete('/api/reviews/:id', async (req, res) => {
  await initializeDatabase();

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
// API 엔드포인트 - 콘텐츠 삭제
// ====================================
app.delete('/api/contents/:id', async (req, res) => {
  await initializeDatabase();

  const { id } = req.params;

  try {
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
// Vercel Serverless Function으로 export
// ====================================
module.exports = app;
