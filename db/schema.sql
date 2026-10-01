-- =====================================================================
--  AI응용프로젝트 학습 블로그 - 데이터베이스 스키마 (SQLite)
--
--   sessions   (1) ──< (N) posts    수업 회차별 글   (선택)
--   post_types (1) ──< (N) posts    글 유형          (필수)
--   projects   (1) ──< (N) posts    프로젝트 기록    (선택)
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- 수업 회차: 수업이 있었던 날 하나당 한 행 (Day 1, Day 2 ...)
-- ---------------------------------------------------------------------
CREATE TABLE sessions (
    id       INTEGER PRIMARY KEY,
    day_no   INTEGER NOT NULL UNIQUE CHECK (day_no > 0),     -- Day N
    date     TEXT    NOT NULL UNIQUE CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    title    TEXT    NOT NULL,                                -- 그날 수업 주제
    summary  TEXT
);

-- ---------------------------------------------------------------------
-- 글 유형: 수업 / 자습 / 프로젝트 (코드 테이블)
-- ---------------------------------------------------------------------
CREATE TABLE post_types (
    id     INTEGER PRIMARY KEY,
    code   TEXT NOT NULL UNIQUE,   -- URL에 쓰는 영문 코드
    name   TEXT NOT NULL UNIQUE,   -- 화면에 보이는 이름
    color  TEXT NOT NULL           -- 배지 색상
);

INSERT INTO post_types (id, code, name, color) VALUES
    (1, 'class',   '수업',     '#3b82f6'),
    (2, 'self',    '자습',     '#10b981'),
    (3, 'project', '프로젝트', '#f97316');

-- ---------------------------------------------------------------------
-- 프로젝트: 수업 중 진행하는 결과물 (이 블로그 자체도 하나의 프로젝트)
-- ---------------------------------------------------------------------
CREATE TABLE projects (
    id          INTEGER PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT,
    repo_url    TEXT,
    started_on  TEXT NOT NULL
);

-- ---------------------------------------------------------------------
-- 글: 모든 기록의 중심 테이블
--   - date       : 글이 다루는 날짜 (일자별 정리의 기준)
--   - session_id : 그 날짜가 수업일이면 해당 회차, 아니면 NULL (주말 자습 등)
--   - project_id : 프로젝트 진행 기록이면 해당 프로젝트
-- ---------------------------------------------------------------------
CREATE TABLE posts (
    id          INTEGER PRIMARY KEY,
    slug        TEXT    NOT NULL UNIQUE,
    title       TEXT    NOT NULL,
    summary     TEXT,
    content_md  TEXT    NOT NULL,                 -- 본문 (Markdown 원문)
    date        TEXT    NOT NULL,
    seq         INTEGER NOT NULL DEFAULT 1,       -- 같은 날짜 안에서의 순서
    type_id     INTEGER NOT NULL REFERENCES post_types (id),
    session_id  INTEGER REFERENCES sessions (id),
    project_id  INTEGER REFERENCES projects (id),
    UNIQUE (date, seq)
);

CREATE INDEX idx_posts_date    ON posts (date);
CREATE INDEX idx_posts_type    ON posts (type_id);
CREATE INDEX idx_posts_project ON posts (project_id);

-- ---------------------------------------------------------------------
-- 뷰: 화면에서 바로 쓰기 좋게 조인해 둔 글 목록
-- ---------------------------------------------------------------------
CREATE VIEW v_posts AS
SELECT
    p.id, p.slug, p.title, p.summary, p.content_md, p.date, p.seq,
    t.code  AS type_code,
    t.name  AS type_name,
    t.color AS type_color,
    s.day_no,
    s.title AS session_title,
    pr.slug AS project_slug,
    pr.name AS project_name
FROM posts p
JOIN post_types     t  ON t.id  = p.type_id
LEFT JOIN sessions  s  ON s.id  = p.session_id
LEFT JOIN projects  pr ON pr.id = p.project_id;
