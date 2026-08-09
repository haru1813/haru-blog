---
title: 스프링 필터의 종류 — 무엇으로 만들고, 어떤 것들이 이미 있나
description: "요청 흐름의 가장 바깥 관문인 필터. 그 필터는 무엇으로 만들고(Filter·GenericFilterBean·OncePerRequestFilter), 스프링이 이미 제공하는 내장 필터와 시큐리티 필터 체인에는 무엇이 있는지, 그리고 직접 만들 때 어떻게 등록하는지 정리한다."
pubDate: 2026-08-08
category: backend
parent: request-flow-filter-interceptor-aop
---

[요청 흐름 글](/blog/request-flow-filter-interceptor-aop/)에서 필터가 **가장 바깥 관문** — DispatcherServlet에 닿기도 전에 모든 요청을 가로채는 문지기라고 했다. 그런데 막상 필터를 직접 쓰려고 하면 궁금해진다. **"필터는 대체 뭘로 만들고, 어떤 종류가 있는 걸까?"** `Filter`를 구현하라는데 `OncePerRequestFilter`도 보이고, 시큐리티를 켜면 필터가 수십 개 생긴다. 이걸 층위로 정리해 보자.

## 먼저, 필터는 스프링 것이 아니다

필터(Filter)는 **서블릿 스펙**(`jakarta.servlet.Filter`)의 것이다. 스프링이 아니라 서블릿 컨테이너(톰캣)가 관리한다. 그래서 스프링을 몰라도 동작하고, **DispatcherServlet 바깥**에서 모든 요청·응답을 훑는다. 인코딩·인증·로깅·CORS처럼 "컨트롤러 이전에, 모든 요청에 공통으로" 할 일을 여기 둔다.

종류는 크게 세 갈래로 나뉜다 — **① 만드는 기반, ② 스프링 내장 필터, ③ 시큐리티 필터 체인.**

## ① 필터를 만드는 기반 (계층)

직접 필터를 만들 때 상속·구현할 수 있는 것이 세 층이다.

| 기반 | 소속 | 설명 |
|---|---|---|
| `Filter` | 서블릿 스펙 | **가장 원시적**. `doFilter()` 하나. 스프링과 무관 |
| `GenericFilterBean` | 스프링 | Filter를 **스프링 빈**으로 쓰고 설정을 주입받게 해줌 |
| `OncePerRequestFilter` | 스프링 | **요청당 딱 한 번** 실행 보장. 커스텀 필터의 사실상 표준 부모 |

세 층은 **위로 갈수록 원시적, 아래로 갈수록 편하다.** `OncePerRequestFilter`는 `GenericFilterBean`을 상속하고, 그건 다시 `Filter`를 구현한다.

### 왜 OncePerRequestFilter를 주로 쓰나

순수 `Filter`에는 함정이 있다. 하나의 요청이 내부에서 **포워드(forward)나 디스패치**되면, 필터가 **여러 번** 실행될 수 있다. 인증이나 로깅 필터가 한 요청에 두 번 돌면 곤란하다.

`OncePerRequestFilter`는 이름 그대로 **"요청 한 번에 필터도 한 번"**을 보장한다. 그래서 실무에서 커스텀 필터를 만들 땐 대부분 이걸 상속하고, `doFilterInternal()`만 구현한다.

```java
@Component
public class JwtFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain)
            throws ServletException, IOException {
        // 토큰 검증 등 공통 처리
        chain.doFilter(req, res);   // 다음 관문으로 넘김
    }
}
```

### ServletRequest vs HttpServletRequest — 편한 이유가 하나 더

위 예시에서 `doFilterInternal`이 `HttpServletRequest`를 받는 걸 눈여겨보자. 사실 `OncePerRequestFilter`를 쓰는 이유가 **하나 더** 있다 — **타입 캐스팅을 대신 해준다**는 것이다. 이걸 이해하려면 두 타입의 관계부터 알아야 한다.

```
ServletRequest       (부모 — 프로토콜 중립)
      ▲
      │ extends
HttpServletRequest   (자식 — HTTP 전용)
```

- **`ServletRequest`·`ServletResponse`** — **프로토콜 중립** 부모. "HTTP일 수도, 아닐 수도 있는" 일반 요청/응답이라 `getMethod()`·`getHeader()`·`getCookies()`·`getSession()` 같은 **HTTP 전용 기능이 없다.** 가진 건 `getParameter()`·`getInputStream()`처럼 프로토콜 무관한 기본뿐이다.
- **`HttpServletRequest`·`HttpServletResponse`** — 그 부모를 **상속**해 HTTP 전용 기능(메서드·헤더·쿠키·세션·상태코드·리다이렉트…)을 얹은 자식. 우리가 실제로 쓰는 건 다 여기 있다.

서블릿 스펙이 *"세상에 HTTP만 있는 건 아닐 수도"* 하고 중립 계층을 먼저 뒀지만, 현실은 거의 100% HTTP라 **실무에선 `HttpServletRequest`만** 쓴다. `ServletRequest`를 직접 쓸 일은 거의 없다.

문제는 **순수 `Filter`의 `doFilter`가 부모 타입을 받는다**는 것이다. HTTP 기능을 쓰려면 매번 자식으로 캐스팅해야 한다.

```java
public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) {
    // req.getMethod()  ← 없음! ServletRequest엔 HTTP 메서드가 없다
    HttpServletRequest httpReq = (HttpServletRequest) req;  // 매번 캐스팅
    String method = httpReq.getMethod();
}
```

반면 `OncePerRequestFilter`의 `doFilterInternal`은 **처음부터 `HttpServletRequest`로** 넘겨준다(위 `JwtFilter` 예시처럼). 캐스팅이 필요 없다.

정리하면 `OncePerRequestFilter`의 이점은 둘이다 — **① 요청당 1회 보장, ② HTTP 타입으로 바로 받는 편의.** 그래서 실무의 커스텀 필터는 대부분 이걸 상속한다.

## ② 스프링이 이미 제공하는 내장 필터

스프링은 자주 필요한 필터를 미리 만들어 두었다. 스프링 부트는 이것들을 **필요할 때 자동 등록**해줘서, 있는지도 모르고 쓰는 경우가 많다.

| 필터 | 역할 |
|---|---|
| `CharacterEncodingFilter` | 요청·응답 인코딩(UTF-8) 강제 |
| `HiddenHttpMethodFilter` | HTML 폼에서 PUT/DELETE 흉내 (`_method` 파라미터) |
| `FormContentFilter` | PUT·PATCH의 폼 데이터 바디를 파싱 |
| `CorsFilter` | CORS(교차 출처 요청) 처리 |
| `ForwardedHeaderFilter` | 프록시 뒤에서 `X-Forwarded-*` 헤더를 반영 |
| `RequestContextFilter` | 요청을 `RequestContextHolder`에 바인딩 |
| `ShallowEtagHeaderFilter` | 응답에 ETag를 붙여 캐싱 |
| `CommonsRequestLoggingFilter` | 요청 내용을 로깅 |

`HiddenHttpMethodFilter`가 필요한 이유가 재밌다. **HTML `<form>`은 GET·POST만 지원**한다. 그런데 REST에선 PUT·DELETE도 쓰고 싶다. 그래서 폼에 `<input type="hidden" name="_method" value="PUT">`를 넣으면, 이 필터가 그걸 읽어 **진짜 PUT 요청인 척** 바꿔준다. 브라우저의 한계를 필터가 메워 주는 것이다. (스프링 부트에선 기본 비활성이라 `spring.mvc.hiddenmethod.filter.enabled=true`로 켠다.)

## ③ 스프링 시큐리티 필터 체인

필터의 진짜 무대는 여기다. **Spring Security는 그 자체가 수십 개 필터의 체인**으로 동작한다. 로그인을 붙이는 순간, 요청은 이 필터들을 순서대로 통과한다.

```
요청
 │
 ▼ [SecurityContextHolderFilter]        ← 이전 인증 정보 복원
 ▼ [CsrfFilter]                         ← CSRF 토큰 검증
 ▼ [LogoutFilter]                       ← 로그아웃 요청 처리
 ▼ [UsernamePasswordAuthenticationFilter] ← 폼 로그인
 ▼ [BasicAuthenticationFilter]          ← HTTP Basic 인증
 ▼ [BearerTokenAuthenticationFilter]    ← JWT·OAuth 토큰
 ▼ [ExceptionTranslationFilter]         ← 인증·인가 예외를 응답으로
 ▼ [AuthorizationFilter]                ← 최종 권한(인가) 체크
 │
 ▼ DispatcherServlet →  컨트롤러
```

핵심은 **인증·인가·CSRF·로그아웃이 전부 각각의 필터로 쪼개져 있다**는 것이다. 하나의 거대한 로직이 아니라, 관심사별로 나뉜 필터들이 줄지어 협력한다. 그리고 이 전체 체인은 `FilterChainProxy`라는 **하나의 필터**로 서블릿 컨테이너에 등록된다 — 필터 안에 필터 체인이 들어 있는 구조다.

왜 인증을 필터에 둘까? [요청 흐름 글](/blog/request-flow-filter-interceptor-aop/)에서 봤듯, 필터가 **가장 바깥**이기 때문이다. 컨트롤러에 닿기도 전에 막아야 안전하다.

## 직접 만든 필터, 어떻게 등록하나

필터는 클래스만 만든다고 동작하지 않는다. **"어떤 요청에 적용할지" 등록**해야 한다. 방법이 시대에 따라 갈린다.

- **예전** — `web.xml`에 `<filter>`·`<filter-mapping>`을 직접 적었다.
- **서블릿 3.0+** — 클래스에 `@WebFilter("/*")` 한 줄. (부트에선 `@ServletComponentScan` 필요)
- **요즘 스프링 부트** — `@Component`로 빈 등록하거나, **`FilterRegistrationBean`**으로 등록한다.

`FilterRegistrationBean`을 쓰는 이유는 **순서와 적용 범위를 세밀하게** 줄 수 있어서다.

```java
@Bean
public FilterRegistrationBean<JwtFilter> jwtFilter() {
    FilterRegistrationBean<JwtFilter> bean = new FilterRegistrationBean<>(new JwtFilter());
    bean.addUrlPatterns("/api/*");   // 적용 URL
    bean.setOrder(1);                // 필터 실행 순서
    return bean;
}
```

필터가 여러 개일 때 **누가 먼저 도느냐**가 중요하기 때문에(예: 인코딩 필터는 인증 필터보다 먼저), 순서 제어가 되는 이 방식이 실무에서 자주 쓰인다.

## 정리

- **필터는 서블릿 스펙**의 것 — DispatcherServlet 바깥, 모든 요청의 문지기
- **만드는 기반 3층**: `Filter`(원시) → `GenericFilterBean`(빈) → `OncePerRequestFilter`(요청당 1회, 실무 표준)
- **내장 필터**: `CharacterEncodingFilter`·`HiddenHttpMethodFilter`·`CorsFilter` 등 — 부트가 자동 등록
- **시큐리티 필터 체인**: 인증·인가·CSRF가 각각의 필터로 쪼개져 줄지어 동작 (`FilterChainProxy`가 감쌈)
- **등록**: `web.xml`(옛날) → `@WebFilter`(서블릿 3.0) → `@Component`·`FilterRegistrationBean`(요즘, 순서 제어)

필터가 "하나의 무엇"이 아니라 **여러 층과 여러 역할로 나뉜 무리**라는 게 보이면, 시큐리티를 켰을 때 쏟아지는 필터들도 덜 무섭다. 나에게는 이걸 "만드는 것 / 이미 있는 것 / 보안용"으로 나눠 본 뒤로, 필터라는 단어가 비로소 정리되어 들어왔다. 결국 여기서도 방향은 하나였다 — 모든 요청에 공통으로 필요한 수고를, 가장 바깥에서 한 번에.
