---
title: application.yml vs application.properties — 스프링 부트 설정 파일
description: "스프링 부트 설정이 사는 곳. properties(key=value)와 yml(계층 구조)의 차이, 어느 걸 왜 쓰는지, 프로파일로 환경(dev/prod)을 나누는 법, @Value·@ConfigurationProperties로 값을 읽는 법, 그리고 설정 우선순위까지 정리한다."
pubDate: 2026-08-08
category: backend
---

[로깅 글](/blog/logging/)에서 `application.yml`에 로그 레벨을 적었고, DB·JPA 설정도 여기 들어간다. 그런데 `application.properties`라는 것도 보인다. **이 둘은 뭐고, 뭐가 다를까?** 스프링 부트 설정이 사는 그 파일을 정리한다.

## 설정이 사는 곳

스프링 부트는 `src/main/resources/` 아래의 **`application.properties`** 또는 **`application.yml`**을 **자동으로 읽는다.** 포트·DB·JPA·로깅 같은 걸 여기 적으면, 부트가 알아서 반영한다. 별도 등록 코드가 필요 없다 — **파일 이름이 곧 약속(컨벤션)**이다.

형식은 두 가지, **properties**와 **yml(YAML)**. 담는 내용은 같고 **표기법만 다르다.**

## 같은 설정, 두 표기법

같은 설정을 각각 써보면 차이가 한눈에 보인다.

**application.properties** — `key=value` 한 줄씩

```properties
server.port=8080
spring.datasource.url=jdbc:mysql://localhost/mydb
spring.datasource.username=root
spring.datasource.password=1234
spring.jpa.hibernate.ddl-auto=update
```

**application.yml** — 계층 구조(들여쓰기)

```yaml
server:
  port: 8080
spring:
  datasource:
    url: jdbc:mysql://localhost/mydb
    username: root
    password: 1234
  jpa:
    hibernate:
      ddl-auto: update
```

properties는 `spring.datasource.`를 **매번 반복**하지만, yml은 계층으로 묶어 **중복을 없앤다.** 설정이 많아질수록 yml이 훨씬 읽기 좋다.

## 어느 걸 쓰나

| | properties | yml |
|---|---|---|
| 형식 | `key=value` | 계층(들여쓰기) |
| 장점 | 단순·명확 | **계층 가독성**, 중복 제거 |
| 단점 | prefix 반복 | **들여쓰기에 민감** |
| 배열/목록 | 표현 번거로움 | 깔끔하게 표현 |

요즘은 **yml을 더 선호**한다. 설정이 계층적으로 정리돼 보기 좋고, 목록·중첩 구조를 표현하기 편해서다. 다만 **yml은 들여쓰기(보통 2칸)에 민감**해서, 탭을 섞거나 칸이 어긋나면 에러가 난다. (둘을 동시에 두면 properties가 우선하니, 하나만 쓰는 게 좋다.)

## 프로파일 — 환경(dev/prod)을 나눈다

개발 DB와 운영 DB가 다르듯, **환경마다 설정이 다르다.** 이걸 **프로파일(profile)**로 나눈다. `application-{프로파일}.yml` 파일을 만들면 된다.

```
application.yml          ← 공통
application-dev.yml      ← 개발용
application-prod.yml     ← 운영용
```

```yaml
# application.yml (공통) — 어떤 프로파일을 켤지
spring:
  profiles:
    active: dev          # dev 프로파일 활성화

# application-dev.yml
server:
  port: 8080
spring:
  jpa:
    show-sql: true       # 개발에선 SQL 출력

# application-prod.yml
server:
  port: 80
spring:
  jpa:
    show-sql: false      # 운영에선 끔
```

`spring.profiles.active`로 **어느 환경을 켤지** 정하면, 공통(`application.yml`) + 해당 프로파일 파일이 합쳐진다. [로깅 글](/blog/logging/)에서 *"개발은 DEBUG, 운영은 INFO"* 로 나눈 게 바로 이 프로파일로 관리된다.

## 설정 값을 코드에서 읽기

설정 파일의 값을 자바 코드로 가져오는 방법이 둘 있다.

**① `@Value` — 값 하나씩**

```java
@Value("${server.port}")
private int port;

@Value("${app.name:기본값}")   // 없으면 "기본값"
private String appName;
```

**② `@ConfigurationProperties` — 묶어서 객체로**

여러 값을 **객체 하나에 통째로** 바인딩한다. 관련 설정이 많을 때 깔끔하다.

```yaml
# application.yml
app:
  name: HaruVerse
  version: 1.0
  admin-email: haru@x.com
```

```java
@ConfigurationProperties(prefix = "app")
@Component
public class AppProperties {
    private String name;
    private String version;
    private String adminEmail;   // admin-email → adminEmail 자동 매핑
    // getter/setter
}
```

- **`@Value`** — 값 몇 개 간단히 꺼낼 때
- **`@ConfigurationProperties`** — 관련 설정을 **묶음으로** 다룰 때 (타입 안전·자동완성 이점)

## 설정 우선순위 — 파일이 전부가 아니다

같은 설정을 여러 곳에 두면 **더 바깥의 것이 이긴다.** 대략 이런 순서다(위가 셈).

```
커맨드라인 인자   --server.port=9090      ← 제일 셈
   ▼
환경변수         SERVER_PORT=9090
   ▼
application.yml / properties
   ▼
기본값                                  ← 제일 약함
```

그래서 **운영 서버에선 비밀번호 같은 민감정보를 파일이 아니라 환경변수로** 주입하는 식으로 덮어쓴다. 코드·파일은 그대로 두고, 배포 환경에서 값만 갈아끼우는 것이다.

## 정리

- 스프링 부트는 `src/main/resources/`의 **`application.yml`/`.properties`를 자동 로드**
- **properties**(`key=value`) vs **yml**(계층) — 담는 건 같고 표기만 다름, 요즘은 **yml 선호**(가독성·중복 제거, 단 들여쓰기 민감)
- **프로파일**: `application-{env}.yml` + `spring.profiles.active`로 dev/prod 분리
- **값 읽기**: `@Value`(하나씩) / `@ConfigurationProperties`(묶음)
- **우선순위**: 커맨드라인 > 환경변수 > 파일 > 기본 — 민감정보는 환경변수로 덮어쓰기

설정 파일은 **코드를 안 건드리고 동작을 바꾸는 스위치판**이다. 포트를 바꾸든, DB를 갈아끼우든, 로그 레벨을 조정하든 — 재컴파일 없이 이 파일 하나로 된다. 나에게는 dev/prod 프로파일을 나눠 본 뒤로, "개발에서 되던 게 운영에서 왜 다르지" 하는 혼란이 사라졌다. 결국 여기서도 방향은 하나였다 — 환경마다 바뀌는 값을 코드에서 떼어, 파일과 환경변수로 필요한 만큼 갈아끼운다.
