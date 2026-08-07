---
title: 요청과 응답 — @RequestBody와 @ResponseBody, 그리고 ResponseEntity
description: "컨트롤러는 요청 본문을 받고 응답 본문을 돌려준다. @RequestBody(JSON→객체)와 @ResponseBody(객체→JSON)의 대칭, @RestController가 감춘 것, ResponseEntity로 상태·헤더까지 다루는 법, 그리고 변환의 주역 HttpMessageConverter를 정리한다."
pubDate: 2026-08-07
category: backend
parent: controller-method-arguments
---

[컨트롤러 인자 글](/blog/controller-method-arguments/)에서 요청을 받는 도구들을 봤고, 그 반대편에 반환값이 있다고 했다. 이번엔 그 핵심 — **요청 본문(body)을 받고, 응답 본문을 돌려주는** 흐름을 대칭으로 정리한다. 주역은 `@RequestBody`, `@ResponseBody`, 그리고 `ResponseEntity`다.

## 요청 본문 받기 — @RequestBody

클라이언트가 JSON을 본문에 담아 보내면, `@RequestBody`가 그걸 **객체로 변환(역직렬화)**해서 받는다.

```java
// 클라이언트가 보낸 본문:  { "name": "하루", "email": "haru@example.com" }
@PostMapping("/users")
public ... create(@RequestBody UserRequest request) {
    // request.getName() == "하루"  — JSON이 객체로 변신했다
}
```

JSON 문자열을 손으로 파싱할 필요 없이, `@RequestBody`만 붙이면 스프링이 알아서 `UserRequest` 객체로 만들어 준다.

## 응답 본문 만들기 — @ResponseBody

반대로, 컨트롤러가 반환한 객체를 **JSON으로 변환(직렬화)**해서 응답 본문에 담는 게 `@ResponseBody`다. **`@RequestBody`의 정확한 반대**다.

```java
@GetMapping("/users/{id}")
@ResponseBody
public UserResponse get(@PathVariable Long id) {
    return new UserResponse(id, "하루");
    // 이 객체가 → { "id": 1, "name": "하루" } JSON으로 변신해 응답 본문에 담긴다
}
```

## 완벽한 대칭

두 애노테이션은 방향만 반대인 짝이다.

| | 애노테이션 | 방향 | 변환 |
|---|---|---|---|
| **요청** | `@RequestBody` | 본문 JSON → 객체 | 역직렬화(deserialize) |
| **응답** | `@ResponseBody` | 객체 → 본문 JSON | 직렬화(serialize) |

- 들어올 때 `@RequestBody`로 **JSON을 객체로 푼다.**
- 나갈 때 `@ResponseBody`로 **객체를 JSON으로 만든다.**

## @RestController — @ResponseBody를 감춘 것

REST API를 만들면 메서드마다 `@ResponseBody`를 붙이는 게 번거롭다. 그래서 나온 게 `@RestController`다.

```java
@RestController        // = @Controller + @ResponseBody
public class UserController {
    @GetMapping("/users/{id}")
    public UserResponse get(@PathVariable Long id) {
        return new UserResponse(id, "하루");   // @ResponseBody 없이도 JSON!
    }
}
```

**`@RestController` = `@Controller` + `@ResponseBody`**다. 클래스에 한 번 붙이면, 그 안의 모든 메서드가 자동으로 `@ResponseBody`처럼 동작한다. 그래서 반환 객체가 알아서 JSON이 된다. (반면 뷰(JSP·타임리프)를 반환하는 전통 MVC 컨트롤러는 `@Controller`를 쓴다 — 이때 `String` 반환값은 뷰 이름이 된다.)

## ResponseEntity — 상태코드·헤더까지 다루기

`@ResponseBody`는 **본문만** 만든다(상태코드는 기본 200). 그런데 실무에선 *"성공은 200, 생성은 201, 없으면 404"*처럼 **상태코드와 헤더도 제어**해야 한다. 그때 쓰는 게 `ResponseEntity`다.

```java
@GetMapping("/users/{id}")
public ResponseEntity<UserResponse> get(@PathVariable Long id) {
    UserResponse user = userService.find(id);
    if (user == null)
        return ResponseEntity.notFound().build();        // 404
    return ResponseEntity.ok(user);                       // 200 + 본문
}

@PostMapping("/users")
public ResponseEntity<UserResponse> create(@RequestBody @Valid UserRequest req) {
    UserResponse created = userService.create(req);
    return ResponseEntity.status(HttpStatus.CREATED)      // 201
                         .body(created);
}
```

정리하면:
- **`@ResponseBody`** → 본문만 (상태코드 200 고정)
- **`ResponseEntity`** → 본문 + **상태코드 + 헤더** (세밀 제어)

REST API에서는 상태코드가 중요하므로 `ResponseEntity`를 많이 쓴다.

## 변환의 주역 — HttpMessageConverter

그런데 JSON ↔ 객체 변환은 누가 할까? **`HttpMessageConverter`**다. `@RequestBody`·`@ResponseBody`가 붙으면, 스프링이 이 컨버터를 불러서 변환한다.

```
요청:  JSON 본문 ──[HttpMessageConverter]──▶ 객체   (@RequestBody)
응답:  객체     ──[HttpMessageConverter]──▶ JSON 본문 (@ResponseBody)
```

- JSON ↔ 객체는 보통 **Jackson**(`MappingJackson2HttpMessageConverter`)이 담당한다. 스프링 부트에 기본 포함돼 있다.
- 스프링은 요청의 `Content-Type`과 `Accept` 헤더를 보고 **적절한 컨버터를 자동 선택**한다. JSON이면 Jackson, XML이면 XML 컨버터 식이다.

즉 `@RequestBody`·`@ResponseBody`는 "본문을 변환하라"는 **표시**일 뿐이고, 실제 변환은 `HttpMessageConverter`가 한다.

## 정리

- **`@RequestBody`**: 요청 본문 JSON → 객체 (역직렬화)
- **`@ResponseBody`**: 객체 → 응답 본문 JSON (직렬화) — `@RequestBody`의 정반대
- **`@RestController`** = `@Controller` + `@ResponseBody` → 메서드마다 안 붙여도 반환값이 JSON
- **`ResponseEntity`**: 본문 + **상태코드·헤더**까지 제어 (REST에서 자주)
- **`HttpMessageConverter`**(주로 Jackson): JSON ↔ 객체 변환의 실제 주역

핵심은 **요청과 응답이 거울처럼 대칭**이라는 것이다. 들어올 땐 JSON을 객체로 풀고(`@RequestBody`), 나갈 땐 객체를 JSON으로 만든다(`@ResponseBody`). 그 사이 변환은 `HttpMessageConverter`가 맡는다. [데이터의 여정](/blog/data-flow-dto-entity-domain/)에서 Request DTO로 받고 Response DTO로 응답한다고 했는데, 그 "받고 응답하는" 실제 장치가 바로 이것들이다.
