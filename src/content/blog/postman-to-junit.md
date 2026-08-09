---
title: Postman에서 JUnit으로 — @WebMvcTest로 API 테스트 자동화하기
description: "Postman으로 손수 눌러 확인하던 API 테스트를, @WebMvcTest·MockMvc·@MockBean으로 코드화하는 과정을 나란히 비교한다. 그리고 JUnit 5 핵심 애노테이션과 스프링 테스트 애노테이션(@SpringBootTest·@WebMvcTest·@DataJpaTest·@MockBean)을 한자리에 정리한다."
pubDate: 2026-08-08
category: backend
parent: junit-testing
---

[JUnit 글](/blog/junit-testing/)에서 테스트의 기본을 봤다. 그런데 실무에서 API를 만들면 보통 **Postman**으로 눌러 확인한다. *"그럼 JUnit은 왜?"* — 답은 **"한 번 확인"이 아니라 "매번 자동 확인"**이었다. 이번엔 Postman으로 하던 걸 **JUnit 코드로 옮기면** 어떻게 되는지 나란히 보고, **테스트 애노테이션**을 한자리에 정리한다.

## Postman으로 하던 것

주문 조회 API를 테스트한다고 하자. Postman에선 이렇게 한다.

```
GET  http://localhost:8080/orders/999      ← 손으로 요청
────────────────────────────────────────
응답:  404 Not Found                        ← 눈으로 확인
      { "code": "NOT_FOUND", "message": "없음" }
```

되는 걸 확인했다. 문제는 — **코드를 고칠 때마다 이걸 손으로 다시** 눌러야 하고, API가 수십 개면 수십 번 반복이다.

## 같은 걸 JUnit으로

`@WebMvcTest`로 **컨트롤러만 떼어내** 같은 요청을 코드로 보낸다.

```java
@WebMvcTest(OrderController.class)   // 이 컨트롤러의 웹 계층만 로드
class OrderControllerTest {

    @Autowired MockMvc mvc;          // 진짜 서버 없이 HTTP 요청을 흉내
    @MockBean OrderService service;  // 서비스는 가짜로 대체

    @Test
    void 없는_주문은_404() throws Exception {
        // given — 서비스가 예외를 던지도록 세팅
        given(service.find(999L)).willThrow(new OrderNotFoundException("없음"));

        // when + then — 요청 보내고, 응답을 검증
        mvc.perform(get("/orders/999"))
           .andExpect(status().isNotFound())                  // 404 인가
           .andExpect(jsonPath("$.code").value("NOT_FOUND")); // 바디의 code 필드
    }
}
```

Postman에서 **눈으로 보던 것**(상태코드·바디)이, 여기선 **`andExpect`로 코드가 검증**한다. 이제 이 테스트는 **버튼 한 번에 자동으로** 돈다.

## 나란히 비교

| | Postman | JUnit(`@WebMvcTest`) |
|---|---|---|
| 요청 보내기 | 손으로 URL 입력 | `mvc.perform(get("/orders/999"))` |
| 상태코드 확인 | 눈으로 `404` | `.andExpect(status().isNotFound())` |
| 바디 확인 | 눈으로 JSON | `.andExpect(jsonPath("$.code").value(...))` |
| 서비스/DB | 진짜로 떠 있어야 함 | `@MockBean`으로 가짜 (DB 불필요) |
| 반복 | 매번 손으로 | 버튼 한 번에 전부 |

핵심은 **"눈으로 확인"이 "코드로 단언"으로 바뀌었다**는 것. 사람의 눈 대신 `andExpect`가 판정하니, 몇 번을 돌려도 지치지 않고 정확하다.

## MockMvc 문법 — 요청·검증 조립

`MockMvc`는 세 조각으로 읽으면 쉽다.

```java
mvc.perform( 요청 )      // 무엇을 보내나
   .andExpect( 검증 )    // 무엇을 기대하나 (여러 개 체이닝)
   .andDo( print() );    // 부가 동작 (요청·응답 콘솔 출력 — 디버깅용)
```

- **요청**: `get(...)`, `post(...)`, `put(...)`, `delete(...)` — 여기에 `.content(json)`, `.contentType(...)`, `.param(...)`을 붙인다
- **검증**: `status().isOk()`·`isNotFound()`·`isCreated()`, `jsonPath("$.필드").value(...)`, `content().json(...)`

```java
// POST에 JSON 본문 실어 보내고, 201 + 생성된 id 검증
mvc.perform(post("/orders")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"item\":\"사과\",\"qty\":3}"))
   .andExpect(status().isCreated())
   .andExpect(jsonPath("$.id").exists());
```

## 자주 쓰는 애노테이션 정리

### ① JUnit 5 핵심 (테스트 그 자체)

| 애노테이션 | 역할 |
|---|---|
| `@Test` | 테스트 메서드 표시 |
| `@BeforeEach` / `@AfterEach` | 각 테스트 전/후 (매번) |
| `@BeforeAll` / `@AfterAll` | 전체 시작 전/끝난 후 (1회, static) |
| `@DisplayName("...")` | 테스트 이름을 사람 말로 |
| `@Disabled` | 이 테스트 잠시 끄기 |
| `@ParameterizedTest` | 여러 입력값으로 반복 |
| `@Nested` | 관련 테스트를 중첩 클래스로 묶기 |

### ② 스프링 테스트 (컨텍스트 로딩 범위)

여기가 실무에서 자주 헷갈리는 지점이다. **"얼마나 로드하느냐"**로 나뉜다.

| 애노테이션 | 로드 범위 | 언제 |
|---|---|---|
| `@SpringBootTest` | **전체** 컨텍스트 | 통합 테스트 (여러 계층 함께) |
| `@WebMvcTest` | **컨트롤러(웹) 계층만** | 컨트롤러 단위 (MockMvc 제공) |
| `@DataJpaTest` | **JPA/리포지토리 계층만** | 리포지토리 단위 (임베디드 DB) |

범위가 좁을수록(`@WebMvcTest`·`@DataJpaTest`) **빠르고 격리**되고, `@SpringBootTest`는 **느리지만 진짜에 가깝다.** 컨트롤러만 볼 땐 굳이 전체를 띄우지 말고 `@WebMvcTest`를 쓰는 게 정석이다.

### ③ 협력 애노테이션 (자주 같이 쓰임)

| 애노테이션 | 역할 |
|---|---|
| `@Autowired` | 테스트에 `MockMvc` 등 주입 |
| `@MockBean` | 스프링 컨텍스트의 빈을 **Mock(가짜)**으로 교체 |
| `@SpyBean` | 진짜 빈을 감싸 일부만 가짜로 |
| `@AutoConfigureMockMvc` | `@SpringBootTest`에서도 `MockMvc` 쓰게 |
| `@ActiveProfiles("test")` | 테스트용 프로파일 활성화 |
| `@Sql("...")` | 테스트 전 SQL 실행 (데이터 준비) |

> `@MockBean`은 [Mock 개념](/blog/junit-testing/)의 그 "가짜 객체"를 **스프링 컨텍스트에 꽂는** 버전이다. `@WebMvcTest`로 컨트롤러만 띄우면 서비스 빈이 없으니, `@MockBean`으로 가짜 서비스를 채워 넣는 것이다.

## 정리

- **Postman = 한 번 수동 확인 / JUnit = 매번 자동 검증** — 대체가 아니라 보완
- **`@WebMvcTest` + `MockMvc`**로 컨트롤러를 떼어내 API를 코드로 테스트
- **눈으로 보던 것**(상태·바디)을 **`andExpect`로 단언**
- **범위 애노테이션**: `@SpringBootTest`(전체) · `@WebMvcTest`(웹만) · `@DataJpaTest`(JPA만) — 좁을수록 빠르고 격리
- **협력**: `@MockBean`(가짜 빈) · `@Autowired`(주입) · `@AutoConfigureMockMvc`

Postman으로 *"어, 되네"* 하던 순간을 코드로 박아 두면, 그 순간이 **영원히 반복 검증**된다. 나에게는 이걸 옮겨 본 뒤로, API를 고칠 때 Postman을 다시 다 눌러 보는 대신 **테스트 초록불 하나로 안심**하게 됐다. 결국 여기서도 방향은 하나였다 — 손으로 눌러 확인하던 수고를, 코드에 담아 필요한 만큼 자동으로.
