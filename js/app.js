// ===== 설정 =====
const DATES_PER_PAGE = 5; // 타임라인 한 페이지에 보여줄 날짜 수
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const $content = document.getElementById("content");
let calMonth = null;        // 달력에 표시 중인 달 (YYYY-MM)
let selectedDate = null;    // 달력에서 강조할 날짜
let sandbox = null;         // SQL 콘솔용 DB 복사본

// ===== 유틸 =====
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

function esc(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(dateStr) {
  const d = toDate(dateStr);
  return `${dateStr.replace(/-/g, ". ")} (${WEEKDAYS[d.getDay()]})`;
}

function renderMarkdown(md) {
  return DOMPurify.sanitize(marked.parse(md, { gfm: true }));
}

function typeBadge(p) {
  return `<a class="badge" href="#/type/${esc(p.type_code)}" style="--c:${esc(p.type_color)}">${esc(p.type_name)}</a>`;
}

function dayBadge(dayNo) {
  return dayNo ? `<span class="day-badge">Day ${dayNo}</span>` : `<span class="day-badge off">자습일</span>`;
}

// 같은 날짜끼리 묶기 (입력은 이미 날짜순 정렬된 상태)
function groupByDate(posts) {
  const groups = [];
  posts.forEach(p => {
    const last = groups[groups.length - 1];
    if (last && last.date === p.date) last.posts.push(p);
    else groups.push({ date: p.date, dayNo: p.day_no, sessionTitle: p.session_title, posts: [p] });
  });
  return groups;
}

function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// ===== 학습 잔디 =====
const HEATMAP_MIN_WEEKS = 20;

function heatLevel(cnt) {
  if (!cnt) return 0;
  if (cnt === 1) return 1;
  if (cnt <= 3) return 2;
  if (cnt <= 5) return 3;
  return 4;
}

// 연속 기록 일수: 최장 기록과, 오늘(또는 어제)까지 이어지고 있는 현재 기록
function calcStreaks(dates) {
  let longest = 0;
  let run = 0;
  let prev = null;
  dates.forEach(key => {
    run = prev && toKey(addDays(toDate(prev), 1)) === key ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = key;
  });

  const today = new Date();
  const alive = prev === toKey(today) || prev === toKey(addDays(today, -1));
  return { longest, current: alive ? run : 0 };
}

function renderHeatmap() {
  const rows = Posts.countsByDate();
  if (!rows.length) return "";

  const counts = {};
  rows.forEach(r => { counts[r.date] = r.cnt; });

  // 첫 기록이 있는 주의 일요일부터, 최소 20주 또는 오늘이 있는 주까지
  const first = toDate(rows[0].date);
  const start = addDays(first, -first.getDay());
  const lastRecord = toDate(rows[rows.length - 1].date);
  const end = new Date(Math.max(lastRecord, new Date()));
  const weeks = Math.max(HEATMAP_MIN_WEEKS, Math.ceil((end - start) / 86400000 / 7) + 1);

  const today = toKey(new Date());
  let cells = "";
  let months = "";
  let lastMonth = -1;

  for (let w = 0; w < weeks; w++) {
    const weekStart = addDays(start, w * 7);
    // 그 주에 1일이 들어 있으면 위쪽에 월 표시
    const firstOfMonth = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(weekStart, i)).find(d => d.getDate() === 1);
    const labelDate = firstOfMonth || (w === 0 ? weekStart : null);
    if (labelDate && labelDate.getMonth() !== lastMonth) {
      months += `<span style="grid-column:${w + 1}">${labelDate.getMonth() + 1}월</span>`;
      lastMonth = labelDate.getMonth();
    }

    for (let i = 0; i < 7; i++) {
      const key = toKey(addDays(weekStart, i));
      const cnt = counts[key] || 0;
      const future = key > today ? " future" : "";
      cells += cnt
        ? `<a href="#/date/${key}" class="heat l${heatLevel(cnt)}" title="${key} · 글 ${cnt}개"></a>`
        : `<span class="heat l0${future}" title="${key}"></span>`;
    }
  }

  const { longest, current } = calcStreaks(rows.map(r => r.date));
  const total = rows.reduce((sum, r) => sum + r.cnt, 0);

  return `
    <section class="card heatmap-card">
      <div class="heatmap-head">
        <h2>학습 잔디</h2>
        <span class="count">${rows.length}일 동안 글 ${total}개 · 현재 연속 ${current}일 · 최장 연속 ${longest}일</span>
      </div>
      <div class="heatmap-scroll">
        <div class="heatmap" style="--weeks:${weeks}">
          <div class="heatmap-months">${months}</div>
          <div class="heatmap-days"><span></span><span>월</span><span></span><span>수</span><span></span><span>금</span><span></span></div>
          <div class="heatmap-grid">${cells}</div>
        </div>
      </div>
      <div class="heatmap-legend">
        적음 <span class="heat l0"></span><span class="heat l1"></span><span class="heat l2"></span><span class="heat l3"></span><span class="heat l4"></span> 많음
      </div>
    </section>`;
}

// ===== 타임라인 (일자별 목록) =====
function renderTimeline({ heading, intro = "", posts, page, baseHash }) {
  const groups = groupByDate(posts);
  const totalPages = Math.max(1, Math.ceil(groups.length / DATES_PER_PAGE));
  const current = Math.min(Math.max(1, page), totalPages);
  const pageGroups = groups.slice((current - 1) * DATES_PER_PAGE, current * DATES_PER_PAGE);

  const body = pageGroups.length
    ? pageGroups.map(dayBlock).join("")
    : `<div class="empty">글이 없습니다.</div>`;

  let pagination = "";
  if (totalPages > 1) {
    pagination = `<nav class="pagination" aria-label="페이지">` +
      Array.from({ length: totalPages }, (_, i) => i + 1)
        .map(n => `<a href="${baseHash}/page/${n}" class="${n === current ? "active" : ""}">${n}</a>`)
        .join("") +
      `</nav>`;
  }

  $content.innerHTML = `
    <h1 class="list-heading">${heading} <span class="count">${posts.length}개의 글</span></h1>
    ${intro}
    <div class="timeline">${body}</div>
    ${pagination}`;
}

function dayBlock(group) {
  return `
    <section class="day-block">
      <header class="day-head">
        <a href="#/date/${group.date}" class="day-date">${dayBadge(group.dayNo)} ${formatDate(group.date)}</a>
        ${group.sessionTitle ? `<span class="day-title">${esc(group.sessionTitle)}</span>` : ""}
      </header>
      <div class="day-posts">${group.posts.map(postItem).join("")}</div>
    </section>`;
}

function postItem(p) {
  return `
    <article class="post-item">
      <div class="post-item-meta">
        ${typeBadge(p)}
        ${p.project_name ? `<a class="project-chip" href="#/project/${esc(p.project_slug)}">📁 ${esc(p.project_name)}</a>` : ""}
      </div>
      <h2 class="post-item-title"><a href="#/post/${esc(p.slug)}">${esc(p.title)}</a></h2>
      ${p.summary ? `<p class="post-excerpt">${esc(p.summary)}</p>` : ""}
    </article>`;
}

// ===== 회차별 =====
function renderDays() {
  const rows = Sessions.listWithCounts();
  const body = rows.length
    ? rows.map(s => `
        <tr>
          <td><a href="#/date/${s.date}" class="day-badge">Day ${s.day_no}</a></td>
          <td class="nowrap">${formatDate(s.date)}</td>
          <td><a href="#/date/${s.date}"><b>${esc(s.title)}</b></a>${s.summary ? `<br><small>${esc(s.summary)}</small>` : ""}</td>
          <td class="num">${s.class_cnt}</td>
          <td class="num">${s.self_cnt}</td>
          <td class="num">${s.project_cnt}</td>
        </tr>`).join("")
    : `<tr><td colspan="6" class="empty-cell">등록된 수업 회차가 없습니다.</td></tr>`;

  $content.innerHTML = `
    <h1 class="list-heading">수업 회차 <span class="count">${rows.length}회</span></h1>
    <div class="card table-wrap">
      <table class="data-table">
        <thead><tr><th>회차</th><th>날짜</th><th>주제</th><th>수업</th><th>자습</th><th>프로젝트</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

// ===== 글 상세 =====
function renderPost(slug) {
  const p = Posts.bySlug(slug);
  if (!p) {
    $content.innerHTML = `<div class="empty">존재하지 않는 글입니다. <a href="#/">타임라인으로</a></div>`;
    return;
  }
  selectedDate = p.date;
  const { older, newer } = Posts.neighbors(p);

  $content.innerHTML = `
    <article class="card post-detail">
      <header class="post-header">
        <div class="post-item-meta">
          ${typeBadge(p)}
          ${p.project_name ? `<a class="project-chip" href="#/project/${esc(p.project_slug)}">📁 ${esc(p.project_name)}</a>` : ""}
        </div>
        <h1 class="post-title">${esc(p.title)}</h1>
        <a class="post-meta" href="#/date/${p.date}">${dayBadge(p.day_no)} ${formatDate(p.date)}${p.session_title ? ` · ${esc(p.session_title)}` : ""}</a>
      </header>

      <div class="post-content">${renderMarkdown(p.content_md)}</div>

      <nav class="post-nav">
        ${older ? `<a href="#/post/${esc(older.slug)}"><small>← 이전 글</small>${esc(older.title)}</a>` : "<span></span>"}
        ${newer ? `<a class="next" href="#/post/${esc(newer.slug)}"><small>다음 글 →</small>${esc(newer.title)}</a>` : ""}
      </nav>
    </article>`;
  window.scrollTo(0, 0);
}

// ===== DB 페이지 =====
const PRESET_QUERIES = [
  {
    label: "일자별 글 수",
    sql: `SELECT date, day_no, session_title, COUNT(*) AS posts\nFROM v_posts\nGROUP BY date\nORDER BY date DESC;`
  },
  {
    label: "유형별 글 수",
    sql: `SELECT t.name, COUNT(p.id) AS cnt\nFROM post_types t\nLEFT JOIN posts p ON p.type_id = t.id\nGROUP BY t.id;`
  },
  {
    label: "프로젝트 기록",
    sql: `SELECT pr.name, p.date, p.title\nFROM posts p\nJOIN projects pr ON pr.id = p.project_id\nORDER BY p.date, p.seq;`
  },
  {
    label: "회차 목록",
    sql: `SELECT * FROM sessions ORDER BY day_no;`
  }
];

function renderDbPage() {
  const tables = Stats.tables();
  const cards = tables.map(t => `
    <div class="table-card">
      <span class="table-kind">${t.type === "view" ? "VIEW" : "TABLE"}</span>
      <b>${esc(t.name)}</b>
      <span class="count">${t.rows}행</span>
    </div>`).join("");
  const schema = tables.map(t => t.sql).join(";\n\n") + ";";

  $content.innerHTML = `
    <h1 class="list-heading">데이터베이스</h1>
    <div class="card db-intro">
      <p>이 블로그의 모든 글은 <b>SQLite</b> 데이터베이스(<code>db/blog.db</code>)에 저장되어 있고,
      브라우저에서 <b>sql.js</b>(WebAssembly)로 직접 SQL을 실행해 화면을 그립니다.</p>
      <div class="table-cards">${cards}</div>
      <pre class="erd">sessions   (1) ──&lt; (N) posts    수업 회차별 글   (선택)
post_types (1) ──&lt; (N) posts    글 유형          (필수)
projects   (1) ──&lt; (N) posts    프로젝트 기록    (선택)</pre>
      <details>
        <summary>전체 스키마 보기</summary>
        <pre><code>${esc(schema)}</code></pre>
      </details>
    </div>

    <h2 class="section-title">SQL 콘솔</h2>
    <div class="card">
      <div class="presets">
        ${PRESET_QUERIES.map((q, i) => `<button type="button" class="chip" data-preset="${i}">${esc(q.label)}</button>`).join("")}
      </div>
      <textarea id="sqlInput" class="sql-input" spellcheck="false">${esc(PRESET_QUERIES[0].sql)}</textarea>
      <div class="sql-actions">
        <small>Ctrl/⌘ + Enter로 실행 · 복사본에서 실행되므로 블로그 데이터는 바뀌지 않아요</small>
        <button type="button" class="btn-ghost" id="sqlReset">초기화</button>
        <button type="button" class="btn" id="sqlRun">실행</button>
      </div>
      <div id="sqlResult" class="sql-result"></div>
    </div>`;

  const input = document.getElementById("sqlInput");
  document.querySelectorAll("[data-preset]").forEach(btn =>
    btn.addEventListener("click", () => {
      input.value = PRESET_QUERIES[Number(btn.dataset.preset)].sql;
      runSql();
    })
  );
  document.getElementById("sqlRun").addEventListener("click", runSql);
  document.getElementById("sqlReset").addEventListener("click", () => {
    sandbox = DB.sandbox();
    document.getElementById("sqlResult").innerHTML = `<p class="sql-msg">복사본을 원래 데이터로 되돌렸습니다.</p>`;
  });
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runSql();
    }
  });
  runSql();
}

function runSql() {
  const $result = document.getElementById("sqlResult");
  const sql = document.getElementById("sqlInput").value.trim();
  if (!sql) return;
  if (!sandbox) sandbox = DB.sandbox();

  try {
    const results = sandbox.exec(sql);
    if (!results.length) {
      $result.innerHTML = `<p class="sql-msg">실행 완료 (변경된 행: ${sandbox.getRowsModified()})</p>`;
      return;
    }
    // 여러 문장을 실행했다면 마지막 SELECT 결과를 보여준다
    const { columns, values } = results[results.length - 1];
    const shown = values.slice(0, 200);
    $result.innerHTML = `
      <p class="sql-msg">${values.length}행${values.length > shown.length ? " (200행까지 표시)" : ""}</p>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>${columns.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead>
          <tbody>${shown.map(row => `<tr>${row.map(v => `<td>${v === null ? `<i class="null">NULL</i>` : esc(String(v).slice(0, 120))}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>`;
  } catch (err) {
    $result.innerHTML = `<p class="sql-error">⚠️ ${esc(err.message)}</p>`;
  }
}

// ===== 사이드바 =====
function renderSidebar(active) {
  const s = Stats.summary();
  document.getElementById("stats").innerHTML = `
    <div><b>${s.days}</b><span>수업일</span></div>
    <div><b>${s.record_days}</b><span>기록한 날</span></div>
    <div><b>${s.posts}</b><span>글</span></div>`;

  document.getElementById("typeList").innerHTML = Types.withCounts()
    .map(t => `<li><a href="#/type/${esc(t.code)}" class="${active.type === t.code ? "active" : ""}">
      <span class="dot" style="background:${esc(t.color)}"></span>${esc(t.name)} <span class="count">(${t.cnt})</span></a></li>`)
    .join("");

  const projects = Projects.withCounts();
  document.getElementById("projectList").innerHTML = projects.length
    ? projects.map(p => `<li><a href="#/project/${esc(p.slug)}" class="${active.project === p.slug ? "active" : ""}">
        📁 ${esc(p.name)} <span class="count">(${p.cnt})</span></a></li>`).join("")
    : `<li class="count">아직 없음</li>`;

  document.getElementById("recentList").innerHTML = Posts.recent()
    .map(p => `<li><a href="#/post/${esc(p.slug)}">${esc(p.title)}</a></li>`)
    .join("");

  document.querySelectorAll("[data-nav]").forEach(a =>
    a.classList.toggle("active", a.dataset.nav === active.nav)
  );

  renderCalendar();
}

function renderCalendar() {
  const [y, m] = calMonth.split("-").map(Number);
  document.getElementById("calTitle").textContent = `${y}년 ${m}월`;

  const marks = {};
  Posts.datesInMonth(calMonth).forEach(r => { marks[r.date] = r; });

  const firstDay = new Date(y, m - 1, 1).getDay();
  const lastDate = new Date(y, m, 0).getDate();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  let cells = WEEKDAYS.map(w => `<span class="cal-week">${w}</span>`).join("");
  cells += "<span></span>".repeat(firstDay);
  for (let d = 1; d <= lastDate; d++) {
    const date = `${calMonth}-${String(d).padStart(2, "0")}`;
    const mark = marks[date];
    const cls = [
      "cal-day",
      mark ? "has" : "",
      mark && mark.day_no ? "class" : "",
      date === today ? "today" : "",
      date === selectedDate ? "selected" : ""
    ].filter(Boolean).join(" ");
    cells += mark
      ? `<a href="#/date/${date}" class="${cls}" title="${mark.day_no ? `Day ${mark.day_no} · ` : ""}글 ${mark.cnt}개">${d}</a>`
      : `<span class="${cls}">${d}</span>`;
  }
  document.getElementById("calendar").innerHTML = cells;
}

function moveMonth(diff) {
  const [y, m] = calMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + diff, 1);
  calMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  renderCalendar();
}

// ===== 라우터 =====
function parseHash() {
  // "/"로 먼저 나눈 뒤 조각별로 디코딩해야 검색어 안의 "/"가 깨지지 않는다
  const parts = location.hash.slice(1).split("/").filter(Boolean).map(part => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
  let page = 1;
  if (parts[parts.length - 2] === "page") {
    page = parseInt(parts.pop(), 10) || 1;
    parts.pop();
  }
  return { type: parts[0], value: parts[1], page };
}

function render() {
  const { type, value, page } = parseHash();
  const active = { nav: "home" };
  selectedDate = null;

  if (type === "post" && value) {
    renderPost(value);
  } else if (type === "date" && value) {
    selectedDate = value;
    const session = Sessions.byDate(value);
    renderTimeline({
      heading: `<strong>${esc(value.replace(/-/g, ". "))}</strong>의 기록`,
      intro: session && session.summary ? `<p class="list-intro">${esc(session.summary)}</p>` : "",
      posts: Posts.list({ date: value }),
      page,
      baseHash: `#/date/${value}`
    });
  } else if (type === "day" && value) {
    const session = Sessions.byDay(Number(value));
    location.replace(session ? `#/date/${session.date}` : "#/days");
    return;
  } else if (type === "days") {
    active.nav = "days";
    renderDays();
  } else if (type === "type" && value) {
    active.type = value;
    const t = Types.byCode(value);
    renderTimeline({
      heading: `<strong>${esc(t ? t.name : value)}</strong> 기록`,
      posts: Posts.list({ type: value }),
      page,
      baseHash: `#/type/${encodeURIComponent(value)}`
    });
  } else if (type === "project" && value) {
    active.project = value;
    const pr = Projects.bySlug(value);
    renderTimeline({
      heading: `📁 <strong>${esc(pr ? pr.name : value)}</strong>`,
      intro: pr ? `<p class="list-intro">${esc(pr.description)}
        ${pr.repo_url ? `<br><a href="${esc(pr.repo_url)}" target="_blank" rel="noopener">저장소 보기 ↗</a>` : ""}</p>` : "",
      posts: Posts.list({ project: value }),
      page,
      baseHash: `#/project/${encodeURIComponent(value)}`
    });
  } else if (type === "search" && value) {
    renderTimeline({
      heading: `<strong>'${esc(value)}'</strong> 검색 결과`,
      posts: Posts.list({ keyword: value }),
      page,
      baseHash: `#/search/${encodeURIComponent(value)}`
    });
  } else if (type === "db") {
    active.nav = "db";
    renderDbPage();
  } else {
    renderTimeline({
      heading: "전체 타임라인",
      intro: page === 1 ? renderHeatmap() : "",
      posts: Posts.list(),
      page,
      baseHash: "#"
    });
  }

  // 선택한 날짜가 있으면 달력도 그 달로 이동
  if (selectedDate) calMonth = selectedDate.slice(0, 7);
  renderSidebar(active);
}

// ===== 다크 모드 =====
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.getElementById("themeToggle").textContent = theme === "dark" ? "☀️" : "🌙";
}

document.getElementById("themeToggle").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  store.set("theme", next);
});

// ===== 검색 / 달력 버튼 =====
document.getElementById("searchForm").addEventListener("submit", e => {
  e.preventDefault();
  const q = document.getElementById("searchInput").value.trim();
  if (q) location.hash = `#/search/${encodeURIComponent(q)}`;
});
document.getElementById("calPrev").addEventListener("click", () => moveMonth(-1));
document.getElementById("calNext").addEventListener("click", () => moveMonth(1));

// ===== 시작 =====
async function start() {
  applyTheme(document.documentElement.dataset.theme || "light");
  try {
    await DB.open("db/blog.db");
  } catch (err) {
    const isFile = location.protocol === "file:";
    $content.innerHTML = `
      <div class="empty">
        <p>⚠️ 데이터베이스를 불러오지 못했습니다.</p>
        <p class="count">${esc(err.message)}</p>
        ${isFile ? `<p>index.html을 직접 열면 브라우저 보안 정책 때문에 DB 파일을 읽을 수 없어요.<br>
          터미널에서 <code>python3 -m http.server</code> 실행 후 <code>http://localhost:8000</code>으로 접속하세요.</p>` : ""}
      </div>`;
    return;
  }
  calMonth = (Posts.latestDate() || new Date().toISOString().slice(0, 10)).slice(0, 7);
  window.addEventListener("hashchange", render);
  render();
}

start();
