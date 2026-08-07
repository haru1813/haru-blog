---
title: 의존성 주입(DI)의 여러 방법 — @Autowired 너머 @Qualifier·@Primary까지
description: "DI는 @Autowired 하나가 아니다. 주입 위치(생성자·필드·세터)부터 @Resource·@Inject의 차이, 같은 타입 빈이 여럿일 때 쓰는 @Qualifier·@Primary, 그리고 실무 표준인 롬복 조합까지 정리한다."
pubDate: 2026-08-07
category: backend
parent: ioc-di-bean-registration
---

[IoC와 DI 글](/blog/ioc-di-bean-registration/)에서 "컨테이너가 의존을 주입한다"고 했다. 그 주입을 실제로 지시하는 애노테이션이 `@Autowired`인데 — 사실 DI는 `@Autowired` 하나가 전부가 아니다. 주입에는 여러 방법과 도구가 있고, 각각 쓰임새가 다르다. 두 축으로 나눠 보면 깔끔하다.

## 축 1 — 주입 "위치" (어디에 넣나)

의존을 객체의 어느 지점으로 넣느냐에 따라 세 가지다.

```java
// ① 생성자 주입 (권장)
public OrderService(OrderRepository repo) { this.repo = repo; }

// ② 필드 주입
@Autowired private OrderRepository repo;

// ③ 세터 주입
@Autowired public void setRepo(OrderRepository repo) { this.repo = repo; }
```

**생성자 주입이 정석**이다. `final`로 불변을 보장하고, 의존 관계가 생성자 시그니처에 명확히 드러나며, 테스트할 때 가짜 객체를 넣기 쉽다. 생성자가 하나면 `@Autowired`도 생략할 수 있다.

## 축 2 — 주입 "방식" (무엇으로 지정하나)

`@Autowired` 말고도 주입을 지시하는 애노테이션이 여럿이다.

| 방식 | 출신 | 기준 | 특징 |
|---|---|---|---|
| `@Autowired` | 스프링 | **타입** | 가장 일반적 |
| 생성자 자동 주입 | 스프링 | 타입 | 생성자 1개면 `@Autowired` 생략 |
| `@Resource` | 자바 표준(JSR-250) | **이름** | 이름으로 먼저 찾음 |
| `@Inject` | 자바 표준(JSR-330) | 타입 | `@Autowired`와 유사, 별도 의존성 필요 |
| `@Value` | 스프링 | 값 | 빈이 아니라 **설정값** 주입 |

### @Autowired vs @Resource vs @Inject

셋이 비슷해 보이지만 **"타입이냐 이름이냐"**로 갈린다.

```java
@Autowired private OrderRepository repo;                    // 스프링, 타입으로
@Inject    private OrderRepository repo;                    // 자바 표준, 타입으로
@Resource(name = "orderRepo") private OrderRepository repo; // 자바 표준, 이름으로
```

- **`@Autowired` / `@Inject`** → **타입** 기준. 같은 타입 빈이 하나면 딱 맞는다.
- **`@Resource`** → **이름** 기준. 빈 이름으로 먼저 매칭한다.
- `@Autowired`는 스프링 전용이고, `@Inject`·`@Resource`는 자바 표준이라 다른 DI 프레임워크에서도 통한다. 실무에서는 스프링을 쓰니 대개 `@Autowired`(또는 생성자 주입)로 충분하다.

## 같은 타입 빈이 여러 개일 때 — @Qualifier·@Primary

`@Autowired`는 타입으로 찾는데, **같은 타입 빈이 2개 이상이면** 어느 걸 넣을지 몰라 에러가 난다(`NoUniqueBeanDefinitionException`). 실무에서 자주 만나는 상황이다. 해결책이 두 가지다.

```java
// 후보가 둘 — 같은 인터페이스의 두 구현
@Component("kakaoPay") class KakaoPay implements Payment { }
@Component("naverPay") class NaverPay implements Payment { }
```

**① `@Qualifier` — 이름으로 콕 집어서 선택**

```java
public OrderService(@Qualifier("kakaoPay") Payment payment) { ... }
```

**② `@Primary` — 기본으로 쓸 빈에 표시**

```java
@Primary
@Component
class KakaoPay implements Payment { }   // 지정 없으면 얘가 기본
```

- `@Qualifier`는 **주입받는 쪽**에서 "이 이름 빈을 달라"고 콕 집는다.
- `@Primary`는 **빈 정의 쪽**에서 "후보가 여럿이면 나를 우선"이라고 표시한다.
- 둘 다 있으면 `@Qualifier`가 이긴다(더 구체적인 지정이 우선).

## 값 주입 — @Value

빈(객체)이 아니라 **설정값**을 넣을 때는 `@Value`를 쓴다.

```java
@Value("${server.port}")      // application.properties의 값
private int port;

@Value("${app.name:기본값}")   // 없으면 기본값
private String appName;
```

객체 의존이 아니라 프로퍼티·환경설정 값을 주입한다는 점에서 결이 다르지만, "외부에서 값을 넣어 준다"는 DI의 정신은 같다.

## 실무 표준 — 생성자 주입 + 롬복

요즘 실무에서 제일 흔한 조합이다.

```java
@Service
@RequiredArgsConstructor   // 롬복이 final 필드로 생성자 자동 생성
public class OrderService {
    private final OrderRepository repository;   // @Autowired 없이 주입됨
    private final PaymentService payment;
}
```

롬복의 `@RequiredArgsConstructor`가 `final` 필드들을 받는 **생성자를 자동으로 만들어 주고**, 생성자가 하나라 스프링이 자동 주입한다. `@Autowired`도 생성자 코드도 안 보이지만, 뒤에서는 **생성자 주입**이 일어난다. 코드가 간결해져서 사실상 표준처럼 쓰인다.

## 정리

- **주입 위치**: 생성자(권장) / 필드 / 세터
- **주입 방식**: `@Autowired`(스프링·타입), `@Resource`(표준·이름), `@Inject`(표준·타입), 생성자 자동주입
- **빈 선택**: `@Qualifier`(주입받는 쪽에서 이름 지정), `@Primary`(빈 정의 쪽에서 우선 표시) — 같은 타입 여럿일 때
- **값 주입**: `@Value` (객체가 아니라 설정값)
- **실무 표준**: 생성자 주입 + 롬복 `@RequiredArgsConstructor`

핵심은 이것이다 — **대부분 `@Autowired`(또는 생성자 주입)로 끝난다.** 나머지(`@Qualifier`·`@Primary`·`@Resource`)는 *"같은 타입 빈이 여러 개"*라는 특수 상황에서 꺼내 쓰는 도구다. 그러니 통째로 외우기보다, *"타입으로 안 되면 이름으로 지정하는 장치가 있다"*로 잡아 두면 된다. 여기서도 방향은 같다 — 개발자는 *"무엇이 필요한지"*만 선언하고, 조립은 컨테이너에 맡긴다.
