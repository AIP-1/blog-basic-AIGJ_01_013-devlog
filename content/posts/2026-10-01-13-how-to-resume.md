---
title: 블로그 운영 가이드 - 컴퓨터를 껐다 켠 뒤 다시 작업하기
type: 프로젝트
project: devlog
tags: Git, GitHub Actions, Claude, 블로그
summary: 내일 컴퓨터를 다시 켰을 때 블로그를 보고 고치는 순서. git pull로 시작해서 git push와 배포 확인으로 끝난다.
---

컴퓨터를 꺼도 블로그와 저장소는 GitHub에 그대로 있고, `gh` 로그인 정보와 내 컴퓨터의 블로그 폴더도 남아 있다. 다시 로그인할 필요 없이 아래 순서만 기억하면 된다.

## 보기만 할 때

브라우저에서 블로그 주소를 열면 끝이다. 터미널도 필요 없다.

> https://aip-1.github.io/blog-basic-AIGJ_01_013-devlog/

## 수정할 때

### 1. 터미널을 열고 블로그 폴더로 이동

`Cmd + Space` → "터미널" → Enter

```bash
cd ~/blog-basic-AIGJ_01_013-devlog
```

### 2. 최신 상태 받기

```bash
git pull
```

다른 곳(GitHub 웹, 다른 컴퓨터)에서 바뀐 게 있으면 받아 온다. **작업 시작 전에 항상** 한다. 충돌을 예방하는 가장 좋은 습관이다.

### 3. 수정하기

**A. Claude에게 맡기기**

```bash
claude
```

**블로그 폴더에서** 실행해야 `CLAUDE.md`를 읽는다. 그다음 이렇게 말하면 된다.

- "오늘 수업에서 ○○ 배웠어. 블로그에 정리해서 올려줘"
- "제작기 #3 글에서 오타 고쳐줘"

글 작성부터 빌드 검사, 커밋, push, 배포 확인까지 처리해 주니 4~6번은 건너뛴다.

**B. 직접 고치기**

```bash
open -e content/posts/2026-10-01-1-assignment.md
```

새 글은 `content/posts/`에 `날짜-순서-slug.md` 형식으로 만든다.

### 4. (선택) 내 컴퓨터에서 미리 보기

```bash
python3 scripts/build_db.py     # DB 만들기 + 형식 검사
python3 -m http.server          # 로컬 서버 켜기
```

`http://localhost:8000`에서 확인하고, 다 보면 `Ctrl + C`로 서버를 끈다.

### 5. GitHub에 올리기

```bash
git add -A
git commit -m "무엇을 바꿨는지 한 줄"
git push
```

### 6. 배포 확인

```bash
gh run watch
```

초록색 ✓가 뜨면 1~2분 안에 반영된다. 브라우저에서 `Cmd + Shift + R`로 새로고침한다.

## 한눈에 보기

```bash
cd ~/blog-basic-AIGJ_01_013-devlog   # 폴더 이동
git pull                              # 최신 받기
claude  # 또는 직접 편집              # 수정
git add -A && git commit -m "..."     # 기록
git push                              # 올리기 → Actions가 자동 배포
```

## 문제가 생겼을 때

| 상황 | 해결 |
|---|---|
| `git push`에서 `rejected` 에러 | 먼저 `git pull` 후 다시 push |
| Actions가 빨간 ✗ | `gh run view --log-failed`로 원인 확인. 대부분 글 머리말 형식 오류 |
| 미리 보기에서 "DB를 불러오지 못했습니다" | `python3 scripts/build_db.py`를 먼저 실행했는지 확인 |
| `http.server`에서 `Address already in use` | 이미 서버가 켜져 있다. `http://localhost:8000`으로 접속하거나 `python3 -m http.server 8001`로 포트를 바꾼다 |

> 같은 내용을 저장소 README의 "다시 작업할 때" 섹션에도 남겨 두었다.
