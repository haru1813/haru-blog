---
title: 이클립스 Dynamic Web Project와 서블릿(Servlet) — Java 웹의 출발점
description: 이클립스의 Dynamic Web Project는 어떤 구조이고, 그 안에서 요청을 처리하는 서블릿은 무엇인지. Java 웹의 뿌리이자 Spring의 밑바탕을 정리한다.
pubDate: 2026-08-02
category: backend
---

[지난 글](/blog/web-server-vs-was/)에서 "WAS는 동적 요청을 처리한다"고 했다. 그런데 그 WAS(톰캣) 안에서 **실제로 요청을 받아 응답을 만들어내는 주인공**이 바로 서블릿(Servlet)이다. 그리고 그 서블릿을 만들고 톰캣에 올려 돌려보는 전통적인 출발점이 이클립스의 **Dynamic Web Project**다. Java 웹의 뿌리를 정리해 둔다.

## Dynamic Web Project란

이클립스에서 **Java 웹 애플리케이션(Servlet · JSP)을 개발하기 위한 프로젝트 유형**이다. 일반 Java 프로젝트가 `main()`을 실행하는 콘솔 앱이라면, Dynamic Web Project는 **톰캣 같은 WAS 위에서 돌아가는 웹앱**을 만든다.

핵심은 **"WAS에 배포될 수 있는 표준 구조(WAR)"**로 프로젝트가 짜인다는 점이다. 그래서 폴더 구조가 정해져 있다.

```
MyWebApp
├── Java Resources/src        // 자바 소스(서블릿 등)
└── WebContent/               // (버전에 따라 src/main/webapp)
    ├── index.html            // 정적 리소스
    ├── view.jsp              // JSP
    └── WEB-INF/
        ├── web.xml           // 배포 서술자(설정)
        ├── lib/              // 외부 라이브러리(jar)
        └── classes/          // 컴파일된 클래스
```

여기서 **`WEB-INF` 폴더가 중요하다.** 이 안의 파일들은 **브라우저에서 직접 접근할 수 없다.** 예를 들어 `WEB-INF/web.xml`이나 그 안의 클래스는 URL로 못 부른다. 설정과 로직을 외부에 노출하지 않기 위한 약속이다.

## 서블릿이란

**서블릿은 웹 요청을 처리하기 위해 Java로 작성하는 클래스**다. 브라우저의 HTTP 요청을 받아서, 로직을 실행하고, 응답(HTML·JSON 등)을 만들어 돌려준다.

- `HttpServlet`을 상속받아 만든다.
- 요청 방식에 따라 **`doGet()`**(조회)·**`doPost()`**(전송) 같은 메서드를 오버라이드한다.
- 이 서블릿을 실행해 주는 게 바로 **서블릿 컨테이너(톰캣)**다.

즉 지난 글의 비유를 이어가면 — WAS가 "주방"이라면, **서블릿은 그 주방에서 주문을 받아 요리하는 요리사**다.

### 가장 단순한 서블릿

```java
import java.io.IOException;
import java.io.PrintWriter;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@WebServlet("/hello")               // 이 URL로 오는 요청을 이 서블릿이 처리
public class HelloServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        resp.setContentType("text/html; charset=UTF-8");
        PrintWriter out = resp.getWriter();
        out.println("<h1>안녕하세요, 서블릿입니다.</h1>");
    }
}
```

톰캣을 켜고 `http://localhost:8080/MyWebApp/hello` 로 접속하면, `doGet()`이 실행되어 그 HTML이 응답으로 돌아온다.

## 서블릿은 어떻게 매핑되나

"어떤 URL을 어떤 서블릿이 처리할지"를 연결하는 걸 **매핑**이라 한다. 두 가지 방식이 있다.

**1. 애노테이션(`@WebServlet`)** — 위 예시처럼 클래스에 바로 붙인다. Servlet 3.0부터 지원되어 요즘은 이게 편하다.

**2. `web.xml`** — 설정 파일에 명시한다. 옛 방식이지만 여전히 쓰인다.

```xml
<servlet>
    <servlet-name>hello</servlet-name>
    <servlet-class>com.example.HelloServlet</servlet-class>
</servlet>
<servlet-mapping>
    <servlet-name>hello</servlet-name>
    <url-pattern>/hello</url-pattern>
</servlet-mapping>
```

## 서블릿의 생명주기

서블릿은 **매 요청마다 새로 만들어지지 않는다.** 컨테이너가 딱 한 번 만들어 두고 재사용한다. 흐름은 이렇다.

```
1. init()      // 최초 한 번. 서블릿 초기화
2. service()   // 요청이 올 때마다 호출 → doGet()/doPost()로 분기
3. destroy()   // 종료 시 한 번. 자원 정리
```

`init()`과 `destroy()`는 **한 번씩**, `service()`는 **요청마다** 불린다. 이 구조 덕에 서블릿은 한 개의 인스턴스로 수많은 요청을 처리한다(그래서 인스턴스 변수에 요청별 데이터를 담으면 안 된다 — 흔한 실수다).

## 요청이 흐르는 전체 그림

```
브라우저  ── GET /hello ──▶  톰캣(WAS)
                               │  URL 매핑 확인
                               ▼
                          HelloServlet.doGet()
                               │  로직 실행
                               ▼
                          응답(HTML) ──▶ 브라우저
```

## 그래서 Spring과 무슨 상관일까

여기까지 이해하면 Spring이 덜 낯설어진다. **Spring MVC도 결국 서블릿 위에서 돈다.**

Spring에는 `DispatcherServlet`이라는 **단 하나의 서블릿**이 있다. 모든 요청이 일단 이 서블릿으로 들어오고, 그 안에서 알맞은 컨트롤러(`@Controller`)로 나눠 보낸다. 즉 우리가 서블릿을 URL마다 하나씩 만들던 걸, Spring은 **하나의 서블릿(DispatcherServlet)이 대신 받아 분배**하는 구조로 바꾼 것이다.

그러니 서블릿을 알고 나면 이런 문장이 이해된다 — *"Spring은 서블릿을 감춰서 편하게 만든 것이다."*

## 정리

- **Dynamic Web Project**: 이클립스에서 WAS에 배포될 웹앱을 만드는 프로젝트. `WEB-INF` 등 표준 구조를 갖는다.
- **서블릿**: 요청을 받아 응답을 만드는 Java 클래스. `HttpServlet`을 상속하고 `doGet`/`doPost`를 구현한다.
- **생명주기**: `init` → `service`(요청마다) → `destroy`.
- **Spring과의 관계**: Spring MVC는 `DispatcherServlet`이라는 서블릿 하나로 모든 요청을 받아 분배한다. 서블릿은 그 밑바탕이다.

PHP에서 Java로 넘어오며 가장 도움이 됐던 건, 프레임워크를 배우기 전에 **이 서블릿이라는 뿌리를 먼저 본 것**이었다. 뿌리를 보고 나니 Spring이 "마법"이 아니라 "정리된 서블릿"으로 보였다.
