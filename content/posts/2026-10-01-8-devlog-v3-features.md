---
title: "블로그 제작기 #3 - 학습 잔디, 태그(N:M), 질문 노트"
type: 프로젝트
project: devlog
tags: SQLite, DB 설계, JavaScript, 블로그
summary: 일자별 블로그에 어울리는 학습 잔디를 만들고, 태그로 다대다 관계를, 질문 노트로 CHECK 제약과 정규화를 연습했다.
---

DB를 붙이고 나니 기능을 하나씩 늘려 가면서 **DB 설계도 같이 키워 갈 수 있겠다**는 생각이 들었다.

## 1. 학습 잔디

GitHub 프로필의 잔디처럼, 날짜별 글 수를 색 농도로 보여준다. 새 테이블 없이 쿼리 하나면 된다.

```sql
SELECT date, COUNT(*) AS cnt FROM posts GROUP BY date;
```

- 7행(일~토) × N열(주) 격자를 CSS Grid의 `grid-auto-flow: column`으로 세로부터 채웠다.
- 연속 기록 일수(streak)도 계산한다. 마지막 기록이 오늘이나 어제가 아니면 현재 연속은 0이 된다.

### 버그 하나

첫 주가 9/27(일)~10/3(토)라서 10월 1일이 들어 있는데도 월 표시에 **10월이 빠졌다**. 첫 주는 무조건 "주 시작일의 달"을 쓰도록 짰기 때문이다. 그 주에 1일이 있으면 그 달을 우선하도록 고쳤다.

## 2. 태그: 다대다(N:M) 관계

글 하나에 태그 여러 개, 태그 하나에 글 여러 개가 붙는다. 어느 한쪽 테이블에 FK를 두는 방식으로는 표현할 수 없어서 **연결 테이블**을 만들었다.

```text
posts (1) ──< post_tags >── (1) tags
            (post_id, tag_id)
```

```sql
CREATE TABLE post_tags (
    post_id INTEGER NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags (id)  ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)   -- 같은 글에 같은 태그 중복 금지
);
```

- `tags.name`에 `COLLATE NOCASE`를 줘서 `git`과 `Git`을 같은 태그로 취급한다.
- 글을 지우면 연결도 같이 지워지도록 `ON DELETE CASCADE`를 걸었다.

## 3. 질문 노트: CHECK 제약과 정규화

공부하다 생긴 질문을 적어 두고, 해결하면 답을 남긴다.

```sql
CHECK ((answer IS NULL) = (resolved_on IS NULL)),     -- 답과 해결일은 같이 있거나 같이 없거나
CHECK (resolved_on IS NULL OR resolved_on >= asked_on) -- 질문하기 전에 해결할 수는 없다
```

규칙을 코드가 아니라 **DB가 직접** 지키게 했다. 실제로 일부러 틀린 데이터를 넣어 보니 빌드가 이렇게 멈췄다.

```text
CHECK constraint failed: resolved_on IS NULL OR resolved_on >= asked_on
```

질문한 날이 Day 몇인지는 **저장하지 않았다.** `asked_on`으로 `sessions`와 조인하면 알 수 있기 때문이다. 계산할 수 있는 값을 또 저장하면 언젠가 둘이 어긋난다. 이게 **정규화**의 기본 아이디어라고 한다.

```sql
SELECT q.question, s.day_no
FROM questions q
LEFT JOIN sessions s ON s.date = q.asked_on;
```
