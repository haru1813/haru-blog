---
title: 스프링 인터셉터 제대로 보기 — preHandle·postHandle·afterCompletion
description: "요청 흐름의 컨트롤러 앞뒤 관문인 인터셉터. HandlerInterceptor의 세 메서드(preHandle·postHandle·afterCompletion)가 각각 언제 도는지, WebMvcConfigurer로 어떻게 등록하는지, 그리고 필터와 뭐가 다른지(HandlerMethod를 안다는 것)를 정리한다."
pubDate: 2026-08-08
category: backend
parent: request-flow-filter-interceptor-aop
---

[요청 흐름 글](/blog/request-flow-filter-interceptor-aop/)에서 인터셉터가 **DispatcherServlet과 컨트롤러 사이**를 지키는 관문이라고 했다. [필터 상세](/blog/filter-types/)·[AOP 상세](/blog/aop-annotations/)를 봤으니, 이번엔 그 사이에 낀 **인터셉터**를 파고든다. 인터셉터는 세 개의 메서드로 이루어지는데, **각각 언제 도는지**만 잡으면 끝이다.

## HandlerInterceptor — 세 개의 실행 지점

인터셉터는 `HandlerInterceptor` 인터페이스를 구현한다. 메서드가 셋인데, **컨트롤러를 기준으로 앞·뒤·끝**에 하나씩 있다.

```java
public class LogInterceptor implements HandlerInterceptor {

    @Override  // ① 컨트롤러 실행 "전"
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        // 로그인 체크 등. false를 반환하면 컨트롤러로 안 감(여기서 차단)
        return true;   // true여야 진행
    }

    @Override  // ② 컨트롤러 실행 "후", 뷰 렌더 "전"
    public void postHandle(HttpServletRequest req, HttpServletResponse res,
                           Object handler, ModelAndView mav) {
        // 컨트롤러가 넘긴 ModelAndView를 만질 수 있다
    }

    @Override  // ③ 요청이 완전히 "끝난 후" (예외가 나도 호출됨)
    public void afterCompletion(HttpServletRequest req, HttpServletResponse res,
                                Object handler, Exception ex) {
        // 리소스 정리·최종 로깅. ex로 예외도 받는다
    }
}
```

## 세 메서드, 언제 도나

```
요청
 │
 ▼ preHandle()        ← 컨트롤러 "전" (false면 여기서 끝, 컨트롤러 안 감)
 │
 ▼ [ 컨트롤러 실행 ]
 │
 ▼ postHandle()       ← 컨트롤러 "후" · 뷰 렌더 "전" (예외 나면 스킵)
 │
 ▼ [ 뷰 렌더링 ]
 │
 ▼ afterCompletion()  ← 요청 "끝" (예외 나도 항상 호출)
```

| 메서드 | 시점 | 특징 |
|---|---|---|
| `preHandle` | 컨트롤러 전 | **`boolean` 반환** — `false`면 컨트롤러 차단 |
| `postHandle` | 컨트롤러 후·뷰 전 | `ModelAndView` 접근 / **예외 시 스킵** |
| `afterCompletion` | 요청 완료 후 | **예외가 나도 항상** 호출 (정리·로깅) |

핵심 셋:
- **`preHandle`의 `boolean`** — 여기서 `false`를 주면 컨트롤러로 진행하지 않는다. 인증 체크의 고전적 자리다.
- **`postHandle`은 예외가 나면 건너뛴다** — 그래서 "무조건 실행"이 필요한 정리는 여기 두면 안 된다.
- **`afterCompletion`은 예외가 나도 돈다** — try의 `finally` 같은 자리. 리소스 반납·최종 로깅은 여기.

## 등록 — WebMvcConfigurer

인터셉터도 만든다고 저절로 동작하지 않는다. `WebMvcConfigurer`의 `addInterceptors`로 등록한다. **적용/제외 경로**를 지정할 수 있는 게 필터와의 편의 차이다.

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new LogInterceptor())
                .addPathPatterns("/**")                 // 적용할 경로
                .excludePathPatterns("/css/**", "/login"); // 제외할 경로
    }
}
```

`addPathPatterns`/`excludePathPatterns`로 **어떤 URL에 걸고 뺄지**를 코드로 깔끔하게 지정한다. 필터에서 이걸 하려면 직접 경로를 비교해야 했는데, 인터셉터는 등록만으로 된다.

## 필터와 뭐가 다른가 — HandlerMethod를 안다

[요청 흐름 글](/blog/request-flow-filter-interceptor-aop/)에서 필터는 바깥(서블릿), 인터셉터는 안쪽(스프링 MVC)이라 했다. 실무적으로 갈리는 **결정적 차이**가 있다.

| | 필터 | 인터셉터 |
|---|---|---|
| 소속 | 서블릿 컨테이너 | **Spring MVC** |
| 위치 | DispatcherServlet **밖** | 컨트롤러 **앞뒤** |
| `handler` 정보 | 없음 | **어느 컨트롤러 메서드인지 앎** |
| 스프링 빈 | 접근 번거로움 | **자유롭게 주입** |
| 경로 지정 | 직접 비교 | `addPathPatterns`로 간단 |

특히 **인터셉터는 `handler` 파라미터로 "어느 컨트롤러 메서드가 이 요청을 처리하는지"(`HandlerMethod`)를 안다.** 필터는 이걸 모른다. 그래서 *"이 메서드에 특정 애노테이션이 붙어 있으면 이렇게 처리"* 같은, **핸들러 맥락이 필요한 공통 처리**는 인터셉터의 몫이다.

```java
public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
    if (handler instanceof HandlerMethod hm) {
        // hm.getMethod() — 실제 컨트롤러 메서드
        // hm.getMethodAnnotation(LoginRequired.class) — 커스텀 애노테이션 확인
    }
    return true;
}
```

## 인터셉터는 실무에서 어디에 쓰나

[요청 흐름 글](/blog/request-flow-filter-interceptor-aop/)에서 봤듯, **인증·인가는 Spring Security(필터)가 가져갔다.** 그래서 요즘 인터셉터는 *"인증이 아닌, 핸들러 단위 공통 처리"*를 맡는다.

- **요청 로깅·실행시간 측정** — `preHandle`에서 시작 시각, `afterCompletion`에서 소요 시간. 어느 핸들러가 처리했는지도 안다
- **추적용 `traceId`/MDC 세팅** — 로그 상관관계·분산추적
- **다국어 로케일 변경** — `LocaleChangeInterceptor` (스프링 기본 제공)
- **공통 헤더·파라미터 검증, 감사(audit) 로그**

## 여러 인터셉터의 순서

인터셉터가 여러 개면 **등록한 순서대로 `preHandle`이 돌고, `postHandle`·`afterCompletion`은 역순**으로 돈다. 필터와 같은 양파 구조다.

```
등록: A, B 순서일 때
preHandle:        A → B
(컨트롤러)
postHandle:       B → A
afterCompletion:  B → A
```

들어갈 때 감싼 순서대로, 나올 때 풀린다.

## 정리

- **인터셉터** = `HandlerInterceptor`, 컨트롤러 **앞·뒤·끝**에 세 메서드
  - `preHandle`(전, `boolean`으로 차단 가능) · `postHandle`(후, 예외 시 스킵) · `afterCompletion`(끝, 예외도 항상)
- **등록**: `WebMvcConfigurer.addInterceptors` + `addPathPatterns`/`excludePathPatterns`
- **필터와 차이**: 인터셉터는 **`HandlerMethod`를 알고**(어느 컨트롤러 메서드인지), 스프링 빈에 자유롭게 접근
- **실무**: 인증은 Security 필터가 가져갔고, 인터셉터는 **로깅·traceId·다국어** 등 핸들러 맥락이 필요한 공통 처리
- **순서**: 등록 순 → 컨트롤러 → 역순

이제 [필터](/blog/filter-types/)·인터셉터·[AOP](/blog/aop-annotations/) 삼형제를 다 뜯어봤다. 셋 다 "공통 처리를 한곳에 모은다"는 목적은 같지만 — **필터는 모든 요청(서블릿), 인터셉터는 핸들러 맥락(MVC), AOP는 메서드 단위**로, 각자 다른 깊이에서 요청을 다듬는다. 나에게는 인터셉터의 세 메서드가 "컨트롤러 앞·뒤·끝"이라는 걸 그림으로 그려 본 뒤로, *"이 공통 처리는 pre냐 after냐"* 를 고를 수 있게 됐다. 결국 여기서도 방향은 하나였다 — 컨트롤러 앞뒤로 반복되는 수고를, 세 지점에 나눠 필요한 만큼 자동으로.
