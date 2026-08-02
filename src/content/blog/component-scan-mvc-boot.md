---
title: Spring은 @Controller를 어떻게 찾아낼까 — 컴포넌트 스캔, MVC vs Boot
description: "@Controller 하나 붙였을 뿐인데 빈으로 등록되는 이유. 컴포넌트 스캔의 원리와, Spring MVC와 Spring Boot의 스캔 방식 차이를 정리한다."
pubDate: 2026-08-02
category: backend
---

[요청 흐름 글](/blog/request-flow-filter-interceptor-aop/)에서 "요청이 컨트롤러까지 온다"고 했다. 그런데 한 발 더 들어가면 이게 궁금해진다 — **그 컨트롤러는 애초에 어떻게 Spring에 등록됐을까?** 우리는 클래스에 `@Controller` 한 줄 붙였을 뿐인데, Spring이 알아서 그걸 찾아내 관리한다. 그 "알아서 찾아내는" 일이 **컴포넌트 스캔(Component Scan)**이다.

## 먼저, 스프링 빈이란

**스프링 빈(Bean)**은 **스프링 컨테이너가 만들어서 관리하는 객체**다. 우리가 `new`로 직접 만들지 않고, 컨테이너에 맡기면 컨테이너가 생성·주입(DI)·소멸까지 챙긴다.

그럼 컨테이너는 "무엇을 빈으로 만들지" 어떻게 알까? 하나하나 등록해 줄 수도 있지만, 클래스가 수백 개면 지옥이다. 그래서 나온 게 **"애노테이션 붙은 클래스를 자동으로 찾아 빈으로 등록"**하는 컴포넌트 스캔이다.

## @Component와 그 친구들

컴포넌트 스캔의 대상은 **`@Component`가 붙은 클래스**다. 그런데 우리가 매일 쓰는 이 애노테이션들도 사실 전부 `@Component`의 특수화다.

```java
@Controller   // 웹 요청 처리 (컨트롤러)
@Service      // 비즈니스 로직
@Repository   // 데이터 접근 (DB)
@Component    // 그 외 일반 컴포넌트
```

`@Controller`·`@Service`·`@Repository`는 내부에 `@Component`를 품고 있다. 그래서 **셋 다 컴포넌트 스캔에 걸려 빈이 된다.** 이름을 나눈 건 "역할을 드러내기 위해서"일 뿐, 등록 원리는 똑같다.

즉 `@Controller`를 붙이는 순간 — *"나는 컴포넌트다, 스캔해서 빈으로 등록해 줘"*라고 표시하는 것이다.

## Spring MVC(레거시) — XML 또는 자바 설정으로 직접 지정

전통적인 Spring MVC에서는 **"어느 패키지를 뒤질지" 개발자가 직접 명시**해야 한다. 방식은 두 가지다.

**① XML 설정 — 순수 레거시 방식.** `applicationContext.xml` 같은 설정 파일에 스캔 대상을 적는다. 오래된 Spring 프로젝트를 열면 이 한 줄이 거의 항상 있었다.

```xml
<!-- applicationContext.xml -->
<context:component-scan base-package="com.example" />
```

"`com.example` 아래를 훑어서 `@Component` 계열을 전부 빈으로 등록해라"는 뜻이다. **Spring 레거시에서는 이렇게 XML로 빈을 스캔했다** — 빈 스캔의 출발점이었다.

**② 자바 설정 — XML을 자바 클래스로 대체.** 이후 XML 파일 없이 자바 코드로 같은 일을 하게 됐다.

```java
@Configuration
@ComponentScan(basePackages = "com.example")
public class AppConfig { }
```

XML이든 자바든 공통점은 하나다 — **"여기를 스캔해라"를 개발자가 손으로 지정**한다는 것. 이 수고를 다음 세대(Spring Boot)가 걷어낸다.

## Spring Boot — 알아서 자기 아래를 스캔한다

Spring Boot에서는 이 지정조차 사라진다. 비밀은 `@SpringBootApplication` 안에 있다.

```java
@SpringBootApplication  // 이 안에 @ComponentScan이 들어 있다
public class MyApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyApplication.class, args);
    }
}
```

`@SpringBootApplication`은 사실 세 개를 합친 것이다.

- `@Configuration` — 설정 클래스
- `@EnableAutoConfiguration` — 자동 설정
- **`@ComponentScan`** — 컴포넌트 스캔

여기서 `@ComponentScan`에 **패키지를 지정하지 않으면, 그 클래스가 있는 패키지를 기준으로** 스캔한다. 즉 **`MyApplication`이 놓인 패키지와 그 하위 전부**가 자동 스캔 대상이 된다.

## 그래서 메인 클래스 위치가 중요하다

이 원리 때문에 **메인 클래스(`@SpringBootApplication`)는 최상위 패키지에 두는 게 관례**다.

```
com.example            ← MyApplication (여기 기준으로 스캔 시작)
├── controller         ✅ 스캔됨
├── service            ✅ 스캔됨
└── repository         ✅ 스캔됨

com.other              ❌ 스캔 안 됨 (메인 클래스 패키지 밖)
```

만약 메인 클래스를 엉뚱하게 깊은 패키지에 두면, 그 위·옆 패키지의 `@Controller`들이 스캔에서 빠져 **"빈을 못 찾는다"**는 에러를 만난다. 흔한 초보 함정이다.

## 정리

- **컴포넌트 스캔**: `@Component` 계열 애노테이션이 붙은 클래스를 찾아 자동으로 빈 등록.
- **`@Controller`·`@Service`·`@Repository`**: 전부 `@Component`의 특수화. 역할만 다르고 등록 원리는 같다.
- **Spring MVC**: `@ComponentScan(basePackages = ...)`로 **스캔 범위를 직접 지정**.
- **Spring Boot**: `@SpringBootApplication` 안의 `@ComponentScan`이 **메인 클래스 패키지부터 자동** 스캔.

`@Controller`가 "마법처럼" 등록되는 게 아니라, **"컴포넌트 스캔이 훑다가 발견해서" 등록되는 것**이다. 여기까지 오니, 오늘 정리한 흐름이 한 바퀴 돌아 맞물린다 — Spring은 서블릿을 감추고, 요청을 관문으로 다듬고, 빈을 스캔으로 모은다. 전부 **"반복되는 일을 관례와 자동으로 덜어 주는"** 같은 철학이었다.
