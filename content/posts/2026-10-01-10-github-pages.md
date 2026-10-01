---
title: GitHub Pages로 배포하고, 저장소 권한 이해하기
type: 자습
tags: GitHub, GitHub Pages, gh CLI, 권한
summary: Organization에 저장소를 만들고 GitHub Pages로 블로그를 배포했다. 서버를 따로 열 필요가 없는 이유와, 누가 블로그를 고칠 수 있는지 정리.
---

과제 블로그를 AIP-1 Organization에 올리고, 누구나 접속할 수 있게 GitHub Pages로 배포했다.

## Organization에 저장소 만들기

저장소 이름 앞에 Organization 이름을 붙이면 내 계정이 아니라 Organization 아래에 만들어진다.

```bash
gh repo create AIP-1/blog-basic-AIGJ_01_013-devlog --public --source=. --push
```

## GitHub Pages 켜기

```bash
gh api -X POST repos/AIP-1/blog-basic-AIGJ_01_013-devlog/pages \
  -f "source[branch]=main" -f "source[path]=/"
```

1~2분 뒤 `https://aip-1.github.io/blog-basic-AIGJ_01_013-devlog/` 주소로 열렸다.

> 무료 Organization에서는 저장소가 **Public**이어야 Pages를 쓸 수 있다.

## 서버는 어떻게 여는 걸까?

**열 필요가 없다.** GitHub Pages가 24시간 켜져 있는 서버 역할을 대신 해 준다. 내 컴퓨터를 꺼도 블로그는 열린다.

```text
내 컴퓨터 ──git push──▶ GitHub ──자동 배포──▶ GitHub Pages 서버 ◀── 누구나 접속
```

`python3 -m http.server`는 push하기 전에 **내 컴퓨터에서 미리 볼 때만** 쓴다.
블로그가 `db/blog.db` 파일을 읽어 오는데, `index.html`을 더블클릭해서 열면 브라우저 보안 정책 때문에 다른 파일을 읽을 수 없어서 로컬 서버가 필요하다.

## 검색에 나올까?

공개 저장소라 언젠가 노출될 수는 있지만 시간이 걸리고 보장되지 않는다.
그리고 이 블로그는 `#/post/...` 형태의 해시 라우팅이라, 검색 엔진이 글 하나하나를 별도 페이지로 보지 않는다. 과제용으로는 링크 공유면 충분해서 따로 손대지 않았다.

## 누가 블로그를 고칠 수 있을까?

리눅스 권한 **755**와 비슷하다. 소유자는 읽기·쓰기 모두, 나머지는 읽기만 할 수 있다.

| 누구 | 저장소 권한 | 할 수 있는 것 |
|---|---|---|
| 나 | admin | 글 작성, 수정, 배포 |
| Organization 관리자 | admin | 모든 저장소 관리 (root 같은 존재) |
| 다른 수강생 | read | 코드 보기, 내려받기 |
| 방문자 | - | 블로그 보기, 공개 코드 보기 |

```bash
gh api repos/AIP-1/blog-basic-AIGJ_01_013-devlog/collaborators --jq '.[] | "\(.login): \(.role_name)"'
```

- 이 사이트는 **정적 사이트**라 방문자가 서버에 무언가를 저장할 통로 자체가 없다.
- DB 메뉴의 SQL 콘솔에서 `DELETE`를 해도 방문자 브라우저 안의 **복사본**만 바뀌고, 새로고침하면 원래대로 돌아온다.
- 다른 사람이 고치고 싶으면 Fork해서 Pull Request를 보낼 수 있지만, **내가 merge하지 않으면** 반영되지 않는다.
