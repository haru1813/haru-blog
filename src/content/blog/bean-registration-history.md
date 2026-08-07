---
title: 빈 등록의 역사 — XML에서 @Configuration까지
description: "스프링에 빈을 등록하는 방법은 시대에 따라 진화했다. XML의 <bean>에서 자바 설정 @Configuration·@Bean, 그리고 컴포넌트 스캔까지. 그 흐름과 1:1 대응, 왜 자바로 넘어왔는지를 정리한다."
pubDate: 2026-08-07
category: backend
parent: ioc-di-bean-registration
---

[IoC와 DI 글](/blog/ioc-di-bean-registration/)에서 빈을 등록하는 두 갈래(`@Component` 스캔, `@Bean` 수동)를 봤다. 그런데 스프링을 오래 보면 이런 게 눈에 띈다 — 옛날 프로젝트에는 `applicationContext.xml`이라는 파일에 빈이 잔뜩 적혀 있었다. **빈 등록은 원래 XML로 했다.** 지금의 애노테이션 방식이 어떻게 여기까지 왔는지, 그 역사를 따라가 보자.

## 빈 등록의 세 시대

스프링에서 빈을 등록하는 방법은 크게 세 단계로 진화했다.

```
① XML (<bean>)                     [레거시]  — applicationContext.xml
        ↓
② 자바 설정 (@Configuration + @Bean)  [현대]   — XML을 자바 코드로
        ↓
③ 컴포넌트 스캔 (@Component)          [자동]   — 애노테이션만 붙이면 자동
```

하나씩 보자.

## ① XML 방식 — 모든 빈을 파일에 적던 시절

초창기 스프링은 빈을 **XML 파일에 일일이 등록**했다.

```xml
<!-- applicationContext.xml -->
<beans>
    <bean id="orderService" class="com.example.OrderService">
        <constructor-arg ref="orderRepository"/>   <!-- 의존성 주입도 XML로 -->
    </bean>
    <bean id="orderRepository" class="com.example.OrderRepository"/>
</beans>
```

클래스 하나하나를 `<bean>` 태그로 등록하고, 의존성 주입(`<constructor-arg>`)까지 XML에 적었다. 프로젝트가 커지면 이 XML이 **수백 줄**로 불어났다. 오래된 스프링 프로젝트를 열면 이 거대한 XML을 만나게 된다.

## ② 자바 설정 — XML을 코드로 옮기다

스프링 3.0부터 **XML 대신 자바 클래스로 설정**할 수 있게 됐다. `@Configuration` + `@Bean`이다.

```java
@Configuration
public class AppConfig {
    @Bean
    public OrderService orderService() {
        return new OrderService(orderRepository());   // 의존성 주입도 코드로
    }
    @Bean
    public OrderRepository orderRepository() {
        return new OrderRepository();
    }
}
```

위 XML과 **똑같은 일**을 자바 코드로 한 것이다. `<bean>` 태그가 `@Bean` 메서드로 바뀌었을 뿐이다.

## ③ 컴포넌트 스캔 — 아예 등록조차 자동으로

여기서 한 발 더 나아간 게 [컴포넌트 스캔](/blog/component-scan-mvc-boot/)이다. `@Component` 계열을 붙여 두면, 스프링이 훑어서 **자동으로 빈 등록**한다.

```java
@Service   // 이거 하나면 등록 끝. 설정 파일에 안 적어도 됨
public class OrderService { ... }
```

XML에도 `@Bean`에도 하나하나 적을 필요 없이, **애노테이션만 붙이면** 되는 시대가 온 것이다.

## XML ↔ 자바 설정, 1:1 대응

여기서 중요한 건, XML로 하던 것이 **자바 설정으로 그대로 옮겨왔다**는 점이다. 사라진 게 아니라 형태만 바뀌었다.

| 하는 일 | XML 방식 (레거시) | 자바 설정 방식 (현대) |
|---|---|---|
| 개별 빈 등록 | `<bean>` | `@Bean` (@Configuration 안) |
| 컴포넌트 스캔 켜기 | `<context:component-scan>` | `@ComponentScan` |
| 다른 설정 불러오기 | `<import>` | `@Import` |
| 프로퍼티 파일 읽기 | `<context:property-placeholder>` | `@PropertySource` |

**XML의 모든 설정이 애노테이션으로 대응**된다. `@Configuration`은 그 대응의 중심 — "XML 설정 파일의 자바 버전"인 셈이다.

## 왜 XML에서 자바로 넘어왔나

같은 일을 하는데 왜 굳이 바꿨을까? 자바 설정이 주는 이점이 뚜렷하다.

- **타입 안전(Type-safe)** — XML은 클래스명을 문자열(`class="com.example.OrderService"`)로 적어서, 오타가 나도 **실행 전에는 모른다.** 자바 설정은 컴파일러가 바로 잡아 준다.
- **IDE 지원** — 자동완성, 리팩터링(클래스명 변경 시 자동 반영), 코드 추적이 다 된다. XML 문자열로는 안 된다.
- **가독성·유지보수** — 설정과 코드가 같은 언어라 읽고 고치기 편하다.

그래서 요즘 스프링(특히 Spring Boot)은 XML을 거의 쓰지 않는다. **XML은 레거시 프로젝트에서나 만나게 된다** (`web.xml`, `applicationContext.xml` 등).

## 살짝 심화 — @Configuration의 싱글톤 보장

`@Configuration` 클래스의 `@Bean` 메서드에는 특별한 능력이 있다. **메서드를 여러 번 호출해도 항상 같은 싱글톤 빈을 반환**한다.

```java
@Configuration
public class AppConfig {
    @Bean public OrderService orderService() {
        return new OrderService(orderRepository());  // 아래 메서드 호출
    }
    @Bean public OrderRepository orderRepository() {
        return new OrderRepository();
    }
}
```

`orderService()`가 `orderRepository()`를 호출하는데, 이때 **새 객체가 만들어지는 게 아니라 컨테이너가 관리하는 그 하나의 빈이 반환**된다. 스프링이 `@Configuration` 클래스를 프록시(CGLIB)로 감싸서 이걸 보장하기 때문이다. `@Configuration` 없이 `@Component`에 `@Bean`만 쓰면(lite mode) 이 보장이 없다. **이것이 설정 클래스에 `@Configuration`을 붙이는 이유**다.

## 정리

- 빈 등록은 **XML(`<bean>`) → 자바 설정(`@Configuration`+`@Bean`) → 컴포넌트 스캔(`@Component`)** 순으로 진화했다.
- **@Configuration** = "XML 설정 파일의 자바 버전". `@Bean`으로 빈을 등록한다.
- XML의 모든 설정이 애노테이션에 **1:1 대응**된다 — `<bean>`→`@Bean`, `<context:component-scan>`→`@ComponentScan`.
- 자바로 넘어온 이유: **타입 안전 + IDE 지원 + 가독성**.
- `@Configuration`은 `@Bean`의 **싱글톤을 보장**한다(프록시).

빈을 XML에 손으로 적던 시절에서, 애노테이션 하나면 자동 등록되는 시대로 — 여기서도 방향은 하나였다. **반복되는 수고를, 필요한 만큼 자동으로.** 스프링의 모든 이야기가 결국 이 문장으로 수렴한다.
