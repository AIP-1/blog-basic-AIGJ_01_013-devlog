# 진행의 AI응용프로젝트 일지 (devlog)

**AI응용프로젝트** 수업 기간 동안 배운 내용과 스스로 공부한 내용을 **일자별로** 기록하는 블로그입니다.
[Tistory](https://www.tistory.com/)의 레이아웃을 참고했고, 이 블로그를 만드는 과정도 `프로젝트` 글로 함께 기록합니다.

- 프론트엔드: HTML / CSS / JavaScript (프레임워크 없음)
- 데이터베이스: **SQLite**, 브라우저에서 [sql.js](https://sql.js.org/)(WebAssembly)로 직접 SQL 조회
- 글 작성: Markdown 파일 → Python 빌드 스크립트 → `db/blog.db`
- 배포: **GitHub Actions**가 push할 때마다 DB를 빌드해서 GitHub Pages에 자동 배포

## 주요 기능

| 기능 | 설명 |
|---|---|
| 일자별 타임라인 | 날짜별로 묶어서 보여주고, 수업일은 **Day N**으로 표시 |
| 학습 잔디 | GitHub 잔디처럼 날짜별 글 수를 색 농도로 표시 + 연속 기록 일수 |
| 달력 | 사이드바 달력에서 수업일/기록한 날을 표시, 클릭하면 그날의 기록으로 이동 |
| 회차별 보기 | 수업 회차마다 수업/자습/프로젝트 글 수를 표로 정리 |
| 유형 / 프로젝트 필터 | `수업`, `자습`, `프로젝트` 유형과 프로젝트별 연재 모아보기 |
| 태그 | 태그 클라우드와 태그별 모아보기 (다대다 관계) |
| 질문 노트 | 공부하다 생긴 질문과 답을 기록, 미해결 질문은 사이드바에 표시 |
| 검색 | 제목, 요약, 본문, 태그 검색 (SQL `LIKE`) |
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
                 └───┬──────────────┬───┘
                     │ 1            │ 1
                   N │              │ N
        ┌────────────▼───┐   ┌──────▼─────────┐
        │  post_tags     │   │  questions     │
        │  (post_id,     │   │  질문 노트      │
        │   tag_id) PK   │   │  post_id (FK)  │
        └────────┬───────┘   └────────────────┘
                 │ N
               1 │
        ┌────────▼───────┐
        │  tags  태그     │
        └────────────────┘
```

| 테이블 | 역할 |
|---|---|
| `sessions` | 수업이 있었던 날 (Day 1, Day 2 ...) |
| `post_types` | 글 유형 코드 테이블: 수업(`class`) / 자습(`self`) / 프로젝트(`project`) |
| `projects` | 수업 중 진행하는 프로젝트 (이 블로그 포함) |
| `posts` | 모든 글. `date`가 일자별 정리의 기준 |
| `tags`, `post_tags` | 태그와, 글-태그를 잇는 연결 테이블 (N:M) |
| `questions` | 질문 노트. 관련 글(FK), 해결 규칙은 CHECK 제약으로 검증 |
| `v_posts` (뷰) | 4개 테이블을 조인해 화면에서 바로 쓰는 글 목록 |

- 글 유형을 코드 테이블로 분리해서 정해진 값만 들어가도록 FK로 제약
- 수업이 없는 날(주말 자습 등)도 기록할 수 있게 `session_id`는 NULL 허용
- `(date, seq)` UNIQUE로 하루에 여러 글을 쓸 때 순서 보장
- 글과 태그는 N:M이라 연결 테이블 `post_tags`로 분리
- 질문의 회차(Day N)는 저장하지 않고 `asked_on`으로 `sessions`와 조인 (정규화)

전체 스키마는 [`db/schema.sql`](db/schema.sql)에 있습니다.

## 실행 방법

DB 파일을 `fetch`로 읽기 때문에 `index.html`을 더블클릭하면 동작하지 않고, **로컬 서버**가 필요합니다.

```bash
git clone https://github.com/AIP-1/blog-basic-AIGJ_01_013-devlog.git
cd blog-basic-AIGJ_01_013-devlog
python3 scripts/build_db.py   # db/blog.db 만들기 (Git에는 올리지 않는 파일)
python3 -m http.server
# 브라우저에서 http://localhost:8000 접속
```

## 다시 작업할 때 (컴퓨터를 껐다 켠 뒤)

블로그와 저장소는 GitHub에 그대로 있고, `gh` 로그인 정보도 남아 있어서 다시 로그인할 필요는 없습니다.

**보기만 할 때**는 https://aip-1.github.io/blog-basic-AIGJ_01_013-devlog/ 를 열면 됩니다.

**수정할 때**는 아래 순서를 따릅니다.

```bash
# 1. 블로그 폴더로 이동
cd ~/blog-basic-AIGJ_01_013-devlog

# 2. 최신 상태 받기 (작업 시작 전에 항상! 충돌 예방)
git pull

# 3. 수정하기: 둘 중 하나
claude                                   # A. Claude Code 실행 → "오늘 배운 거 정리해서 올려줘"
open -e content/posts/파일이름.md          # B. 직접 편집

# 4. (선택) 미리 보기
python3 scripts/build_db.py              # DB 만들기 + 형식 검사
python3 -m http.server                   # http://localhost:8000, 끌 때는 Ctrl + C

# 5. GitHub에 올리기
git add -A
git commit -m "무엇을 바꿨는지 한 줄"
git push

# 6. 배포 확인 (초록색 ✓ → 1~2분 뒤 반영, 브라우저에서 Cmd + Shift + R)
gh run watch
```

- **A. Claude Code**는 반드시 **블로그 폴더에서** 실행해야 `CLAUDE.md`를 읽습니다. 이때는 글 작성부터 push, 배포 확인까지 Claude가 처리하니 4~6번은 건너뛰어도 됩니다.
- **B. 직접 편집**할 때 새 글 형식은 아래 [새 글 쓰는 법](#새-글-쓰는-법)을 참고하세요.

### 문제가 생겼을 때

| 상황 | 해결 |
|---|---|
| `git push`에서 `rejected` 에러 | 먼저 `git pull` 후 다시 push |
| Actions가 빨간 ✗ | `gh run view --log-failed`로 원인 확인. 대부분 글 머리말 형식 오류 |
| 미리 보기에서 "DB를 불러오지 못했습니다" | `python3 scripts/build_db.py`를 먼저 실행했는지 확인 |
| `http.server`에서 `Address already in use` | 이미 서버가 켜져 있음. http://localhost:8000 으로 접속하거나 `python3 -m http.server 8001`로 포트 변경 |

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
type: 수업
tags: Python, 기초
summary: 목록에 보일 한두 줄 요약
---

## 오늘 배운 것

본문은 마크다운으로 자유롭게 작성합니다.
```

| 항목 | 필수 | 설명 |
|---|---|---|
| `title` | ✔ | 제목. `#`이나 `:`가 들어가면 큰따옴표로 감싸기 |
| `type` | ✔ | `수업` / `자습` / `프로젝트` |
| `tags` | | 쉼표로 구분 |
| `project` | | `projects.csv`의 slug (예: `devlog`) |
| `summary` | | 목록에 보일 요약 |

### 2. 수업일이면 회차 추가

`content/sessions.csv`에 한 줄 추가합니다. 같은 날짜의 글은 자동으로 해당 Day에 연결됩니다.

```csv
2,2026-10-02,파이썬 기초,변수와 자료형
```

### 3. (선택) 질문 기록

`content/questions.csv`에 추가합니다. 해결하면 `resolved_on`과 `answer`를 채웁니다.

```csv
asked_on,question,resolved_on,answer,post_slug
2026-10-02,리스트와 튜플의 차이는?,,,
```

### 4. push하면 끝

```bash
git add -A
git commit -m "Day 2 기록"
git push
```

push하면 GitHub Actions가 DB를 빌드하고 배포합니다. 1~2분 뒤 블로그에 반영되고, 진행 상황은 저장소의 **Actions** 탭에서 볼 수 있어요.
push 전에 확인하고 싶으면 `python3 scripts/build_db.py`로 미리 빌드해 보세요. 파일 이름 형식, 유형, 프로젝트, 중복, CHECK 제약을 검사하고, 오류가 있으면 기존 DB를 그대로 둔 채 이유를 알려줍니다.

## 자동 배포 (GitHub Actions)

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

```text
git push ─▶ build: 체크아웃 → 파이썬 설치 → build_db.py → 배포 파일 모으기 → 업로드
                │ 실패하면 여기서 멈춤 (망가진 사이트가 배포되지 않음)
                ▼
            deploy: GitHub Pages에 배포
```

- `main`에 push하면 빌드 + 배포, Pull Request는 빌드 검사만 합니다.
- `db/blog.db`는 빌드 결과물이라 Git에 올리지 않습니다. (`.gitignore`)

## 폴더 구조

```
├── .github/workflows/
│   └── deploy.yml        # 자동 빌드·배포 (GitHub Actions)
├── index.html            # 페이지 뼈대 (헤더, 본문, 사이드바)
├── css/style.css         # 디자인, 다크 모드, 반응형
├── js/
│   ├── db.js             # 데이터 접근 계층: 모든 SQL 쿼리
│   └── app.js            # 해시 라우팅, 화면 렌더링, 달력, SQL 콘솔
├── db/
│   ├── schema.sql        # 테이블 설계 (DDL)
│   └── blog.db           # 빌드 결과물 (Git에 올리지 않음)
├── content/
│   ├── sessions.csv      # 수업 회차
│   ├── projects.csv      # 프로젝트
│   ├── questions.csv     # 질문 노트
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
| `#/tag/Git` | 태그별 |
| `#/questions` | 질문 노트 |
| `#/project/devlog` | 프로젝트 연재 |
| `#/post/<slug>` | 글 상세 |
| `#/search/<검색어>` | 검색 결과 |
| `#/db` | DB 구조와 SQL 콘솔 |
