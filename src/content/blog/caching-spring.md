---
title: 스프링 캐싱 완전 정리 — @Cacheable·@CachePut·@CacheEvict와 Redis 연동
description: "캐싱을 실전으로. @EnableCaching으로 켜고, @Cacheable(조회 캐시)·@CachePut(갱신)·@CacheEvict(삭제)로 다루는 법, key·condition·unless 조건, CacheManager 추상화로 로컬(Caffeine)에서 Redis로 갈아끼우는 법, TTL과 주의점(self-invocation)까지 정리한다."
pubDate: 2026-08-08
category: backend
parent: caching-event-async
---

[개념 글](/blog/caching-event-async/)에서 캐싱이 *"반복 조회를 저장해 빠르게"* 하는 것이라 했다. 이번엔 스프링 캐싱을 실전으로 — 켜는 법부터, 세 애노테이션, 조건 설정, 그리고 로컬에서 Redis로 갈아끼우는 추상화까지.

## 켜기 — @EnableCaching

캐싱은 기본이 꺼져 있다. 메인 클래스(또는 설정 클래스)에 `@EnableCaching`을 붙여야 켜진다.

```java
@EnableCaching
@SpringBootApplication
public class App { ... }
```

## 세 애노테이션 — 조회·갱신·삭제

캐싱은 세 동작으로 나뉜다.

| 애노테이션 | 역할 | 동작 |
|---|---|---|
| `@Cacheable` | **조회 캐시** | 있으면 캐시에서, 없으면 실행 후 저장 |
| `@CachePut` | **갱신** | 항상 실행하고 결과로 캐시 갱신 |
| `@CacheEvict` | **삭제** | 캐시에서 제거 |

```java
@Service
public class ProductService {

    // 조회 — 처음엔 DB, 그다음부턴 캐시
    @Cacheable(value = "products", key = "#id")
    public Product get(Long id) {
        return repository.find(id);   // 캐시에 있으면 이 줄을 건너뜀
    }

    // 갱신 — 항상 실행하고, 결과를 캐시에 덮어씀
    @CachePut(value = "products", key = "#product.id")
    public Product update(Product product) {
        return repository.save(product);
    }

    // 삭제 — 캐시에서 제거 (데이터 바뀌면 낡은 캐시 비우기)
    @CacheEvict(value = "products", key = "#id")
    public void delete(Long id) {
        repository.deleteById(id);
    }
}
```

핵심은 **`@Cacheable`과 `@CacheEvict`의 짝**이다. 조회는 캐시하되, 데이터가 바뀌면(`update`·`delete`) **낡은 캐시를 비워야** 한다. 안 그러면 DB는 바뀌었는데 캐시는 옛날 값을 계속 주는 사고가 난다.

```java
@CacheEvict(value = "products", allEntries = true)   // 이 캐시 전체 비우기
```

## key·condition·unless — 세밀 제어

캐시 키와 조건을 SpEL(스프링 표현식)로 준다.

```java
// key: 무엇을 키로 삼을지
@Cacheable(value = "users", key = "#id")

// condition: 이 조건일 때만 캐시
@Cacheable(value = "users", condition = "#id > 0")

// unless: 이 결과는 캐시 안 함 (null 캐싱 방지에 자주)
@Cacheable(value = "users", unless = "#result == null")
```

- **`key`** — 캐시를 구분하는 열쇠 (보통 파라미터)
- **`condition`** — 실행 **전** 판단 (파라미터 기준)
- **`unless`** — 실행 **후** 판단 (결과 기준, `#result`)

## CacheManager — 로컬에서 Redis로 갈아끼우기

여기가 스프링 캐싱의 힘이다. `@Cacheable` 코드는 그대로 두고, **뒤에서 캐시 저장소만 바꿀 수 있다.** [`@Transactional`](/blog/transactional-spring/)이 DB 기술과 무관했던 것과 같은 추상화다.

```
@Cacheable  ──▶  CacheManager (추상화)  ──▶  실제 저장소
                                              ├ ConcurrentMapCache (기본, 메모리)
                                              ├ Caffeine (고성능 로컬 캐시)
                                              └ Redis (분산 캐시)
```

- **기본** — 별도 설정 없으면 `ConcurrentHashMap` 기반 (간단하지만 서버 재시작하면 사라짐)
- **Caffeine** — 고성능 로컬 캐시 (한 서버 안에서 빠름)
- **[Redis](/blog/caching-event-async-middleware/)** — **여러 서버가 공유**하는 분산 캐시 (실무의 주력)

의존성과 설정만 바꾸면 `@Cacheable` 코드는 **한 줄도 안 고치고** 로컬에서 Redis로 넘어간다.

```yaml
# application.yml — Redis를 캐시 저장소로
spring:
  cache:
    type: redis
  data:
    redis:
      host: localhost
      port: 6379
```

## TTL — 캐시도 만료시켜야 한다

캐시를 영원히 두면 낡은 데이터가 쌓인다. **TTL(Time To Live)**로 유효기간을 준다.

```java
// Redis 캐시에 10분 TTL 예시 (설정으로)
RedisCacheConfiguration.defaultCacheConfig()
    .entryTtl(Duration.ofMinutes(10));
```

`@CacheEvict`로 **명시적으로 비우고**, TTL로 **시간이 지나면 자동으로 만료**시킨다 — 이 둘로 캐시의 신선도를 관리한다.

## 주의 — self-invocation 함정

[`@Transactional`](/blog/transactional-spring/)·[AOP](/blog/aop-annotations/)에서 본 그 함정이 여기도 있다. 캐싱도 **AOP 프록시**로 동작하기 때문에, **같은 클래스 안에서 자기 메서드를 직접 호출하면 캐시가 안 먹는다.**

```java
public void outer() {
    this.get(1L);   // ← 프록시 안 거침 → @Cacheable 무시됨
}
@Cacheable("products")
public Product get(Long id) { ... }
```

프록시를 거치는 **다른 빈을 통해** 호출해야 캐시가 적용된다. 원리가 [트랜잭션 글](/blog/transactional-spring/)과 정확히 같다.

## 정리

- **켜기**: `@EnableCaching`
- **세 동작**: `@Cacheable`(조회) · `@CachePut`(갱신) · `@CacheEvict`(삭제) — 데이터 바뀌면 **캐시 비우기**를 잊지 말 것
- **조건**: `key`(열쇠) · `condition`(실행 전) · `unless`(결과 기준, null 캐싱 방지)
- **추상화**: `CacheManager` — `@Cacheable` 코드 그대로, 로컬(Caffeine)↔[Redis](/blog/caching-event-async-middleware/) 갈아끼우기
- **신선도**: `@CacheEvict`(명시적) + TTL(시간 만료)
- **함정**: AOP 프록시라 **self-invocation엔 안 걸림** (트랜잭션과 동일)

캐싱은 *"빠르게"* 를 공짜로 주는 것 같지만, 진짜 어려움은 **"언제 비우느냐"**다. 낡은 캐시가 최신 데이터인 척하는 순간 버그가 되니까. 나에게는 `@Cacheable`을 붙이는 것보다 `@CacheEvict`를 어디에 둘지 고민하는 게 캐싱의 본론이었다. 결국 여기서도 방향은 하나였다 — 반복 조회의 수고를 덜되, 신선도는 손으로 관리한다.
