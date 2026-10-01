"""content/ 폴더의 글과 CSV를 읽어서 db/blog.db (SQLite)를 새로 만든다.

사용법:
    python3 scripts/build_db.py
"""

import csv
import os
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
SCHEMA = ROOT / "db" / "schema.sql"
DB_PATH = ROOT / "db" / "blog.db"

# 파일 이름 형식: 2026-10-01-1-slug.md  (날짜-같은 날 순서-슬러그)
FILENAME_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})-(\d+)-([a-z0-9-]+)\.md$")


def parse_front_matter(text):
    """'---'로 감싼 머리말(key: value)과 본문을 나눈다."""
    match = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not match:
        raise ValueError("머리말(---)이 없습니다")

    meta = {}
    for line in match.group(1).splitlines():
        if not line.strip():
            continue
        key, sep, value = line.partition(":")
        if not sep:
            raise ValueError(f"머리말 형식 오류: {line!r}")
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        meta[key.strip()] = value
    return meta, match.group(2).strip() + "\n"


def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def build(conn):
    conn.executescript(SCHEMA.read_text(encoding="utf-8"))

    for row in read_csv(CONTENT / "sessions.csv"):
        conn.execute(
            "INSERT INTO sessions (day_no, date, title, summary) VALUES (?, ?, ?, ?)",
            (int(row["day_no"]), row["date"], row["title"], row["summary"] or None),
        )

    for row in read_csv(CONTENT / "projects.csv"):
        conn.execute(
            "INSERT INTO projects (slug, name, description, repo_url, started_on) VALUES (?, ?, ?, ?, ?)",
            (row["slug"], row["name"], row["description"] or None, row["repo_url"] or None, row["started_on"]),
        )

    # 글 유형은 이름('수업')과 코드('class') 둘 다 허용
    types = {}
    for type_id, code, name in conn.execute("SELECT id, code, name FROM post_types"):
        types[code] = type_id
        types[name] = type_id
    projects = dict(conn.execute("SELECT slug, id FROM projects"))
    sessions = dict(conn.execute("SELECT date, id FROM sessions"))

    errors = []
    for path in sorted((CONTENT / "posts").glob("*.md")):
        name = path.name
        m = FILENAME_RE.match(name)
        if not m:
            errors.append(f"{name}: 파일 이름은 'YYYY-MM-DD-순서-slug.md' 형식이어야 합니다")
            continue
        date, seq, slug = m.group(1), int(m.group(2)), m.group(3)

        try:
            meta, body = parse_front_matter(path.read_text(encoding="utf-8"))
        except ValueError as e:
            errors.append(f"{name}: {e}")
            continue

        if not meta.get("title"):
            errors.append(f"{name}: title이 없습니다")
            continue
        type_id = types.get(meta.get("type", ""))
        if type_id is None:
            errors.append(f"{name}: type은 수업/자습/프로젝트 중 하나여야 합니다 (현재: {meta.get('type')!r})")
            continue
        project_slug = meta.get("project")
        if project_slug and project_slug not in projects:
            errors.append(f"{name}: projects.csv에 없는 프로젝트입니다 ({project_slug!r})")
            continue

        try:
            conn.execute(
                """INSERT INTO posts
                   (slug, title, summary, content_md, date, seq, type_id, session_id, project_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    slug, meta["title"], meta.get("summary"), body, date, seq, type_id,
                    sessions.get(date), projects.get(project_slug) if project_slug else None,
                ),
            )
        except sqlite3.IntegrityError as e:
            errors.append(f"{name}: {e} (slug 또는 같은 날짜의 순서 번호가 겹칩니다)")

    return errors


def main():
    tmp_path = DB_PATH.with_suffix(".db.tmp")
    if tmp_path.exists():
        tmp_path.unlink()

    conn = sqlite3.connect(tmp_path)
    try:
        errors = build(conn)
        if errors:
            print("빌드 실패:")
            for e in errors:
                print("  -", e)
            conn.close()
            tmp_path.unlink()
            sys.exit(1)

        conn.commit()
        conn.execute("VACUUM")
        summary = conn.execute(
            """SELECT
                 (SELECT COUNT(*) FROM sessions),
                 (SELECT COUNT(*) FROM projects),
                 (SELECT COUNT(*) FROM posts)"""
        ).fetchone()
        by_type = conn.execute(
            """SELECT t.name, COUNT(p.id) FROM post_types t
               LEFT JOIN posts p ON p.type_id = t.id GROUP BY t.id ORDER BY t.id"""
        ).fetchall()
    finally:
        conn.close()

    # 성공했을 때만 기존 DB를 교체한다
    os.replace(tmp_path, DB_PATH)
    print(f"✔ {DB_PATH.relative_to(ROOT)} 생성 완료")
    print(f"  회차 {summary[0]}개 · 프로젝트 {summary[1]}개 · 글 {summary[2]}개")
    print("  " + " · ".join(f"{name} {cnt}" for name, cnt in by_type))


if __name__ == "__main__":
    main()
