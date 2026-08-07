---
title: 제어의 역전(IoC)과 의존성 주입(DI) — 스프링이 객체를 대신 만들어 주는 이유
description: "new로 직접 만들던 객체를 왜 스프링에게 맡길까. IoC와 DI의 원리부터, @Component·@Bean 등 빈을 등록하는 방법들과 그 차이까지 정리한다."
pubDate: 2026-08-07
category: backend
---

스프링을 배우면 어느 순간부터 `new`로 객체를 직접 만들지 않는다. `@Controller`, `@Service`를 붙여 두면 스프링이 알아서 객체를 만들어 주고, `@Autowired`로 가져다 쓴다. **왜 내가 만들던 객체를 스프링에게 맡기는 걸까?** 그 답이 스프링의 심장인 **IoC(제어의 역전)**다.

## 제어의 역전(IoC)이란

전통적인 방식에서는 **개발자가 객체의 생성과 생명주기를 직접 제어**한다.

```java
public class OrderService {
    // 내가 필요한 걸 직접 new 한다
    private OrderRepository repository = new OrderRepository();
}
```

여기서 "제어권"은 개발자에게 있다. *"언제 만들고, 무엇을 넣을지"*를 내가 코드에 박아 넣는다. 문제는 — `OrderRepository`를 바꾸고 싶으면 이 코드를 직접 고쳐야 하고, 테스트할 때 가짜 객체로 바꾸기도 어렵다. 강하게 묶여(강결합) 있기 때문이다.

**IoC는 이 제어권을 뒤집는다(역전).** 객체의 생성·조립·생명주기 관리를 **개발자가 아니라 컨테이너(스프링)가 담당**한다.

```java
public class OrderService {
    private final OrderRepository repository;
    // 내가 new 하지 않는다. 누군가(컨테이너)가 넣어 준다
    public OrderService(OrderRepository repository) {
        this.repository = repository;
    }
}
```

이제 `OrderService`는 *"나는 OrderRepository가 필요해"*라고 **선언만** 하고, 실제로 무엇을 언제 넣을지는 스프링이 결정한다. **제어의 주도권이 개발자 → 컨테이너로 넘어간 것**, 이것이 제어의 역전이다.

> 비유하자면 — 예전엔 요리 재료를 내가 직접 사 오고 손질했다면(직접 제어), IoC는 *"이 재료 필요해"*라고 주문서만 내고 주방(컨테이너)이 알아서 준비해 주는 것이다.

## DI(의존성 주입) — IoC를 실현하는 방법

IoC가 "원리"라면, 그걸 실제로 구현하는 대표적 방법이 **DI(Dependency Injection, 의존성 주입)**다. 위 예시처럼 **객체가 필요로 하는 의존(dependency)을 컨테이너가 외부에서 넣어 주는(injection)** 것이다.

주입 방법은 세 가지가 있다.

```java
// ① 생성자 주입 (권장) — final 가능, 불변, 테스트 쉬움
public OrderService(OrderRepository repository) { ... }

// ② 필드 주입 — 간단하지만 테스트·불변에 불리
@Autowired private OrderRepository repository;

// ③ 세터 주입 — 선택적 의존에 사용
@Autowired public void setRepository(OrderRepository r) { ... }
```

요즘은 **생성자 주입이 정석**이다. `final`로 불변을 보장하고, 의존 관계가 명확히 드러나며, 테스트할 때 가짜 객체를 넣기 쉽기 때문이다. 생성자가 하나면 `@Autowired`도 생략할 수 있다.

## IoC 컨테이너 — 빈을 관리하는 주방

이 모든 걸 담당하는 게 **IoC 컨테이너**(스프링에서는 `ApplicationContext`)다. 컨테이너가 관리하는 객체를 **빈(Bean)**이라 부른다. 컨테이너는:

1. 어떤 객체를 빈으로 만들지 **등록**받고
2. 빈을 **생성**하고
3. 서로 필요한 빈을 **주입(DI)**하고
4. 생명주기를 **관리**한다

그럼 컨테이너에게 *"이걸 빈으로 만들어라"*를 어떻게 알려줄까? 여기서 **빈 등록 방법**이 등장한다.

## 빈 등록, 두 갈래 길

빈을 등록하는 방법은 크게 두 가지다.

### ① `@Component` 계열 — 자동 스캔으로 등록

클래스에 애노테이션을 붙여 두면, [컴포넌트 스캔](/blog/component-scan-mvc-boot/)이 훑어서 자동으로 빈으로 등록한다.

```java
@Component     // 일반 컴포넌트
@Controller    // 웹 요청 처리
@Service       // 비즈니스 로직
@Repository     // 데이터 접근
```

`@Controller`·`@Service`·`@Repository`는 전부 `@Component`의 특수화다. 역할을 드러내려고 이름만 나눈 것이고, **등록 원리는 똑같다** — 스캔에 걸려 빈이 된다.

### ② `@Bean` — 수동으로 등록

`@Configuration`을 붙인 설정 클래스 안에서, 메서드에 `@Bean`을 붙여 **반환 객체를 직접 빈으로 등록**한다.

```java
@Configuration
public class AppConfig {
    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();   // 이 반환값이 빈이 된다
    }
}
```

## @Component와 @Bean, 무엇이 다른가

이 둘의 차이가 핵심이다. **"누구의 코드냐"**로 갈린다.

| | `@Component` 계열 | `@Bean` |
|---|---|---|
| 붙이는 곳 | **클래스** 위 | `@Configuration` 안 **메서드** 위 |
| 등록 방식 | 컴포넌트 스캔이 자동 발견 | 개발자가 메서드로 직접 반환 |
| 주 용도 | **내가 만든 클래스** | **외부 라이브러리 객체** / 세밀한 생성 제어 |
| 제어 수준 | 애노테이션만 붙이면 끝 | 생성 과정을 코드로 조립 |

**결정적 차이는 이것이다** — `@Component`는 **클래스에 애노테이션을 붙일 수 있어야** 쓸 수 있다. 그런데 `ObjectMapper`, `DataSource` 같은 **외부 라이브러리 클래스는 내가 소스를 고칠 수 없어서 `@Component`를 못 붙인다.** 이때 `@Bean`으로 *"이 객체를 빈으로 등록해라"*라고 대신 선언하는 것이다.

```
내가 만든 클래스        → @Component (클래스에 붙여 자동 스캔)
외부 라이브러리 객체     → @Bean (설정 클래스에서 수동 등록)
생성 과정을 세밀히 제어   → @Bean (코드로 조립)
```

## 정리

- **IoC(제어의 역전)**: 객체의 생성·관리 제어권을 개발자 → 컨테이너로 넘기는 것. 강결합을 푼다.
- **DI(의존성 주입)**: IoC의 실현 방법. 필요한 의존을 컨테이너가 주입. **생성자 주입이 정석**.
- **IoC 컨테이너**(`ApplicationContext`): 빈을 등록·생성·주입·관리하는 주방.
- **빈 등록 두 갈래**:
  - `@Component` 계열(`@Controller`/`@Service`/`@Repository`) — **내 클래스**, 스캔으로 자동 등록
  - `@Bean`(`@Configuration` 안) — **외부 라이브러리·세밀 제어**, 수동 등록

`@Controller`가 마법처럼 등록되는 걸 [컴포넌트 스캔 글](/blog/component-scan-mvc-boot/)에서 봤다면, 이제 그 위의 그림이 보인다 — 스프링은 **객체를 대신 만들고(IoC), 서로 엮어 주고(DI), 그 재료를 등록받는 창구(@Component·@Bean)를 열어 둔** 것이다. 개발자는 *"무엇이 필요한지"*만 선언하고, 조립은 컨테이너에 맡긴다. 여기서도 방향은 같다 — 반복되는 수고를, 필요한 만큼 자동으로.
