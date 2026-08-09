---
title: JUnit 5로 테스트 시작하기 — @Test·단언·생명주기, 그리고 스프링까지
description: "main에 print 찍어 확인하던 걸 자동화하는 테스트 프레임워크 JUnit. JUnit 4에서 5(Jupiter)로의 변화, @Test·assertEquals·assertThrows 같은 단언, @BeforeEach 등 생명주기 애노테이션, given-when-then 패턴, 그리고 @SpringBootTest·@WebMvcTest 맛보기까지 정리한다."
pubDate: 2026-08-08
category: backend
---

코드를 짜면 늘 궁금하다. **"이거 진짜 잘 돌아가나?"** 그때마다 `main`에 `System.out.println`을 찍어 눈으로 확인하곤 한다. 그런데 코드가 늘어나면 이 방식은 무너진다 — 매번 손으로 확인할 수 없고, 예전에 되던 게 지금도 되는지 모른다. 이걸 **자동으로, 반복 가능하게** 확인해 주는 게 테스트 프레임워크 **JUnit**이다.

## JUnit 4에서 5로 — 이름부터 바뀌었다

먼저 버전 정리. 예전 자료는 **JUnit 4**, 요즘은 **JUnit 5(=Jupiter)**다. 스프링 부트도 기본이 JUnit 5다. 애노테이션 **이름이 바뀌어서** 옛날 코드와 헷갈리기 쉽다.

| JUnit 4 | JUnit 5 | 뜻 |
|---|---|---|
| `@Test` (org.junit) | `@Test` (org.junit.**jupiter**.api) | 테스트 메서드 |
| `@Before` | `@BeforeEach` | 각 테스트 **전** |
| `@After` | `@AfterEach` | 각 테스트 **후** |
| `@BeforeClass` | `@BeforeAll` | 전체 시작 전 (1회) |
| `@AfterClass` | `@AfterAll` | 전체 끝난 후 (1회) |
| `@Ignore` | `@Disabled` | 테스트 비활성 |
| `@RunWith` | `@ExtendWith` | 확장 등록 |

핵심은 — **import 경로가 `org.junit.jupiter.api`면 JUnit 5**다. 이걸로 어느 버전인지 바로 안다.

## 첫 테스트 — @Test

테스트는 **"이런 입력이면 이런 결과가 나와야 한다"**를 코드로 박아 두는 것이다.

```java
class CalculatorTest {

    @Test
    void 덧셈() {
        Calculator calc = new Calculator();
        int result = calc.add(2, 3);
        assertEquals(5, result);   // 기대값 5, 실제값 result
    }
}
```

`@Test`가 붙은 메서드를 JUnit이 찾아서 실행한다. `assertEquals(5, result)`에서 **기대값과 실제값이 다르면 테스트 실패**로 빨간불이 켜진다. 이제 `println`으로 눈 굴릴 필요 없이, **"통과/실패"로 자동 판정**된다.

## 단언(assertion) — 무엇을 검증하나

테스트의 심장은 **단언**이다. "이래야 한다"를 선언하는 것.

```java
assertEquals(expected, actual);     // 같은가
assertTrue(condition);              // 참인가
assertFalse(condition);             // 거짓인가
assertNull(value);                  // null인가
assertNotNull(value);               // null이 아닌가

// 예외가 나야 하는 경우 — 이게 유용하다
assertThrows(IllegalArgumentException.class,
        () -> calc.divide(1, 0));   // 0으로 나누면 예외 나야 통과

// 여러 개를 한 번에 (하나 실패해도 나머지 다 확인)
assertAll(
    () -> assertEquals("하루", user.getName()),
    () -> assertEquals(34, user.getAge())
);
```

`assertThrows`가 특히 좋다. **"이 상황에선 예외가 나야 정상"**을 검증할 수 있다. [예외 처리 글](/blog/spring-exception-handling/)에서 만든 커스텀 예외가 제대로 던져지는지 테스트할 때 쓴다.

### AssertJ — 더 읽기 좋은 단언

실무에선 JUnit 기본 단언보다 **AssertJ**(`assertThat`)를 더 많이 쓴다. **영어 문장처럼 읽혀서** 가독성이 좋다. 스프링 부트 스타터에 기본 포함돼 있다.

```java
import static org.assertj.core.api.Assertions.assertThat;

assertThat(result).isEqualTo(5);
assertThat(user.getName()).isEqualTo("하루");
assertThat(list).hasSize(3).contains("a", "b");   // 체이닝
```

`assertThat(result).isEqualTo(5)` — *"result가 5와 같음을 단언한다"*가 그대로 읽힌다. 기대값·실제값 순서를 헷갈릴 일도 없다.

## 생명주기 — @BeforeEach로 준비를 모은다

테스트마다 반복되는 **준비 작업**은 `@BeforeEach`로 뺀다.

```java
class OrderServiceTest {

    OrderService service;

    @BeforeEach       // 각 테스트 실행 "전"에 매번 호출
    void setUp() {
        service = new OrderService();   // 매 테스트마다 새 객체
    }

    @Test void 주문_생성() { /* service 바로 사용 */ }
    @Test void 주문_취소() { /* 여기서도 깨끗한 service */ }

    @AfterEach        // 각 테스트 "후" (정리)
    void tearDown() { /* 리소스 정리 */ }
}
```

실행 순서는 이렇다.

```
@BeforeAll  (전체 시작 전, 딱 1번 — static)
  ├ @BeforeEach → @Test(주문_생성) → @AfterEach
  └ @BeforeEach → @Test(주문_취소) → @AfterEach
@AfterAll   (전체 끝난 후, 딱 1번 — static)
```

핵심은 **`@BeforeEach`가 테스트마다 새로 돈다**는 것. 그래서 각 테스트는 **서로 독립적**이다 — 앞 테스트가 남긴 상태가 다음 테스트를 오염시키지 않는다. 이게 테스트의 기본 원칙이다.

## 알아 두면 좋은 애노테이션

| 애노테이션 | 역할 |
|---|---|
| `@DisplayName("주문을 생성한다")` | 테스트 이름을 사람 말로 (리포트에 표시) |
| `@Disabled` | 이 테스트 잠시 끄기 |
| `@ParameterizedTest` | **여러 입력값**으로 같은 테스트 반복 |
| `@Nested` | 관련 테스트를 **중첩 클래스**로 묶기 |

`@ParameterizedTest`는 입력만 바꿔 가며 도는 테스트에 유용하다.

```java
@ParameterizedTest
@ValueSource(ints = {1, 2, 3, 100})   // 이 값들을 하나씩 넣어 4번 실행
void 양수인지(int number) {
    assertThat(number).isPositive();
}
```

## given-when-then — 테스트를 읽기 쉽게

테스트 본문은 보통 **세 덩어리**로 나눠 쓴다. 관례처럼 굳은 패턴이다.

```java
@Test
void 주문_금액_계산() {
    // given — 준비 (입력·상황 세팅)
    Order order = new Order();
    order.addItem("사과", 1000, 3);

    // when — 실행 (테스트할 행동)
    int total = order.getTotalPrice();

    // then — 검증 (기대 결과)
    assertThat(total).isEqualTo(3000);
}
```

*준비하고(given), 실행하고(when), 확인한다(then).* 이 틀로 쓰면 남이 봐도 **"뭘 테스트하는지"**가 한눈에 들어온다.

## 스프링과 연결 (맛보기)

스프링 부트에선 JUnit 위에 **테스트용 애노테이션**이 얹힌다. 상황에 따라 골라 쓴다.

| 애노테이션 | 범위 |
|---|---|
| `@SpringBootTest` | **전체** 컨텍스트 (통합 테스트) |
| `@WebMvcTest` | **컨트롤러 계층만** (MockMvc로 HTTP 흉내) |
| `@DataJpaTest` | **JPA/리포지토리 계층만** |

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired MockMvc mvc;      // 진짜 서버 없이 HTTP 요청 흉내
    @MockBean OrderService service;   // 서비스는 가짜로 대체

    @Test
    void 주문_조회_404() throws Exception {
        given(service.find(999L)).willThrow(new OrderNotFoundException("없음"));

        mvc.perform(get("/orders/999"))
           .andExpect(status().isNotFound());   // 404 나오는지 검증
    }
}
```

여기서 **`@MockBean`**(가짜 객체)이 나오는데, 이건 **Mockito**라는 별도 라이브러리의 힘이다. "서비스는 진짜로 안 부르고 정해진 답만 내놓게" 만들어, 컨트롤러만 딱 떼어 테스트한다. (이 슬라이스 테스트와 Mockito는 주제가 커서, 다음 글에서 따로 다루면 좋겠다.)

## 정리

- **JUnit** = "잘 되나"를 `println` 대신 **자동·반복 검증**하는 프레임워크
- **버전**: import가 `org.junit.jupiter.api`면 **JUnit 5** (`@Before`→`@BeforeEach` 식으로 이름 바뀜)
- **`@Test`** + **단언**(`assertEquals`·`assertThrows`·`assertAll`) — 특히 `assertThrows`로 예외도 검증
- **AssertJ**(`assertThat`) — 영어처럼 읽히는 단언, 실무 선호
- **생명주기**: `@BeforeEach`로 준비를 모으고, 각 테스트는 **독립**
- **패턴**: `@DisplayName`·`@ParameterizedTest`, given-when-then
- **스프링**: `@SpringBootTest`·`@WebMvcTest`·`@DataJpaTest` + Mockito(`@MockBean`)

테스트를 쓰기 시작하면 개발이 달라진다. **"고치고 나서 다 깨졌는지 손으로 확인"**하던 걸, 버튼 한 번으로 전부 검증하게 된다. 나에게는 리팩터링이 무섭지 않아진 게 가장 컸다 — 테스트가 초록불이면, 바꿔도 안 깨졌다는 뜻이니까. 결국 여기서도 방향은 하나였다 — 매번 손으로 확인하던 수고를, 자동으로 반복되게.
