// ====================================
// 완전한 샘플 데이터 생성 스크립트
// ====================================
// 세 섹션 모두에 적절한 데이터를 생성합니다.
// - 내 아카이브: 영화 3개 + 책 3개 (리뷰 없음)
// - 내가 본 영화: 영화 5개 (리뷰 있음)
// - 내가 읽은 책: 책 5개 (리뷰 있음)

// 환경 변수 로드
require('dotenv').config();

const { Pool } = require('pg');
const fetch = require('node-fetch');

// 데이터베이스 연결
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// ====================================
// 콘텐츠 데이터 정의
// ====================================

// 리뷰 있는 영화 (5개)
const moviesWithReview = [
  '인터스텔라',
  '인셉션',
  '기생충',
  '조커',
  '어벤져스 엔드게임'
];

// 리뷰 없는 영화 (3개) - 아카이브
const moviesWithoutReview = [
  '타이타닉',
  '아바타',
  '겨울왕국'
];

// 리뷰 있는 책 (5개)
const booksWithReview = [
  '사피엔스',
  '코스모스',
  '총 균 쇠',
  '이기적 유전자',
  '지적 대화를 위한 넓고 얕은 지식'
];

// 리뷰 없는 책 (3개) - 아카이브
const booksWithoutReview = [
  '1984',
  '어린왕자',
  '데미안'
];

// ====================================
// 리뷰 데이터 (영화)
// ====================================
const movieReviews = {
  '인터스텔라': {
    rating: 5,
    one_liner: '우주 SF의 명작! 시간과 공간을 초월한 감동',
    detailed_review: '크리스토퍼 놀란 감독의 최고 걸작. 상대성 이론과 블랙홀을 다루면서도 부녀간의 사랑을 중심으로 풀어낸 이야기가 감동적입니다. 한스 짐머의 OST는 정말 압도적이에요.'
  },
  '인셉션': {
    rating: 5,
    one_liner: '꿈속의 꿈, 놀란의 천재성이 빛나는 작품',
    detailed_review: '현실과 꿈의 경계를 넘나드는 설정이 너무 창의적입니다. 팽이가 돌아가는 마지막 장면은 아직도 생각하게 만드네요. 여러 번 봐도 새로운 해석이 나와요.'
  },
  '기생충': {
    rating: 5,
    one_liner: '한국 영화의 자랑, 아카데미 작품상 수상작',
    detailed_review: '빈부격차를 이렇게 재미있고 날카롭게 풀어낸 작품은 처음입니다. 송강호 배우를 비롯한 모든 연기가 완벽하고, 봉준호 감독의 연출력이 돋보입니다.'
  },
  '조커': {
    rating: 5,
    one_liner: '호아킨 피닉스의 연기에 압도당한 영화',
    detailed_review: '빌런의 탄생을 이렇게 섬세하게 그려낸 작품은 없었습니다. 사회의 냉담함과 개인의 광기가 만나는 지점을 완벽하게 표현했어요. 무거운 주제지만 꼭 봐야 할 명작입니다.'
  },
  '어벤져스': {
    rating: 4,
    one_liner: 'MCU 10년의 대장정을 마무리하는 완벽한 피날레',
    detailed_review: '아이언맨의 마지막이 너무 감동적이었어요. 3시간이 전혀 지루하지 않았고, 모든 히어로들이 모이는 장면에서 소름이 돋았습니다. 팬이라면 꼭 봐야 할 작품!'
  }
};

// ====================================
// 리뷰 데이터 (책)
// ====================================
const bookReviews = {
  '사피엔스': {
    rating: 5,
    one_liner: '인류의 역사를 새롭게 바라보게 만든 책',
    detailed_review: '호모 사피엔스가 어떻게 지구를 정복했는지를 흥미진진하게 풀어냈습니다. 인지혁명, 농업혁명, 과학혁명을 거치며 인류가 어떻게 발전했는지 이해하는 데 큰 도움이 됐어요.'
  },
  '코스모스': {
    rating: 5,
    one_liner: '우주의 신비를 쉽고 아름답게 풀어낸 과학서',
    detailed_review: '칼 세이건의 문학적 감성과 과학적 통찰이 결합된 최고의 과학 교양서입니다. 우주의 광대함 앞에서 겸손해지고, 동시에 인간의 탐구정신에 감동하게 됩니다.'
  },
  '총': {
    rating: 4,
    one_liner: '왜 어떤 문명은 발전하고 어떤 문명은 사라졌는가',
    detailed_review: '지리적 환경이 문명의 발전을 어떻게 결정했는지 설득력 있게 설명합니다. 다소 어려운 부분도 있지만 인류 역사를 이해하는 새로운 시각을 제공해줘요.'
  },
  '이기적': {
    rating: 4,
    one_liner: '유전자 관점에서 본 생명의 진화, 눈이 번쩍 뜨임',
    detailed_review: '리처드 도킨스의 통찰이 담긴 명저입니다. 유전자가 생존기계를 만들어낸다는 관점이 처음엔 낯설었지만, 읽다 보니 진화를 이해하는 새로운 렌즈를 얻었어요.'
  },
  '지적': {
    rating: 4,
    one_liner: '교양의 기초를 다지기 좋은 입문서',
    detailed_review: '역사, 경제, 정치, 사회, 윤리를 한 권으로 정리해주는 책입니다. 깊이는 부족하지만 전반적인 흐름을 이해하고 대화의 소재를 얻기에 좋아요. 시리즈로 읽으면 더 좋습니다.'
  }
};

// ====================================
// API 함수들
// ====================================

async function searchMovie(title) {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&language=ko-KR&query=${encodeURIComponent(title)}`
    );

    if (!response.ok) throw new Error('영화 검색 실패');

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const movie = data.results[0];
      return {
        type: 'movie',
        title: movie.title,
        poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
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

async function searchBook(title) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&key=${process.env.GOOGLE_BOOKS_API_KEY}&langRestrict=ko`
    );

    if (!response.ok) throw new Error('책 검색 실패');

    const data = await response.json();

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

    return result.rows[0];
  } catch (error) {
    console.error(`콘텐츠 저장 오류:`, error.message);
    return null;
  }
}

async function addReview(contentId, reviewData) {
  try {
    const result = await pool.query(
      `INSERT INTO reviews (content_id, rating, one_liner, detailed_review)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [contentId, reviewData.rating, reviewData.one_liner, reviewData.detailed_review]
    );

    return result.rows[0];
  } catch (error) {
    console.error(`리뷰 추가 오류:`, error.message);
    return null;
  }
}

// ====================================
// 메인 실행 함수
// ====================================
async function main() {
  console.log('🎬 완전한 샘플 데이터 생성 시작...\n');

  try {
    let totalAdded = 0;
    let totalReviews = 0;

    // 1. 리뷰 있는 영화 추가 (5개)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎬 리뷰 있는 영화 추가 중... (5개)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const title of moviesWithReview) {
      console.log(`🔍 검색 중: ${title}`);
      const movieData = await searchMovie(title);

      if (movieData) {
        const saved = await saveContent(movieData);
        if (saved) {
          console.log(`   ✅ 저장 완료: ${saved.title}`);
          totalAdded++;

          // 리뷰 추가
          for (const [reviewTitle, reviewData] of Object.entries(movieReviews)) {
            if (saved.title.includes(reviewTitle)) {
              const review = await addReview(saved.id, reviewData);
              if (review) {
                console.log(`   ⭐ 리뷰 추가: ${'★'.repeat(reviewData.rating)}${'☆'.repeat(5 - reviewData.rating)}`);
                console.log(`   💬 ${reviewData.one_liner}\n`);
                totalReviews++;
              }
              break;
            }
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 2. 리뷰 없는 영화 추가 (3개) - 아카이브
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 리뷰 없는 영화 추가 중... (3개 - 아카이브)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const title of moviesWithoutReview) {
      console.log(`🔍 검색 중: ${title}`);
      const movieData = await searchMovie(title);

      if (movieData) {
        const saved = await saveContent(movieData);
        if (saved) {
          console.log(`   ✅ 저장 완료: ${saved.title}`);
          console.log(`   📥 아카이브에 추가됨 (리뷰 없음)\n`);
          totalAdded++;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 3. 리뷰 있는 책 추가 (5개)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📚 리뷰 있는 책 추가 중... (5개)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const title of booksWithReview) {
      console.log(`🔍 검색 중: ${title}`);
      const bookData = await searchBook(title);

      if (bookData) {
        const saved = await saveContent(bookData);
        if (saved) {
          console.log(`   ✅ 저장 완료: ${saved.title}`);
          totalAdded++;

          // 리뷰 추가
          for (const [reviewTitle, reviewData] of Object.entries(bookReviews)) {
            if (saved.title.includes(reviewTitle)) {
              const review = await addReview(saved.id, reviewData);
              if (review) {
                console.log(`   ⭐ 리뷰 추가: ${'★'.repeat(reviewData.rating)}${'☆'.repeat(5 - reviewData.rating)}`);
                console.log(`   💬 ${reviewData.one_liner}\n`);
                totalReviews++;
              }
              break;
            }
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 4. 리뷰 없는 책 추가 (3개) - 아카이브
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 리뷰 없는 책 추가 중... (3개 - 아카이브)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const title of booksWithoutReview) {
      console.log(`🔍 검색 중: ${title}`);
      const bookData = await searchBook(title);

      if (bookData) {
        const saved = await saveContent(bookData);
        if (saved) {
          console.log(`   ✅ 저장 완료: ${saved.title}`);
          console.log(`   📥 아카이브에 추가됨 (리뷰 없음)\n`);
          totalAdded++;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 5. 결과 요약
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ 데이터 생성 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 생성된 데이터:');
    console.log(`   📦 총 콘텐츠: ${totalAdded}개`);
    console.log(`   📝 총 리뷰: ${totalReviews}개\n`);

    console.log('📍 섹션별 예상 개수:');
    console.log('   🎬 내가 본 영화: 5개 (리뷰 있음)');
    console.log('   📚 내가 읽은 책: 5개 (리뷰 있음)');
    console.log('   📥 내 아카이브: 6개 (영화 3개 + 책 3개, 리뷰 없음)\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 브라우저에서 확인하기');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. http://localhost:3001 새로고침 (F5)');
    console.log('2. 세 섹션 모두 확인:\n');
    console.log('   🎬 내가 본 영화');
    console.log('      - 인터스텔라, 인셉션, 기생충, 조커, 어벤져스\n');
    console.log('   📚 내가 읽은 책');
    console.log('      - 사피엔스, 코스모스, 총균쇠, 이기적 유전자, 지적 대화\n');
    console.log('   📥 내 아카이브');
    console.log('      - 타이타닉, 아바타, 겨울왕국 (영화)');
    console.log('      - 1984, 어린왕자, 데미안 (책)\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await pool.end();
  }
}

// ====================================
// 스크립트 실행
// ====================================
main().catch(error => {
  console.error('❌ 오류 발생:', error);
  process.exit(1);
});
