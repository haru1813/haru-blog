---
title: 롬복(Lombok) — 반복 코드를 없애는 도구, 그리고 JPA와의 구분
description: "getter·생성자·빌더… DTO와 Entity에 반복되는 코드를 롬복이 자동 생성한다. 주요 애노테이션과, 헷갈리기 쉬운 JPA 애노테이션과의 구분, 그리고 Entity에서 조심할 점까지 정리한다."
pubDate: 2026-08-07
category: backend
parent: data-flow-dto-entity-domain
---

[데이터의 여정](/blog/data-flow-dto-entity-domain/)에서 본 DTO와 Entity에는 공통점이 있다 — **getter, 생성자, toString 같은 뻔한 코드가 필드 수만큼 반복**된다는 것이다. 이 지겨운 반복을 없애 주는 게 **롬복(Lombok)**이다. 그리고 롬복 애노테이션은 Entity의 JPA 애노테이션과 나란히 붙어서 자주 헷갈리는데, 그 구분도 이 글에서 잡는다.

## 롬복이란

롬복은 **컴파일 시점에 반복 코드를 자동으로 생성**해 주는 라이브러리다. 애노테이션만 붙이면, 컴파일할 때 롬복이 getter·생성자 등의 코드를 실제로 만들어 넣는다. 소스에는 안 보이지만 바이트코드에는 들어간다.

```java
// 롬복 없이 — 이 반복을...
public class UserRequest {
    private String name;
    private String email;
    public String getName() { return name; }
    public String getEmail() { return email; }
    public UserRequest(String name, String email) { ... }
    // toString, equals, hashCode... 계속
}

// 롬복으로 — 한 줄로
@Getter
@AllArgsConstructor
public class UserRequest {
    private String name;
    private String email;
}
```

## 주요 롬복 애노테이션

| 애노테이션 | 생성하는 것 |
|---|---|
| `@Getter` / `@Setter` | getter / setter 메서드 |
| `@NoArgsConstructor` | 기본 생성자 (파라미터 없음) |
| `@AllArgsConstructor` | 모든 필드를 받는 생성자 |
| `@RequiredArgsConstructor` | **`final` 필드**만 받는 생성자 |
| `@Builder` | 빌더 패턴 (`User.builder().name("하루").build()`) |
| `@ToString` | toString 메서드 |
| `@EqualsAndHashCode` | equals·hashCode 메서드 |
| `@Data` | 위의 여러 개를 **한 번에** (아래 주의) |

`@Data`는 `@Getter` + `@Setter` + `@ToString` + `@EqualsAndHashCode` + `@RequiredArgsConstructor`를 합친 것이다. 편하지만 Entity에는 위험하다(뒤에서 설명).

## @RequiredArgsConstructor — 생성자 주입의 짝

[의존성 주입 글](/blog/dependency-injection-methods/)에서 나온 그 애노테이션이다. `final` 필드를 받는 생성자를 만들어 줘서, **생성자 주입을 간결하게** 해준다.

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository repository;   // 이 final 필드를 받는 생성자 자동 생성
}
```

## JPA 애노테이션 vs 롬복 애노테이션 (헷갈리지 말자)

Entity 클래스를 보면 두 종류의 애노테이션이 **나란히** 붙어 있다. 출신과 역할이 완전히 다르다.

```java
@Entity              // JPA
@Getter              // 롬복
@NoArgsConstructor   // 롬복
public class User {
    @Id                 // JPA
    @GeneratedValue     // JPA
    private Long id;

    @Column(nullable = false)  // JPA
    private String email;
}
```

| 애노테이션 | 출신 | 역할 |
|---|---|---|
| `@Entity`, `@Table` | **JPA** | 클래스 ↔ DB 테이블 매핑 |
| `@Id`, `@GeneratedValue` | **JPA** | 기본키 지정·생성 |
| `@Column`, `@OneToMany` 등 | **JPA** | 컬럼·연관관계 매핑 |
| `@Getter`, `@Setter` | **롬복** | getter/setter 생성 |
| `@Builder`, `@NoArgsConstructor` | **롬복** | 빌더·생성자 생성 |

**한 문장으로 — JPA 애노테이션은 "DB와 어떻게 매핑할지", 롬복 애노테이션은 "반복 코드를 어떻게 생성할지"를 담당한다.** 역할이 겹치지 않는다. 그래서 Entity 클래스에는 이 둘이 자연스럽게 함께 붙는다.

## Entity에서 롬복 조심할 점 (실무 중요)

DTO에는 롬복을 마음껏 써도 되지만, **Entity에는 조심**해야 한다. 잘못 쓰면 버그가 난다.

- **`@Data`·`@Setter`를 Entity에 남발하지 말 것** — Entity는 함부로 값이 바뀌면 안 되는데(무결성), `@Setter`가 다 열려 있으면 아무 데서나 수정된다. Entity는 의미 있는 메서드(`changeEmail()` 등)로만 바꾸는 게 좋다.
- **`@ToString`에서 연관관계 필드 제외** — 양방향 연관관계(`@OneToMany`)에서 `@ToString`이 서로를 호출하면 **무한 루프**에 빠진다. `@ToString(exclude = "orders")`로 빼준다.
- **`@NoArgsConstructor(access = PROTECTED)`** — JPA는 기본 생성자가 필요하지만, 아무나 빈 객체를 만들지 못하게 접근을 `PROTECTED`로 막는 게 관례다.

즉 **DTO엔 롬복을 자유롭게, Entity엔 신중하게** — 이게 실무 감각이다.

## 정리

- **롬복**: 컴파일 시 getter·생성자·빌더 등 **반복 코드를 자동 생성**
- **주요 애노테이션**: `@Getter`/`@Setter`, `@___ArgsConstructor`, `@Builder`, `@ToString`, `@Data`
- **`@RequiredArgsConstructor`**: `final` 필드 생성자 → 생성자 주입의 짝
- **JPA vs 롬복**: `@Entity`·`@Id`·`@Column`은 **JPA(DB 매핑)**, `@Getter`·`@Builder`는 **롬복(코드 생성)** — 역할이 다르고 함께 붙는다
- **Entity 주의**: `@Data`·`@Setter` 남발 금지, `@ToString` 연관관계 제외, 기본 생성자 `PROTECTED`

이걸로 [데이터의 여정](/blog/data-flow-dto-entity-domain/) 계열이 마무리된다. 요청을 DTO로 받고(그릇), 검증하고(관문), Entity로 저장하고, 그 반복 코드를 롬복이 덜어 준다. 스프링을 관통하는 그 방향이 데이터 계층에서도 똑같이 흐른다 — **반복되는 수고를, 필요한 만큼 자동으로.**
