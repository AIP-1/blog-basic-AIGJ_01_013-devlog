# 진행의 개발 일지 (devlog)

[Tistory](https://www.tistory.com/)를 참고해서 **HTML / CSS / JavaScript만으로** 만든 개발 공부 기록 블로그입니다.
별도의 프레임워크나 빌드 과정 없이 `index.html`을 브라우저로 열면 바로 실행됩니다.

## 주요 기능

| 기능 | 설명 |
|---|---|
| 글 목록 | 썸네일, 요약, 날짜, 댓글/공감 수 표시 + 페이지 번호 |
| 카테고리 / 태그 | 사이드바에서 카테고리·태그별로 모아보기 |
| 검색 | 제목, 본문, 태그에서 검색 |
| 글 상세 | 본문, 태그, 이전/다음 글 이동 |
| 공감 ♥ / 댓글 | 브라우저 `localStorage`에 저장 |
| 방문자 수 | 이 브라우저 기준 Total / Today |
| 다크 모드 | 버튼으로 전환, 설정 기억 |
| 반응형 | 모바일에서는 사이드바가 본문 아래로 이동 |

## 실행 방법

```bash
git clone https://github.com/AIP-1/blog-basic-AIGJ_01_013-devlog.git
cd blog-basic-AIGJ_01_013-devlog
open index.html   # Windows: start index.html
```

## 폴더 구조

```
├── index.html      # 페이지 뼈대 (헤더, 본문, 사이드바, 푸터)
├── css/
│   └── style.css   # 디자인, 다크 모드, 반응형
└── js/
    ├── posts.js    # 글 데이터
    └── app.js      # 해시 라우팅, 화면 렌더링, 공감/댓글/검색
```

## 구현 포인트

- **해시 라우팅**: 페이지는 하나뿐이고 주소의 `#` 뒷부분으로 화면을 바꿉니다.
  - `#/` 전체 글 · `#/post/3` 글 상세 · `#/category/Git` · `#/tag/HTML` · `#/search/검색어` · `.../page/2`
- **CSS 변수 기반 테마**: `html[data-theme="dark"]`일 때 색상 변수만 바꿔서 다크 모드를 구현했습니다.
- **XSS 방지**: 댓글처럼 사용자가 입력한 내용은 `escapeHTML()`을 거쳐 화면에 표시합니다.

## 새 글 쓰는 법

`js/posts.js`의 `POSTS` 배열에 객체를 하나 추가하면 됩니다.

```js
{
  id: 7,                         // 겹치지 않는 번호
  title: "글 제목",
  category: "Web",
  date: "2026-10-02",
  tags: ["HTML"],
  emoji: "📝",                   // 목록 썸네일
  color: "#e8f0ff",              // 썸네일 배경색
  excerpt: "목록에 보일 요약",
  content: `<p>본문 (HTML)</p>`
}
```

## 한계

공감, 댓글, 방문자 수는 서버 없이 브라우저에 저장하기 때문에 **내 브라우저에서만** 보입니다.
