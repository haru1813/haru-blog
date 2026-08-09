---
title: 스프링 시큐리티 큰 그림 — 인증·인가와 필터 체인
description: "스프링 시큐리티의 뼈대. 인증(너 누구야)과 인가(너 이거 돼)의 구분, 시큐리티가 사실 '필터 체인'이라는 것(FilterChainProxy), 요청이 SecurityContext에 담기는 전체 흐름, 그리고 세션 기반과 JWT 기반이라는 두 인증 방식의 개요를 잡는다."
pubDate: 2026-08-08
category: backend
---

[필터 글](/blog/filter-types/)에서 *"Spring Security는 그 자체가 수십 개 필터의 체인"* 이라고 예고했다. 이제 그 시큐리티를 정리한다. 방대해 보이지만 뼈대는 단순하다 — **인증·인가**라는 두 개념과, 그걸 처리하는 **필터 체인**. 먼저 큰 그림부터 잡고, [세션 기반](/blog/spring-security-session/)·[JWT 기반](/blog/spring-security-jwt/)이라는 두 방식은 자식 글에서 본다.

## 가장 먼저 — 인증 vs 인가

시큐리티의 모든 것은 이 두 단어로 갈린다. 자주 헷갈리는데, 순서가 있다.

```
① 인증(Authentication)  →  "너 누구야?"     (신원 확인 = 로그인)
② 인가(Authorization)   →  "너 이거 돼?"    (권한 확인 = 접근 제어)
```

| | 인증(Authentication) | 인가(Authorization) |
|---|---|---|
| 질문 | 너 누구야? | 너 이거 할 수 있어? |
| 하는 일 | 로그인 (신원 확인) | 권한 체크 (접근 허용/거부) |
| 예 | 아이디·비번 검증 | "관리자만 이 페이지" |
| 순서 | **먼저** | 인증 **후** |

**인증이 먼저, 인가가 나중**이다. "누구인지" 확인해야(인증) "무엇을 할 수 있는지" 판단(인가)할 수 있다. 로그인은 됐는데 권한이 없으면 → 인증은 통과, 인가에서 막힌다(403).

## 시큐리티는 사실 "필터 체인"이다

[필터 글](/blog/filter-types/)에서 봤듯, 스프링 시큐리티는 **여러 필터가 줄지어 선 체인**으로 동작한다. 요청은 이 필터들을 순서대로 통과한다.

```
요청
 ▼ [SecurityContextHolderFilter]        ← 이전 인증 정보 복원
 ▼ [UsernamePasswordAuthenticationFilter] ← 폼 로그인 (인증)
 ▼ [BearerTokenAuthenticationFilter]     ← JWT 토큰 (인증)
 ▼ [ExceptionTranslationFilter]          ← 인증·인가 예외 처리
 ▼ [AuthorizationFilter]                 ← 권한 체크 (인가)
 ▼ DispatcherServlet → 컨트롤러
```

이 전체 체인은 **`FilterChainProxy`**라는 하나의 필터로 서블릿 컨테이너에 등록된다 — **필터 안에 필터 체인이 들어있는** 구조다. 그리고 인증·인가가 각각 **다른 필터**로 쪼개져 있다는 게 보인다. 인증 필터가 앞, 인가 필터가 뒤다(순서대로).

**왜 필터냐면** — [필터가 가장 바깥](/blog/request-flow-filter-interceptor-aop/)이라, 컨트롤러에 닿기도 전에 막아야 안전하기 때문이다.

## 인증 정보는 어디에 — SecurityContext

인증이 끝나면 *"이 사람은 하루, 권한은 USER"* 같은 정보를 어딘가 저장해야 한다. 그게 **`SecurityContext`**다.

```
인증 성공 → Authentication 객체 생성 → SecurityContext에 저장
          → SecurityContextHolder (ThreadLocal)로 어디서든 꺼냄
```

- **`Authentication`** — 인증된 주체(principal)와 권한(authorities)을 담은 객체
- **`SecurityContext`** — 그 `Authentication`을 담는 상자
- **`SecurityContextHolder`** — 컨텍스트를 스레드에 보관, 어디서든 현재 사용자 조회

```java
// 컨트롤러·서비스 어디서든 현재 로그인 사용자 꺼내기
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
```

## 인증을 처리하는 조연들

인증 과정에서 몇 개의 협력 객체가 등장한다. 이름만 알아두자.

| 구성요소 | 역할 |
|---|---|
| `UserDetailsService` | DB 등에서 **사용자 정보 로드** |
| `UserDetails` | 로드된 사용자 (아이디·비번·권한) |
| `AuthenticationManager` | 인증 처리의 **총괄** |
| `PasswordEncoder` | 비밀번호 **암호화·검증** (BCrypt 등) |

흐름은 — 필터가 `AuthenticationManager`에게 인증을 맡기고, 매니저가 `UserDetailsService`로 사용자를 불러와 `PasswordEncoder`로 비번을 확인한다.

## 두 갈래 — 세션 기반 vs JWT 기반

인증에 성공한 뒤, **그 상태를 어떻게 유지하느냐**가 두 방식으로 갈린다. 이게 시큐리티의 큰 분기점이다.

```
세션 기반 → 서버가 로그인 상태를 "기억" (stateful)
JWT 기반  → 서버가 안 기억, 토큰에 담아 클라이언트가 들고 다님 (stateless)
```

| | 세션 기반 | JWT 기반 |
|---|---|---|
| 상태 | 서버가 기억 (stateful) | 서버가 안 기억 (stateless) |
| 저장 | 서버 세션 + JSESSIONID 쿠키 | 클라이언트가 토큰 보관 |
| 확장 | 세션 공유 필요 | 서버 확장 쉬움 |
| 주 무대 | 전통적 웹 | MSA·모바일·SPA |

이 둘은 각각 [세션 기반 인증 글](/blog/spring-security-session/)·[JWT 기반 인증 글](/blog/spring-security-jwt/)에서 자세히 본다.

## 정리

- **인증(Authentication)** = "너 누구야"(로그인) / **인가(Authorization)** = "너 이거 돼"(권한) — 인증이 먼저
- 시큐리티 = **필터 체인**(`FilterChainProxy`) — 인증·인가가 각각 다른 필터로, [가장 바깥](/blog/request-flow-filter-interceptor-aop/)에서
- 인증 정보는 **`SecurityContext`**(`SecurityContextHolder`로 어디서든 조회)
- 조연: `UserDetailsService`·`AuthenticationManager`·`PasswordEncoder`
- 인증 상태 유지 방식이 두 갈래 — **[세션](/blog/spring-security-session/)**(stateful) vs **[JWT](/blog/spring-security-jwt/)**(stateless)

시큐리티가 무서웠던 건 필터·매니저·컨텍스트가 한꺼번에 쏟아져서였다. 근데 **"인증(누구) → 인가(무엇을), 그걸 필터 체인이 처리하고, 결과는 SecurityContext에 담긴다"** 이 한 줄로 꿰면 골격이 선다. 나머지는 이 골격에 붙는 살이다. 결국 여기서도 방향은 하나였다 — 모든 요청 앞에서 반복될 "누구냐·되느냐"를, 필터 체인 한곳에 모은다.
