---
title: DB 접근 기술 지도 — JDBC에서 JPA까지
description: "JDBC·JdbcTemplate·MyBatis·JPA… DB에 접근하는 기술은 왜 이렇게 많을까. 'SQL을 얼마나 직접 다루나'라는 하나의 스펙트럼으로 정리하고, 헷갈리는 JPA·Hibernate·Spring Data JPA의 관계까지 짚는다."
pubDate: 2026-08-07
category: backend
---

[데이터의 여정](/blog/data-flow-dto-entity-domain/)에서 Entity가 DB에 저장된다고 했다. 그런데 그 "저장"을 실제로 담당하는 기술이 여럿이다 — JDBC, JdbcTemplate, MyBatis, JPA… 처음 보면 뭘 골라야 할지 막막하다. 하지만 이것들은 따로 노는 게 아니라, **하나의 스펙트럼 위에** 늘어서 있다.

## 핵심 축 — SQL을 얼마나 직접 다루나

DB 접근 기술을 가르는 기준은 하나다. **"SQL을 개발자가 직접 쓰느냐, 프레임워크가 대신 만들어 주느냐."**

```
SQL 직접 작성 ←――――――――――――――――――――→ 객체 중심 (SQL 자동)

JDBC  →  JdbcTemplate  →  MyBatis  →  JPA(Hibernate)  →  Spring Data JPA
저수준     반복 제거       SQL 매퍼      ORM               ORM 추상화
```

왼쪽으로 갈수록 SQL을 손으로 다 쓰고(제어권↑, 코드량↑), 오른쪽으로 갈수록 객체로 다루며 SQL이 자동 생성된다(편의성↑).

## 같은 조회를 네 가지로 — 스펙트럼 체감하기

`id`로 회원 하나를 조회하는 코드를 각 기술로 보면 차이가 확 온다.

```java
// ① JDBC — 연결·실행·매핑을 다 손으로
Connection conn = dataSource.getConnection();
PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?");
ps.setLong(1, id);
ResultSet rs = ps.executeQuery();
if (rs.next()) { user = new User(rs.getLong("id"), rs.getString("email")); }
// 연결 닫기, 예외 처리… 반복 지옥

// ② JdbcTemplate — 반복은 스프링이, SQL은 내가
User user = jdbcTemplate.queryForObject(
    "SELECT * FROM users WHERE id = ?", userRowMapper, id);

// ③ MyBatis — SQL은 XML에, 호출은 인터페이스로
//   UserMapper.xml: <select id="findById">SELECT * FROM users WHERE id=#{id}</select>
User user = userMapper.findById(id);

// ④ Spring Data JPA — SQL 없이 객체로
User user = userRepository.findById(id).orElseThrow();
```

같은 일인데, **①에서 ④로 갈수록 SQL이 사라지고 코드가 줄어든다.** 대신 ①에 가까울수록 SQL을 세밀하게 제어할 수 있다. 어느 게 "좋다"가 아니라, **제어냐 편의냐의 트레이드오프**다.

## 각 기술 한 줄 정리

- **JDBC** — 자바 표준. 제일 저수준. `Connection`·`ResultSet`을 직접 다뤄 반복이 많다.
- **JdbcTemplate** — 스프링. JDBC의 반복(연결·예외처리)을 걷어낸다. **SQL은 여전히 직접** 쓴다. (스프링 6.1의 최신 API `JdbcClient`도 같은 계열)
- **MyBatis** — SQL을 XML/애노테이션에 작성하고 결과를 객체에 매핑. **SQL 직접 제어 + 매핑 자동화**. SQL 매퍼(SQL Mapper)라 부른다.
- **JPA** — 객체로 DB를 다루고 SQL을 자동 생성하는 ORM(Object-Relational Mapping).

## 꼭 알아야 할 것 — "JPA 삼형제"

여기가 제일 헷갈리는 지점이다. 흔히 "JPA 쓴다"고 하지만, 실무의 JPA는 **세 겹**으로 되어 있다.

| | 정체 | 비유 |
|---|---|---|
| **JPA** | 자바 표준 **명세**(인터페이스). 규칙만 정의 | "이렇게 동작하라"는 설계도 |
| **Hibernate** | JPA의 대표 **구현체**. 실제 엔진 | 설계도로 만든 실제 제품 |
| **Spring Data JPA** | JPA를 **더 쉽게** 쓰게 하는 스프링 모듈 | 제품을 더 편하게 쓰는 리모컨 |

```
JPA (명세) ─ 구현 → Hibernate ─ 감쌈 → Spring Data JPA
```

즉 `@Entity`를 붙이고 `JpaRepository`를 상속받아 쓰는 것은 — **JPA 명세를 Hibernate가 구현하고, 그 위를 Spring Data JPA가 감싼** 결과다. 세 층이 쌓여 있는 것이다.

> 면접 단골 질문: *"JPA와 Hibernate의 차이는?"* → **JPA는 명세(인터페이스), Hibernate는 그 구현체.** [인터페이스와 구현의 관계](/blog/ioc-di-bean-registration/)와 똑같다.

## 그 외의 기술들

| 기술 | 특징 |
|---|---|
| **QueryDSL** | JPA와 함께 쓴다. JPQL 문자열 대신 **타입 안전한 자바 코드**로 쿼리. 복잡한 동적 쿼리에 강함 |
| **jOOQ** | SQL을 타입 안전하게. SQL 중심인데 컴파일러가 잡아준다 |
| **R2DBC** | **리액티브**(비동기·논블로킹) DB 접근. WebFlux와 함께 |
| **Spring Data JDBC** | JPA보다 단순한 스프링 데이터 접근 |

새 기술이 나와도, **"이 스펙트럼의 어디쯤인가"**로 짚으면 이해된다.

## 실무에서는 무엇을 쓰나

```
신규·스타트업       → Spring Data JPA + QueryDSL   (요즘 주류)
SI·공공·금융·레거시  → MyBatis                      (SQL 직접 제어 선호)
간단한 배치·조회     → JdbcTemplate / JdbcClient
```

특히 **SI·공공(전자정부프레임워크) 쪽은 MyBatis가 여전히 강세**다. SQL을 개발자가 직접 통제하려는 문화 때문이다. 반면 신규 프로젝트는 **JPA 계열**로 많이 간다. 그래서 **둘 다 알아두면** 어느 회사를 가든 대응된다.

## 정리

- DB 접근 기술은 **"SQL을 얼마나 직접 다루나"** 하나의 스펙트럼 위에 있다.
- **JDBC**(저수준) → **JdbcTemplate**(반복 제거) → **MyBatis**(SQL 매퍼) → **JPA**(ORM) → **Spring Data JPA**(추상화)
- **JPA 삼형제**: JPA(명세) ← Hibernate(구현) ← Spring Data JPA(추상화)
- **추가**: QueryDSL(타입안전 쿼리), jOOQ, R2DBC(리액티브)
- **실무**: 신규=JPA+QueryDSL / SI·공공=MyBatis — **둘 다 알아두면 유리**

핵심은 *"몇 개가 끝이냐"*가 아니라 **"제어(SQL 직접)와 편의(객체 중심) 사이 어디에 서느냐"**다. 그 선택이 프로젝트 성격에 따라 갈릴 뿐, 밑바탕에 흐르는 방향은 여기서도 같다 — 반복되는 수고를, 필요한 만큼 자동으로. 다만 DB 접근에서는 그 자동화의 정도를 **내가 고를 수 있다.**
