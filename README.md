# 진행의 AI응용프로젝트 일지 (devlog)

**AI응용프로젝트** 수업 기간 동안 배운 내용과 스스로 공부한 내용을 **일자별로** 기록하는 블로그입니다.
[Tistory](https://www.tistory.com/)의 레이아웃을 참고했고, 이 블로그를 만드는 과정도 `프로젝트` 글로 함께 기록합니다.

- 프론트엔드: HTML / CSS / JavaScript (프레임워크 없음)
- 데이터베이스: **SQLite**, 브라우저에서 [sql.js](https://sql.js.org/)(WebAssembly)로 직접 SQL 조회
- 글 작성: Markdown 파일 → Python 빌드 스크립트 → `db/blog.db`

## 주요 기능

| 기능 | 설명 |
|---|---|
| 일자별 타임라인 | 날짜별로 묶어서 보여주고, 수업일은 **Day N**으로 표시 |
| 달력 | 사이드바 달력에서 수업일/기록한 날을 표시, 클릭하면 그날의 기록으로 이동 |
| 회차별 보기 | 수업 회차마다 수업/자습/프로젝트 글 수를 표로 정리 |
| 유형 / 프로젝트 필터 | `수업`, `자습`, `프로젝트` 유형과 프로젝트별 연재 모아보기 |
| 검색 | 제목, 요약, 본문 검색 (SQL `LIKE`) |
| DB 페이지 | 테이블 구조와 행 수, 스키마 확인 + **브라우저에서 SQL 직접 실행** |
| 다크 모드 / 반응형 | 설정 기억, 모바일에서는 사이드바가 아래로 이동 |

## 데이터베이스 설계

```text
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  sessions    │      │  post_types  │      │  projects    │
│  수업 회차    │      │  글 유형      │      │  프로젝트     │
│──────────────│      │──────────────│      │──────────────│
│ id (PK)      │      │ id (PK)      │      │ id (PK)      │
│ day_no  (UQ) │      │ code    (UQ) │      │ slug    (UQ) │
│ date    (UQ) │      │ name    (UQ) │      │ name         │
│ title        │      │ color        │      │ description  │
│ summary      │      └──────┬───────┘      │ repo_url     │
└──────┬───────┘             │ 1            │ started_on   │
       │ 1                   │              └──────┬───────┘
       │       N ┌───────────▼──────────┐ N        │ 1
       └────────▶│  posts  글            │◀─────────┘
                 │──────────────────────│
                 │ id (PK)              │
                 │ slug (UQ)            │
                 │ title, summary       │
                 │ content_md           │
                 │ date, seq  (UQ 묶음) │
                 │ type_id    (FK, 필수)│
                 │ session_id (FK, 선택)│
                 │ project_id (FK, 선택)│
                 └──────────────────────┘
```

| 테이블 | 역할 |
|---|---|
| `sessions` | 수업이 있었던 날 (Day 1, Day 2 ...) |
| `post_types` | 글 유형 코드 테이블: 수업(`class`) / 자습(`self`) / 프로젝트(`project`) |
| `projects` | 수업 중 진행하는 프로젝트 (이 블로그 포함) |
| `posts` | 모든 글. `date`가 일자별 정리의 기준 |
| `v_posts` (뷰) | 4개 테이블을 조인해 화면에서 바로 쓰는 글 목록 |

- 글 유형을 코드 테이블로 분리해서 정해진 값만 들어가도록 FK로 제약
- 수업이 없는 날(주말 자습 등)도 기록할 수 있게 `session_id`는 NULL 허용
- `(date, seq)` UNIQUE로 하루에 여러 글을 쓸 때 순서 보장

전체 스키마는 [`db/schema.sql`](db/schema.sql)에 있습니다.

## 실행 방법

DB 파일을 `fetch`로 읽기 때문에 `index.html`을 더블클릭하면 동작하지 않고, **로컬 서버**가 필요합니다.

```bash
git clone https://github.com/AIP-1/blog-basic-AIGJ_01_013-devlog.git
cd blog-basic-AIGJ_01_013-devlog
python3 -m http.server
# 브라우저에서 http://localhost:8000 접속
```

## 새 글 쓰는 법

### 1. 마크다운 파일 만들기

`content/posts/`에 **`날짜-순서-슬러그.md`** 형식으로 파일을 만듭니다.

```text
content/posts/2026-10-02-1-python-basics.md
              └ 날짜 ─┘ │ └── 슬러그 ──┘
                    같은 날 순서
```

```markdown
---
title: 파이썬 기초 문법
type: 수업              # 수업 / 자습 / 프로젝트
project: devlog         # (선택) projects.csv의 slug
summary: 목록에 보일 한두 줄 요약
---

## 오늘 배운 것

본문은 마크다운으로 자유롭게 작성합니다.
```

### 2. 수업일이면 회차 추가

`content/sessions.csv`에 한 줄 추가합니다. 같은 날짜의 글은 자동으로 해당 Day에 연결됩니다.

```csv
2,2026-10-02,파이썬 기초,변수와 자료형
```

### 3. DB 빌드 후 커밋

```bash
python3 scripts/build_db.py
git add -A
git commit -m "Day 2 기록"
git push
```

빌드 스크립트는 파일 이름 형식, 유형, 프로젝트, 중복 여부를 검사하고, 오류가 있으면 기존 DB를 그대로 둔 채 이유를 알려줍니다.

## 폴더 구조

```
├── index.html            # 페이지 뼈대 (헤더, 본문, 사이드바)
├── css/style.css         # 디자인, 다크 모드, 반응형
├── js/
│   ├── db.js             # 데이터 접근 계층: 모든 SQL 쿼리
│   └── app.js            # 해시 라우팅, 화면 렌더링, 달력, SQL 콘솔
├── db/
│   ├── schema.sql        # 테이블 설계 (DDL)
│   └── blog.db           # 빌드된 SQLite DB (사이트가 읽는 파일)
├── content/
│   ├── sessions.csv      # 수업 회차
│   ├── projects.csv      # 프로젝트
│   └── posts/*.md        # 글 (마크다운)
└── scripts/build_db.py   # content → db/blog.db 빌드
```

## 화면 주소 (해시 라우팅)

| 주소 | 화면 |
|---|---|
| `#/` | 전체 타임라인 |
| `#/date/2026-10-01` | 그날의 기록 |
| `#/day/1` | Day 1 (해당 날짜로 이동) |
| `#/days` | 회차별 표 |
| `#/type/class` | 유형별 (`class` / `self` / `project`) |
| `#/project/devlog` | 프로젝트 연재 |
| `#/post/<slug>` | 글 상세 |
| `#/search/<검색어>` | 검색 결과 |
| `#/db` | DB 구조와 SQL 콘솔 |
