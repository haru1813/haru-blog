---
title: 스프링 부트 로깅 — println을 넘어, SLF4J와 Logback
description: "System.out.println으로 확인하던 걸 실무 로깅으로. SLF4J(인터페이스)와 Logback(구현)의 분리, 로그 레벨(TRACE~ERROR)과 환경별 설정, @Slf4j와 파라미터 바인딩({}), 파일 저장·롤링까지 정리한다."
pubDate: 2026-08-08
category: backend
---

코드가 잘 도는지 확인할 때 `System.out.println`을 찍곤 한다. [JUnit 글](/blog/junit-testing/)에서 "그걸 테스트로 자동화한다"고 했는데, 실행 중의 기록을 남기는 쪽은 **로깅(logging)**이 맡는다. *"언제 무슨 요청이 왔고, 뭘 처리했고, 어디서 터졌는지"* 를 남겨 문제를 추적하는 것. `println`과 뭐가 다르고, 어떻게 쓰는지 정리한다.

## println은 왜 실무에서 안 쓰나

`System.out.println`도 화면에 찍히긴 한다. 그런데 운영에선 문제가 많다.

```java
System.out.println("주문 처리: " + userId);   // 이게 왜 문제냐면
```

- **끄고 켤 수가 없다** — 개발 때 찍던 게 운영에서도 그대로 다 찍힌다
- **중요도 구분이 없다** — 사소한 정보와 심각한 에러가 똑같이 나온다
- **파일로 안 남는다** — 서버 재시작하면 사라진다
- **느리다** — `println`은 동기 방식이라 성능에도 안 좋다

로깅 프레임워크는 이걸 다 해결한다 — **레벨로 끄고 켜고, 파일로 저장하고, 포맷을 붙인다.**

## 구조 — SLF4J(인터페이스) + Logback(구현)

여기서 [JPA 글](/blog/db-access-jdbc-to-jpa/)에서 본 **"명세와 구현의 분리"** 패턴이 또 나온다.

```
SLF4J      ← 로깅 "인터페이스" (표준 명세)
   ▲
   │ 구현
Logback    ← 실제 동작하는 "구현체" (스프링 부트 기본)
```

- **SLF4J**(Simple Logging Facade for Java) — 로깅 **인터페이스**. 우리 코드는 이것만 바라본다
- **Logback** — SLF4J의 **구현체**. 실제로 로그를 찍는 엔진. 스프링 부트 기본이다
- (대안 구현으로 Log4j2도 있다 — SLF4J를 쓰면 구현만 갈아끼울 수 있다)

JPA에서 *"JPA(명세)를 바라보면 Hibernate(구현)를 갈아끼울 수 있다"* 고 했던 것과 **똑같은 구조**다. 우리는 SLF4J로 코드를 짜고, 뒤에서 Logback이 돈다. 스프링 부트 스타터에 **이미 다 들어있어서** 따로 설정 없이 바로 쓴다.

## 로그 레벨 — 중요도로 끄고 켠다

로깅의 핵심은 **레벨**이다. 낮은 것부터 높은 것까지 5단계다.

| 레벨 | 용도 | 예 |
|---|---|---|
| `TRACE` | 가장 상세 (거의 안 씀) | 변수 하나하나 |
| `DEBUG` | 개발용 상세 | "여기 값 뭐냐" |
| `INFO` | 주요 흐름 (운영 기록) | "주문 생성됨" |
| `WARN` | 경고 (문제 가능성) | "재시도 3회째" |
| `ERROR` | 심각한 오류 | "결제 실패" |

**설정한 레벨 이상만 출력**된다. 그래서 환경별로 다르게 준다.

```
개발 → DEBUG (자세히 보고 싶으니 DEBUG 이상 다)
운영 → INFO  (INFO 이상만, DEBUG는 안 나옴 → 로그 폭주 방지)
```

같은 코드라도 **운영에선 DEBUG 로그가 자동으로 꺼진다.** `println`은 이게 안 됐다. 이게 로깅의 제일 큰 힘이다.

## 사용법 — @Slf4j + 파라미터 바인딩

Logger를 직접 선언할 수도 있지만, [롬복](/blog/lombok/)의 `@Slf4j`를 붙이면 `log` 변수가 자동 생성된다.

```java
@Slf4j          // 롬복이 log 필드를 만들어 줌
@Service
public class OrderService {
    public void order(Long userId) {
        log.info("주문 시작: userId={}", userId);   // INFO
        log.debug("상세 상태: {}", someState);       // DEBUG (운영에선 안 나옴)
        try {
            // ...
        } catch (Exception e) {
            log.error("주문 실패: userId={}", userId, e);   // 예외까지 넘기면 스택트레이스
        }
    }
}
```

### `{}` 파라미터 바인딩 — 문자열 연결(+)을 쓰지 마라

`log.info("user=" + userId)` 처럼 **문자열을 `+`로 잇지 말고**, `{}`에 값을 넘긴다. 이유가 있다.

```java
log.debug("user=" + userId);    // ❌ + 연결은 DEBUG가 꺼져 있어도 "항상" 문자열을 만든다 (낭비)
log.debug("user={}", userId);   // ✅ DEBUG가 켜질 때만 조합 (지연 평가 → 성능)
```

`{}` 방식은 **로그가 실제로 찍힐 때만** 문자열을 조립한다. 운영에서 DEBUG가 꺼져 있으면 조립 자체를 건너뛰어 빠르다. 예외는 **마지막 인자로 그냥 넘기면**(`, e`) 스택트레이스가 자동으로 붙는다.

## 설정 — 레벨과 파일 저장

간단한 레벨 조정은 `application.yml`로 한다.

```yaml
logging:
  level:
    root: INFO                          # 기본 INFO
    com.haru.order: DEBUG               # 이 패키지만 DEBUG
```

파일 저장·롤링(날짜별 분리)·포맷 같은 세밀한 건 `logback-spring.xml`로 한다.

```xml
<!-- 콘솔 + 날짜별 파일, 30일 보관 예시 (개념만) -->
<appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
    <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
        <fileNamePattern>logs/app.%d{yyyy-MM-dd}.log</fileNamePattern>
        <maxHistory>30</maxHistory>
    </rollingPolicy>
</appender>
```

- **Appender** — 로그를 "어디에" 쓸지 (콘솔·파일·외부 시스템)
- **RollingPolicy** — 날짜/크기별로 파일을 나누고 오래된 건 삭제

## 실무 팁

- **민감정보 로깅 금지** — 비밀번호·주민번호·카드번호를 로그에 찍으면 사고다
- **적정 레벨** — 정상 흐름은 `INFO`, 개발 확인용은 `DEBUG`, 잡은 예외는 상황에 따라 `WARN`/`ERROR`
- **예외는 메시지+객체로** — `log.error("실패", e)` (문자열에 `e.getMessage()`만 넣으면 스택트레이스를 잃는다)
- **요청 로깅은 인터셉터에서** — 모든 요청 공통이니, [인터셉터](/blog/interceptor-details/)의 `preHandle`/`afterCompletion`에 두면 깔끔하다

## 정리

- **println 대신 로깅** — 레벨로 끄고 켜고, 파일 저장, 포맷, 성능
- **구조**: `SLF4J`(인터페이스) + `Logback`(구현) — [JPA](/blog/db-access-jdbc-to-jpa/)의 명세/구현 분리와 같은 패턴, 스프링 부트 기본
- **레벨**: `TRACE`<`DEBUG`<`INFO`<`WARN`<`ERROR` — 설정 이상만 출력 (개발 DEBUG / 운영 INFO)
- **사용**: `@Slf4j` + `log.info("user={}", id)` — `+` 연결 말고 `{}` (지연 평가), 예외는 마지막 인자로
- **설정**: `application.yml`(레벨) / `logback-spring.xml`(파일·롤링)

로깅은 개발할 땐 대수롭지 않아 보이는데, **장애가 터지면 생명줄**이 된다. *"이 요청이 어디서 왜 터졌나"* 를 알려주는 게 로그니까. 나에게는 `println`을 `log.info`로 바꾸고 레벨을 나눈 뒤로, 운영과 개발에서 보이는 정보가 깔끔하게 갈리기 시작했다. 결국 여기서도 방향은 하나였다 — 실행 중에 손으로 확인하던 수고를, 레벨과 파일로 나눠 필요한 만큼 자동으로 남긴다.

> 이 로그에 요청별 **traceId**를 심으면 여러 계층·서버를 거친 로그를 하나로 묶어 추적할 수 있고, **MDC**가 그걸 자동화한다 — 이건 필요할 때 따로 파보면 좋다.
