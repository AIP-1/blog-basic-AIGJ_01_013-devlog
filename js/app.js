// ===== 설정 =====
const PER_PAGE = 4; // 한 페이지에 보여줄 글 수

// 최신 글이 먼저 오도록 정렬 (날짜 → id 순)
const posts = [...POSTS].sort((a, b) =>
  b.date.localeCompare(a.date) || b.id - a.id
);

const $content = document.getElementById("content");

// ===== 유틸 =====

// localStorage는 시크릿 모드 등에서 막힐 수 있어서 항상 try/catch로 감싼다
const store = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 저장할 수 없으면 조용히 무시
    }
  }
};

// 사용자가 입력한 글자를 화면에 넣을 때 HTML로 해석되지 않도록 변환
function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(dateStr) {
  return dateStr.replace(/-/g, ". ");
}

function countBy(list, getKeys) {
  const counts = {};
  list.forEach(item => {
    getKeys(item).forEach(key => {
      counts[key] = (counts[key] || 0) + 1;
    });
  });
  return counts;
}

// ===== 사이드바 =====
function renderSidebar(activeCategory) {
  const categoryCounts = countBy(posts, p => [p.category]);
  const allActive = activeCategory === undefined ? "active" : "";

  document.getElementById("categoryList").innerHTML =
    `<li><a href="#/" class="${allActive}">전체 글 <span class="count">(${posts.length})</span></a></li>` +
    Object.entries(categoryCounts)
      .map(([name, count]) => {
        const active = name === activeCategory ? "active" : "";
        return `<li><a href="#/category/${encodeURIComponent(name)}" class="${active}">
          └ ${escapeHTML(name)} <span class="count">(${count})</span></a></li>`;
      })
      .join("");

  document.getElementById("recentList").innerHTML = posts
    .slice(0, 5)
    .map(p => `<li><a href="#/post/${p.id}">${escapeHTML(p.title)}</a></li>`)
    .join("");

  const tagCounts = countBy(posts, p => p.tags);
  document.getElementById("tagCloud").innerHTML = Object.keys(tagCounts)
    .map(tag => `<a class="tag" href="#/tag/${encodeURIComponent(tag)}">#${escapeHTML(tag)}</a>`)
    .join("");
}

// 방문자 수 (이 브라우저 기준, 하루에 한 번만 증가)
function countVisit() {
  const today = new Date().toISOString().slice(0, 10);
  const visit = store.get("visit", { total: 0, today: 0, date: "" });

  if (visit.date !== today) {
    visit.today = 0;
    visit.date = today;
  }
  if (!sessionFlag()) {
    visit.total += 1;
    visit.today += 1;
    store.set("visit", visit);
  }

  document.getElementById("visitTotal").textContent = visit.total;
  document.getElementById("visitToday").textContent = visit.today;
}

// 새로고침할 때마다 숫자가 오르지 않도록 세션당 한 번만 센다
function sessionFlag() {
  try {
    if (sessionStorage.getItem("visited")) return true;
    sessionStorage.setItem("visited", "1");
  } catch {
    // 무시
  }
  return false;
}

// ===== 글 목록 =====
function renderList(list, heading, page, baseHash) {
  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const current = Math.min(Math.max(1, page), totalPages);
  const pageItems = list.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const cards = pageItems.length
    ? pageItems.map(postCard).join("")
    : `<div class="empty">글이 없습니다.</div>`;

  let pagination = "";
  if (totalPages > 1) {
    pagination = `<nav class="pagination" aria-label="페이지">` +
      Array.from({ length: totalPages }, (_, i) => i + 1)
        .map(n => `<a href="${baseHash}/page/${n}" class="${n === current ? "active" : ""}">${n}</a>`)
        .join("") +
      `</nav>`;
  }

  $content.innerHTML = `<h1 class="list-heading">${heading}</h1>${cards}${pagination}`;
}

function postCard(p) {
  return `
    <a class="post-card" href="#/post/${p.id}">
      <div class="post-card-body">
        <span class="post-category">${escapeHTML(p.category)}</span>
        <h2 class="post-card-title">${escapeHTML(p.title)}</h2>
        <p class="post-excerpt">${escapeHTML(p.excerpt)}</p>
        <div class="post-meta">${formatDate(p.date)} · 댓글 ${getComments(p.id).length} · ♥ ${getLikes(p.id)}</div>
      </div>
      <div class="thumb" style="background:${p.color}" aria-hidden="true">${p.emoji}</div>
    </a>`;
}

// ===== 글 상세 =====
function renderPost(id) {
  const index = posts.findIndex(p => p.id === id);
  if (index === -1) {
    $content.innerHTML = `<div class="empty">존재하지 않는 글입니다. <a href="#/">홈으로</a></div>`;
    return;
  }

  const p = posts[index];
  const newer = posts[index - 1]; // 목록에서 위쪽 = 더 최근 글
  const older = posts[index + 1];
  const liked = store.get("liked", []).includes(p.id);

  $content.innerHTML = `
    <article class="post-detail">
      <header class="post-header">
        <a class="post-category" href="#/category/${encodeURIComponent(p.category)}">${escapeHTML(p.category)}</a>
        <h1 class="post-title">${escapeHTML(p.title)}</h1>
        <div class="post-meta">이진행 · ${formatDate(p.date)}</div>
      </header>

      <div class="post-content">${p.content}</div>

      <div class="post-tags">
        ${p.tags.map(t => `<a class="tag" href="#/tag/${encodeURIComponent(t)}">#${escapeHTML(t)}</a>`).join("")}
      </div>

      <div class="like-box">
        <button class="like-btn ${liked ? "liked" : ""}" id="likeBtn">
          ${liked ? "♥" : "♡"} 공감 <span id="likeCount">${getLikes(p.id)}</span>
        </button>
      </div>

      <nav class="post-nav">
        ${older ? `<a href="#/post/${older.id}"><small>← 이전 글</small>${escapeHTML(older.title)}</a>` : "<span></span>"}
        ${newer ? `<a class="next" href="#/post/${newer.id}"><small>다음 글 →</small>${escapeHTML(newer.title)}</a>` : ""}
      </nav>

      <section class="comments">
        <h2>댓글 <span id="commentCount">0</span></h2>
        <form class="comment-form" id="commentForm">
          <input type="text" id="commentName" placeholder="이름" maxlength="20" required>
          <textarea id="commentText" placeholder="댓글을 남겨주세요" maxlength="500" required></textarea>
          <button type="submit">등록</button>
        </form>
        <ul class="comment-list" id="commentList"></ul>
      </section>
    </article>`;

  document.getElementById("likeBtn").addEventListener("click", () => toggleLike(p.id));
  document.getElementById("commentForm").addEventListener("submit", e => {
    e.preventDefault();
    addComment(p.id);
  });
  renderComments(p.id);
  window.scrollTo(0, 0);
}

// ===== 공감 =====
function getLikes(id) {
  return store.get("likes", {})[id] || 0;
}

function toggleLike(id) {
  const likes = store.get("likes", {});
  const liked = store.get("liked", []);
  const wasLiked = liked.includes(id);

  likes[id] = Math.max(0, (likes[id] || 0) + (wasLiked ? -1 : 1));
  const nextLiked = wasLiked ? liked.filter(x => x !== id) : [...liked, id];

  store.set("likes", likes);
  store.set("liked", nextLiked);

  const btn = document.getElementById("likeBtn");
  btn.classList.toggle("liked", !wasLiked);
  btn.innerHTML = `${wasLiked ? "♡" : "♥"} 공감 <span id="likeCount">${likes[id]}</span>`;
}

// ===== 댓글 =====
function getComments(id) {
  return store.get("comments", {})[id] || [];
}

function addComment(id) {
  const nameInput = document.getElementById("commentName");
  const textInput = document.getElementById("commentText");
  const name = nameInput.value.trim();
  const text = textInput.value.trim();
  if (!name || !text) return;

  const all = store.get("comments", {});
  all[id] = [...(all[id] || []), { name, text, date: new Date().toISOString() }];
  store.set("comments", all);

  textInput.value = "";
  renderComments(id);
}

function renderComments(id) {
  const comments = getComments(id);
  document.getElementById("commentCount").textContent = comments.length;
  document.getElementById("commentList").innerHTML = comments
    .map(c => `
      <li class="comment">
        <span class="comment-author">${escapeHTML(c.name)}</span>
        <span class="comment-date">${new Date(c.date).toLocaleString("ko-KR")}</span>
        <p class="comment-text">${escapeHTML(c.text)}</p>
      </li>`)
    .join("");
}

// ===== 라우터 =====
// 주소의 # 뒷부분을 보고 어떤 화면을 그릴지 결정한다
function render() {
  // 먼저 "/"로 나눈 뒤 조각별로 디코딩해야 검색어 안의 "/"가 깨지지 않는다
  const parts = location.hash.slice(1).split("/").filter(Boolean).map(part => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });

  // 끝에 /page/N 이 붙어 있으면 페이지 번호로 사용
  let page = 1;
  if (parts[parts.length - 2] === "page") {
    page = parseInt(parts.pop(), 10) || 1;
    parts.pop();
  }

  const [type, value] = parts;
  let activeCategory;

  if (type === "post") {
    const post = posts.find(p => p.id === Number(value));
    activeCategory = post && post.category;
    renderPost(Number(value));
  } else if (type === "category" && value) {
    activeCategory = value;
    renderList(
      posts.filter(p => p.category === value),
      `<strong>${escapeHTML(value)}</strong> 카테고리의 글`,
      page,
      `#/category/${encodeURIComponent(value)}`
    );
  } else if (type === "tag" && value) {
    renderList(
      posts.filter(p => p.tags.includes(value)),
      `<strong>#${escapeHTML(value)}</strong> 태그의 글`,
      page,
      `#/tag/${encodeURIComponent(value)}`
    );
  } else if (type === "search" && value) {
    const q = value.toLowerCase();
    const plain = html => html.replace(/<[^>]*>/g, " ");
    renderList(
      posts.filter(p =>
        [p.title, p.excerpt, p.category, plain(p.content), ...p.tags]
          .some(text => text.toLowerCase().includes(q))
      ),
      `<strong>'${escapeHTML(value)}'</strong> 검색 결과`,
      page,
      `#/search/${encodeURIComponent(value)}`
    );
  } else {
    renderList(posts, "전체 글", page, "#");
  }

  renderSidebar(activeCategory);
}

// ===== 다크 모드 =====
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.getElementById("themeToggle").textContent = theme === "dark" ? "☀️" : "🌙";
}

function initTheme() {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(store.get("theme", prefersDark ? "dark" : "light"));

  document.getElementById("themeToggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    store.set("theme", next);
  });
}

// ===== 검색 =====
document.getElementById("searchForm").addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("searchInput");
  const q = input.value.trim();
  if (q) location.hash = `#/search/${encodeURIComponent(q)}`;
});

// ===== 시작 =====
initTheme();
countVisit();
window.addEventListener("hashchange", render);
render();
