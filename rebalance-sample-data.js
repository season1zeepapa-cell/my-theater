// ====================================
// 샘플 데이터 재구성 스크립트
// ====================================
// 세 섹션 모두에 데이터가 표시되도록 리뷰를 조정합니다.
// - 내가 본 영화: 리뷰 있는 영화 3개
// - 내가 읽은 책: 리뷰 있는 책 3개
// - 내 아카이브: 리뷰 없는 콘텐츠 4개

// 환경 변수 로드
require('dotenv').config();

// 필요한 라이브러리
const { Pool } = require('pg');

// 데이터베이스 연결 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// ====================================
// 리뷰를 유지할 콘텐츠 (제목 키워드)
// ====================================
const keepReviews = {
  movies: [
    '인터스텔라',  // 리뷰 유지
    '인셉션',      // 리뷰 유지
    '기생충'       // 리뷰 유지
  ],
  books: [
    '사피엔스',    // 리뷰 유지
    '코스모스',    // 리뷰 유지
    '총, 균, 쇠'   // 리뷰 유지
  ]
};

// ====================================
// 리뷰를 삭제할 콘텐츠 (아카이브로 이동)
// ====================================
const removeReviews = {
  movies: [
    '조커',           // 리뷰 삭제 → 아카이브
    '어벤져스'        // 리뷰 삭제 → 아카이브
  ],
  books: [
    '이기적',         // 리뷰 삭제 → 아카이브
    '지적 대화'       // 리뷰 삭제 → 아카이브
  ]
};

// ====================================
// 메인 실행 함수
// ====================================
async function main() {
  console.log('🔄 샘플 데이터 재구성 시작...\n');

  try {
    // 1단계: 모든 콘텐츠 가져오기
    const contentsResult = await pool.query(
      'SELECT * FROM contents ORDER BY created_at DESC'
    );

    const contents = contentsResult.rows;

    console.log(`✅ ${contents.length}개의 콘텐츠를 찾았습니다.\n`);

    // 2단계: 영화 리뷰 정리
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎬 영화 리뷰 정리 중...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let moviesToArchive = 0;
    let moviesWithReview = 0;

    for (const content of contents) {
      if (content.type === 'movie') {
        // 리뷰를 삭제할 영화인지 확인
        const shouldRemove = removeReviews.movies.some(keyword =>
          content.title.includes(keyword)
        );

        if (shouldRemove) {
          // 리뷰 삭제
          const deleteResult = await pool.query(
            'DELETE FROM reviews WHERE content_id = $1 RETURNING *',
            [content.id]
          );

          if (deleteResult.rowCount > 0) {
            console.log(`📥 "${content.title}"`);
            console.log(`   → 리뷰 삭제 완료 (${deleteResult.rowCount}개)`);
            console.log(`   → "내 아카이브"로 이동\n`);
            moviesToArchive++;
          }
        } else {
          // 리뷰 유지
          const reviewResult = await pool.query(
            'SELECT COUNT(*) as count FROM reviews WHERE content_id = $1',
            [content.id]
          );

          const reviewCount = parseInt(reviewResult.rows[0].count);

          if (reviewCount > 0) {
            console.log(`✅ "${content.title}"`);
            console.log(`   → 리뷰 유지 (${reviewCount}개)`);
            console.log(`   → "내가 본 영화"에 표시\n`);
            moviesWithReview++;
          }
        }
      }
    }

    // 3단계: 책 리뷰 정리
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📚 책 리뷰 정리 중...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let booksToArchive = 0;
    let booksWithReview = 0;

    for (const content of contents) {
      if (content.type === 'book') {
        // 리뷰를 삭제할 책인지 확인
        const shouldRemove = removeReviews.books.some(keyword =>
          content.title.includes(keyword)
        );

        if (shouldRemove) {
          // 리뷰 삭제
          const deleteResult = await pool.query(
            'DELETE FROM reviews WHERE content_id = $1 RETURNING *',
            [content.id]
          );

          if (deleteResult.rowCount > 0) {
            console.log(`📥 "${content.title}"`);
            console.log(`   → 리뷰 삭제 완료 (${deleteResult.rowCount}개)`);
            console.log(`   → "내 아카이브"로 이동\n`);
            booksToArchive++;
          }
        } else {
          // 리뷰 유지
          const reviewResult = await pool.query(
            'SELECT COUNT(*) as count FROM reviews WHERE content_id = $1',
            [content.id]
          );

          const reviewCount = parseInt(reviewResult.rows[0].count);

          if (reviewCount > 0) {
            console.log(`✅ "${content.title}"`);
            console.log(`   → 리뷰 유지 (${reviewCount}개)`);
            console.log(`   → "내가 읽은 책"에 표시\n`);
            booksWithReview++;
          }
        }
      }
    }

    // 4단계: 결과 요약
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ 데이터 재구성 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 섹션별 콘텐츠 개수:\n');

    console.log('🎬 내가 본 영화 (리뷰 있음):');
    console.log(`   - 인터스텔라 ⭐⭐⭐⭐⭐`);
    console.log(`   - 인셉션 ⭐⭐⭐⭐⭐`);
    console.log(`   - 기생충 ⭐⭐⭐⭐⭐`);
    console.log(`   📝 총 ${moviesWithReview}개\n`);

    console.log('📚 내가 읽은 책 (리뷰 있음):');
    console.log(`   - 사피엔스 ⭐⭐⭐⭐⭐`);
    console.log(`   - 코스모스 ⭐⭐⭐⭐⭐`);
    console.log(`   - 총, 균, 쇠 ⭐⭐⭐⭐☆`);
    console.log(`   📝 총 ${booksWithReview}개\n`);

    console.log('📥 내 아카이브 (리뷰 없음):');
    console.log(`   - 조커 (영화)`);
    console.log(`   - 어벤져스: 엔드게임 (영화)`);
    console.log(`   - 이기적인 유전자란 무엇인가 (책)`);
    console.log(`   - 지적 대화를 위한 넓고 얕은 지식 (책)`);
    console.log(`   📦 총 ${moviesToArchive + booksToArchive}개\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 브라우저에서 확인하기');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. 브라우저에서 http://localhost:3001 열기');
    console.log('2. 페이지 새로고침 (F5)');
    console.log('3. 세 섹션 모두 확인:\n');
    console.log('   🎬 내가 본 영화: 3개의 영화 표시');
    console.log('   📚 내가 읽은 책: 3개의 책 표시');
    console.log('   📥 내 아카이브: 4개의 콘텐츠 표시\n');

    console.log('💡 Tip: 아카이브에서 리뷰를 작성하면');
    console.log('   자동으로 "내가 본 영화/책" 섹션으로 이동합니다!\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    // 데이터베이스 연결 종료
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
