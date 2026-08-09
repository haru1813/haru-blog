---
title: 스프링 이벤트 처리 완전 정리 — ApplicationEvent·@EventListener·@TransactionalEventListener
description: "앱 내부의 이벤트 처리를 깊게. 이벤트 발행(ApplicationEventPublisher)과 구독(@EventListener), 동기가 기본이고 @Async로 비동기가 되는 것, 트랜잭션 커밋 후에만 실행하는 @TransactionalEventListener, 순서(@Order)까지 정리한다."
pubDate: 2026-08-08
category: backend
parent: caching-event-async
---

[개념 글](/blog/caching-event-async/)에서 이벤트가 *"발생을 알려 느슨하게 연결"* 하는 것이라 했다. 이번엔 **앱 내부의 스프링 이벤트**를 실전으로 정리한다. 발행·구독부터, 동기/비동기, 그리고 실무에서 꼭 만나는 `@TransactionalEventListener`까지.

## 기본 — 이벤트 발행과 구독

이벤트는 **① 이벤트 객체 → ② 발행 → ③ 구독** 세 조각이다.

```java
// ① 이벤트 객체 (그냥 데이터를 담은 클래스, record면 깔끔)
public record OrderCreatedEvent(Long orderId) {}

// ② 발행 — ApplicationEventPublisher 주입해서 publishEvent
@Service
@RequiredArgsConstructor
public class OrderService {
    private final ApplicationEventPublisher publisher;

    public void order() {
        // ... 주문 저장
        publisher.publishEvent(new OrderCreatedEvent(orderId));   // 발행
    }
}

// ③ 구독 — @EventListener
@Component
public class OrderEventHandler {
    @EventListener
    public void sendEmail(OrderCreatedEvent e) {
        // 이메일 발송
    }
    @EventListener
    public void reduceStock(OrderCreatedEvent e) {
        // 재고 차감
    }
}
```

`OrderService`는 이메일·재고의 **존재조차 모른다.** 이벤트만 던지고, 반응은 각 리스너가 알아서 한다. 리스너를 추가·삭제해도 발행 코드는 그대로다 — 이게 [개념 글](/blog/caching-event-async/)에서 말한 **결합도 분리**다.

## 이벤트는 기본이 "동기"다

여기서 오해하기 쉽다. **`@EventListener`는 기본이 동기**다. 발행하면 **그 자리에서, 같은 스레드로** 리스너가 실행되고, 끝나야 발행 지점으로 돌아온다.

```
publishEvent() 호출
   ▼ (같은 스레드)
sendEmail() 실행 → 끝
reduceStock() 실행 → 끝
   ▼
publishEvent() 다음 줄로 복귀   ← 리스너가 다 끝난 뒤에야
```

즉 이벤트를 쓴다고 저절로 비동기가 되는 게 아니다. **이벤트 = 통신 구조**일 뿐, 실행은 여전히 동기다.

## 비동기로 만들려면 — @Async

리스너를 별도 스레드에서 돌리려면 [`@Async`](/blog/caching-event-async/)를 붙인다. (메인 클래스에 `@EnableAsync` 필요)

```java
@Async                        // 이 리스너는 딴 스레드에서
@EventListener
public void sendEmail(OrderCreatedEvent e) {
    // 3초 걸려도 발행 지점은 안 기다림
}
```

이제 발행 지점은 이메일을 기다리지 않고 바로 다음으로 간다. **이벤트(통신) + 비동기(실행)를 조합**한 것이다. 둘이 별개 축이라 이렇게 따로 켤 수 있다.

## 실무 필수 — @TransactionalEventListener

여기가 실무에서 제일 중요하다. 문제 상황을 보자.

```java
@Transactional
public void order() {
    orderRepository.save(order);
    publisher.publishEvent(new OrderCreatedEvent(orderId));  // 이메일 발송
    // ... 여기서 예외가 나면? 주문은 롤백되는데 이메일은 이미 나갔다! 😱
}
```

기본 `@EventListener`는 발행 즉시 실행돼서, **트랜잭션이 롤백돼도 이메일은 이미 발송**된다. 주문은 취소됐는데 "주문 완료" 메일이 가는 사고다.

**`@TransactionalEventListener`**는 이걸 막는다. **트랜잭션이 커밋된 후에만** 리스너를 실행한다.

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void sendEmail(OrderCreatedEvent e) {
    // 주문이 "확실히 커밋된 후"에만 실행 → 롤백되면 이메일 안 나감
}
```

- `AFTER_COMMIT` (기본) — 커밋 성공 후에만 (가장 많이 씀)
- `AFTER_ROLLBACK` / `AFTER_COMPLETION` / `BEFORE_COMMIT` 도 있음

*"DB에 확실히 저장된 뒤에 후속 작업(메일·알림)을 하라"* — 이 안전장치가 `@TransactionalEventListener`다. [`@Transactional`](/blog/transactional-spring/)과 짝을 이룬다.

## 여러 리스너의 순서 — @Order

한 이벤트에 리스너가 여럿이면 순서가 필요할 때가 있다. `@Order`로 준다(숫자가 작을수록 먼저).

```java
@Order(1) @EventListener public void first(OrderCreatedEvent e) {}
@Order(2) @EventListener public void second(OrderCreatedEvent e) {}
```

## 스프링이 원래 쓰던 이벤트

사실 이벤트는 스프링 내부에서 원래 쓰던 메커니즘이다. `ApplicationContext`가 뜨고 지는 순간들도 이벤트다.

- `ContextRefreshedEvent` — 컨텍스트 초기화 완료
- `ApplicationReadyEvent` — 앱이 완전히 준비됨 (부트)

우리가 만든 커스텀 이벤트도 이 **같은 이벤트 시스템**을 타는 것이다.

## 정리

- **발행**(`ApplicationEventPublisher.publishEvent`) → **구독**(`@EventListener`) — 발행자는 구독자를 모름(결합도 분리)
- **기본은 동기** — 이벤트 쓴다고 비동기 아님. 실행은 같은 스레드
- **비동기는 `@Async`** — 이벤트(통신) + 비동기(실행)를 조합
- **`@TransactionalEventListener`** — 트랜잭션 **커밋 후에만** 실행 (롤백 시 후속작업 방지) ← 실무 필수
- **순서는 `@Order`**

이벤트를 쓰면 코드가 *"주문 → 이메일 → 재고"* 로 줄줄이 엮이는 대신, *"주문했다"* 는 사실만 던지고 나머지가 각자 반응한다. 나에게는 `@TransactionalEventListener`를 알고 나서야 이벤트를 안심하고 쓸 수 있게 됐다 — "커밋된 다음에만"이라는 보장이 있어야 후속 작업을 맡길 수 있으니까. 결국 여기서도 방향은 하나였다 — 직접 부르며 엮이던 수고를, 발행과 구독으로 떼어낸다.
