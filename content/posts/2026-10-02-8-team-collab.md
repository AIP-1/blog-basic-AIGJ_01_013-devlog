---
title: GitHub로 팀 협업하기 - 초대, 브랜치, PR, merge, 리뷰
type: 자습
tags: GitHub, Branch, Pull Request, 협업
summary: 개인 프로젝트가 3인 팀 프로젝트가 됐다. 팀원을 저장소에 초대하고, 브랜치와 PR로 같은 문서를 나눠 쓰는 방법과 그 과정에서 생긴 일을 정리했다.
---

오후에 Blogville이 **3인 팀 프로젝트**로 바뀌었다. 같은 문서와 코드를 셋이 동시에 고치려면 규칙이 필요하다.

## 1. 저장소 공유: Organization으로 옮길까, 초대할까

| | 내 계정 저장소에 초대 | Organization으로 옮기기 |
|---|---|---|
| 권한 | 초대받은 사람은 모두 **쓰기 권한** | 읽기/쓰기/관리 세분화 |
| 보호 규칙 | 비공개 무료 계정은 **브랜치 보호 규칙 사용 불가** | 요금제에 따라 다름 |

일단은 요구사항 명세서를 같이 쓰는 단계라 **내 저장소에 팀원 2명을 Collaborator로 초대**했다.

```bash
gh api -X PUT repos/내아이디/blogville/collaborators/팀원아이디
```

팀원이 초대를 **수락**해야 저장소가 보인다.

## 2. 왜 브랜치, PR, merge를 쓰나

`main`은 모두가 함께 쓰는 **완성본**이다. 셋이 main을 직접 고치면 반쯤 고친 내용이 퍼지고, 서로의 수정을 덮어쓴다.

회사 문서 결재에 비유하면 이해가 쉬웠다.

| Git | 회사 |
|---|---|
| main | 공식 문서 |
| 브랜치 | 내 책상 위 초안 |
| 커밋 | 초안 중간 저장 |
| **PR** | **결재 요청서** ("이렇게 고치려고 합니다") |
| Approve | 검토 승인 도장 |
| **merge** | **공식 문서에 반영** |

> 브랜치에서 안전하게 작업하고 → PR로 확인을 받고 → merge로 모두의 완성본에 반영한다.

## 3. 팀원이 브랜치에서 작업하는 법

### GitHub 웹에서 (문서 작업)

1. 파일을 열고 ✏️ 연필 아이콘
2. 고친 뒤 **Commit changes...**
3. ⚠️ **"Create a new branch for this commit and start a pull request"** 를 골라야 한다

```text
○ Commit directly to the main branch        ← 이걸 고르면 main에 바로 들어간다
● Create a new branch ... and start a pull request
```

**브랜치는 알아서 생기지 않는다.** 쓰기 권한이 있으면 main에 바로 커밋할 수도 있어서, 팀원이 직접 두 번째를 골라야 한다.

이어서 고칠 때는 파일 화면에서 브랜치를 내 브랜치로 바꾸고 수정하면 **이미 만든 PR에 자동으로 추가**된다.

### 내 컴퓨터에서 (코드 작업)

```bash
git switch main && git pull
git switch -c docs/req-blog-post-social
# ... 수정 ...
git add . && git commit -m "요구사항: BLOG 상세"
git push -u origin docs/req-blog-post-social
gh pr create
```

## 4. merge는 누가?

**쓰기 권한이 있는 사람이면 누구나** merge할 수 있다. 그래서 규칙을 정했다.

1. main에 직접 커밋하지 않는다
2. PR은 작성자가 아닌 팀원 1명 이상이 승인
3. merge는 팀장이, 본인 PR은 본인이 merge하지 않는다

비공개 무료 저장소라 GitHub가 이 규칙을 **강제하지 못해서**, 약속으로 지킨다. 강제하려면 저장소를 공개로 바꾸거나, GitHub Pro(학생은 Student Developer Pack으로 무료)가 필요하다.

이 내용을 저장소에 **`CONTRIBUTING.md`(협업 가이드)**와 **PR 템플릿**으로 넣어 두었다. PR을 만들면 체크리스트가 자동으로 채워진다.

## 5. 실제로 생긴 일

- **리뷰 없이 merge된 PR**: 첫 PR을 올리고 내용을 더 추가하는 사이에 팀원이 리뷰 없이 merge했다. 나중에 올린 커밋이 빠져서 **PR을 하나 더** 만들어야 했다. → 위 규칙을 만든 계기
- **PR끼리 충돌 확인**: 같은 파일을 고치는 PR이 여러 개 열려 있어서, merge 전에 서로 충돌하는지 확인했다.

```bash
git merge-tree --write-tree origin/브랜치A origin/브랜치B   # 성공하면 충돌 없음
```

- 이 확인 중에 zsh에서 `set -- $pair`로 변수를 나누려다 **zsh는 변수를 자동으로 단어로 나누지 않아서** 결과가 엉망이 됐다. bash와 zsh의 차이다.
- **리뷰를 텔레그램으로 주고받음**: 편하긴 한데 GitHub에는 기록이 안 남는다. 나중에 "왜 이렇게 정했지?"의 근거가 PR에 남도록, 최소한 **Approve 한 번**은 GitHub에서 누르기로 했다.
