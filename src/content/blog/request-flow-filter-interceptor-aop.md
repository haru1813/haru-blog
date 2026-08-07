---
title: 요청은 어떻게 컨트롤러까지 오는가 — 필터·디스패처서블릿·인터셉터·AOP
description: 컨트롤러에 닿기 전, 요청이 차례로 거치는 관문들. 필터·DispatcherServlet·인터셉터·AOP의 위치와 차이를 하나의 흐름으로 정리한다.
pubDate: 2026-08-02
category: backend
---

Spring으로 컨트롤러를 만들다 보면 이런 게 궁금해진다. **"내 컨트롤러가 실행되기 전에, 요청은 무엇을 거쳐서 여기까지 오는 걸까?"** 인코딩 설정, 로그인 체크, 로깅, 트랜잭션… 이런 공통 처리는 대체 어디서 일어날까. 그 답이 **필터 · 디스패처서블릿 · 인터셉터 · AOP**다. 네 개는 따로 노는 게 아니라, **요청이 순서대로 지나가는 관문**이다.

## 전체 그림부터

```
클라이언트 요청
   │
   ▼
[ 필터 (Filter) ]              ← 서블릿 컨테이너 레벨 (Spring 밖)
   │
   ▼
[ DispatcherServlet ]         ← 유일한 서블릿, 요청 분배
   │
   ▼
[ 인터셉터 (Interceptor) ]     ← Spring MVC 레벨, 컨트롤러 앞뒤
   │
   ▼
[ AOP ]                       ← 메서드 실행 앞뒤
   │
   ▼
[ 컨트롤러 ]                   ← 드디어 우리 로직
```

바깥에서 안으로 갈수록 **점점 더 좁고 구체적인 범위**를 다룬다. 필터는 "모든 요청", AOP는 "특정 메서드"를 다룬다고 보면 된다. 하나씩 보자.

## 1. 필터 — 서블릿 컨테이너의 문지기

필터(Filter)는 **가장 바깥**, 즉 서블릿 컨테이너(톰캣) 레벨에서 동작한다. **DispatcherServlet에 도달하기도 전에** 요청을 가로챈다.

- 소속: **Servlet 스펙**(`jakarta.servlet.Filter`). 엄밀히는 Spring이 아니라 서블릿 컨테이너의 것이다.
- 하는 일: 인코딩 설정, CORS, XSS 방어, 그리고 **Spring Security의 인증/인가**가 대표적이다. (Security는 필터 체인으로 돌아간다.)

```java
@WebFilter("/*") // 이 필터를 어떤 요청에 적용할지 지정 (여기선 모든 요청)
public class LogFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        // 요청 전 처리
        chain.doFilter(req, res); // 다음 관문으로 넘김
        // 응답 후 처리
    }
}
```

### @WebFilter는 왜 붙일까

필터는 클래스를 만든다고 저절로 동작하지 않는다. **"어떤 URL에 이 필터를 적용할지" 등록**해 줘야 한다. 방법은 두 가지다.

- **예전 방식** — `web.xml`에 `<filter>`와 `<filter-mapping>`을 직접 적었다.
- **요즘 방식** — **`@WebFilter("/*")` 애노테이션 한 줄**로 끝낸다.

`@WebFilter`는 서블릿 3.0부터 생긴 **등록용 애노테이션**으로, **`web.xml` 설정을 대신한다.** 서블릿을 등록하는 `@WebServlet`, 리스너를 등록하는 `@WebListener`와 같은 계열이다. XML 파일을 따로 열지 않고 **필터 클래스 바로 옆에** "이 필터는 이런 URL에 붙는다"를 선언할 수 있어 간결하다. 한마디로 `@WebFilter`를 쓰는 이유는 — **"필터를 web.xml 없이, 클래스에 직접 등록하기 위해서"**다.

> 참고: Spring Boot에서는 `@WebFilter`를 인식시키려면 메인 클래스에 `@ServletComponentScan`을 켜야 한다. 또 필터 **순서**나 적용 조건을 더 세밀하게 주고 싶을 땐 `FilterRegistrationBean`으로 등록하는 방식도 자주 쓴다.

"Spring이 손대기도 전에 걸러야 하는 것"은 필터에 둔다.

## 2. DispatcherServlet — 요청을 나눠 주는 창구

[지난 글](/blog/servlet-vs-controller/)에서 다뤘듯, **모든 요청을 받는 단 하나의 서블릿**이다. 어떤 컨트롤러가 이 요청을 처리할지 찾아서(핸들러 매핑) 넘긴다. 여기서부터가 **Spring MVC의 세계**다.

## 3. 인터셉터 — 컨트롤러 앞뒤를 지키는 경비

인터셉터(Interceptor)는 **DispatcherServlet과 컨트롤러 사이**에서 동작한다. 필터보다 안쪽, Spring MVC가 관리하는 지점이다.

- 소속: **Spring MVC**(`HandlerInterceptor`). 그래서 **Spring 빈에 자유롭게 접근**할 수 있다.
- 실행 지점 세 곳:
  - `preHandle()` — 컨트롤러 **실행 전** (로그인 체크 등, 여기서 막으면 컨트롤러 안 감)
  - `postHandle()` — 컨트롤러 실행 후, 뷰 렌더 전
  - `afterCompletion()` — 요청 완전히 끝난 후 (로깅·정리)

```java
public class AuthInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        if (로그인_안됨) { res.sendRedirect("/login"); return false; }
        return true; // true여야 컨트롤러로 진행
    }
}
```

위 예시처럼 로그인 체크가 인터셉터의 교과서적 예로 자주 등장한다. 그런데 **요즘 인증·인가는 Spring Security가 담당한다.** Spring Security 자체가 서블릿 필터(`FilterChainProxy`)라, 인증은 인터셉터보다 더 바깥인 **필터 레벨**에서 처리하는 게 표준이다. 컨트롤러에 닿기도 전에 막아야 안전하기 때문이다.

그럼 인터셉터는 쓸 일이 없어졌을까? 그렇지 않다. **인증에서 손을 뗐을 뿐, "인증이 아닌, 핸들러(컨트롤러) 단위 공통 처리"로 자리를 옮겼다.** 요청 로깅·실행시간 측정, 추적용 `traceId` 심기, 다국어 처리 같은 것들이다. 필터는 모르지만 **인터셉터는 "어느 컨트롤러 메서드가 이 요청을 처리하는지(`HandlerMethod`)"를 안다.** 그래서 핸들러 맥락이 필요한 공통 처리는 여전히 인터셉터의 몫이다.

## 4. AOP — 메서드를 감싸는 가장 안쪽 층

AOP(Aspect Oriented Programming)는 가장 안쪽, **메서드 실행 앞뒤**에 공통 로직을 끼워 넣는다.

- 소속: **Spring AOP**. 프록시(대리 객체)를 만들어 원래 메서드를 감싼다.
- 하는 일: **트랜잭션(`@Transactional`)**, 로깅, 성능 측정 등. 우리가 매일 쓰는 `@Transactional`이 사실 AOP다.

```java
@Aspect
@Component
public class LogAspect {
    @Around("execution(* com.example.service..*(..))")
    public Object log(ProceedingJoinPoint pjp) throws Throwable {
        // 메서드 실행 전
        Object result = pjp.proceed(); // 실제 메서드 실행
        // 메서드 실행 후
        return result;
    }
}
```

인터셉터가 **요청(URL) 단위**라면, AOP는 **메서드 단위**다. 컨트롤러든 서비스든, 지정한 메서드마다 공통 로직을 붙인다.

## 헷갈리는 셋 — 필터 vs 인터셉터 vs AOP

| | 필터 | 인터셉터 | AOP |
|---|---|---|---|
| 소속 | 서블릿 컨테이너 | Spring MVC | Spring AOP |
| 위치 | DispatcherServlet **밖** | 컨트롤러 **앞뒤** | 메서드 **앞뒤** |
| 단위 | 모든 요청 | 요청(핸들러) | 메서드 |
| 대표 예 | 인코딩·**Security(인증)** | 로깅·traceId·다국어 | `@Transactional` |

셋 다 "공통 처리를 한곳에 모은다"는 목적은 같다. 다만 **어느 깊이에서, 무엇을 단위로 거느냐**가 다르다. 바깥일수록 넓고(모든 요청), 안쪽일수록 좁다(특정 메서드).

## 실무에서 어디에 쓰나

층이 다른 만큼 실제 쓰이는 곳도 갈린다.

**필터** — 모든 요청에 걸리는, 인증을 포함한 가장 바깥의 공통 처리.

- **인증·인가** (**Spring Security** 필터 체인) — 요즘 로그인/권한은 여기서 한다
- 인코딩 설정(`CharacterEncodingFilter`), CORS
- XSS 방어, 요청/응답 압축(GZIP)
- 정적 리소스까지 포함해 "무조건 걸러야 하는 것"

**인터셉터** — 인증 외, 컨트롤러(핸들러) 맥락이 필요한 공통 처리.

- 요청 로깅·실행시간 측정 (어느 핸들러가 처리했는지 알 수 있다)
- 추적용 `traceId` / MDC 세팅 (분산추적·로그 상관관계)
- 다국어 로케일 변경(`LocaleChangeInterceptor` — 스프링 기본 제공)
- 공통 헤더·파라미터 검증, 감사(audit) 로그

**AOP** — 웹과 무관한, 서비스 메서드 단위의 관심사.

- **트랜잭션**(`@Transactional`)
- 메서드 실행 로깅·성능 측정
- 캐싱(`@Cacheable`), 실패 시 재시도
- 메서드 보안(`@PreAuthorize` — 이것도 사실 AOP다)

한 줄로 요약하면 — **인증은 필터(Security), 웹 공통 처리는 인터셉터, 비즈니스 로직의 공통 관심사는 AOP.**

## 응답은 역순으로 나간다

들어올 때 `필터 → 인터셉터 → AOP → 컨트롤러` 순이었다면, 나갈 때는 **정확히 그 역순**으로 빠져나온다.

```
필터 ▶ 인터셉터(preHandle) ▶ AOP ▶ 컨트롤러
                                      │
컨트롤러 ▶ AOP ▶ 인터셉터(postHandle·afterCompletion) ▶ 필터 ◀
```

들어올 때 감싼 순서대로, 나갈 때 풀린다. 양파 껍질을 벗겼다 다시 덮는 것과 같다.

## 정리

- **필터**: 서블릿 컨테이너 레벨. 모든 요청. (인코딩·Security)
- **DispatcherServlet**: 요청을 컨트롤러로 분배하는 유일한 서블릿.
- **인터셉터**: Spring MVC 레벨. 컨트롤러 앞뒤, 요청 단위. (로깅·traceId·다국어 — 인증/인가는 Security 필터가 담당)
- **AOP**: 메서드 앞뒤. (`@Transactional`·로깅)

컨트롤러 하나가 실행되기까지 이렇게 여러 관문이 순서대로 요청을 다듬는다. *"이 처리는 어느 층에 두어야 할까?"* 를 고를 수 있게 되면, 코드가 훨씬 깔끔하게 제자리를 찾는다. 나에게는 이 흐름을 그림으로 그려 본 뒤로, Spring이 "어디서 뭘 하는지"가 비로소 눈에 들어왔다.
