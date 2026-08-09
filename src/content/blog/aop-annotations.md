---
title: 스프링 AOP 제대로 보기 — @Aspect·@Pointcut·@Before·@After·@Around
description: "AOP의 5대 용어(Aspect·Join Point·Pointcut·Advice·Weaving)를 먼저 잡고, @Aspect로 관점을 선언하고 @Pointcut으로 적용 지점을 고르고 @Before·@AfterReturning·@AfterThrowing·@After·@Around로 로직을 끼워 넣는 법을, 실행 순서와 프록시 원리까지 정리한다."
pubDate: 2026-08-08
category: backend
parent: request-flow-filter-interceptor-aop
---

[요청 흐름 글](/blog/request-flow-filter-interceptor-aop/)에서 AOP가 **메서드 실행 앞뒤에 공통 로직을 끼워 넣는 가장 안쪽 층**이라고 했다. `@Transactional`이 사실 AOP라는 것도 봤다. 그런데 막상 직접 AOP를 짜려면 `@Aspect`, `@Around`, `@Before`, `@Pointcut`… 애노테이션이 우수수 쏟아진다. **이것들이 각각 뭐고, 언제 뭘 쓰는지** 정리해 보자.

## AOP가 풀려는 문제 — 횡단 관심사

로깅·트랜잭션·성능 측정 같은 건 **거의 모든 메서드에 공통으로** 필요하다. 그런데 이걸 메서드마다 직접 적으면 이렇게 된다.

```java
public void order() {
    log.info("start");           // 로깅
    long t = System.nanoTime();  // 시간 측정
    // ... 진짜 주문 로직 (딱 이거만 하고 싶은데)
    log.info("end " + (System.nanoTime() - t));
}
```

진짜 하고 싶은 건 "주문 로직" 한 줄인데, 로깅·측정 코드가 **모든 메서드에 반복**된다. 이렇게 **핵심 로직을 가로질러(cross-cutting) 흩어지는 공통 관심사**를 **횡단 관심사(cross-cutting concern)**라 한다. AOP는 이걸 **한곳에 모아 두고, 필요한 메서드에 자동으로 끼워 넣는** 기술이다.

## 먼저 잡아야 할 5대 용어

애노테이션을 보기 전에 용어부터. 이 다섯이 AOP의 전부다.

| 용어 | 뜻 | 비유 |
|---|---|---|
| **Aspect** (관점) | 횡단 관심사를 모듈로 묶은 것 | "로깅 담당 부서" |
| **Join Point** (조인 포인트) | 로직을 끼워 넣을 수 있는 지점 | 스프링에선 **메서드 실행** |
| **Pointcut** (포인트컷) | 그중 **어디에** 적용할지 고르는 조건 | "서비스 계층 메서드만" |
| **Advice** (어드바이스) | 실제 끼워 넣을 로직 + **언제** | "실행 전에 로그 찍기" |
| **Weaving** (위빙) | Aspect를 실제 코드에 엮는 과정 | 스프링은 **런타임 프록시**로 |

한 문장으로 꿰면 — **Aspect(관점) 안에, Pointcut(어디)으로 고른 Join Point(메서드)에, Advice(무엇을 언제) 로직을 Weaving(엮는다).**

> 참고: 여기서 다루는 건 **스프링 AOP**다. 스프링 AOP의 Join Point는 **오직 메서드 실행**뿐이다. 필드 접근·생성자 호출까지 잡는 더 강력한 **AspectJ**도 있지만, 실무 대부분은 스프링 AOP로 충분하다.

## @Aspect — "이 클래스는 관점이다"

`@Aspect`는 이 클래스가 횡단 관심사를 담은 **Aspect**임을 선언한다. 스프링 빈이어야 동작하므로 `@Component`(또는 `@Bean` 등록)를 같이 붙인다.

```java
@Aspect
@Component
public class LoggingAspect {
    // 여기에 Pointcut과 Advice들이 들어간다
}
```

> 스프링 부트는 `spring-boot-starter-aop`만 있으면 `@EnableAspectJAutoProxy`가 자동으로 켜져, `@Aspect`를 알아서 인식한다.

## @Pointcut — "어디에 적용할지" 이름 붙여 재사용

`@Pointcut`은 **적용 지점(포인트컷)을 정의**한다. 빈 메서드에 표현식을 붙이는 게 특징인데, 이렇게 하면 **여러 Advice가 같은 조건을 이름으로 재사용**할 수 있다.

```java
@Pointcut("execution(* com.example.service..*(..))")
public void serviceLayer() {}   // 몸통은 비어 있다 — 이름표일 뿐
```

### 포인트컷 표현식 읽는 법

`execution`이 가장 많이 쓰인다. 문법은 이렇다.

```
execution( 반환타입  패키지.클래스.메서드(파라미터) )

execution(* com.example.service..*.*(..))
          │  └── com.example.service 하위 모든 클래스
          └── 반환타입 아무거나
                                    *(..) └── 모든 메서드, 파라미터 아무거나
```

- `*` — 아무거나 (반환타입·클래스·메서드명)
- `..` — 패키지면 "그 하위 전부", 파라미터면 "개수·타입 무관"

`execution` 말고도 지정자가 있다. 자주 쓰는 것만:

| 지정자 | 고르는 기준 |
|---|---|
| `execution(...)` | 메서드 시그니처 (제일 많이 씀) |
| `@annotation(...)` | **특정 애노테이션 붙은 메서드** (예: 커스텀 `@LogExecutionTime`) |
| `within(...)` | 특정 클래스·패키지 안 |
| `bean(...)` | 특정 빈 이름 |

## Advice 5종 — "언제" 끼워 넣나

여기가 핵심이다. **언제** 로직을 끼워 넣느냐에 따라 애노테이션이 나뉜다.

| 애노테이션 | 실행 시점 | 반환/예외 접근 |
|---|---|---|
| `@Before` | 메서드 실행 **직전** | — |
| `@AfterReturning` | **정상 반환 후** | 반환값 받을 수 있음 |
| `@AfterThrowing` | **예외 발생 후** | 예외 받을 수 있음 |
| `@After` | **끝난 후 무조건** (finally) | — |
| `@Around` | **실행 전+후 전부 감쌈** | 가장 강력 |

```java
@Aspect
@Component
public class LoggingAspect {

    @Pointcut("execution(* com.example.service..*(..))")
    public void serviceLayer() {}

    // 실행 직전
    @Before("serviceLayer()")
    public void before(JoinPoint jp) {
        System.out.println("[before] " + jp.getSignature());
    }

    // 정상 반환 후 — 반환값을 result로 받음
    @AfterReturning(pointcut = "serviceLayer()", returning = "result")
    public void afterReturning(JoinPoint jp, Object result) {
        System.out.println("[return] " + result);
    }

    // 예외 발생 후 — 예외를 ex로 받음
    @AfterThrowing(pointcut = "serviceLayer()", throwing = "ex")
    public void afterThrowing(JoinPoint jp, Exception ex) {
        System.out.println("[throw] " + ex.getMessage());
    }

    // 끝나면 무조건 (성공이든 예외든)
    @After("serviceLayer()")
    public void after(JoinPoint jp) {
        System.out.println("[after] " + jp.getSignature());
    }
}
```

### @Before·@After vs @Around의 결정적 차이

`@Before`·`@After` 계열은 **끼어들기만** 한다 — 메서드를 실행할지 말지, 결과를 바꿀지는 관여 못 한다. 인자로 받는 `JoinPoint`는 **정보 조회용**(어떤 메서드인지, 인자가 뭔지)일 뿐이다.

반면 **`@Around`는 메서드 실행 자체를 손에 쥔다.** `ProceedingJoinPoint.proceed()`를 **직접 호출해야** 원래 메서드가 실행되고, 그 앞뒤를 감싼다.

```java
@Around("serviceLayer()")
public Object around(ProceedingJoinPoint pjp) throws Throwable {
    long start = System.nanoTime();     // 실행 전
    Object result = pjp.proceed();      // ★ 여기서 원래 메서드 실행
    long took = System.nanoTime() - start;
    System.out.println("[took] " + took + "ns");  // 실행 후
    return result;                      // 반환값도 바꿀 수 있다
}
```

`@Around`는 **실행 여부·반환값·예외까지 전부 제어**할 수 있어 가장 강력하다. 그래서 트랜잭션(`@Transactional`)·재시도·캐싱처럼 "흐름을 통제"해야 하는 건 다 `@Around` 계열이다. 대신 강력한 만큼 `proceed()`를 빠뜨리면 **원래 메서드가 아예 안 돌아가는** 사고가 나므로 조심해야 한다.

> 규칙: **단순 조회·기록이면 @Before/@After, 흐름을 제어해야 하면 @Around.** 필요 이상으로 @Around를 쓰지 않는 게 깔끔하다.

## 실행 순서 — 양파처럼 감싼다

여러 Advice가 한 메서드에 걸리면, 순서는 이렇다.

```
[ @Around  시작 (proceed 전) ]
   [ @Before ]
      ▶ 실제 메서드 실행
   [ @AfterReturning  (정상) ]  또는  [ @AfterThrowing (예외) ]
   [ @After  (무조건) ]
[ @Around  끝 (proceed 후) ]
```

`@Around`가 가장 바깥에서 전체를 감싸고, 그 안에서 `@Before` → 메서드 → `@AfterReturning`/`@AfterThrowing` → `@After` 순으로 돈다. 들어갈 때 감싼 순서대로 나올 때 풀리는, **양파 껍질** 구조다. (Aspect가 여러 개면 `@Order`로 Aspect 간 우선순위를 준다.)

## 왜 자동으로 될까 — 프록시

원리는 [트랜잭션 글](/blog/transactional-spring/)에서 본 것과 같다. 스프링은 `@Aspect`가 가리키는 빈을 **프록시(대리 객체)로 감싸서**, 메서드 앞뒤에 Advice를 끼워 넣는다.

```
호출자 → [프록시] → (Advice 실행) → 진짜 메서드
```

우리가 부르는 건 사실 프록시고, 프록시가 Advice를 실행한 뒤 원래 메서드로 넘긴다. 그래서 **같은 클래스 안에서 자기 메서드를 직접 부르면(self-invocation) AOP가 안 먹는다** — 프록시를 거치지 않기 때문이다. `@Transactional`이 내부 호출에서 안 걸리는 그 함정과 **정확히 같은 이유**다.

## 정리

- **AOP** = 로깅·트랜잭션 같은 **횡단 관심사**를 한곳에 모아 자동으로 끼워 넣는 기술
- **5대 용어**: Aspect(관점)·Join Point(메서드 실행)·Pointcut(어디)·Advice(무엇을 언제)·Weaving(엮기)
- **`@Aspect`** — 이 클래스가 관점 (+`@Component`)
- **`@Pointcut`** — 적용 지점을 이름 붙여 재사용 (`execution`·`@annotation`…)
- **Advice 5종**:
  - `@Before` (전) · `@AfterReturning` (정상 후) · `@AfterThrowing` (예외 후) · `@After` (무조건 후) — **끼어들기만**
  - `@Around` — `proceed()`로 **흐름 자체를 제어** (가장 강력)
- **순서**: `@Around`가 감싸고, 그 안에서 `@Before` → 메서드 → `@After*`
- **원리**: 런타임 **프록시** — 그래서 self-invocation엔 안 걸림

`@Transactional` 한 줄을 쓰면서도 "이게 어떻게 자동으로 되지?" 싶던 게, AOP를 뜯어보면 풀린다. **관점을 선언하고(@Aspect), 지점을 고르고(@Pointcut), 시점을 정해(@Before·@Around) 로직을 끼운다** — 이 세 박자다. 나에게는 로깅 Aspect를 한 번 직접 만들어 본 뒤로, 스프링이 뒤에서 감춰 온 "프록시가 감싸는 그림"이 비로소 손에 잡혔다. 결국 여기서도 방향은 하나였다 — 흩어지는 공통의 수고를, 한곳에 모아 필요한 만큼 자동으로.
