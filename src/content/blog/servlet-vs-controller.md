---
title: 서블릿과 컨트롤러의 차이 — Spring은 서블릿을 어떻게 감췄나
description: URL마다 서블릿을 하나씩 만들던 방식과, 하나의 DispatcherServlet 뒤에서 애노테이션으로 동작하는 Spring 컨트롤러. 둘의 차이를 코드로 비교한다.
pubDate: 2026-08-02
category: backend
parent: servlet-dynamic-web-project
---

[서블릿 글](/blog/servlet-dynamic-web-project/)에서 "Spring MVC도 결국 서블릿 위에서 돈다"고 했다. 그렇다면 우리가 Spring에서 매일 쓰는 **컨트롤러(`@Controller`)**는 서블릿과 무엇이 다를까? 결론부터 말하면 — **컨트롤러는 서블릿의 불편함을 걷어낸 결과물**이다. 이걸 알면 Spring이 "마법"이 아니라 "정리"라는 게 보인다.

## 서블릿만으로 개발하면 불편한 점

서블릿 방식에서는 **URL 하나에 서블릿 클래스 하나**를 만든다. 회원 목록, 회원 상세, 회원 등록… 기능이 늘 때마다 클래스가 늘어난다. 게다가 요청 하나를 처리하려면 매번 이런 저수준 작업을 직접 해야 한다.

```java
@WebServlet("/user")
public class UserServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        // 1. 파라미터를 직접 꺼내고
        String id = req.getParameter("id");

        // 2. 응답 타입을 직접 세팅하고
        resp.setContentType("application/json; charset=UTF-8");

        // 3. 출력 스트림에 직접 써야 한다
        resp.getWriter().write("{\"id\":\"" + id + "\"}");
    }
}
```

`req`에서 값을 꺼내고, `resp`에 직접 쓰는 이 반복이 모든 서블릿마다 되풀이된다. 로직보다 **뒤치다꺼리**가 더 많다.

## 컨트롤러 — 같은 일을, 로직만 남기고

Spring의 컨트롤러는 같은 처리를 이렇게 바꾼다.

```java
@RestController
public class UserController {

    @GetMapping("/user")
    public User getUser(@RequestParam String id) {
        return new User(id);   // 반환하면 JSON으로 알아서 변환
    }
}
```

달라진 점을 보자.

- **클래스 하나에 여러 핸들러.** `@GetMapping`, `@PostMapping`을 메서드마다 붙여, 한 컨트롤러가 여러 URL을 담당한다. URL마다 클래스를 만들지 않는다.
- **파라미터 자동 바인딩.** `req.getParameter("id")` 대신 `@RequestParam String id`. 필요한 값을 매개변수로 선언만 하면 Spring이 꽂아 준다.
- **반환값이 곧 응답.** `resp.getWriter().write(...)` 대신 객체를 `return`하면, Spring이 JSON으로 변환해 응답한다.

즉 **`req`·`resp`라는 저수준 도구를 직접 만지지 않고, 순수한 로직만** 남긴다.

## 한눈에 보는 차이

| | 서블릿 | 컨트롤러(Spring) |
|---|---|---|
| 단위 | URL당 클래스 하나 | 메서드 하나가 URL 하나 |
| 매핑 | `web.xml` / `@WebServlet` | `@GetMapping` 등 애노테이션 |
| 파라미터 | `req.getParameter()` 직접 | `@RequestParam` 자동 바인딩 |
| 응답 | `resp`에 직접 작성 | 반환값을 자동 변환 |
| 상속 | `HttpServlet` 상속 필요 | 그냥 POJO(평범한 클래스) |

## 그런데 서블릿이 사라진 게 아니다

여기서 중요한 사실 — **컨트롤러가 서블릿을 대체한 게 아니다. 뒤에 숨겼을 뿐이다.**

Spring MVC에는 **`DispatcherServlet`**이라는 **단 하나의 서블릿**이 있다. 모든 요청은 일단 이 서블릿이 받는다. 그리고 그 뒤에서 이런 일을 대신 해 준다.

```
브라우저 ── GET /user ──▶ [ DispatcherServlet ]  ← 유일한 서블릿
                              │  1. 어느 컨트롤러가 처리할지 찾고
                              │  2. 파라미터를 꺼내 바인딩하고
                              ▼
                        UserController.getUser()   ← 우리가 짜는 로직
                              │  3. 반환값을 JSON/뷰로 변환
                              ▼
                        응답 ──▶ 브라우저
```

우리가 서블릿에서 손으로 하던 **1·2·3번(디스패칭·바인딩·변환)을 DispatcherServlet이 공통으로** 처리한다. 그래서 우리는 컨트롤러에 **로직(가운데)만** 채우면 된다. 이 구조를 **프론트 컨트롤러 패턴**이라 부른다 — 모든 요청을 받는 하나의 창구를 앞에 두는 것이다.

## 무엇이 좋아졌나

- **중복 제거**: 파라미터 파싱·응답 작성 같은 반복을 프레임워크가 가져갔다.
- **로직 집중**: 컨트롤러엔 비즈니스 로직만 남아 읽기 쉽다.
- **일관성**: 예외 처리·인터셉터·뷰 렌더 같은 공통 처리를 한곳(DispatcherServlet 흐름)에서 다룬다.

## 정리

- **서블릿**: URL마다 클래스. `req`/`resp`를 직접 다룬다. 저수준이지만 뿌리다.
- **컨트롤러**: 애노테이션 + 자동 바인딩 + 반환값 변환. 로직만 남긴다.
- **DispatcherServlet**: 유일한 서블릿으로 모든 요청을 받아 컨트롤러에 분배한다(프론트 컨트롤러 패턴).

그래서 이 문장이 성립한다 — **"Spring은 서블릿을 없앤 게 아니라, DispatcherServlet 하나 뒤로 감춰서 편하게 만든 것이다."** 서블릿을 알고 나면, 컨트롤러가 왜 이렇게 생겼는지가 자연스럽게 이해된다.
