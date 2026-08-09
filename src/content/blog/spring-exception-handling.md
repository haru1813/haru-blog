---
title: 스프링 부트 예외 처리 — @ExceptionHandler·@RestControllerAdvice로 에러를 다루는 법
description: "컨트롤러에서 예외가 터지면 무슨 일이 벌어지나. 스프링 부트의 기본 에러 처리부터, @ExceptionHandler(개별)·@RestControllerAdvice(전역)·@ResponseStatus, 일관된 에러 응답 만들기, 그리고 이게 AOP가 아니라 HandlerExceptionResolver로 도는 이유까지 정리한다."
pubDate: 2026-08-08
category: backend
parent: data-flow-dto-entity-domain
---

컨트롤러를 짜다 보면 반드시 만난다. **"예외가 터지면, 클라이언트한테 뭐가 나가지?"** [검증 글](/blog/validation-valid-bean-validation/)에서 `@Valid`가 실패하면 예외가 난다고 했는데, 그 예외를 어떻게 **일관된 에러 응답**으로 바꾸는지가 이번 주제다. try-catch를 컨트롤러마다 도배하지 않고 처리하는 법을 정리한다.

## 아무것도 안 하면 — 스프링 부트 기본 에러

컨트롤러에서 예외가 터지고 아무 처리도 안 하면, 스프링 부트가 **기본 에러 처리**를 해준다.

- 브라우저 요청 → **Whitelabel Error Page**(허연 기본 에러 화면)
- API 요청(JSON) → 이런 기본 JSON

```json
{
  "timestamp": "2026-08-08T10:00:00.000+00:00",
  "status": 500,
  "error": "Internal Server Error",
  "path": "/api/orders/999"
}
```

이건 스프링 부트의 **`BasicErrorController`**가 `/error` 경로에서 만들어 주는 거다. 동작은 하지만 — 에러 포맷을 우리 마음대로 못 바꾸고, 상태코드도 뭉뚱그려진다. 그래서 직접 다뤄야 한다.

## @ExceptionHandler — 이 컨트롤러의 예외를 잡는다

`@ExceptionHandler`는 **특정 예외가 나면 실행할 메서드**를 지정한다. 컨트롤러 안에 두면 **그 컨트롤러에서 난 예외**를 잡는다.

```java
@RestController
public class OrderController {

    @GetMapping("/orders/{id}")
    public OrderResponse get(@PathVariable Long id) {
        return orderService.find(id);   // 없으면 OrderNotFoundException 던짐
    }

    // 이 컨트롤러에서 OrderNotFoundException이 나면 여기로
    @ExceptionHandler(OrderNotFoundException.class)
    public ResponseEntity<ErrorResponse> handle(OrderNotFoundException e) {
        ErrorResponse body = new ErrorResponse("ORDER_NOT_FOUND", e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);   // 404
    }
}
```

`try-catch`를 컨트롤러 메서드 안에 쓰지 않아도, **예외 종류별로 처리 메서드를 선언**해 두면 스프링이 알아서 연결해 준다. 문제는 — 이렇게 두면 **그 컨트롤러에서만** 동작한다는 것. 컨트롤러가 열 개면 열 개에 다 적어야 한다.

## @RestControllerAdvice — 전역으로 한곳에서

그래서 나온 게 **`@RestControllerAdvice`**다. 여기에 `@ExceptionHandler`를 모아 두면 **모든 컨트롤러의 예외를 한곳에서** 처리한다.

```java
@RestControllerAdvice     // = @ControllerAdvice + @ResponseBody
public class GlobalExceptionHandler {

    // 404 — 없는 리소스
    @ExceptionHandler(OrderNotFoundException.class)
    public ResponseEntity<ErrorResponse> notFound(OrderNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("NOT_FOUND", e.getMessage()));
    }

    // 400 — 잘못된 요청
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> badRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest()
                .body(new ErrorResponse("BAD_REQUEST", e.getMessage()));
    }

    // 500 — 예상 못 한 나머지 전부 (맨 아래 안전망)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> etc(Exception e) {
        return ResponseEntity.internalServerError()
                .body(new ErrorResponse("INTERNAL_ERROR", "잠시 후 다시 시도해 주세요."));
    }
}
```

**`@RestControllerAdvice` = `@ControllerAdvice` + `@ResponseBody`**다. 그래서 반환한 객체가 자동으로 JSON이 된다([요청과 응답 글](/blog/request-response-body/)의 그 `@ResponseBody`다). 이제 컨트롤러들은 **비즈니스 로직만** 갖고, 예외 처리는 이 한 클래스가 전담한다.

`ErrorResponse`는 그냥 우리가 정한 **에러 응답 DTO**다.

```java
public record ErrorResponse(String code, String message) {}
```

이렇게 포맷을 고정하면, 클라이언트는 **어떤 에러든 같은 모양**(`code`·`message`)으로 받는다. 프론트가 처리하기 훨씬 쉬워진다.

## @ResponseStatus — 상태코드만 간단히

에러 응답 바디까지는 필요 없고 **상태코드만** 바꾸고 싶으면 `@ResponseStatus`가 간단하다. 예외 클래스에 직접 붙일 수 있다.

```java
@ResponseStatus(HttpStatus.NOT_FOUND)   // 이 예외 = 404
public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(String msg) { super(msg); }
}
```

이러면 이 예외가 터지는 순간 **자동으로 404**가 나간다. `@ExceptionHandler`를 따로 안 써도 된다.

- **`@ResponseStatus`** — 상태코드만 간단히 (바디 제어 X)
- **`ResponseEntity`** — 상태코드 + **바디까지** 세밀하게

## 검증 실패 예외 잡기 (validation과 연결)

[검증 글](/blog/validation-valid-bean-validation/)에서 `@Valid`가 실패하면 예외가 난다고 했다. 그 예외 이름이 **`MethodArgumentNotValidException`**이다. 이것도 `@RestControllerAdvice`에서 잡아 **어떤 필드가 왜 틀렸는지** 예쁘게 내려줄 수 있다.

```java
@ExceptionHandler(MethodArgumentNotValidException.class)
public ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException e) {
    String msg = e.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .collect(Collectors.joining(", "));   // "email: 형식 오류, name: 필수"
    return ResponseEntity.badRequest()
            .body(new ErrorResponse("VALIDATION_ERROR", msg));
}
```

이제 검증이 터져도 whitelabel이 아니라 **"어느 필드가 왜 틀렸는지"** 가 일관된 포맷으로 나간다.

> 참고: 검증 예외는 종류가 몇 개 있다. `@RequestBody`+`@Valid` 실패는 `MethodArgumentNotValidException`, `@ModelAttribute` 폼 검증은 `BindException`, `@Validated`를 파라미터에 쓴 경우는 `ConstraintViolationException`이다. 스프링 MVC 표준 예외를 한 번에 다루려면 `ResponseEntityExceptionHandler`를 상속하는 방법도 있다.

## 이건 AOP가 아니다 — HandlerExceptionResolver

여기서 헷갈리기 쉬운 지점. `@ExceptionHandler`가 `@Transactional`처럼 **AOP(프록시)로 도는 걸까?** **아니다.** [AOP 글](/blog/aop-annotations/)의 프록시와는 **다른 메커니즘**이다.

```
컨트롤러에서 예외 발생
        │
        ▼
[ DispatcherServlet ]  ← 예외를 붙잡는다
        │
        ▼
[ HandlerExceptionResolver ]  ← "이 예외 처리할 사람?"
        │
        ▼
[ ExceptionHandlerExceptionResolver ]
        │  @ExceptionHandler / @RestControllerAdvice 를 찾아 실행
        ▼
    에러 응답 생성
```

컨트롤러에서 예외가 올라오면, **`DispatcherServlet`이 그걸 잡아** `HandlerExceptionResolver`에게 넘긴다. 그중 **`ExceptionHandlerExceptionResolver`**가 우리가 만든 `@ExceptionHandler`·`@RestControllerAdvice`를 찾아 실행한다. 즉 **DispatcherServlet 레벨의 예외 처리 흐름**이지, 프록시가 감싸는 AOP가 아니다.

이 차이가 실무에서 중요하다. AOP는 self-invocation(내부 호출)에서 안 걸리는 함정이 있었지만, 예외 처리는 **예외가 컨트롤러 밖으로 전파되기만 하면** 잡힌다. 서비스 계층에서 던진 예외도, 컨트롤러를 뚫고 DispatcherServlet까지 올라오면 `@RestControllerAdvice`가 잡아 준다. **"예외를 던지기만 하면, 처리는 전역에서"** 가 되는 이유다.

## 정리

- **기본**: 아무 처리 안 하면 스프링 부트가 Whitelabel/기본 JSON (`BasicErrorController`, `/error`) — 포맷 제어 안 됨
- **`@ExceptionHandler`**: 특정 예외 처리 메서드. 컨트롤러 안에 두면 그 컨트롤러만
- **`@RestControllerAdvice`**(= `@ControllerAdvice` + `@ResponseBody`): **전역** 예외 처리 한곳에서
- **`@ResponseStatus`**: 상태코드만 간단히 / **`ResponseEntity`**: 상태코드 + 바디까지
- **검증 예외**: `MethodArgumentNotValidException` 등을 잡아 필드별 메시지로
- **원리**: AOP가 **아니다**. `DispatcherServlet` → `HandlerExceptionResolver` → `ExceptionHandlerExceptionResolver`

핵심은 — 예외 처리를 **컨트롤러 밖으로 몰아내는** 것이다. 각 컨트롤러는 `throw`만 하고, "무슨 에러를 어떤 상태코드·포맷으로 내릴지"는 `@RestControllerAdvice` 한곳이 책임진다. 나에게는 `try-catch`로 도배됐던 컨트롤러가, 전역 핸들러 하나로 깔끔해지던 순간이 인상 깊었다. 결국 여기서도 방향은 하나였다 — 흩어지는 예외 처리를, 한곳에 모아 일관되게.
