---
title: "Blogville #2 - ERD 설계: 규칙은 DB가 지키게"
type: 프로젝트
project: blogville
tags: DB 설계, PostgreSQL, 트랜잭션
summary: 17개 테이블을 설계했다. 복합 외래 키로 '산 아이템만 장착', 원장으로 '코인은 저장하지 않고 계산', advisory lock으로 '동시에 눌러도 보상은 한 번'을 DB 수준에서 보장했다.
---

요구사항을 테이블로 옮겼다. 인증 테이블 4개(로그인 라이브러리가 정한 구조)와 직접 설계한 13개, 모두 17개다.

```text
users ──< accounts / sessions          소셜 로그인
  ├──1:1── profiles                    온보딩을 마친 주민 (닉네임, 장착 캐릭터)
  ├──1:1── blogs ──< categories
  │          └──< posts ──< comments (답글은 자기 참조)
  │                 ├──< post_likes >── users   (N:M)
  │                 └──< post_tags  >── tags    (N:M)
  ├──< user_items >── items            보유 아이템 (N:M)
  ├──< follows >── users               이웃 (자기 참조 N:M)
  ├──< attendances                     출석
  └──< point_ledger                    경험치·코인 원장
```

어제 SQLite 블로그에서 배운 개념(FK, UNIQUE, CHECK, N:M, 정규화)이 전부 다시 쓰였다. 오늘 새로 쓴 것들을 정리한다.

## 1. 회원과 프로필을 나눴다

- `users`: 로그인할 수 있는 사람
- `profiles`: 온보딩을 마친 마을 주민

소셜 로그인 직후에는 `users`만 있고 `profiles`가 없다. 그래서 **"온보딩이 필요한가?"를 별도 컬럼 없이** 알 수 있다.

## 2. 산 아이템만 장착: 복합 외래 키

`profiles.character_item_id`가 그냥 `items.id`를 가리키면 **사지 않은 캐릭터도 장착**할 수 있다. 그래서 두 컬럼을 묶어서 "보유 목록"을 가리키게 했다.

```sql
FOREIGN KEY (user_id, character_item_id)
  REFERENCES user_items (user_id, item_id)
```

이 규칙을 앱 코드가 아니라 **DB가 직접** 막는다.

## 3. 코인은 저장하지 않고 계산: 원장(ledger)

`coins` 컬럼을 두지 않았다. 모든 변화를 `point_ledger`에 한 줄씩 쌓고, 잔액은 합계로 계산한다. 은행 통장의 거래 내역과 같다.

```sql
SELECT SUM(coin_delta) AS coins, SUM(exp_delta) AS exp
FROM point_ledger WHERE user_id = $1;
```

**레벨도 저장하지 않는다.** 레벨 n이 되려면 누적 경험치 `50 × n × (n − 1)`.

## 4. 하루 한 번 출석: 기본 키

`attendances`의 기본 키를 `(user_id, date)`로 했다. 같은 날 두 번 넣으면 DB가 거부한다.

## 5. 동시에 눌러도 보상은 한 번: advisory lock

"오늘 글 보상을 몇 번 받았나 세고 → 3번 미만이면 지급"을 두 요청이 **동시에** 하면 둘 다 "2번이네, 지급!"이 될 수 있다.

처음엔 `SELECT ... FOR UPDATE`로 원장 행을 잠그려 했다. 그런데 원장은 **행을 추가하는** 테이블이라 아직 없는 행은 잠글 수 없었다. 그래서 회원 ID로 만든 **이름표 잠금**을 썼다.

```sql
SELECT pg_advisory_xact_lock(hashtext(user_id));  -- 트랜잭션이 끝나면 자동으로 풀린다
```

같은 회원의 보상·구매는 한 줄로 서서 하나씩 처리된다. 테스트로 **두 탭에서 출석 버튼을 동시에** 눌러 봤더니, 한쪽은 "출석 완료", 다른 쪽은 "이미 출석했어요"가 떴고 원장에도 한 줄만 남았다.

## 6. 구매는 트랜잭션 하나로

```text
BEGIN
  잠금 → 잔액·레벨 계산 → 부족하면 중단
  user_items에 아이템 추가 (이미 있으면 기본 키 위반 → 전체 취소)
  point_ledger에 -가격 기록
COMMIT
```

중간에 하나라도 실패하면 전부 취소돼서, "코인은 빠졌는데 아이템은 안 들어옴" 같은 일이 생기지 않는다.

## 마이그레이션

Drizzle 스키마(`schema.ts`)를 고치고 명령 하나로 SQL 파일을 만들어 DB에 적용했다. 생성된 SQL에 설계한 제약이 그대로 들어간 걸 확인했다.

```bash
npx drizzle-kit generate --name init   # drizzle/0000_init.sql 생성
npx drizzle-kit migrate                # DB에 적용
```
