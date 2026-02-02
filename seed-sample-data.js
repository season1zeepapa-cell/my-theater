// ====================================
// 샘플 데이터 삽입 스크립트
// ====================================
// 이 스크립트는 "내가 본 영화"와 "내가 읽은 책" 섹션을 테스트하기 위한
// 샘플 데이터를 데이터베이스에 추가합니다.

// 환경 변수 로드
require('dotenv').config();

// 필요한 라이브러리
const { Pool } = require('pg');
const fetch = require('node-fetch');

// 데이터베이스 연결 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// ====================================
// 1단계: 영화 샘플 데이터
// ====================================
// 유명한 영화 5개를 TMDB API에서 검색하여 추가
const movieTitles = [
  '인터스텔라',
  '인셉션',
  '기생충',
  '어벤져스 엔드게임',
  '조커'
];

// ====================================
// 2단계: 책 샘플 데이터
// ====================================
// 유명한 책 5개를 Google Books API에서 검색하여 추가
const bookTitles = [
  '사피엔스',
  '총 균 쇠',
  '코스모스',
  '이기적 유전자',
  '지적 대화를 위한 넓고 얕은 지식'
];

// ====================================
// 3단계: TMDB API로 영화 검색
// ====================================
async function searchMovie(title) {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&language=ko-KR&query=${encodeURIComponent(title)}`
    );

    if (!response.ok) {
      throw new Error('영화 검색 실패');
    }

    const data = await response.json();

    // 첫 번째 검색 결과 사용
    if (data.results && data.results.length > 0) {
      const movie = data.results[0];
      return {
        type: 'movie',
        title: movie.title,
        poster_url: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : null,
        release_date: movie.release_date,
        genre: movie.genre_ids.join(', '),
        description: movie.overview,
        external_id: movie.id.toString()
      };
    }

    return null;
  } catch (error) {
    console.error(`영화 검색 오류 (${title}):`, error.message);
    return null;
  }
}

// ====================================
// 4단계: Google Books API로 책 검색
// ====================================
async function searchBook(title) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&key=${process.env.GOOGLE_BOOKS_API_KEY}&langRestrict=ko`
    );

    if (!response.ok) {
      throw new Error('책 검색 실패');
    }

    const data = await response.json();

    // 첫 번째 검색 결과 사용
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        type: 'book',
        title: item.volumeInfo.title,
        poster_url: item.volumeInfo.imageLinks?.thumbnail || null,
        author: item.volumeInfo.authors?.join(', ') || '저자 미상',
        publisher: item.volumeInfo.publisher || '출판사 미상',
        release_date: item.volumeInfo.publishedDate || '',
        description: item.volumeInfo.description || '',
        external_id: item.id
      };
    }

    return null;
  } catch (error) {
    console.error(`책 검색 오류 (${title}):`, error.message);
    return null;
  }
}

// ====================================
// 5단계: 데이터베이스에 콘텐츠 저장
// ====================================
async function saveContent(content) {
  try {
    const result = await pool.query(
      `INSERT INTO contents (type, title, poster_url, release_date, genre, author, publisher, description, external_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        content.type,
        content.title,
        content.poster_url,
        content.release_date,
        content.genre || null,
        content.author || null,
        content.publisher || null,
        content.description,
        content.external_id
      ]
    );

    console.log(`✅ 저장 완료: ${content.title}`);
    return result.rows[0];
  } catch (error) {
    // 중복 체크 (이미 존재하는 경우)
    if (error.message.includes('duplicate')) {
      console.log(`⏭️  이미 존재함: ${content.title}`);
      return null;
    }
    console.error(`❌ 저장 실패 (${content.title}):`, error.message);
    return null;
  }
}

// ====================================
// 6단계: 메인 실행 함수
// ====================================
async function main() {
  console.log('🎬 샘플 데이터 삽입 시작...\n');

  // API 키 확인
  if (!process.env.TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY가 설정되지 않았습니다.');
    console.log('   .env 파일에 TMDB_API_KEY를 추가해주세요.');
    process.exit(1);
  }

  if (!process.env.GOOGLE_BOOKS_API_KEY) {
    console.error('❌ GOOGLE_BOOKS_API_KEY가 설정되지 않았습니다.');
    console.log('   .env 파일에 GOOGLE_BOOKS_API_KEY를 추가해주세요.');
    process.exit(1);
  }

  // 영화 추가
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📽️  영화 샘플 데이터 추가 중...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const title of movieTitles) {
    console.log(`🔍 검색 중: ${title}`);
    const movieData = await searchMovie(title);

    if (movieData) {
      await saveContent(movieData);
    } else {
      console.log(`⚠️  검색 결과 없음: ${title}`);
    }

    // API 속도 제한 방지 (0.5초 대기)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 책 추가
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📚 책 샘플 데이터 추가 중...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const title of bookTitles) {
    console.log(`🔍 검색 중: ${title}`);
    const bookData = await searchBook(title);

    if (bookData) {
      await saveContent(bookData);
    } else {
      console.log(`⚠️  검색 결과 없음: ${title}`);
    }

    // API 속도 제한 방지 (0.5초 대기)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ 샘플 데이터 삽입 완료!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n💡 브라우저에서 http://localhost:3001을 새로고침하세요!\n');

  // 데이터베이스 연결 종료
  await pool.end();
}

// ====================================
// 7단계: 스크립트 실행
// ====================================
// 에러 처리와 함께 메인 함수 실행
main().catch(error => {
  console.error('❌ 오류 발생:', error);
  process.exit(1);
});
