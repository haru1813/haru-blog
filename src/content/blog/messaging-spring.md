---
title: 스프링 메시징 완전 정리 — Kafka·RabbitMQ 실전 연동 (프로듀서·컨슈머)
description: "미들웨어 글이 '도구가 뭔지'였다면, 이 글은 '스프링에서 실제로 메시지를 주고받는 코드'다. Spring Kafka(KafkaTemplate·@KafkaListener)와 Spring AMQP(RabbitTemplate·@RabbitListener)로 프로듀서·컨슈머를 짜는 법, 그리고 이게 왜 앱 내부 이벤트와 다른지 정리한다."
pubDate: 2026-08-08
category: backend
parent: caching-event-async
---

[미들웨어 글](/blog/caching-event-async-middleware/)에서 Kafka·RabbitMQ가 *"이벤트·비동기를 앱 간(분산)에서 해주는 도구"* 라고 했다. 이번엔 한 걸음 더 — **스프링에서 실제로 메시지를 주고받는 코드**를 본다. 도구 소개가 아니라 실전 연동이다.

## 왜 메시징인가 — 앱 내부 이벤트와 뭐가 다른가

[이벤트 글](/blog/event-handling-spring/)의 `@EventListener`는 **한 애플리케이션 안**에서만 돈다. 그런데 서비스가 여러 개로 쪼개지면(MSA), **다른 서버의 서비스**에 알림을 보내야 한다. 그때 **메시지 브로커**(Kafka·RabbitMQ)를 거친다.

```
앱 내부:   서비스A ──@EventListener──▶ 리스너 (같은 앱)
앱 간:     서비스A ──메시지──▶ [브로커] ──▶ 서비스B (다른 서버!)
```

메시징의 핵심 구조는 **프로듀서(발행) → 브로커(중개) → 컨슈머(구독)** 다. 발행자와 구독자가 **브로커를 사이에 두고 완전히 분리**되어, 서로의 존재를 몰라도 되고 심지어 서버가 달라도 된다.

## Spring Kafka — KafkaTemplate·@KafkaListener

Kafka는 `spring-kafka`로 붙인다. **`KafkaTemplate`으로 보내고, `@KafkaListener`로 받는다.**

```java
// 프로듀서 — 메시지 발행
@Service
@RequiredArgsConstructor
public class OrderProducer {
    private final KafkaTemplate<String, String> kafka;

    public void send(String orderId) {
        kafka.send("order-topic", orderId);   // "order-topic"에 발행
    }
}

// 컨슈머 — 메시지 구독 (다른 서비스일 수 있음)
@Component
public class OrderConsumer {
    @KafkaListener(topics = "order-topic", groupId = "email-service")
    public void handle(String orderId) {
        // 이메일 발송 등
    }
}
```

- **토픽(topic)** — 메시지가 쌓이는 채널 (`order-topic`)
- **컨슈머 그룹(groupId)** — 같은 그룹은 메시지를 나눠 처리, 다른 그룹은 각자 다 받음
- Kafka는 발행한 메시지를 **로그로 보관**해서, 컨슈머가 나중에 다시 읽거나 재처리할 수 있다

## Spring AMQP(RabbitMQ) — RabbitTemplate·@RabbitListener

RabbitMQ는 `spring-boot-starter-amqp`로 붙인다. 구조는 닮았다 — **`RabbitTemplate`으로 보내고, `@RabbitListener`로 받는다.**

```java
// 프로듀서
@Service
@RequiredArgsConstructor
public class OrderProducer {
    private final RabbitTemplate rabbit;

    public void send(String orderId) {
        rabbit.convertAndSend("order-queue", orderId);   // "order-queue"에 발행
    }
}

// 컨슈머
@Component
public class OrderConsumer {
    @RabbitListener(queues = "order-queue")
    public void handle(String orderId) {
        // 처리
    }
}
```

- **큐(queue)** — 메시지가 쌓이는 곳
- **익스체인지(exchange)** — 메시지를 어느 큐로 보낼지 정하는 라우팅 규칙 (RabbitMQ의 특징)
- RabbitMQ는 컨슈머가 꺼내 처리하면 큐에서 **사라진다**(Kafka는 보관) — 작업 큐에 적합

## Kafka vs RabbitMQ — 코드는 닮았지만 성격이 다르다

| | Spring Kafka | Spring AMQP(Rabbit) |
|---|---|---|
| 발행 | `KafkaTemplate.send` | `RabbitTemplate.convertAndSend` |
| 구독 | `@KafkaListener` | `@RabbitListener` |
| 채널 | **토픽** | **큐** + 익스체인지 |
| 메시지 | **로그로 보관**(재처리 가능) | 소비하면 **사라짐** |
| 강점 | 대용량 스트림·이벤트 소싱 | 정교한 라우팅·작업 큐 |

프로듀서/컨슈머라는 **뼈대는 똑같다.** 차이는 [미들웨어 글](/blog/caching-event-async-middleware/)에서 본 그대로 — Kafka는 "이벤트의 강"(보관·재처리), Rabbit은 "작업의 우체국"(소비·라우팅)이다.

## 메시징이 주는 것 — 세 가지

메시지 브로커를 거치면 이런 이점이 생긴다.

- **비동기** — 프로듀서는 보내고 바로 끝, 컨슈머가 알아서 처리 ([비동기](/blog/caching-event-async/))
- **결합도 분리** — 발행자와 구독자가 서로를 모름, 서버가 달라도 됨 ([이벤트](/blog/caching-event-async/))
- **완충(buffering)** — 트래픽이 몰려도 브로커에 쌓아두고 컨슈머가 처리 가능한 만큼 꺼냄 (부하 분산)

특히 **완충**이 메시징의 진짜 매력이다. 주문이 초당 1만 건 몰려도, 브로커가 받아 쌓아두고 컨슈머가 감당 가능한 속도로 처리한다. 앱 내부 이벤트론 못 하는 일이다.

## 정리

- **구조**: 프로듀서(발행) → **브로커** → 컨슈머(구독) — 앱 간(분산)에서 동작
- **Spring Kafka**: `KafkaTemplate.send` + `@KafkaListener(topics)` — 토픽, 메시지 보관·재처리
- **Spring AMQP**: `RabbitTemplate.convertAndSend` + `@RabbitListener(queues)` — 큐+익스체인지, 소비 시 삭제
- **뼈대는 같고**(프로듀서/컨슈머), 성격이 다름 — Kafka(스트림) vs Rabbit(작업 큐)
- **주는 것**: 비동기 + 결합도 분리 + **완충**(부하 분산)

[앱 내부 이벤트](/blog/event-handling-spring/)가 *"한 앱 안에서 발행-구독"* 이라면, 메시징은 그걸 **서버 경계 밖으로 확장**한 것이다. 코드 모양(`send`/`@Listener`)은 놀랍도록 닮았지만, 그 사이에 **브로커가 끼면서 서버가 달라도, 트래픽이 몰려도** 되는 시스템이 된다. 나에게는 이 "완충" 개념을 이해한 뒤로, 왜 큰 서비스들이 메시지 큐를 쓰는지가 비로소 보였다. 결국 여기서도 방향은 하나였다 — 앱 안에서 떼어낸 발행-구독을, 앱 밖까지 넓혀 필요한 만큼 흘려보낸다.
