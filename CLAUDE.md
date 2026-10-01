# CLAUDE.md

이 저장소는 **AI응용프로젝트** 수업 기간 동안 배운 것과 스스로 공부한 것을 **일자별로 기록하는 블로그**다.
블로그를 만드는 과정 자체도 `프로젝트` 글로 함께 기록한다.

- 사이트: https://aip-1.github.io/blog-basic-AIGJ_01_013-devlog/
- 저장소: https://github.com/AIP-1/blog-basic-AIGJ_01_013-devlog
- 답변은 한국어로 한다. 사용자는 Git/GitHub를 막 배우기 시작한 수강생이므로, 무엇을 왜 하는지 짧게 설명하면서 진행한다.

## 구조

| 경로 | 역할 |
|---|---|
| `content/posts/*.md` | 글 (마크다운). **블로그 내용은 여기서만 바꾼다** |
| `content/sessions.csv` | 수업 회차 (Day N) |
| `content/projects.csv` | 프로젝트 |
| `content/questions.csv` | 질문 노트 |
| `db/schema.sql` | DB 설계 (SQLite) |
| `scripts/build_db.py` | `content/` → `db/blog.db` 빌드 + 검사 |
| `index.html`, `css/`, `js/` | 화면. `js/db.js`에 모든 SQL, `js/app.js`에 라우팅/렌더링 |
| `.github/workflows/deploy.yml` | push하면 빌드하고 GitHub Pages에 배포 |

`db/blog.db`는 빌드 결과물이라 Git에 올리지 않는다(`.gitignore`). 배포할 때 GitHub Actions가 새로 만든다.

## "오늘 한 거 블로그에 정리해줘" 요청을 받았을 때

### 0. 내용 확인

- 같은 대화에서 작업했다면 그 대화 내용을 정리한다.
- 새 대화라서 내용을 모르면 **추측해서 쓰지 말고 사용자에게 묻는다**: 오늘 수업 주제와 배운 것, 혼자 공부한 것, 진행한 프로젝트, 궁금했던 질문.
- 특히 `수업` 글에는 사용자가 실제로 말해 준 수업 내용만 쓴다. 모르는 내용을 지어내지 않는다.
- 날짜는 `date +%F`로 확인하고, 오늘이 수업일인지 사용자에게 확인한다.

### 1. 수업일이면 회차 추가: `content/sessions.csv`

```csv
day_no,date,title,summary
2,2026-10-02,그날 수업 주제,한 줄 요약
```

- `day_no`는 기존 최대값 + 1. 수업이 없는 날(주말 자습 등)은 추가하지 않는다. 그날 글은 "자습일"로 표시된다.

### 2. 글 작성: `content/posts/YYYY-MM-DD-순서-slug.md`

- 파일 이름: 날짜, 같은 날 안의 순서(1부터), 영문 소문자/숫자/하이픈 slug. 예: `2026-10-02-1-python-basics.md`
- `slug`는 전체에서 겹치면 안 된다. `ls content/posts`로 확인한다.
- 머리말:

```markdown
---
title: 글 제목
type: 수업
tags: Python, 기초
summary: 목록에 보일 한두 줄 요약
---
```

| 항목 | 필수 | 값 |
|---|---|---|
| `title` | ✔ | `#`나 `:`가 들어가면 큰따옴표로 감싼다 |
| `type` | ✔ | `수업` / `자습` / `프로젝트` |
| `tags` | | 쉼표로 구분. 기존 태그를 재사용한다 (`sqlite3 db/blog.db "SELECT name FROM tags"`) |
| `project` | | `projects.csv`의 slug. 이 블로그 작업이면 `devlog` |
| `summary` | | 1~2문장 |

- 머리말 값 뒤에 `# 주석`을 붙이지 않는다. 값의 일부로 읽힌다.
- 분류 기준:
  - `수업`: 수업 시간에 배운 것, 과제 안내
  - `자습`: 혼자 또는 Claude와 공부한 개념, 실습
  - `프로젝트`: 프로젝트 진행 기록. 이 블로그 개선 작업은 `project: devlog`, 제목은 `블로그 제작기 #N - ...` (기존 마지막 번호 + 1)
- 문체: 사용자 본인이 쓰는 학습 일지처럼 "~했다" 체. 명령어, 에러 메시지, 해결 방법은 코드 블록으로 남긴다.

### 3. 질문 기록: `content/questions.csv`

```csv
asked_on,question,resolved_on,answer,post_slug
2026-10-02,질문 내용,2026-10-02,답,관련-글-slug
2026-10-02,아직 못 푼 질문,,,
```

- 사용자가 그날 실제로 물어본 질문을 기록한다.
- 해결했으면 `resolved_on`과 `answer`를 **둘 다** 채운다(CHECK 제약). 미해결이면 둘 다 비운다.
- 이전에 미해결이던 질문이 풀렸으면 해당 행을 찾아 해결 처리한다.
- 쉼표가 들어간 값이 있으면 Python `csv` 모듈로 써서 따옴표 처리를 맡긴다.

### 4. 검사 → 커밋 → push

```bash
python3 scripts/build_db.py          # 형식 오류가 있으면 여기서 실패한다. 고친 뒤 다시 실행
git add -A
git commit -m "Day N 기록: 주제"
git push
```

- push 후에는 `gh run watch`로 Actions 실행을 확인하고, 성공하면 사이트 주소를 알려준다.
- 사용자가 미리 보고 싶어 하면: `python3 -m http.server` → `http://localhost:8000`

## 코드를 수정할 때

- 프레임워크 없는 HTML/CSS/JS. 기존 스타일(주석은 한국어, CSS 변수 기반 다크 모드)을 따른다.
- SQL은 `js/db.js`에만 둔다. 테이블을 바꾸면 `db/schema.sql`, `scripts/build_db.py`, README의 ERD를 함께 고친다.
- 사용자 입력이나 DB 문자열을 HTML에 넣을 때는 `esc()`를 거친다. 마크다운 본문은 `DOMPurify`로 정화한다.
- 외부 라이브러리(sql.js, marked, DOMPurify)는 cdnjs에서 불러온다.
- 기능을 추가했으면 `블로그 제작기 #N` 글로 무엇을, 왜 바꿨는지 기록한다.
