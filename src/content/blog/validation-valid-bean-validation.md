---
title: 입력 검증 — @Valid와 Bean Validation
description: "요청 데이터가 규칙에 맞는지 어떻게 확인할까. @NotBlank·@Size 같은 Bean Validation 애노테이션과, 그 검증을 실행시키는 @Valid, 그리고 실패를 처리하는 방법까지 정리한다."
pubDate: 2026-08-07
category: backend
parent: data-flow-dto-entity-domain
---

[데이터의 여정](/blog/data-flow-dto-entity-domain/)에서 봤듯, 요청은 `Request DTO`로 받은 뒤 **두 번째 관문인 검증**을 거친다. 클라이언트가 보낸 데이터를 곧이곧대로 믿고 처리하면 위험하다. 이 관문을 지키는 게 `@Valid`와 **Bean Validation**이다.

## 왜 검증이 필요한가

**클라이언트가 보낸 데이터는 믿을 수 없다.** 이름이 비어 있거나, 이메일 형식이 아니거나, 나이가 음수이거나, 악의적으로 조작된 값이 올 수 있다. 프론트엔드에서 검사했더라도 — 그건 우회할 수 있으니 **서버에서 반드시 다시 검증**해야 한다.

문제는, 이걸 `if`문으로 일일이 짜면 지옥이라는 것이다.

```java
// 검증을 손으로 짜면...
if (request.getName() == null || request.getName().isBlank())
    throw new IllegalArgumentException("이름은 필수입니다");
if (!request.getEmail().contains("@"))
    throw new IllegalArgumentException("이메일 형식 오류");
if (request.getAge() < 0) ...
// 필드마다 이걸 반복 → 지옥
```

이 반복을 **애노테이션으로 선언**하게 해주는 게 Bean Validation이다.

## Bean Validation — 애노테이션으로 규칙 선언

DTO 필드에 **"이 필드는 이런 규칙이다"**를 애노테이션으로 붙인다.

```java
public class UserRequest {

    @NotBlank(message = "이름은 필수입니다")
    private String name;

    @Email(message = "올바른 이메일 형식이 아닙니다")
    private String email;

    @Size(min = 8, message = "비밀번호는 8자 이상이어야 합니다")
    private String password;

    @Min(0) @Max(150)
    private int age;
}
```

`if`문 없이, 필드 위에 규칙을 **선언**만 하면 된다. `message`로 실패 시 메시지도 지정한다.

## @Valid — 검증을 실행시키는 방아쇠

애노테이션만 붙인다고 검증이 저절로 되진 않는다. **컨트롤러에서 `@Valid`를 붙여야 실행**된다.

```java
@PostMapping("/users")
public UserResponse create(@RequestBody @Valid UserRequest request) {
    //                                  ↑ 이게 있어야 검증이 돌아간다
    return userService.create(request);
}
```

`@Valid`가 붙으면, 스프링이 컨트롤러 메서드를 실행하기 **전에** DTO의 검증 애노테이션들을 검사한다. 하나라도 어기면 **`MethodArgumentNotValidException`이 발생**하고, 컨트롤러 본문은 아예 실행되지 않는다. 잘못된 데이터가 비즈니스 로직까지 들어가는 걸 관문에서 막는 것이다.

## 검증 실패를 처리하는 두 방법

검증이 실패하면 그 결과를 어떻게 다룰까?

**① BindingResult로 직접 받기**

```java
@PostMapping("/users")
public UserResponse create(@RequestBody @Valid UserRequest request,
                           BindingResult result) {
    if (result.hasErrors()) {
        // 검증 실패를 여기서 직접 처리
    }
    ...
}
```

`@Valid` 바로 뒤에 `BindingResult`를 두면, 예외가 터지는 대신 **에러 정보가 여기 담긴다.** 개별 컨트롤러에서 직접 다룰 때 쓴다.

**② @RestControllerAdvice로 전역 처리 (실무 표준)**

```java
@RestControllerAdvice
public class ValidationHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handle(MethodArgumentNotValidException e) {
        // 모든 컨트롤러의 검증 실패를 여기서 한 곳에서 처리
        var errors = e.getBindingResult().getFieldErrors();
        // errors를 정리해 일관된 형식으로 응답
        return ResponseEntity.badRequest().body(...);
    }
}
```

`BindingResult` 없이 검증이 실패하면 예외가 나는데, 그걸 **한 곳에서 몰아서 처리**한다. 컨트롤러마다 검증 처리를 중복하지 않아도 되고, **응답 형식이 일관**돼서 실무에서는 대개 이 방식을 쓴다.

## 주요 검증 애노테이션

| 애노테이션 | 규칙 |
|---|---|
| `@NotNull` | null이 아님 |
| `@NotEmpty` | null 아니고 비어있지 않음 (문자열·컬렉션) |
| `@NotBlank` | null 아니고 공백도 아님 (문자열) |
| `@Size(min, max)` | 길이·크기 범위 |
| `@Min` / `@Max` | 숫자 최소·최대 |
| `@Email` | 이메일 형식 |
| `@Pattern(regexp=…)` | 정규식 일치 |
| `@Positive` / `@Negative` | 양수 / 음수 |
| `@Past` / `@Future` | 과거 / 미래 날짜 |

특히 문자열은 `@NotNull`(null만 체크)보다 **`@NotBlank`(null·빈문자·공백 다 체크)**를 쓰는 경우가 많다.

## @Valid vs @Validated

둘 다 검증을 트리거하지만 출신과 기능이 다르다.

- **`@Valid`** — 자바 표준(Bean Validation). 가장 일반적.
- **`@Validated`** — 스프링 제공. `@Valid` 기능에 더해 **검증 그룹(groups)**을 지원한다. "회원가입 때는 이 규칙, 수정 때는 저 규칙"처럼 상황별로 다른 검증을 적용할 때 쓴다.

보통은 `@Valid`로 충분하고, 그룹별 검증이 필요할 때 `@Validated`를 꺼낸다.

## 정리

- **검증이 필요한 이유**: 클라이언트 데이터는 못 믿는다 → 서버에서 반드시 검사
- **Bean Validation**: `@NotBlank`·`@Size`·`@Email` 등으로 DTO 필드에 규칙을 **선언**
- **`@Valid`**: 컨트롤러에서 검증을 **실행시키는 방아쇠**. 실패 시 컨트롤러 본문 실행 전에 차단
- **실패 처리**: `BindingResult`(직접) 또는 `@RestControllerAdvice`(전역, 실무 표준)
- **`@Valid` vs `@Validated`**: 후자는 검증 그룹 지원

핵심은 [데이터의 여정](/blog/data-flow-dto-entity-domain/)에서 말한 **관문**이다. 잘못된 데이터가 비즈니스 로직과 DB까지 흘러들지 않도록, 입구에서 걸러낸다. 그리고 그 걸러내는 규칙을 `if`문이 아니라 **애노테이션으로 선언**한다 — 여기서도 방향은 같다. 반복되는 수고를, 필요한 만큼 자동으로.

> 다음 글에서는 이 DTO·Entity들의 반복 코드(getter·생성자 등)를 없애 주는 **롬복**을 정리한다.
