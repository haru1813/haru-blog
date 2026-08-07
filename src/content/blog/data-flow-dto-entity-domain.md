---
title: 데이터의 여정 — DTO·Entity·Domain은 왜 나뉘나
description: "웹 요청이 들어와 DB에 저장되고 응답까지, 데이터는 여러 객체로 변신하며 흐른다. Request DTO·Entity·Domain·Response DTO는 각각 무엇이고, 왜 굳이 나누는지 — 실무 설계의 핵심을 정리한다."
pubDate: 2026-08-07
category: backend
---

지금까지 [스프링이 객체를 어떻게 관리하는지](/blog/ioc-di-bean-registration/)(IoC·DI·빈)를 봤다. 이제 시선을 옮겨 보자 — **데이터는 앱 안에서 어떻게 흐를까?** 웹 요청이 들어와 DB에 저장되고 응답으로 나가기까지, 데이터는 하나의 객체로 쭉 가지 않는다. `Request DTO` → `Entity` → `Response DTO`처럼 **여러 객체로 변신하며** 흐른다. 왜 이렇게 나눌까?

## 데이터의 여정 — 전체 흐름

먼저 큰 그림부터.

```
[클라이언트 요청]
      ↓
① Request DTO   — 요청 데이터를 받는 그릇
      ↓
② 검증(@Valid)   — 데이터가 규칙에 맞는지 확인
      ↓
③ Domain/Entity — 비즈니스 처리 + DB 저장용 객체
      ↓
   [DB 저장]
      ↓
④ Response DTO  — 응답할 데이터를 담는 그릇
      ↓
[클라이언트 응답]
```

데이터가 계층을 지날 때마다 **그 계층에 맞는 옷으로 갈아입는다**고 보면 된다.

## 각 객체의 역할

- **Request DTO** (Data Transfer Object) — 클라이언트가 보낸 **요청 데이터를 받는** 전용 객체. `@RequestBody`로 받는 그 객체다.
- **Entity** — **DB 테이블과 매핑**되는 객체. JPA의 `@Entity`가 붙는다. DB의 한 행(row)이 곧 하나의 Entity다.
- **Domain** — **비즈니스 개념과 로직**을 담은 객체. "주문", "회원" 같은 업무 개념 그 자체다.
- **Response DTO** — 클라이언트에 **응답할 데이터**를 담는 객체.

## 핵심 질문 — 왜 DTO와 Entity를 나눌까?

가장 많이 하는 질문이다. *"그냥 Entity 하나로 요청·응답·저장 다 하면 안 되나?"* 안 될 건 없지만, **나누는 데는 분명한 이유가 있다.**

### ① 보안 — 민감 정보 노출 방지

```java
@Entity                          // DB와 직결
class User {
    Long id;
    String email;
    String password;             // ← 민감!
    LocalDateTime createdAt;
}

class UserResponse {             // Response DTO — 필요한 것만
    Long id;
    String email;
    // password 없음 → 응답에 안 나감
}
```

Entity를 그대로 응답하면 `password` 같은 **민감 필드까지 노출**된다. DTO로 걸러서 필요한 것만 내보낸다.

### ② 결합도 — DB 변경이 API를 깨지 않게

Entity를 API에 그대로 쓰면, **DB 컬럼이 바뀔 때마다 API 응답도 바뀌어** 버린다. 프론트엔드가 깨진다. DTO가 **완충 지대** 역할을 해서, DB가 바뀌어도 DTO만 맞춰주면 API는 그대로 유지된다.

### ③ 필요한 것만 — 요청·응답마다 다른 모양

회원 가입 요청에는 `password`가 필요하지만, 회원 조회 응답에는 없어야 한다. 목록 응답엔 요약 필드만, 상세 응답엔 전체 필드가 필요하다. **각 상황에 맞는 DTO**를 두면 딱 필요한 데이터만 주고받는다.

## Entity와 Domain의 관계

이 둘이 헷갈리기 쉽다. 정리하면:

- **좁게 보면** — Entity는 **DB 매핑**(기술적 관심사), Domain은 **비즈니스 개념·로직**(업무적 관심사)이다.
- **실무에서는** — 규모에 따라 다르다.
  - **작은/보통 프로젝트**: Entity가 Domain 역할을 **겸한다.** `User` 엔티티 안에 `changePassword()` 같은 비즈니스 메서드를 둔다. (Entity ≈ Domain)
  - **크고 복잡한 프로젝트(DDD)**: 순수 Domain 모델과 영속성 Entity를 **분리**하기도 한다.

처음엔 **Entity ≈ Domain으로 시작**하고, 복잡해지면 분리를 고민하면 된다. 억지로 처음부터 나눌 필요는 없다.

## 실무 흐름 — 코드로 보기

컨트롤러에서 이 여정이 어떻게 펼쳐지는지 보자.

```java
@PostMapping("/users")
public UserResponse create(@RequestBody @Valid UserRequest request) {
    //  ①②: Request DTO로 받고 @Valid로 검증

    User user = userService.create(request);
    //  ③: DTO를 Entity/Domain으로 변환하고 비즈니스 처리 + DB 저장

    return UserResponse.from(user);
    //  ④: Entity를 Response DTO로 변환해 응답
}
```

- `@RequestBody @Valid UserRequest` — 요청을 DTO로 받고 [검증](/blog/controller-method-arguments/)
- `userService.create(...)` — DTO를 Entity로 바꿔 저장 (변환은 보통 서비스나 매퍼가)
- `UserResponse.from(user)` — Entity를 필요한 필드만 담은 응답 DTO로

**계층마다 데이터가 옷을 갈아입는 것**이 한눈에 보인다.

## 정리

- 데이터는 **Request DTO → 검증 → Domain/Entity → DB → Response DTO**로, 계층마다 옷을 갈아입으며 흐른다.
- **Request/Response DTO**: 요청·응답 전용 그릇
- **Entity**: DB 테이블 매핑 객체
- **Domain**: 비즈니스 개념·로직 (작은 프로젝트에선 Entity가 겸함)
- **DTO와 Entity를 나누는 이유**: ① 보안(민감 필드 차단) ② 결합도(DB 변경 격리) ③ 필요한 것만
- Entity ↔ Domain은 **처음엔 하나로 시작**, 복잡해지면 분리 고민

핵심은 이것이다 — **각 계층은 자기 관심사에 맞는 데이터 모양을 갖는다.** 웹은 DTO로, DB는 Entity로, 업무는 Domain으로. 그래서 한 곳이 바뀌어도 다른 곳이 흔들리지 않는다. 이 "관심사의 분리"가 유지보수하기 좋은 앱의 뼈대다.

> 다음 글에서는 이 여정의 두 번째 관문 — **검증(@Valid)**이 실제로 어떻게 동작하는지 들여다본다.
