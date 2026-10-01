---
title: 정적 사이트 vs 서버, 그리고 백엔드 구조
type: 자습
tags: GitHub Pages, 정적 사이트, 백엔드, 아키텍처
summary: GitHub로 서버를 돌릴 수 있을까? 정적 블로그는 프론트엔드만으로 되어 있을까? 여러 사람이 쓰는 블로그라면 무엇이 필요하고, 프론트엔드와 백엔드는 어떻게 나눌까?
---

블로그를 배포하고 나니 질문이 꼬리에 꼬리를 물었다. 한 번에 정리해 둔다.

## 1. GitHub를 서버로 쓸 수 있을까?

**정적 사이트 배포까지만** 된다.

| | 정적 사이트 | 동적 서비스 |
|---|---|---|
| 서버가 하는 일 | 만들어진 파일을 **그대로 전달** | 요청마다 **코드를 실행**해서 응답 생성 |
| 예시 | 지금 이 블로그, 포트폴리오, 문서 사이트 | 로그인, 댓글 저장, 게시판, AI 챗봇 |
| GitHub Pages | ✅ | ❌ |

- 이 블로그가 Pages로 되는 이유는 DB 조회까지 **방문자 브라우저 안에서**(sql.js) 처리하기 때문이다. 대신 방문자가 무언가를 **저장**하는 기능은 만들 수 없다.
- **GitHub Actions도 서버가 아니다.** push 같은 사건이 생기면 일하고 꺼지는 일꾼이라, 방문자 요청을 24시간 기다리는 용도로는 못 쓴다.

### AI 프로젝트에서 특히 중요한 점: API 키

```text
❌ GitHub Pages의 JS에서 AI API 직접 호출
   → API 키가 JS 파일에 그대로 노출 → 누구나 가져다 쓸 수 있음

✅ 브라우저 → 내 서버 (API 키는 서버에만) → AI API
```

숨겨야 하는 값이 있으면 서버나 서버리스 함수가 반드시 필요하다.

### 서버가 필요할 때 쓰는 서비스

| 필요한 것 | 대표 서비스 |
|---|---|
| 정적 사이트 | GitHub Pages, Netlify, Vercel, Cloudflare Pages |
| 정적 + 간단한 서버 함수 | Vercel, Netlify, Cloudflare Workers |
| 파이썬 서버 통째로 | Render, Railway, Fly.io |
| AI 데모 앱 | Hugging Face Spaces, Streamlit Community Cloud |
| 데이터베이스 | Supabase, Neon |

대부분 GitHub 저장소를 연결하면 push할 때 자동 배포된다. Actions에서 본 흐름과 같다.

## 2. 정적 블로그는 프론트엔드로만 되어 있을까?

**방문자가 볼 때는 맞다.** 정확히는 **백엔드가 하던 일을 "방문할 때"에서 "빌드할 때"로 옮긴 것**이다.

```text
[동적] 방문할 때마다 서버가 일함:   요청 → DB 조회 → HTML 조립 → 응답 (매번)
[정적] 미리 한 번 해 두고 결과만 줌: 빌드 때 정리 → 결과물 / 요청 → 파일 그대로 전달
```

이 블로그로 보면:

| 시점 | 하는 일 | 성격 |
|---|---|---|
| 빌드 타임 (push → Actions) | `build_db.py`: 마크다운 읽기, 검사, DB에 INSERT | 백엔드스러운 일 (Python) |
| 런타임 (방문자 브라우저) | `app.js`, `db.js`: DB 조회, 화면 그리기 | 프론트엔드 |
| 서버 (GitHub Pages) | 파일 전달만 | 코드 실행 없음 |

참고한 **Tistory는 반대로 동적 사이트**다. 로그인, 글쓰기, 댓글, 공감, 방문자 통계를 전부 서버가 실시간으로 처리한다. 첫 버전의 댓글과 방문자 수를 뺀 이유가 이 차이다.

실무에서는 내가 Python으로 짠 빌드 과정을 **정적 사이트 생성기(SSG)**가 대신한다. Jekyll, Hugo, Astro, Next.js(export) 같은 도구들이 마크다운을 읽어 **글마다 HTML 파일을 미리 만들어** 둔다.

## 3. 여러 사람이 글을 쓰는 블로그라면?

**무조건 백엔드나 유료 서버가 필요한 건 아니다.**

| 방식 | 내 서버 | 비용 | 설명 |
|---|---|---|---|
| Git으로 협업 | ❌ | 무료 | 팀원을 저장소에 초대, 각자 마크다운 작성 → PR → merge. 지금 구조 그대로 가능 |
| Git 기반 웹 에디터 | ❌ | 무료 | Decap CMS 등. 웹에서 글을 쓰면 GitHub에 커밋된다 |
| BaaS | ❌ (내 코드 없음) | 무료 플랜 있음 | Supabase, Firebase가 로그인과 DB를 제공 |
| 직접 백엔드 | ✅ | 무료 플랜은 제약 많음 | Flask, FastAPI, Spring으로 API를 만들어 배포 |

- 팀원끼리 쓰는 블로그면 Git 협업으로 충분하다.
- **아무나 가입해서 글이나 댓글을 쓰는** 서비스라면 BaaS나 직접 백엔드가 필요하다.
- 무료 플랜은 접속이 없으면 서버가 잠들거나 용량 제한이 있다. 과제나 포트폴리오는 무료로 충분하다.

## 4. 프론트엔드와 백엔드 폴더를 나눠야 할까?

**둘 다 가능하고, 둘 다 실무에서 쓴다.**

### 통짜: 서버가 HTML까지 만들어 줌

```text
my-blog/
├── app.py        # Flask: 요청 처리 + DB
├── templates/    # HTML 틀 (서버가 데이터를 채워서 보냄)
└── static/       # CSS, JS
```

프로젝트 하나, 배포도 한 번. 처음 배울 때 좋다. (Flask + Jinja, Django, Spring + Thymeleaf)

### 분리: API로 대화

```text
my-blog/
├── frontend/     # React 등: 화면
└── backend/      # FastAPI, Spring 등: API + DB

브라우저(frontend) ──HTTP 요청──▶ backend ──▶ DB
                  ◀──JSON 응답──
```

역할이 분명하고 앱이나 다른 화면도 같은 API를 쓸 수 있다. 요즘 팀 프로젝트의 기본 형태다. 배포는 보통 따로 한다(예: frontend는 Vercel, backend는 Render).

### 중간: 풀스택 프레임워크

Next.js 같은 프레임워크는 한 프로젝트, 한 언어(JS) 안에 화면과 API를 같이 둔다.

## 5. 언어가 다르면 힘들까?

**언어가 섞이는 건 문제가 아니고, 오히려 일반적이다.**

- 프론트엔드는 선택권이 없다. 브라우저는 **JavaScript**만 실행한다.
- 백엔드는 Python, Java, JS(Node), Go 등 아무 언어나 된다.
- 둘은 **HTTP + JSON**으로만 대화하니 서로의 언어를 몰라도 된다.

```text
React (JS) ──{"title": "Day 2"}──▶ Spring (Java)     한국에서 가장 흔한 조합
React (JS) ──{"title": "Day 2"}──▶ FastAPI (Python)  AI 서비스에서 흔한 조합
```

생각해 보니 **이 블로그도 이미 언어가 섞여 있다.**

```text
build_db.py (Python) ──▶ blog.db ──▶ app.js (JavaScript)
```

Python과 JS가 `blog.db` 파일을 사이에 두고 대화한다. API 서버는 파일 대신 HTTP로 대화하는 것뿐이다.
진짜 어려운 점은 언어가 섞이는 게 아니라 **두 가지를 동시에 배워야 한다는 것**이다.

## 나에게 적용하면

AI 라이브러리와 API는 Python 생태계가 가장 강하다. 수업 프로젝트에서 서버가 필요해지면:

- 간단한 데모 → **Streamlit, Gradio** (Python만으로 화면까지)
- 제대로 된 서비스 → **프론트엔드(JS) + FastAPI(Python)** 분리 구조
