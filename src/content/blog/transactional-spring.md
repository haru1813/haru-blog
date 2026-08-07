---
title: "@Transactional — 스프링이 트랜잭션을 다루는 법"
description: "여러 작업을 하나로 묶는 트랜잭션. 순수 JDBC의 수동 commit/rollback과, 스프링의 @Transactional 선언적 처리를 비교하고, 기술이 달라도 코드가 같은 이유(추상화)와 AOP 원리, 실무 함정까지 정리한다."
pubDate: 2026-08-07
category: backend
parent: db-access-jdbc-to-jpa
---

[DB 접근 기술 지도](/blog/db-access-jdbc-to-jpa/)에서 봤듯, DB를 다루는 기술은 여럿이다. 그런데 그 어느 것을 쓰든 반드시 따라오는 게 **트랜잭션**이다. 그리고 스프링은 이걸 `@Transactional` 하나로 통일해 버렸다. 어떻게 그게 가능한지 들여다보자.

## 트랜잭션이란 — 다 되거나, 다 안 되거나

트랜잭션은 **여러 작업을 하나의 단위로 묶어, 전부 성공하거나 전부 실패하게** 하는 것이다. 대표적인 예가 계좌 이체다.

```
A 계좌 출금 5만원  →  B 계좌 입금 5만원
```

출금은 됐는데 입금 직전에 오류가 나면? **출금도 취소(rollback)**되어야 한다. 안 그러면 돈이 허공으로 사라진다. 이 "전부 아니면 전무"를 보장하는 게 트랜잭션이다.

## 순수 JDBC — 손으로 commit / rollback

트랜잭션을 직접 다루면 이렇게 된다.

```java
conn.setAutoCommit(false);          // 자동 커밋 끄기 (트랜잭션 시작)
try {
    withdraw(from, amount);         // 출금
    deposit(to, amount);            // 입금
    conn.commit();                  // 둘 다 성공 → 커밋
} catch (Exception e) {
    conn.rollback();                // 하나라도 실패 → 롤백
} finally {
    conn.close();
}
```

로직은 `withdraw`·`deposit` 두 줄인데, 그걸 감싸는 트랜잭션 코드가 더 길다. 게다가 이걸 **메서드마다 반복**해야 하고, `rollback`을 빠뜨리면 사고가 난다.

## @Transactional — 한 줄로 선언

스프링은 이 반복을 애노테이션 하나로 대체한다.

```java
@Transactional
public void transfer(Long from, Long to, int amount) {
    withdraw(from, amount);   // 출금
    deposit(to, amount);      // 입금
    // 정상 종료 → 자동 커밋 / 예외 발생 → 자동 롤백
}
```

메서드 본문에는 **비즈니스 로직만** 남는다. 트랜잭션 시작·커밋·롤백은 스프링이 알아서 한다. `setAutoCommit`도, `try-catch`도, `rollback`도 안 보인다.

## 기술이 달라도 @Transactional이 똑같은 이유 — 추상화

여기가 핵심이다. **JdbcTemplate을 쓰든 MyBatis를 쓰든 JPA를 쓰든, `@Transactional` 코드는 동일**하다. 스프링이 트랜잭션을 `PlatformTransactionManager`라는 공통 인터페이스로 추상화했기 때문이다.

| DB 접근 기술 | 뒤에서 동작하는 TransactionManager |
|---|---|
| JDBC · JdbcTemplate · MyBatis | `DataSourceTransactionManager` |
| JPA · Hibernate | `JpaTransactionManager` |

`@Transactional`은 같지만, **뒤에서 각 기술에 맞는 매니저가 갈아 끼워진다.** 개발자는 그게 뭔지 몰라도 된다. 스프링 부트가 어떤 기술을 쓰는지 보고 매니저를 자동 등록해 주기 때문이다. 그래서 **MyBatis에서 JPA로 갈아타도 트랜잭션 코드는 그대로** 둘 수 있다.

## 어떻게 자동으로 될까 — AOP 프록시

원리는 [요청 흐름 글](/blog/request-flow-filter-interceptor-aop/)에서 본 **AOP(프록시)**다.

```
@Transactional 메서드 호출
      ↓  (스프링이 프록시로 감쌈)
[프록시] 트랜잭션 시작(begin)
      ↓
   실제 메서드 실행 (비즈니스 로직)
      ↓
[프록시] 정상 종료 → commit  /  예외 발생 → rollback
```

스프링이 `@Transactional`이 붙은 빈을 **프록시로 감싸서**, 메서드 앞뒤에 트랜잭션 시작·종료 코드를 자동으로 끼워 넣는다. 그래서 본문에는 로직만 남는 것이다. JDBC 예시의 그 `try-catch-commit-rollback`을 프록시가 대신 해준다고 보면 된다.

## 실무 함정 (면접·버그 단골)

`@Transactional`은 편하지만, 원리를 모르면 함정에 빠진다.

- **기본 롤백은 `RuntimeException`·`Error`만** — `IOException` 같은 checked exception은 **기본적으로 롤백되지 않는다.** 커밋돼 버린다. 필요하면 명시한다.
  ```java
  @Transactional(rollbackFor = Exception.class)
  ```
- **같은 클래스 내부 호출은 안 먹힌다(self-invocation)** — 프록시를 거치지 않기 때문이다. 아래 `this.save()`는 트랜잭션이 안 걸린다.
  ```java
  public void outer() { this.save(); }   // ← 프록시 안 거침, @Transactional 무시됨
  @Transactional public void save() { ... }
  ```
  다른 빈을 통해 호출해야 프록시가 적용된다.
- **읽기 전용은 `readOnly = true`** — 조회만 하는 메서드는 `@Transactional(readOnly = true)`로 성능을 최적화한다.
- **전파(propagation)** — 트랜잭션 안에서 또 트랜잭션을 만나면 어떻게 할지 정하는 옵션. 기본은 `REQUIRED`(기존 트랜잭션에 합류), `REQUIRES_NEW`(새 트랜잭션 시작) 등이 있다.

## 정리

- **트랜잭션**: 여러 작업을 묶어 "다 되거나 다 안 되게" (이체의 출금·입금)
- **순수 JDBC**: `setAutoCommit(false)` + `commit`/`rollback`을 손으로, 메서드마다 반복
- **@Transactional**: 한 줄로 선언 → 정상 커밋·예외 롤백을 스프링이 자동
- **기술 무관**: `PlatformTransactionManager` 추상화 덕에 JDBC·MyBatis·JPA 어디서든 코드 동일
- **원리**: AOP 프록시가 메서드 앞뒤로 begin/commit·rollback을 감쌈
- **함정**: checked 예외 기본 미롤백 / 내부 호출 무효 / readOnly / 전파 옵션

핵심은 — 스프링이 **트랜잭션 처리를 비즈니스 로직에서, 그리고 DB 기술에서 둘 다 분리**했다는 것이다. 덕분에 개발자는 `@Transactional` 한 줄만 붙이고 로직에 집중한다. 여기서도 흐르는 방향은 같다 — 반복되고 기술에 얽매이는 수고를, 추상화로 덜어낸다.
