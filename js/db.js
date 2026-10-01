// ===== 데이터 접근 계층 =====
// 화면 코드(app.js)는 SQL을 직접 쓰지 않고 이 파일의 함수만 사용한다.

const SQL_JS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/";

const DB = {
  conn: null,   // 블로그 화면용 연결
  bytes: null,  // 원본 DB 파일 (SQL 콘솔용 복사본을 만들 때 사용)
  SQL: null,

  async open(url) {
    this.SQL = await initSqlJs({ locateFile: file => SQL_JS_CDN + file });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}을(를) 불러오지 못했습니다 (HTTP ${res.status})`);
    this.bytes = new Uint8Array(await res.arrayBuffer());
    this.conn = new this.SQL.Database(this.bytes);
  },

  // 원본과 분리된 복사본: SQL 콘솔에서 무엇을 실행해도 블로그 데이터는 그대로다
  sandbox() {
    return new this.SQL.Database(this.bytes);
  },

  all(sql, params = []) {
    const stmt = this.conn.prepare(sql);
    try {
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows;
    } finally {
      stmt.free();
    }
  },

  one(sql, params = []) {
    return this.all(sql, params)[0] || null;
  }
};

// 목록에 필요한 컬럼 (본문 content_md는 무거워서 제외)
const LIST_COLUMNS = `id, slug, title, summary, date, seq, type_code, type_name, type_color,
                      day_no, session_title, project_slug, project_name`;

const Posts = {
  // 조건에 맞는 글을 최신 날짜 → 같은 날은 순서대로
  list({ type, project, date, keyword } = {}) {
    const where = [];
    const params = [];
    if (type)    { where.push("type_code = ?");    params.push(type); }
    if (project) { where.push("project_slug = ?"); params.push(project); }
    if (date)    { where.push("date = ?");         params.push(date); }
    if (keyword) {
      // %, _ 는 LIKE에서 특수문자라서 글자 그대로 찾도록 이스케이프한다
      where.push("(title LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\' OR content_md LIKE ? ESCAPE '\\')");
      const like = `%${keyword.replace(/[\\%_]/g, "\\$&")}%`;
      params.push(like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    return DB.all(
      `SELECT ${LIST_COLUMNS} FROM v_posts ${whereSql} ORDER BY date DESC, seq ASC`,
      params
    );
  },

  bySlug(slug) {
    return DB.one("SELECT * FROM v_posts WHERE slug = ?", [slug]);
  },

  // 전체 글을 (날짜, 순서)로 줄 세웠을 때 바로 앞/뒤 글
  neighbors(post) {
    const older = DB.one(
      `SELECT slug, title FROM v_posts
       WHERE date < ? OR (date = ? AND seq < ?)
       ORDER BY date DESC, seq DESC LIMIT 1`,
      [post.date, post.date, post.seq]
    );
    const newer = DB.one(
      `SELECT slug, title FROM v_posts
       WHERE date > ? OR (date = ? AND seq > ?)
       ORDER BY date ASC, seq ASC LIMIT 1`,
      [post.date, post.date, post.seq]
    );
    return { older, newer };
  },

  recent(limit = 5) {
    return DB.all("SELECT slug, title FROM v_posts ORDER BY date DESC, seq DESC LIMIT ?", [limit]);
  },

  // 달력용: 글이 있는 날짜와 그날이 수업일인지
  datesInMonth(yyyyMm) {
    return DB.all(
      `SELECT date, MAX(day_no) AS day_no, COUNT(*) AS cnt
       FROM v_posts WHERE substr(date, 1, 7) = ? GROUP BY date`,
      [yyyyMm]
    );
  },

  latestDate() {
    const row = DB.one("SELECT MAX(date) AS d FROM posts");
    return row && row.d;
  }
};

const Sessions = {
  // 회차별 목록 + 유형별 글 수
  listWithCounts() {
    return DB.all(
      `SELECT s.day_no, s.date, s.title, s.summary,
              COALESCE(SUM(t.code = 'class'), 0)   AS class_cnt,
              COALESCE(SUM(t.code = 'self'), 0)    AS self_cnt,
              COALESCE(SUM(t.code = 'project'), 0) AS project_cnt,
              COUNT(p.id)                          AS total
       FROM sessions s
       LEFT JOIN posts p      ON p.session_id = s.id
       LEFT JOIN post_types t ON t.id = p.type_id
       GROUP BY s.id
       ORDER BY s.day_no DESC`
    );
  },

  byDate(date) {
    return DB.one("SELECT * FROM sessions WHERE date = ?", [date]);
  },

  byDay(dayNo) {
    return DB.one("SELECT * FROM sessions WHERE day_no = ?", [dayNo]);
  }
};

const Types = {
  withCounts() {
    return DB.all(
      `SELECT t.code, t.name, t.color, COUNT(p.id) AS cnt
       FROM post_types t LEFT JOIN posts p ON p.type_id = t.id
       GROUP BY t.id ORDER BY t.id`
    );
  },

  byCode(code) {
    return DB.one("SELECT * FROM post_types WHERE code = ?", [code]);
  }
};

const Projects = {
  withCounts() {
    return DB.all(
      `SELECT pr.slug, pr.name, COUNT(p.id) AS cnt
       FROM projects pr LEFT JOIN posts p ON p.project_id = pr.id
       GROUP BY pr.id ORDER BY pr.started_on DESC`
    );
  },

  bySlug(slug) {
    return DB.one("SELECT * FROM projects WHERE slug = ?", [slug]);
  }
};

const Stats = {
  summary() {
    return DB.one(
      `SELECT (SELECT COUNT(*) FROM sessions)                AS days,
              (SELECT COUNT(*) FROM posts)                   AS posts,
              (SELECT COUNT(DISTINCT date) FROM posts)       AS record_days`
    );
  },

  tables() {
    return DB.all(
      `SELECT name, type, sql FROM sqlite_master
       WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'
       ORDER BY type, rowid`
    ).map(t => ({
      ...t,
      rows: DB.one(`SELECT COUNT(*) AS n FROM "${t.name}"`).n
    }));
  }
};
