// ====================================
// 1단계: 전역 변수 선언
// ====================================
// 현재 검색 타입 (movie 또는 book)
let currentSearchType = 'movie';

// 현재 선택된 별점
let currentRating = 0;

// 리뷰 수정 모드 추적 (null: 작성 모드, 숫자: 수정 모드의 리뷰 ID)
let currentEditingReviewId = null;

// ====================================
// 2단계: 페이지가 로드되면 실행되는 함수
// ====================================
// DOMContentLoaded: HTML이 모두 로드되면 실행
document.addEventListener('DOMContentLoaded', function() {
  console.log('🎬 My Theater 초기화 중...');

  // 메인 아카이브 로드
  loadContents();

  // 영화/책 섹션 로드 (각각 최신 5개씩)
  loadMoviesSection();
  loadBooksSection();

  // 리뷰 섹션 로드 (최신 6개)
  loadReviewsSection();

  // 별점 클릭 이벤트 설정
  setupStarRating();
});

// ====================================
// 3단계: 검색 모달 열기/닫기
// ====================================
function toggleSearchModal() {
  const modal = document.getElementById('searchModal');

  // classList.toggle: 클래스가 있으면 제거, 없으면 추가
  modal.classList.toggle('hidden');

  // 모달을 열 때 검색 결과와 입력창 초기화
  if (!modal.classList.contains('hidden')) {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
  }
}

// ====================================
// 4단계: 검색 타입 변경 (영화 또는 도서)
// ====================================
function setSearchType(type) {
  currentSearchType = type;

  // 버튼 스타일 변경
  const movieBtn = document.getElementById('movieTypeBtn');
  const bookBtn = document.getElementById('bookTypeBtn');

  if (type === 'movie') {
    // 영화 버튼 활성화
    movieBtn.className = 'flex-1 bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold transition';
    bookBtn.className = 'flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-600 transition';
  } else {
    // 도서 버튼 활성화
    movieBtn.className = 'flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-600 transition';
    bookBtn.className = 'flex-1 bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold transition';
  }

  // 검색 결과 초기화
  document.getElementById('searchResults').innerHTML = '';
}

// ====================================
// 5단계: 콘텐츠 검색 (TMDB 또는 Google Books API)
// ====================================
async function searchContent() {
  // 검색어 가져오기
  const query = document.getElementById('searchInput').value.trim();

  if (!query) {
    alert('검색어를 입력해주세요!');
    return;
  }

  // 로딩 표시
  const loading = document.getElementById('searchLoading');
  const resultsContainer = document.getElementById('searchResults');

  loading.classList.remove('hidden');
  resultsContainer.innerHTML = '';

  try {
    // 서버에 검색 요청
    // fetch: 서버와 통신하는 함수
    const endpoint = currentSearchType === 'movie' ? '/api/search/movies' : '/api/search/books';
    const response = await fetch(`${endpoint}?query=${encodeURIComponent(query)}`);

    // 서버 응답이 정상이 아니면 에러 발생
    if (!response.ok) {
      throw new Error('검색 중 오류가 발생했습니다');
    }

    // JSON 형태로 변환
    const results = await response.json();

    // 로딩 숨기기
    loading.classList.add('hidden');

    // 검색 결과가 없으면
    if (results.length === 0) {
      resultsContainer.innerHTML = '<p class="text-center text-gray-400 col-span-full py-8">검색 결과가 없습니다</p>';
      return;
    }

    // 검색 결과를 화면에 표시
    displaySearchResults(results);

  } catch (error) {
    console.error('검색 오류:', error);
    loading.classList.add('hidden');
    alert('검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }
}

// ====================================
// 6단계: 검색 결과를 화면에 표시
// ====================================
function displaySearchResults(results) {
  const container = document.getElementById('searchResults');
  container.innerHTML = ''; // 기존 내용 지우기

  // results 배열의 각 항목마다 카드 생성
  results.forEach(item => {
    // div 요소 생성 (카드)
    const card = document.createElement('div');
    card.className = 'group cursor-pointer';

    // 포스터 이미지 또는 기본 그라데이션
    const posterHTML = item.poster_url
      ? `<img src="${item.poster_url}" alt="${item.title}" class="w-full aspect-[2/3] object-cover rounded-lg">`
      : `<div class="w-full aspect-[2/3] bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-4xl">
           ${item.type === 'movie' ? '🎬' : '📚'}
         </div>`;

    // 카드 HTML 구조
    card.innerHTML = `
      <div class="relative overflow-hidden rounded-lg mb-2">
        ${posterHTML}
        <!-- 호버 시 나타나는 버튼 2개 -->
        <!-- flex flex-col: 버튼을 세로로 배치 (위아래로) -->
        <!-- gap-2: 버튼 사이 간격 8px -->
        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2">
          <!-- 리뷰 작성 버튼: 저장하면서 바로 리뷰 모달 열기 -->
          <button onclick='addToArchiveAndReview(${JSON.stringify(item)})' class="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold text-sm">
            ✍️ 리뷰 작성
          </button>
          <!-- 아카이브 추가 버튼: 리뷰 없이 저장만 -->
          <button onclick='addToArchive(${JSON.stringify(item)})' class="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold text-sm">
            📥 아카이브 추가
          </button>
        </div>
      </div>
      <h4 class="font-semibold text-sm truncate">${item.title}</h4>
      <p class="text-xs text-gray-400">${item.type === 'movie' ? '영화' : '도서'} · ${item.release_date || '날짜 미상'}</p>
    `;

    container.appendChild(card);
  });
}

// ====================================
// 7단계: 아카이브에 콘텐츠 추가 (리뷰 없이)
// ====================================
async function addToArchive(item) {
  try {
    // 서버에 콘텐츠 저장 요청
    const response = await fetch('/api/contents', {
      method: 'POST', // POST: 새로운 데이터 생성
      headers: {
        'Content-Type': 'application/json' // JSON 형식으로 보냄
      },
      body: JSON.stringify(item) // JavaScript 객체를 JSON 문자열로 변환
    });

    if (!response.ok) {
      throw new Error('저장 실패');
    }

    const savedContent = await response.json();

    // 성공 메시지
    alert(`"${item.title}"이(가) 아카이브에 추가되었습니다!`);

    // 검색 모달 닫기
    toggleSearchModal();

    // 콘텐츠 목록 새로고침
    loadContents();

    // 영화/책 섹션도 새로고침
    loadMoviesSection();
    loadBooksSection();

  } catch (error) {
    console.error('저장 오류:', error);
    alert('저장 중 오류가 발생했습니다.');
  }
}

// ====================================
// 7-2단계: 아카이브에 추가하고 바로 리뷰 작성
// ====================================
// addToArchiveAndReview: 콘텐츠를 저장한 후 즉시 리뷰 작성 모달을 엽니다
// 매개변수 item: 검색 결과에서 선택한 콘텐츠 객체
async function addToArchiveAndReview(item) {
  try {
    // 1단계: 서버에 콘텐츠 저장 요청
    const response = await fetch('/api/contents', {
      method: 'POST', // POST: 새로운 데이터 생성
      headers: {
        'Content-Type': 'application/json' // JSON 형식으로 보냄
      },
      body: JSON.stringify(item) // JavaScript 객체를 JSON 문자열로 변환
    });

    if (!response.ok) {
      throw new Error('저장 실패');
    }

    // 2단계: 저장된 콘텐츠 정보 받기 (ID 포함)
    const savedContent = await response.json();

    // 3단계: 검색 모달 닫기
    toggleSearchModal();

    // 4단계: 콘텐츠 목록 새로고침 (백그라운드에서)
    loadContents();
    loadMoviesSection();
    loadBooksSection();

    // 5단계: 리뷰 작성 모달 바로 열기
    // savedContent.id: 방금 저장된 콘텐츠의 ID
    // item.title: 콘텐츠 제목
    openReviewModal(savedContent.id, item.title);

    // 성공 메시지 (모달이 열린 후)
    console.log(`✅ "${item.title}"이(가) 저장되었습니다. 리뷰를 작성해주세요!`);

  } catch (error) {
    console.error('저장 및 리뷰 모달 열기 오류:', error);
    alert('저장 중 오류가 발생했습니다.');
  }
}

// ====================================
// 8단계: 저장된 콘텐츠 목록 불러오기
// ====================================
async function loadContents() {
  const loading = document.getElementById('contentsLoading');
  const grid = document.getElementById('contentsGrid');
  const emptyState = document.getElementById('emptyState');
  const contentsSection = document.getElementById('mainArchive');
  const heroSection = document.getElementById('heroSection');

  // 로딩 표시
  loading.classList.remove('hidden');
  // ⚠️ 버그 수정: grid.innerHTML = '' 대신 inner 요소만 비우기
  // grid(horizontal-roller)를 비우면 내부의 contentsInner도 삭제됨
  const inner = document.getElementById('contentsInner');
  if (inner) inner.innerHTML = '';
  emptyState.classList.add('hidden');

  try {
    // 필터 값 가져오기
    const type = document.getElementById('typeFilter').value;
    const sort = document.getElementById('sortFilter').value;

    // 쿼리 파라미터 구성
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (sort) params.append('sort', sort);

    // 서버에서 콘텐츠 목록 가져오기
    const response = await fetch(`/api/contents?${params.toString()}`);

    if (!response.ok) {
      throw new Error('목록 불러오기 실패');
    }

    const contents = await response.json();

    // ⭐ 중요: "내 아카이브"는 리뷰가 없는 콘텐츠만 표시
    // review_count가 0인 콘텐츠만 필터링
    // parseInt: 문자열을 숫자로 변환
    // filter: 조건에 맞는 항목만 걸러냄
    const contentsWithoutReview = contents.filter(content => {
      // review_count를 숫자로 변환
      // null, undefined, '', '0', 0 등을 모두 처리
      const reviewCount = parseInt(content.review_count);

      // 디버깅: 콘솔에 각 콘텐츠의 리뷰 개수 출력
      console.log(`${content.title}: review_count = ${content.review_count}, parsed = ${reviewCount}`);

      // 리뷰 개수가 0이거나 NaN(리뷰 없음)인 경우만 표시
      // isNaN: 숫자가 아니면 true (리뷰가 없는 경우)
      // reviewCount === 0: 리뷰 개수가 정확히 0인 경우
      return isNaN(reviewCount) || reviewCount === 0;
    });

    // 로딩 숨기기
    loading.classList.add('hidden');

    // 리뷰가 없는 콘텐츠가 없으면 빈 상태 표시
    if (contentsWithoutReview.length === 0) {
      // 빈 상태 메시지 표시
      emptyState.classList.remove('hidden');
      contentsSection.classList.add('hidden');
      heroSection.classList.add('hidden'); // 히어로 섹션도 숨김
      return;
    }

    // 콘텐츠가 있으면 표시
    contentsSection.classList.remove('hidden');

    // 첫 번째 콘텐츠를 히어로 섹션에 표시
    if (contentsWithoutReview.length > 0) {
      displayHeroContent(contentsWithoutReview[0]);
      heroSection.classList.remove('hidden');
    }

    // 리뷰가 없는 콘텐츠만 카드로 표시
    displayContents(contentsWithoutReview);

  } catch (error) {
    console.error('목록 불러오기 오류:', error);
    loading.classList.add('hidden');
    alert('콘텐츠 목록을 불러오는 중 오류가 발생했습니다.');
  }
}

// ====================================
// 9단계: 히어로 섹션에 추천 콘텐츠 표시
// ====================================
function displayHeroContent(content) {
  const heroSection = document.getElementById('heroSection');

  // 별점 표시 (평균 평점을 별로 변환)
  const avgRating = parseFloat(content.avg_rating) || 0;
  const stars = '★'.repeat(Math.round(avgRating)) + '☆'.repeat(5 - Math.round(avgRating));

  heroSection.innerHTML = `
    <!-- 배경 이미지 영역 -->
    <div class="absolute inset-0 ${content.poster_url ? '' : 'bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900'}">
      ${content.poster_url ? `<img src="${content.poster_url}" alt="${content.title}" class="w-full h-full object-cover">` : ''}
    </div>

    <!-- 어두운 오버레이 -->
    <div class="absolute inset-0 bg-black/50"></div>

    <!-- 텍스트 내용 -->
    <div class="relative z-10 h-full flex flex-col justify-end px-4 md:px-16 pb-16">
      <!-- 카테고리 태그 -->
      <div class="mb-4">
        <span class="inline-block bg-purple-600 px-4 py-1 rounded-full text-sm font-semibold">
          ${content.review_count > 0 ? '내 리뷰' : '최근 추가'}
        </span>
      </div>

      <!-- 제목 -->
      <h2 class="text-5xl md:text-7xl font-bold mb-4 max-w-3xl">
        ${content.title}
      </h2>

      <!-- 별점과 정보 -->
      <div class="flex items-center gap-4 mb-6 text-gray-300">
        <div class="flex items-center">
          <span class="text-yellow-400 text-xl">${stars}</span>
          <span class="ml-2">${avgRating.toFixed(1)}</span>
        </div>
        <span>${content.release_date || '날짜 미상'}</span>
        <span>${content.type === 'movie' ? '영화' : '도서'}</span>
      </div>

      <!-- 설명 -->
      <p class="text-lg text-gray-300 mb-8 max-w-2xl line-clamp-3">
        ${content.description || '설명이 없습니다.'}
      </p>

      <!-- 버튼들 -->
      <div class="flex gap-4">
        ${content.review_count > 0
          ? `<button onclick="viewContentDetail(${content.id})" class="bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
               내 리뷰 보기
             </button>`
          : `<button onclick="openReviewModal(${content.id}, '${content.title}')" class="bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
               리뷰 작성하기
             </button>`
        }
        <button onclick="deleteContent(${content.id})" class="bg-red-600/70 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-600 transition">
          삭제하기
        </button>
      </div>
    </div>
  `;
}

// ====================================
// 10단계: 콘텐츠 목록을 자동 롤링으로 표시
// ====================================
function displayContents(contents) {
  const inner = document.getElementById('contentsInner');
  if (!inner) {
    console.error('contentsInner 요소를 찾을 수 없습니다');
    return;
  }
  inner.innerHTML = '';

  // 콘텐츠가 없으면 애니메이션 중지
  if (contents.length === 0) {
    inner.style.animation = 'none';
    return;
  }

  contents.forEach(content => {
    const card = document.createElement('div');
    card.className = 'group cursor-pointer content-card-mobile snap-item';

    // 별점 표시
    const avgRating = parseFloat(content.avg_rating) || 0;
    const stars = '★'.repeat(Math.round(avgRating)) + '☆'.repeat(5 - Math.round(avgRating));

    // 포스터 이미지
    const posterHTML = content.poster_url
      ? `<img src="${content.poster_url}" alt="${content.title}" class="w-full aspect-[2/3] object-cover">`
      : `<div class="w-full aspect-[2/3] bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-6xl">
           ${content.type === 'movie' ? '🎬' : '📚'}
         </div>`;

    card.innerHTML = `
      <div class="relative overflow-hidden rounded-lg mb-3">
        ${posterHTML}

        <!-- 타입 라벨 배지 (왼쪽 상단) -->
        <div class="absolute top-2 left-2 z-10">
          <span class="${content.type === 'movie' ? 'bg-purple-600' : 'bg-green-600'} text-white px-2 py-1 rounded text-xs font-semibold">
            ${content.type === 'movie' ? '🎬 영화' : '📚 책'}
          </span>
        </div>

        <!-- 호버 시 나타나는 오버레이 -->
        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <div class="flex gap-2">
            ${content.review_count > 0
              ? `<button onclick="viewContentDetail(${content.id})" class="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded text-sm font-semibold">
                   리뷰 보기
                 </button>`
              : `<button onclick="openReviewModal(${content.id}, '${content.title}')" class="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded text-sm font-semibold">
                   리뷰 작성
                 </button>`
            }
            <button onclick="deleteContent(${content.id})" class="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm font-semibold">
              삭제
            </button>
          </div>
        </div>
      </div>
      <h4 class="font-semibold truncate">${content.title}</h4>
      <p class="text-sm text-gray-400">${content.type === 'movie' ? '영화' : '도서'} · ${content.release_date || ''}</p>
      <div class="flex items-center mt-1">
        <span class="text-yellow-400 text-sm">${stars}</span>
        <span class="text-sm text-gray-400 ml-1">${avgRating.toFixed(1)}</span>
      </div>
    `;

    inner.appendChild(card);
  });

  // 무한 롤링을 위해 카드 복제 (2배로)
  const originalCards = inner.innerHTML;
  inner.innerHTML = originalCards + originalCards;

  // 콘텐츠 개수에 따라 애니메이션 속도 조절
  const duration = Math.max(15, contents.length * 3);
  inner.style.animationDuration = `${duration}s`;
}

// ====================================
// 11단계: 리뷰 모달 열기
// ====================================
function openReviewModal(contentId, contentTitle) {
  document.getElementById('reviewModal').classList.remove('hidden');
  document.getElementById('reviewContentId').value = contentId;
  document.getElementById('reviewModalTitle').textContent = `${contentTitle} - 리뷰 작성`;

  // 폼 초기화
  document.getElementById('oneLiner').value = '';
  document.getElementById('detailedReview').value = '';
  currentRating = 0;
  updateStarDisplay();
}

// ====================================
// 12단계: 리뷰 모달 닫기
// ====================================
function closeReviewModal() {
  // 모달 숨기기
  document.getElementById('reviewModal').classList.add('hidden');

  // 수정 모드 초기화 (다음에 모달을 열 때 작성 모드가 되도록)
  currentEditingReviewId = null;
}

// ====================================
// 13단계: 별점 설정
// ====================================
function setRating(rating) {
  currentRating = rating;
  document.getElementById('ratingValue').value = rating;
  updateStarDisplay();
}

// 별점 표시 업데이트
function updateStarDisplay() {
  const stars = document.querySelectorAll('#starRating span');
  stars.forEach((star, index) => {
    if (index < currentRating) {
      star.className = 'text-4xl cursor-pointer text-yellow-400 transition';
    } else {
      star.className = 'text-4xl cursor-pointer text-gray-600 hover:text-yellow-400 transition';
    }
  });
}

// 별점 클릭 이벤트 설정
function setupStarRating() {
  const stars = document.querySelectorAll('#starRating span');
  stars.forEach(star => {
    star.addEventListener('click', function() {
      const rating = parseInt(this.getAttribute('data-rating'));
      setRating(rating);
    });
  });
}

// ====================================
// 14단계: 리뷰 제출
// ====================================
async function submitReview(event) {
  event.preventDefault(); // 폼의 기본 동작(페이지 새로고침) 방지

  // 폼 데이터 가져오기
  const rating = currentRating;
  const oneLiner = document.getElementById('oneLiner').value.trim();
  const detailedReview = document.getElementById('detailedReview').value.trim();

  // 별점 필수 체크
  if (rating === 0) {
    alert('별점을 선택해주세요!');
    return;
  }

  try {
    let response;

    // ⭐ 수정 모드인 경우
    if (currentEditingReviewId) {
      // PUT 요청: 기존 리뷰 수정
      response = await fetch(`/api/reviews/${currentEditingReviewId}`, {
        method: 'PUT', // PUT: 데이터 수정
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rating: rating,
          one_liner: oneLiner,
          detailed_review: detailedReview
        })
      });

      if (!response.ok) {
        throw new Error('리뷰 수정 실패');
      }

      alert('리뷰가 수정되었습니다!');

      // 수정 모드 초기화
      currentEditingReviewId = null;

    } else {
      // ⭐ 새 리뷰 작성 모드
      const contentId = document.getElementById('reviewContentId').value;

      // POST 요청: 새 리뷰 저장
      response = await fetch('/api/reviews', {
        method: 'POST', // POST: 새 데이터 생성
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content_id: contentId,
          rating: rating,
          one_liner: oneLiner,
          detailed_review: detailedReview
        })
      });

      if (!response.ok) {
        throw new Error('리뷰 저장 실패');
      }

      alert('리뷰가 저장되었습니다!');
    }

    // 모달 닫기
    closeReviewModal();

    // 목록 새로고침 (변경 사항 반영)
    loadContents(); // 메인 아카이브
    loadMoviesSection(); // 영화 섹션
    loadBooksSection(); // 책 섹션
    loadReviewsSection(); // 리뷰 섹션

  } catch (error) {
    console.error('리뷰 처리 오류:', error);
    alert('리뷰 처리 중 오류가 발생했습니다.');
  }
}

// ====================================
// 15단계: 콘텐츠 상세보기 (리뷰 목록 모달로 표시)
// ====================================
// viewContentDetail: 콘텐츠의 리뷰를 모달로 표시하는 함수
// 매개변수 contentId: 조회할 콘텐츠의 ID
async function viewContentDetail(contentId) {
  try {
    // API 호출: 콘텐츠 정보 + 리뷰 목록 가져오기
    const response = await fetch(`/api/contents/${contentId}`);

    if (!response.ok) {
      throw new Error('상세 정보 불러오기 실패');
    }

    // JSON 데이터 파싱
    const data = await response.json();
    const { content, reviews } = data;

    // 모달 제목 설정
    // textContent: HTML 태그가 아닌 텍스트로 설정 (XSS 방지)
    document.getElementById('reviewDetailTitle').textContent = `📝 ${content.title}의 리뷰`;

    // 리뷰 목록 컨테이너 찾기
    const reviewsList = document.getElementById('reviewsList');
    // 기존 내용 초기화
    reviewsList.innerHTML = '';

    // 리뷰가 없는 경우
    if (reviews.length === 0) {
      reviewsList.innerHTML = `
        <div class="text-center text-gray-400 py-8">
          <p class="text-lg mb-2">아직 작성된 리뷰가 없습니다.</p>
          <button onclick="closeReviewDetailModal(); openReviewModal(${contentId}, '${escapeHtml(content.title)}')"
                  class="mt-4 bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-semibold transition">
            첫 리뷰 작성하기
          </button>
        </div>
      `;
    } else {
      // 리뷰가 있는 경우: 각 리뷰를 카드 형태로 표시
      reviews.forEach((review) => {
        // 별점 표시: ★ 채워진 별, ☆ 빈 별
        const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

        // 리뷰 카드 생성
        const reviewCard = document.createElement('div');
        reviewCard.className = 'bg-gray-700 rounded-lg p-5 space-y-3';

        reviewCard.innerHTML = `
          <!-- 별점과 작성일 -->
          <div class="flex items-center justify-between">
            <div class="text-2xl text-yellow-400">${stars}</div>
            <div class="text-sm text-gray-400">
              ${new Date(review.created_at).toLocaleDateString('ko-KR')}
            </div>
          </div>

          <!-- 한줄평 -->
          ${review.one_liner ? `
            <div class="text-lg font-semibold text-purple-300">
              "${escapeHtml(review.one_liner)}"
            </div>
          ` : ''}

          <!-- 상세평 -->
          ${review.detailed_review ? `
            <div class="text-gray-300 leading-relaxed whitespace-pre-wrap">
              ${escapeHtml(review.detailed_review)}
            </div>
          ` : ''}

          <!-- 수정/삭제 버튼 -->
          <div class="flex gap-2 pt-3 border-t border-gray-600">
            <button onclick="openEditReviewModal(${review.id}, ${review.rating}, \`${escapeBackticks(review.one_liner || '')}\`, \`${escapeBackticks(review.detailed_review || '')}\`)"
                    class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-semibold transition">
              ✏️ 수정
            </button>
            <button onclick="deleteReview(${review.id}, ${contentId})"
                    class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-semibold transition">
              🗑️ 삭제
            </button>
          </div>
        `;

        // 리뷰 카드를 목록에 추가
        reviewsList.appendChild(reviewCard);
      });
    }

    // 모달 표시
    // hidden 클래스 제거 → 모달이 보이게 됨
    document.getElementById('reviewDetailModal').classList.remove('hidden');

  } catch (error) {
    console.error('상세 정보 불러오기 오류:', error);
    alert('상세 정보를 불러오는 중 오류가 발생했습니다.');
  }
}

// ====================================
// 15-1단계: 리뷰 상세 모달 닫기
// ====================================
function closeReviewDetailModal() {
  // hidden 클래스 추가 → 모달이 숨겨짐
  document.getElementById('reviewDetailModal').classList.add('hidden');
}

// ====================================
// 15-2단계: HTML 이스케이프 (XSS 방지)
// ====================================
// escapeHtml: HTML 특수 문자를 안전하게 변환하는 함수
// <, >, &, ", ' 등을 HTML 엔티티로 변환하여 XSS 공격 방지
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ====================================
// 15-3단계: 백틱 이스케이프 (템플릿 리터럴용)
// ====================================
// escapeBackticks: 백틱(`)을 이스케이프하는 함수
// onclick 속성에서 템플릿 리터럴을 사용할 때 필요
function escapeBackticks(str) {
  if (!str) return '';
  return str.replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

// ====================================
// 15-4단계: 리뷰 수정 모달 열기
// ====================================
// openEditReviewModal: 리뷰 수정 모달을 여는 함수
// 기존 리뷰 작성 모달을 재사용하며, 기존 데이터를 폼에 채움
// 매개변수:
//   - reviewId: 수정할 리뷰의 ID
//   - rating: 기존 별점 (1-5)
//   - oneLiner: 기존 한줄평
//   - detailedReview: 기존 상세평
function openEditReviewModal(reviewId, rating, oneLiner, detailedReview) {
  // 수정 모드 활성화: 전역 변수에 리뷰 ID 저장
  currentEditingReviewId = reviewId;

  // 리뷰 상세 모달 닫기
  closeReviewDetailModal();

  // 리뷰 작성 모달 열기
  document.getElementById('reviewModal').classList.remove('hidden');

  // 모달 제목 변경
  document.getElementById('reviewModalTitle').textContent = '리뷰 수정';

  // 기존 데이터를 폼에 채우기
  document.getElementById('oneLiner').value = oneLiner || '';
  document.getElementById('detailedReview').value = detailedReview || '';

  // 별점 설정
  currentRating = rating;
  updateStarDisplay();
}

// ====================================
// 15-5단계: 리뷰 삭제
// ====================================
// deleteReview: 리뷰를 삭제하는 함수
// 매개변수:
//   - reviewId: 삭제할 리뷰의 ID
//   - contentId: 리뷰가 속한 콘텐츠의 ID (새로고침용)
async function deleteReview(reviewId, contentId) {
  // 사용자 확인
  if (!confirm('정말 이 리뷰를 삭제하시겠습니까?')) {
    return; // 취소하면 함수 종료
  }

  try {
    // API 호출: DELETE /api/reviews/:id
    const response = await fetch(`/api/reviews/${reviewId}`, {
      method: 'DELETE' // DELETE: 데이터 삭제
    });

    if (!response.ok) {
      throw new Error('리뷰 삭제 실패');
    }

    // 성공 알림
    alert('리뷰가 삭제되었습니다.');

    // 모달 닫기
    closeReviewDetailModal();

    // 목록 새로고침 (삭제된 리뷰 반영)
    // loadContents(): 메인 아카이브 새로고침
    // loadMoviesSection(): 영화 섹션 새로고침
    // loadBooksSection(): 책 섹션 새로고침
    // loadReviewsSection(): 리뷰 섹션 새로고침
    loadContents();
    loadMoviesSection();
    loadBooksSection();
    loadReviewsSection();

  } catch (error) {
    console.error('리뷰 삭제 오류:', error);
    alert('리뷰 삭제 중 오류가 발생했습니다.');
  }
}

// ====================================
// 16단계: 콘텐츠 삭제
// ====================================
async function deleteContent(contentId) {
  // 사용자에게 확인
  if (!confirm('정말 삭제하시겠습니까? 관련된 리뷰도 함께 삭제됩니다.')) {
    return;
  }

  try {
    const response = await fetch(`/api/contents/${contentId}`, {
      method: 'DELETE' // DELETE: 데이터 삭제
    });

    if (!response.ok) {
      throw new Error('삭제 실패');
    }

    alert('삭제되었습니다.');
    loadContents(); // 목록 새로고침

    // 영화/책 섹션도 새로고침
    loadMoviesSection();
    loadBooksSection();

  } catch (error) {
    console.error('삭제 오류:', error);
    alert('삭제 중 오류가 발생했습니다.');
  }
}

// ====================================
// 17단계: 콘텐츠 카드 생성 (재사용 가능)
// ====================================
// createContentCard: 영화/책 카드를 생성하는 함수
// 매개변수 content: 콘텐츠 객체 (title, poster_url, type, avg_rating 등)
// 반환값: 생성된 카드 DOM 요소
function createContentCard(content) {
  // 카드 컨테이너 생성
  const card = document.createElement('div');
  // Tailwind CSS 클래스: group(그룹), cursor-pointer(커서 손가락 모양)
  // content-card-mobile: 모바일에서 2개 카드가 보이도록 반응형 너비
  // snap-item: 스와이프 시 카드에 딱 맞게 멈춤
  card.className = 'group cursor-pointer content-card-mobile snap-item';

  // 평균 평점 계산 (소수점 1자리)
  // parseFloat: 문자열을 숫자로 변환, || 0: 값이 없으면 0 사용
  const rating = parseFloat(content.avg_rating) || 0;
  const ratingDisplay = rating.toFixed(1); // 소수점 1자리까지 표시

  // 별점 표시 (★과 ☆)
  // Math.floor: 소수점 버림 (4.7 → 4)
  const fullStars = Math.floor(rating);
  const emptyStars = 5 - fullStars;
  // repeat: 문자열 반복 (예: '★'.repeat(3) → '★★★')
  const stars = '★'.repeat(fullStars) + '☆'.repeat(emptyStars);

  // 날짜 포맷팅 (YYYY.MM 형식으로 변환)
  let date = '';
  if (content.release_date) {
    // new Date: 날짜 객체 생성
    // toLocaleDateString: 날짜를 지역 형식으로 변환
    date = new Date(content.release_date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit'
    }).replace('. ', '.').slice(0, -1); // "2024. 05." → "2024.05"
  }

  // 타입 표시 (영화 또는 책)
  const typeLabel = content.type === 'movie' ? '영화' : '책';

  // 카드 HTML 생성
  // innerHTML: HTML 코드를 문자열로 삽입
  // 삼항 연산자: 조건 ? 참일때값 : 거짓일때값
  card.innerHTML = `
    <div class="relative overflow-hidden rounded-lg mb-3">
      ${content.poster_url
        ? `<img src="${content.poster_url}" alt="${content.title}" class="aspect-[2/3] w-full object-cover transform group-hover:scale-105 transition duration-300">`
        : `<div class="aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center transform group-hover:scale-105 transition duration-300">
             <span class="text-gray-500 text-sm">포스터 없음</span>
           </div>`
      }
    </div>
    <h4 class="font-semibold truncate">${content.title}</h4>
    <p class="text-sm text-gray-400">${typeLabel} · ${date}</p>
    <div class="flex items-center mt-1">
      <span class="text-yellow-400 text-sm">${stars}</span>
      <span class="text-sm text-gray-400 ml-1">${ratingDisplay}</span>
    </div>
  `;

  // 클릭 시 리뷰 상세 보기
  // viewContentDetail: 콘텐츠 정보 + 리뷰 목록을 alert로 표시하는 함수
  // content.id: 클릭한 콘텐츠의 ID (데이터베이스 고유 번호)
  card.onclick = () => {
    viewContentDetail(content.id); // 리뷰 상세 보기 함수 호출
  };

  return card; // 생성된 카드 반환
}

// ====================================
// 18단계: 영화 섹션 로드 (자동 롤링)
// ====================================
// loadMoviesSection: 리뷰가 있는 영화를 자동 롤링으로 표시
async function loadMoviesSection() {
  try {
    // API 호출: 영화만 필터링, 최신순 정렬
    const response = await fetch('/api/contents?type=movie&sort=date');

    if (!response.ok) {
      throw new Error('영화 목록을 불러올 수 없습니다');
    }

    const movies = await response.json();

    // "내가 본 영화" = 리뷰가 있는 영화만 표시
    const moviesWithReview = movies.filter(movie => {
      const reviewCount = parseInt(movie.review_count) || 0;
      return reviewCount > 0;
    });

    // inner 컨테이너 찾기
    const inner = document.getElementById('moviesInner');
    if (!inner) {
      console.error('moviesInner 요소를 찾을 수 없습니다');
      return;
    }

    inner.innerHTML = '';

    // 리뷰를 작성한 영화가 없으면 안내 메시지 표시
    if (moviesWithReview.length === 0) {
      inner.innerHTML = '<p class="text-gray-400 text-sm py-4">리뷰를 작성한 영화가 없습니다. 아카이브에서 리뷰를 작성해보세요!</p>';
      inner.style.animation = 'none';
      return;
    }

    // 각 영화에 대해 카드 생성
    moviesWithReview.forEach(movie => {
      const card = createContentCard(movie);
      inner.appendChild(card);
    });

    // 무한 롤링을 위해 카드 복제
    const originalCards = inner.innerHTML;
    inner.innerHTML = originalCards + originalCards;

    // 콘텐츠 개수에 따라 애니메이션 속도 조절
    const duration = Math.max(12, moviesWithReview.length * 4);
    inner.style.animationDuration = `${duration}s`;

  } catch (error) {
    console.error('영화 섹션 로드 오류:', error);
    const inner = document.getElementById('moviesInner');
    if (inner) {
      inner.innerHTML = '<p class="text-red-400 text-sm">영화를 불러오는 중 오류가 발생했습니다.</p>';
      inner.style.animation = 'none';
    }
  }
}

// ====================================
// 19단계: 책 섹션 로드 (자동 롤링)
// ====================================
// loadBooksSection: 리뷰가 있는 책을 자동 롤링으로 표시
async function loadBooksSection() {
  try {
    // API 호출: 책만 필터링, 최신순 정렬
    const response = await fetch('/api/contents?type=book&sort=date');

    if (!response.ok) {
      throw new Error('책 목록을 불러올 수 없습니다');
    }

    const books = await response.json();

    // "내가 읽은 책" = 리뷰가 있는 책만 표시
    const booksWithReview = books.filter(book => {
      const reviewCount = parseInt(book.review_count) || 0;
      return reviewCount > 0;
    });

    // inner 컨테이너 찾기
    const inner = document.getElementById('booksInner');
    if (!inner) {
      console.error('booksInner 요소를 찾을 수 없습니다');
      return;
    }

    inner.innerHTML = '';

    // 리뷰를 작성한 책이 없으면 안내 메시지 표시
    if (booksWithReview.length === 0) {
      inner.innerHTML = '<p class="text-gray-400 text-sm py-4">리뷰를 작성한 책이 없습니다. 아카이브에서 리뷰를 작성해보세요!</p>';
      inner.style.animation = 'none';
      return;
    }

    // 각 책에 대해 카드 생성
    booksWithReview.forEach(book => {
      const card = createContentCard(book);
      inner.appendChild(card);
    });

    // 무한 롤링을 위해 카드 복제
    const originalCards = inner.innerHTML;
    inner.innerHTML = originalCards + originalCards;

    // 콘텐츠 개수에 따라 애니메이션 속도 조절
    const duration = Math.max(12, booksWithReview.length * 4);
    inner.style.animationDuration = `${duration}s`;

  } catch (error) {
    console.error('책 섹션 로드 오류:', error);
    const inner = document.getElementById('booksInner');
    if (inner) {
      inner.innerHTML = '<p class="text-red-400 text-sm">책을 불러오는 중 오류가 발생했습니다.</p>';
      inner.style.animation = 'none';
    }
  }
}

// ====================================
// 19-1단계: 내가 쓴 리뷰 섹션 로드 (자동 롤링)
// ====================================
// loadReviewsSection: 데이터베이스에서 최신 리뷰를 가져와서 자동 롤링 표시
async function loadReviewsSection() {
  console.log('📝 리뷰 섹션 로드 시작...');
  try {
    // API 호출: 모든 리뷰를 최신순으로 가져오기
    // GET /api/reviews?sort=date&limit=10 (롤링용으로 10개 가져오기)
    const response = await fetch('/api/reviews?sort=date&limit=10');
    console.log('API 응답 상태:', response.status);

    // 서버 응답이 정상이 아니면 에러 발생
    if (!response.ok) {
      throw new Error('리뷰 목록을 불러올 수 없습니다');
    }

    // JSON 형태로 변환
    const reviews = await response.json();
    console.log('받아온 리뷰 개수:', reviews.length);

    // 롤링 inner 컨테이너 찾기
    const inner = document.getElementById('reviewsInner');
    if (!inner) {
      console.error('❌ reviewsInner 요소를 찾을 수 없습니다!');
      return;
    }

    // 기존 내용 초기화 (빈 HTML로 만들기)
    inner.innerHTML = '';

    // 리뷰가 없으면 안내 메시지 표시
    if (reviews.length === 0) {
      inner.innerHTML = `
        <div class="text-center text-gray-400 py-8">
          <p class="text-lg mb-2">아직 작성한 리뷰가 없습니다.</p>
          <p class="text-sm">콘텐츠를 추가하고 리뷰를 작성해보세요!</p>
        </div>
      `;
      // 애니메이션 비활성화
      inner.style.animation = 'none';
      return; // 함수 종료
    }

    // 각 리뷰에 대해 카드 생성
    reviews.forEach(review => {
      const card = createReviewCard(review);
      card.classList.add('review-card-fixed'); // 고정 높이 클래스 추가
      inner.appendChild(card);
    });

    // 무한 롤링을 위해 리뷰 카드 복제 (2배로)
    // 원본 카드들을 복제해서 뒤에 붙임 → 끊김 없는 롤링 효과
    const originalCards = inner.innerHTML;
    inner.innerHTML = originalCards + originalCards;

    // 리뷰 개수에 따라 애니메이션 속도 조절
    // 리뷰가 많을수록 천천히 스크롤
    const duration = Math.max(8, reviews.length * 3);
    inner.style.animationDuration = `${duration}s`;

    console.log('✅ 리뷰 섹션 로드 완료! (자동 롤링)');

  } catch (error) {
    // 에러가 발생하면 콘솔에 출력하고 사용자에게 알림
    console.error('❌ 리뷰 섹션 로드 오류:', error);
    console.error('오류 상세:', error.message);
    console.error('오류 스택:', error.stack);
    const inner = document.getElementById('reviewsInner');
    if (inner) {
      inner.innerHTML =
        '<p class="text-red-400 text-sm text-center py-8">리뷰를 불러오는 중 오류가 발생했습니다.</p>';
      inner.style.animation = 'none';
    }
  }
}

// ====================================
// 19-2단계: 리뷰 카드 생성
// ====================================
// createReviewCard: 리뷰 데이터를 받아서 카드 HTML 생성
// 매개변수 review: 리뷰 객체 (content_title, rating, one_liner, created_at 등)
// 반환값: 생성된 카드 DOM 요소
function createReviewCard(review) {
  // 카드 div 생성
  const card = document.createElement('div');
  // Tailwind CSS 클래스:
  // bg-gray-800: 어두운 회색 배경
  // rounded-lg: 모서리 둥글게
  // p-6: 내부 패딩 24px
  // hover:bg-gray-750: 마우스 호버 시 약간 밝게
  // transition: 부드러운 전환 효과
  // cursor-pointer: 마우스 커서를 포인터로 (클릭 가능함을 표시)
  card.className = 'bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition cursor-pointer';

  // 별점 표시
  // ★: 채워진 별, ☆: 빈 별
  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

  // 날짜 포맷 (예: 2026. 2. 1.)
  const date = new Date(review.created_at).toLocaleDateString('ko-KR');

  // 콘텐츠 타입 배지 (영화/책)
  // movie: 보라색 배지 + 🎬 이모지
  // book: 초록색 배지 + 📚 이모지
  const typeBadge = review.content_type === 'movie'
    ? '<span class="bg-purple-600 text-white px-2 py-1 rounded text-xs font-semibold">🎬 영화</span>'
    : '<span class="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">📚 책</span>';

  // 카드 HTML 구성
  card.innerHTML = `
    <!-- 타입 배지 + 날짜 -->
    <div class="flex justify-between items-center mb-3">
      ${typeBadge}
      <span class="text-xs text-gray-400">${date}</span>
    </div>

    <!-- 콘텐츠 제목 -->
    <!-- truncate: 텍스트가 넘치면 ... 처리 -->
    <h3 class="font-bold text-lg mb-2 truncate">${escapeHtml(review.content_title)}</h3>

    <!-- 별점 -->
    <div class="flex items-center gap-2 mb-3">
      <span class="text-yellow-400 text-lg">${stars}</span>
      <span class="text-sm text-gray-400">${review.rating}.0</span>
    </div>

    <!-- 한줄평 -->
    ${review.one_liner ? `
      <p class="text-purple-300 text-sm mb-2 line-clamp-2">
        "${escapeHtml(review.one_liner)}"
      </p>
    ` : ''}

    <!-- 상세평 미리보기 -->
    ${review.detailed_review ? `
      <p class="text-gray-400 text-sm line-clamp-3">
        ${escapeHtml(review.detailed_review)}
      </p>
    ` : ''}
  `;

  // 클릭 시 리뷰 상세 보기 모달 열기
  // viewContentDetail: 리뷰 상세 모달을 여는 함수
  card.onclick = () => {
    viewContentDetail(review.content_id);
  };

  return card; // 생성된 카드 반환
}

// ====================================
// 20단계: 전체보기 - 영화 필터 자동 적용
// ====================================
// viewAllMovies: "전체보기" 클릭 시 영화 필터를 자동으로 적용하고 메인 아카이브로 스크롤
function viewAllMovies() {
  // 필터 드롭다운의 값을 'movie'로 설정
  const typeFilter = document.getElementById('typeFilter');
  typeFilter.value = 'movie'; // 드롭다운에서 "영화" 선택

  // 콘텐츠 다시 로드 (필터가 적용됨)
  loadContents();

  // 메인 아카이브 섹션으로 스크롤 (부드럽게 이동)
  const archiveSection = document.getElementById('mainArchive');
  if (archiveSection) {
    // scrollIntoView: 해당 요소로 스크롤 이동
    // behavior: 'smooth': 부드럽게 스크롤
    // block: 'start': 화면 위쪽에 맞춤
    archiveSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ====================================
// 21단계: 전체보기 - 책 필터 자동 적용
// ====================================
// viewAllBooks: "전체보기" 클릭 시 책 필터를 자동으로 적용하고 메인 아카이브로 스크롤
function viewAllBooks() {
  // 필터 드롭다운의 값을 'book'으로 설정
  const typeFilter = document.getElementById('typeFilter');
  typeFilter.value = 'book'; // 드롭다운에서 "책" 선택

  // 콘텐츠 다시 로드 (필터가 적용됨)
  loadContents();

  // 메인 아카이브 섹션으로 스크롤 (부드럽게 이동)
  const archiveSection = document.getElementById('mainArchive');
  if (archiveSection) {
    // scrollIntoView: 해당 요소로 스크롤 이동
    // behavior: 'smooth': 부드럽게 스크롤
    // block: 'start': 화면 위쪽에 맞춤
    archiveSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}


// ====================================
// 21-1단계: 전체보기 - 모든 리뷰
// ====================================
// viewAllReviews: "내가 쓴 리뷰" 섹션의 "전체보기" 클릭 시 실행되는 함수
function viewAllReviews() {
  // 페이지 상단으로 부드럽게 스크롤
  // scrollTo: 특정 위치로 스크롤 이동
  // top: 0: 페이지 맨 위로
  // behavior: 'smooth': 부드럽게 스크롤
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  // 향후 개선 가능:
  // - 별도의 "모든 리뷰" 모달 구현
  // - 또는 필터링 옵션 제공 (영화만/책만, 최신순/별점순 등)
}

