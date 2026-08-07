---
title: 컨트롤러 메서드 인자는 왜 이렇게 많을까 — HTTP 요청의 칸과 애노테이션
description: "@RequestParam, @PathVariable, @RequestBody, @RequestHeader… 컨트롤러가 받는 인자는 왜 이렇게 많을까. HTTP 요청의 구조와 서블릿 시절을 되짚으면, 이 많음이 사실 1:1 대응이었음을 알게 된다."
pubDate: 2026-08-07
category: backend
---

Spring 컨트롤러를 짜다 보면 메서드 인자가 참 다양하다. `@RequestParam`, `@PathVariable`, `@RequestBody`, `@ModelAttribute`, `Model`, `HttpServletRequest`, `@RequestHeader`… 반환값도 `ResponseEntity`, `String`, `ModelAndView` 등 여럿이다. 처음엔 이걸 다 외워야 하나 싶어 막막하다. **그런데 왜 이렇게 많은 걸까?**

## 먼저, 이것들을 뭐라고 부르나

이것들을 한 묶음으로 부르면 **핸들러 메서드(handler method)의 「인자(Arguments)」와 「반환값(Return Values)」**이다. 즉 *"컨트롤러 메서드가 받을 수 있는 것들과 돌려줄 수 있는 것들"*의 목록이다. Spring이 이걸 자동으로 채워주고(ArgumentResolver), 반환값을 응답으로 변환해준다(ReturnValueHandler).

그런데 "왜 이렇게 많냐"의 답은 Spring에 있지 않다. **HTTP에 있다.**

## HTTP 요청은 원래 여러 칸으로 나뉘어 있다

HTTP 요청 하나를 뜯어보자. 데이터가 **여기저기 흩어져** 있다.

```http
GET /users/3?sort=name          ← 경로에 3, 쿼리에 sort
Host: example.com
User-Agent: Mozilla/5.0         ← 헤더
Cookie: session=abc123          ← 쿠키
Content-Type: application/json

{ "name": "하루" }              ← 본문(body)
```

경로, 쿼리스트링, 헤더, 쿠키, 본문… **한 요청 안에서도 데이터가 담기는 칸이 여러 개**다. 그리고 **각 칸마다 그걸 꺼내는 전용 도구**가 하나씩 있다.

## 각 칸마다 전용 도구가 하나씩

| HTTP의 어느 부분 | 꺼내는 도구 |
|---|---|
| 경로 `/users/{id}` | `@PathVariable` |
| 쿼리 `?sort=name` | `@RequestParam` |
| 본문 (JSON) | `@RequestBody` |
| 본문 (폼 데이터) | `@ModelAttribute` |
| 헤더 | `@RequestHeader` |
| 쿠키 | `@CookieValue` |
| 세션 | `HttpSession` |
| 업로드 파일 | `MultipartFile` |

여기서 관점을 뒤집어야 한다. **도구가 8개인 게 아니라, HTTP에 데이터 칸이 8개라서 도구도 8개인 것**이다. 복잡성의 근원은 Spring이 아니라 **HTTP 프로토콜 자체**다. Spring은 그 각각의 칸을 편하게 꺼내라고 도구를 하나씩 마련해준 것뿐이다.

## 서블릿 시절과 비교하면 확 와닿는다

이 "많음"이 사실은 예전부터 있던 것임을, 서블릿과 비교하면 알 수 있다.

```java
// 예전 서블릿 — 하나의 request 객체에서 메서드로 다 꺼냄
String id     = request.getParameter("id");       // 쿼리
String agent  = request.getHeader("User-Agent");   // 헤더
Cookie[] c    = request.getCookies();              // 쿠키
HttpSession s = request.getSession();              // 세션
BufferedReader body = request.getReader();         // 본문 (직접 파싱!)
```

서블릿은 "종류가 적어" 보인다. 그런데 사실은 `request` 하나에 `getParameter()`, `getHeader()`, `getCookies()`… **메서드가 잔뜩** 달려 있었다. 게다가 본문(JSON)은 스트림으로 직접 읽어서 파싱까지 해야 했다.

Spring은 그 메서드들을 **애노테이션으로 바꾼 것뿐**이다.

```java
// Spring — 각 칸을 애노테이션으로 선언, 타입 변환·파싱까지 자동
public User get(@RequestParam Long id,
                @RequestHeader("User-Agent") String agent,
                @CookieValue("session") String session,
                @RequestBody UserDto body) { ... }
```

**서블릿의 `request.getXXX()`가 Spring의 `@Xxx` 애노테이션으로 1:1 대응**된다.

| 서블릿 | Spring |
|---|---|
| `request.getParameter("id")` | `@RequestParam Long id` |
| `request.getHeader("...")` | `@RequestHeader` |
| `request.getCookies()` | `@CookieValue` |
| `request.getReader()` + 직접 파싱 | `@RequestBody` (자동 파싱) |
| `request.getSession()` | `HttpSession` |

즉 **종류가 늘어난 게 아니라, 원래 있던 것들이 애노테이션으로 겉모습만 바뀐** 것이다. 오히려 Spring은 여기에 **타입 변환(String→Long)과 JSON 파싱까지 자동으로** 얹어줬다. 손이 줄어든 셈이다.

## 그래서 다 외울 필요가 없다

핵심은 이것이다.

> **"요청의 어느 칸에서 값을 꺼낼지"만 알면, 애노테이션은 자연히 따라온다.**

- 경로에서? → `@PathVariable`
- 쿼리에서? → `@RequestParam`
- 본문 JSON에서? → `@RequestBody`
- 헤더에서? → `@RequestHeader`

30개 애노테이션을 통째로 암기하는 게 아니다. **HTTP 요청의 구조를 이해하면**, *"아, 이건 요청의 이 부분을 꺼내는 거구나"* 하고 매핑된다. 새 애노테이션이 나와도 같은 틀로 이해된다. 반환값(`ResponseEntity`, `String` 뷰이름 등)도 마찬가지 — *"응답의 무엇을 만들 것인가"*로 나뉠 뿐이다.

## 정리

- 컨트롤러 인자·반환값이 많은 이유는 **HTTP 요청이 원래 여러 칸(경로·쿼리·본문·헤더·쿠키·세션·파일)으로 나뉘어 있고, 각 칸마다 전용 도구를 두었기 때문**이다.
- **복잡성의 근원은 Spring이 아니라 HTTP다.** Spring은 그걸 애노테이션으로 편하게 만들었을 뿐이다.
- 서블릿의 `request.getXXX()`가 Spring의 `@Xxx`로 **1:1 대응**된다 — 종류가 는 게 아니라 겉모습이 바뀐 것.
- **HTTP 구조를 알면** 암기 없이 자연히 매핑된다.

[서블릿과 컨트롤러 글](/blog/servlet-vs-controller/)에서 "서블릿을 감춘 게 컨트롤러"라고 했는데, 그 감춤이 여기까지 이어진다. 서블릿이 `request`에서 손으로 꺼내던 것을, Spring은 애노테이션으로 선언만 하면 알아서 채워준다. *"많다"*고 느껴지는 건 그만큼 **HTTP의 구석구석을 다 편하게 다룰 수 있게** 됐다는 뜻이기도 하다. 결국 여기서도 방향은 하나였다 — 반복되는 수고를, 필요한 만큼 자동으로.
