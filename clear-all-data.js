// ====================================
// 전체 데이터 삭제 스크립트
// ====================================
// 데이터베이스의 모든 콘텐츠와 리뷰를 삭제합니다.
// 테이블 구조는 유지되고 데이터만 삭제됩니다.

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
// 메인 실행 함수
// ====================================
async function main() {
  console.log('🗑️  전체 데이터 삭제 시작...\n');

  try {
    // 1단계: 현재 데이터 개수 확인
    const contentsCount = await pool.query('SELECT COUNT(*) as count FROM contents');
    const reviewsCount = await pool.query('SELECT COUNT(*) as count FROM reviews');

    const totalContents = parseInt(contentsCount.rows[0].count);
    const totalReviews = parseInt(reviewsCount.rows[0].count);

    console.log('📊 현재 데이터 현황:');
    console.log(`   📦 콘텐츠: ${totalContents}개`);
    console.log(`   📝 리뷰: ${totalReviews}개\n`);

    if (totalContents === 0 && totalReviews === 0) {
      console.log('✅ 이미 데이터가 비어있습니다.\n');
      return;
    }

    // 2단계: 리뷰 삭제
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🗑️  리뷰 삭제 중...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const deleteReviewsResult = await pool.query('DELETE FROM reviews RETURNING *');
    console.log(`✅ ${deleteReviewsResult.rowCount}개의 리뷰가 삭제되었습니다.\n`);

    // 3단계: 콘텐츠 삭제
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🗑️  콘텐츠 삭제 중...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const deleteContentsResult = await pool.query('DELETE FROM contents RETURNING *');
    console.log(`✅ ${deleteContentsResult.rowCount}개의 콘텐츠가 삭제되었습니다.\n`);

    // 4단계: AUTO_INCREMENT 리셋 (선택사항)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 시퀀스 초기화 중...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await pool.query('ALTER SEQUENCE contents_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE reviews_id_seq RESTART WITH 1');

    console.log('✅ ID 시퀀스가 1로 초기화되었습니다.\n');

    // 5단계: 결과 확인
    const afterContentsCount = await pool.query('SELECT COUNT(*) as count FROM contents');
    const afterReviewsCount = await pool.query('SELECT COUNT(*) as count FROM reviews');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ 전체 데이터 삭제 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 삭제 후 데이터 현황:');
    console.log(`   📦 콘텐츠: ${afterContentsCount.rows[0].count}개`);
    console.log(`   📝 리뷰: ${afterReviewsCount.rows[0].count}개\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 다음 단계');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. 브라우저에서 http://localhost:3001 새로고침');
    console.log('   → 모든 섹션이 비어있을 것입니다.\n');

    console.log('2. 샘플 데이터를 다시 추가하려면:');
    console.log('   node seed-sample-data.js\n');

    console.log('3. 샘플 리뷰를 추가하려면:');
    console.log('   node add-sample-reviews.js\n');

    console.log('4. 데이터를 재구성하려면:');
    console.log('   node rebalance-sample-data.js\n');

    console.log('💡 Tip: 또는 브라우저에서 직접 콘텐츠를 추가하고');
    console.log('   리뷰를 작성해보세요!\n');

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
