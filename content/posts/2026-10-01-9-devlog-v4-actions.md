---
title: "블로그 제작기 #4 - GitHub Actions로 자동 빌드·배포"
type: 프로젝트
project: devlog
tags: GitHub Actions, CI/CD, GitHub, 블로그, 트러블슈팅
summary: 이제 글을 쓰고 push만 하면 GitHub가 DB를 빌드해서 배포한다. 워크플로 파일 구조와 workflow 권한 문제 해결 과정.
---

지금까지는 글을 쓸 때마다 `python3 scripts/build_db.py`를 직접 돌리고, 결과물인 `blog.db`까지 커밋해야 했다.
빌드를 깜빡하면 새 글이 안 보이고, 원본(마크다운)과 결과물(DB)이 둘 다 저장소에 있어서 어긋날 수도 있었다.

## GitHub Actions란?

**GitHub가 빌려주는 임시 컴퓨터에서, 정해 둔 일을 자동으로 실행해 주는 기능**이다.
`.github/workflows/` 폴더에 YAML 파일로 **"언제(on)"**와 **"무엇을(jobs)"**을 적어 두면 된다.

```text
git push ─▶ build: 체크아웃 → 파이썬 설치 → build_db.py → 배포 파일 모으기 → 업로드
                │ 실패하면 여기서 멈춤 (망가진 사이트가 배포되지 않음)
                ▼
            deploy: GitHub Pages에 배포
```

### 비유: 식당 주방

| 식당 | GitHub Actions |
|---|---|
| 손님이 주문서를 넣음 | 내가 `git push` |
| 벽에 붙은 레시피 | `.github/workflows/deploy.yml` |
| 요리사가 레시피대로 요리 | GitHub가 컴퓨터를 하나 켜서 yml 순서대로 실행 |
| 완성된 요리를 홀에 내보냄 | 결과물을 GitHub Pages에 배포 |

### push하면 실제로 일어나는 일

1. 내가 `git push`
2. GitHub: "main에 push가 왔네? `on: push`가 있으니 실행!"
3. GitHub가 빈 Ubuntu 컴퓨터(가상머신)를 하나 빌려준다.
4. 그 컴퓨터가 yml의 steps를 위에서부터 실행한다. **내 컴퓨터에서 하던 `python3 scripts/build_db.py`를 똑같이 대신 돌리는 것이다.**
5. build가 성공하면 deploy가 Pages에 올린다.
6. 일이 끝나면 빌려준 컴퓨터는 삭제된다.

마법이 아니라 **명령어 목록을 남의 컴퓨터에서 자동으로 돌리는 것**이다. Actions 탭에서 실행 기록을 열어 "DB 빌드" 단계를 펼쳐 보면, 내 터미널에서 보던 `✔ db/blog.db 생성 완료` 메시지가 GitHub 컴퓨터에서도 찍혀 있다.

> push할 때마다 자동으로 빌드·검사·배포하는 방식을 **CI/CD**(지속적 통합 / 지속적 배포)라고 부른다.

## 워크플로 파일 핵심

```yaml
on:
  push:
    branches: [main]      # main에 push되면 빌드 + 배포
  pull_request:
    branches: [main]      # PR이면 빌드 검사만

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7          # 저장소 코드 받기
      - uses: actions/setup-python@v7      # 파이썬 설치
      - run: python scripts/build_db.py    # DB 빌드
      # ... 배포할 파일만 _site/에 모아서 업로드
  deploy:
    needs: build                           # build가 성공해야 실행
    steps:
      - uses: actions/deploy-pages@v5
```

- `uses:` 는 남이 만들어 둔 Action을 가져다 쓰는 것, `run:` 은 명령어를 직접 실행하는 것이다.
- `needs: build` 덕분에 **빌드가 실패하면 배포가 일어나지 않는다.** 글 머리말을 잘못 써도 블로그가 망가지지 않는다.
- `_site/`에 `index.html`, `css`, `js`, `db/blog.db`만 모아서 올렸다. 그래서 `content/`나 `scripts/`는 사이트에서 404가 난다.

## 바뀐 점

- `db/blog.db`는 이제 **빌드 결과물**이라 `.gitignore`에 넣고 Git에서 뺐다.
- GitHub Pages 설정을 "브랜치에서 배포(legacy)"에서 **"GitHub Actions로 배포"**로 바꿨다.

## 트러블슈팅: workflow 권한

처음 push했을 때 거절당했다.

```text
refusing to allow an OAuth App to create or update workflow
`.github/workflows/deploy.yml` without `workflow` scope
```

워크플로 파일은 GitHub 컴퓨터에서 명령을 실행시키는 파일이라, 일반 코드보다 위험해서 **별도 권한(`workflow` scope)**이 필요하다.
처음 `gh auth login`으로 받은 권한은 `repo`, `gist`, `read:org`뿐이었다.

```bash
gh auth refresh -h github.com -s workflow
```

권한을 추가하고 다시 push하니 build 6초, deploy 12초 만에 배포가 끝났다.

## 그래서 지금 이 글은

이 글은 **로컬에서 DB를 빌드하지 않고**, 마크다운 파일만 추가해서 push했다.
이 글이 블로그에 보인다면 GitHub Actions가 대신 빌드해 준 것이다. 🎉
