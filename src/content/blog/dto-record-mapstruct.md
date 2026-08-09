---
title: DTO를 현대적으로 — Record로 정의하고 MapStruct로 변환하기
description: "데이터의 여정에서 DTO↔Entity 변신이 핵심이라 했다. 그 DTO를 실제로 무엇으로 정의하고(Record), 어떻게 변환하는지(MapStruct)를 정리한다. class+롬복 대신 Record가 DTO에 맞는 이유, 손 매핑 대신 MapStruct가 컴파일 타임에 코드를 생성해 주는 원리까지."
pubDate: 2026-08-08
category: backend
parent: data-flow-dto-entity-domain
---

[데이터의 여정 글](/blog/data-flow-dto-entity-domain/)에서 데이터가 **DTO ↔ Entity로 변신하며 흐른다**고 했다. 그런데 그 글은 *"왜 나누나"*까지였다. 이번엔 실무편 — **그 DTO를 무엇으로 정의하고(Record), 어떻게 변환하는가(MapStruct)**다. 두 도구가 각각 "정의"와 "변환"을 맡는다.

## ① Record — DTO를 정의하는 현대적 방법

DTO는 대개 **값만 담고, 한 번 만들면 안 바뀌는(불변)** 객체다. 예전엔 이걸 `class + 롬복`으로 만들었다.

```java
// 예전 — class + 롬복
@Getter
@AllArgsConstructor
public class UserResponse {
    private final Long id;
    private final String name;
    private final String email;
}
```

Java 16부터는 **Record** 한 줄이면 끝난다.

```java
// 지금 — Record
public record UserResponse(Long id, String name, String email) {}
```

이 한 줄이 **생성자·게터·`equals`·`hashCode`·`toString`을 전부 자동**으로 만든다. 게다가 필드가 **불변(final)**이라, "값만 실어 나르는 DTO"의 성격과 정확히 맞는다.

```java
UserResponse u = new UserResponse(1L, "하루", "haru@x.com");
u.name();   // 게터는 getName()이 아니라 name() — "get" 없이 필드명 그대로
```

### 롬복 @Value vs Record

불변 객체를 만드는 롬복 `@Value`와 자주 비교된다.

| | 롬복 `@Value` | **Record** |
|---|---|---|
| 불변 | O | O |
| 게터 | `getName()` | `name()` |
| 출처 | **라이브러리** 필요 | **자바 언어 기본**(16+) |
| 상속 | 제한적 가능 | 불가 (final) |

[롬복 글](/blog/lombok/)에서 봤듯 롬복도 훌륭하지만, **불변 DTO라면 언어 기본인 Record가 더 깔끔**하다. 라이브러리 없이, 자바 문법 그 자체니까.

### 주의 — Entity에는 Record를 쓰지 않는다

Record는 **DTO 전용**이라고 봐야 한다. JPA **Entity는 Record로 만들면 안 된다.**

- JPA Entity는 **기본 생성자(no-arg)**가 필요하고, 프록시·지연로딩 때문에 **가변**이어야 한다
- Record는 불변이고 기본 생성자가 없다 → JPA와 안 맞는다

그래서 **Entity는 `class`, DTO는 `Record`** 로 나눠 쓴다. [데이터의 여정](/blog/data-flow-dto-entity-domain/)에서 둘을 나눈 이유가 여기서 도구 선택으로도 갈린다.

## ② MapStruct — DTO ↔ Entity 변환 자동화

DTO와 Entity가 나뉘어 있으니, 둘 사이를 **변환**해야 한다. 손으로 하면 이렇게 노가다다.

```java
// 손 매핑 — 필드 많아지면 지옥
User user = new User();
user.setName(request.name());
user.setEmail(request.email());
user.setAge(request.age());
// ... 필드 20개면 20줄
```

**MapStruct**는 이 변환 코드를 **컴파일 타임에 자동 생성**해 준다. 우리는 **인터페이스만** 선언하면 된다.

```java
@Mapper(componentModel = "spring")   // 스프링 빈으로 등록
public interface UserMapper {
    UserResponse toResponse(User user);       // Entity → DTO
    User toEntity(UserRequest request);       // DTO → Entity
}
```

메서드 **시그니처만** 적었는데, 빌드하면 MapStruct가 **구현체를 만들어** 준다. `target/generated-sources`를 열어 보면 실제로 이런 코드가 생성돼 있다.

```java
// MapStruct가 자동 생성한 UserMapperImpl (우리가 안 짠 코드!)
@Component
public class UserMapperImpl implements UserMapper {
    public UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail());
    }
}
```

우리가 손으로 짤 뻔한 그 노가다를, **컴파일러가 대신 짜 준** 것이다. 이후엔 스프링 빈처럼 주입해 쓴다.

```java
private final UserMapper mapper;   // 주입
...
return mapper.toResponse(user);    // 변환 끝
```

### 필드 이름이 다를 땐 @Mapping

DTO와 Entity의 필드명이 같으면 **자동 매핑**이지만, 다르면 짚어 준다.

```java
@Mapping(source = "username", target = "name")   // username → name
UserResponse toResponse(User user);
```

### 왜 MapStruct인가 — vs ModelMapper

비슷한 도구로 **ModelMapper**도 있다. 차이가 중요하다.

| | **MapStruct** | ModelMapper |
|---|---|---|
| 방식 | **컴파일 타임 코드 생성** | 런타임 리플렉션 |
| 속도 | 빠름 (그냥 자바 코드) | 느림 (리플렉션) |
| 안전성 | **컴파일 때 오류 발견** | 런타임에 터짐 |
| 확인 | 생성 코드를 **눈으로** 볼 수 있음 | 내부에서 동작 (안 보임) |

MapStruct는 **생성된 코드가 그냥 평범한 자바**라, 빠르고 타입 안전하고 디버깅도 쉽다. 그래서 실무에서 더 선호된다.

## 둘을 합치면

**Record로 DTO를 정의**하고, **MapStruct로 Entity와 변환**한다 — 이게 요즘 DTO를 다루는 표준 조합이다.

```java
// 정의 (Record)
public record UserRequest(String name, String email) {}
public record UserResponse(Long id, String name, String email) {}

// 변환 (MapStruct)
@Mapper(componentModel = "spring")
public interface UserMapper {
    User toEntity(UserRequest request);
    UserResponse toResponse(User user);
}
```

[데이터의 여정](/blog/data-flow-dto-entity-domain/)의 그 흐름 — 요청이 `UserRequest`로 들어와 `User` Entity가 되고, 다시 `UserResponse`로 나가는 — 이 **변신 전체가 Record + MapStruct 몇 줄**로 정리된다.

## 정리

- **Record**: 불변 DTO를 한 줄로 정의 (생성자·게터·equals 자동). 게터는 `name()`
  - 롬복 `@Value`보다 **언어 기본**이라 깔끔 / 단 **Entity엔 쓰지 말 것**(JPA는 가변·기본생성자 필요)
- **MapStruct**: DTO↔Entity 변환을 **컴파일 타임에 자동 생성**
  - 인터페이스만 선언 → `~MapperImpl` 생성 / `@Mapping`으로 이름 다른 필드 매핑
  - **ModelMapper(런타임 리플렉션)보다 빠르고 안전** (생성 코드가 평범한 자바)
- **표준 조합**: Record(정의) + MapStruct(변환)

여기서도 방향은 같다 — DTO를 정의하고 변환하는 **반복되는 수고**를, Record는 언어 문법으로, MapStruct는 컴파일러 코드 생성으로 덜어낸다. 다만 이 둘은 **직접 설정하고 빌드해서, 생성된 코드를 눈으로 확인**할 때 진짜로 와닿는다. 그러니 이 글은 지도로 두고, 실제 프로젝트에서 의존성을 넣고 매퍼 하나를 만들어 `target/generated-sources`를 열어 보길 — *"아, 이래서 자동이구나"* 가 그 순간 손에 잡힌다.
