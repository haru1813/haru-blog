---
title: GraphQL — REST의 오버페칭·언더페칭을 푸는 다른 방식
description: "REST를 배웠는데 GraphQL은 왜 나왔을까. REST의 오버페칭·언더페칭 문제, 클라이언트가 필요한 데이터만 지정하는 GraphQL의 방식(단일 엔드포인트·스키마·리졸버), Spring for GraphQL 사용법, 그리고 캐싱·N+1 같은 단점과 'REST vs GraphQL 언제 뭘'까지 정리한다."
pubDate: 2026-08-08
category: backend
---

[컨트롤러 글](/blog/controller-method-arguments/)·[요청과 응답 글](/blog/request-response-body/)에서 `@RestController`로 REST API를 만들었다. 그런데 **GraphQL**이라는 게 보인다. *"REST 잘 되는데 이건 또 왜?"* — GraphQL은 REST가 불편했던 지점을 다른 방식으로 푼다. 뭘 푸는지부터 보자.

## REST의 두 가지 아쉬움

REST에서 `GET /users/1`을 하면, 서버가 **정해둔 필드 전부**가 온다.

**① 오버페칭(over-fetching) — 필요 없는 것까지 받는다**

```
GET /users/1
→ { id, name, email, address, phone, createdAt, ... }   ← 다 옴
```

모바일 화면에서 **이름만** 필요한데도, 주소·전화까지 통째로 받는다. 낭비다.

**② 언더페칭(under-fetching) — 여러 번 요청해야 한다**

사용자 + 그가 쓴 글 + 친구 목록을 보여주려면:

```
GET /users/1
GET /users/1/posts
GET /users/1/friends      ← 3번 왔다 갔다
```

한 화면을 그리려고 **여러 엔드포인트**를 호출한다. 느리고 번거롭다.

## GraphQL의 방식 — 필요한 것만, 한 번에

GraphQL은 **클라이언트가 필요한 데이터를 직접 지정**한다. 엔드포인트도 **딱 하나**(`/graphql`)다.

```graphql
query {
  user(id: 1) {
    name          # 필요한 필드만 콕 집어서
    email
    posts {       # 관련 데이터도 한 쿼리에
      title
    }
  }
}
```

응답은 **요청한 모양 그대로** 온다.

```json
{ "user": { "name": "하루", "email": "haru@x.com", "posts": [{ "title": "..." }] } }
```

- **오버페칭 해결** — `name`, `email`만 요청하면 그것만 온다 (주소·전화 안 옴)
- **언더페칭 해결** — `user` + `posts`를 **한 번의 요청**으로

즉 *"서버가 주는 대로 받는 REST"* 에서, *"클라이언트가 필요한 만큼 요청하는 GraphQL"* 로 주도권이 바뀐다.

## 핵심 개념 셋

**① 스키마(Schema) — 타입 정의**

무슨 데이터가 있고 어떻게 생겼는지를 **미리 정의**한다.

```graphql
type Query {           # 조회 진입점
  user(id: ID!): User
}
type User {
  id: ID!
  name: String!
  email: String
  posts: [Post]
}
```

**② 오퍼레이션 3종**

| 종류 | 역할 | REST 대응 |
|---|---|---|
| **Query** | 조회 | GET |
| **Mutation** | 변경(생성·수정·삭제) | POST/PUT/DELETE |
| **Subscription** | 실시간 구독 | (WebSocket) |

**③ 리졸버(Resolver) — 각 필드를 어떻게 채우나**

스키마의 각 필드에 대해 *"이 값을 어떻게 가져올지"* 를 정의하는 함수다. `user`를 요청하면 `user` 리졸버가, `posts`를 요청하면 `posts` 리졸버가 돈다.

## 스프링에서 — Spring for GraphQL

스프링 부트는 `spring-boot-starter-graphql`로 지원한다. **스키마 파일**(`schema.graphqls`)을 두고, 리졸버를 애노테이션으로 연결한다.

```graphql
# src/main/resources/graphql/schema.graphqls
type Query {
    user(id: ID!): User
}
type User { id: ID!  name: String!  email: String }
```

```java
@Controller
public class UserGraphQlController {

    @QueryMapping                       // Query의 user 필드 담당
    public User user(@Argument Long id) {
        return userService.find(id);
    }

    @MutationMapping                    // 변경용
    public User createUser(@Argument String name) {
        return userService.create(name);
    }
}
```

- **`@QueryMapping`** — 조회 리졸버 / **`@MutationMapping`** — 변경 리졸버
- **`@Argument`** — 쿼리 인자 받기 (REST의 [`@RequestParam`](/blog/controller-method-arguments/)과 비슷한 자리)
- **`@SchemaMapping`** — 특정 타입의 필드 리졸버 (예: `User.posts`)

REST 컨트롤러와 구조가 닮았다 — 요청을 받아 서비스를 부르고 결과를 돌려준다. 다만 **URL 매핑이 아니라 스키마 필드에 매핑**된다는 게 다르다.

## REST vs GraphQL

| | REST | GraphQL |
|---|---|---|
| 엔드포인트 | 여러 개 (`/users`, `/posts`) | **하나** (`/graphql`) |
| 데이터 | 서버가 정한 대로 (고정) | **클라이언트가 필요한 것만** |
| 오버/언더페칭 | 발생 | 해결 |
| **캐싱** | **HTTP 캐싱 쉬움** | 어려움 |
| 러닝 커브 | 낮음 | 높음 |
| 실시간 | 별도(WebSocket) | Subscription 내장 |

## 공짜는 아니다 — GraphQL의 단점

GraphQL이 만능은 아니다. 대가가 있다.

- **캐싱이 어렵다** — REST는 `GET /users/1`을 URL 단위로 HTTP 캐싱하기 쉽지만, GraphQL은 **단일 엔드포인트에 POST**라 그게 안 된다
- **N+1 문제** — `users`를 불러오고 각 user의 `posts`를 리졸버가 **하나씩** 조회하면 쿼리가 폭발한다. `DataLoader`로 묶어서 해결한다 ([JPA의 N+1](/blog/db-access-jdbc-to-jpa/)과 같은 종류의 함정)
- **러닝 커브·복잡도** — 스키마·리졸버 설계, 에러 처리, 파일 업로드 등이 REST보다 손이 간다

## 언제 REST, 언제 GraphQL

```
REST가 나을 때:
  · 단순 CRUD, 공개 API
  · HTTP 캐싱이 중요
  · 빠르게 시작 (러닝 커브 낮음)

GraphQL이 나을 때:
  · 복잡한 데이터 관계 (한 화면에 여러 리소스)
  · 클라이언트마다 필요 데이터가 다름 (모바일 vs 웹)
  · 오버페칭이 성능에 영향
```

## 정리

- GraphQL은 REST의 **오버페칭**(필요없는 것까지)·**언더페칭**(여러 요청)을 푼다
- **클라이언트가 필요한 필드를 지정**, 엔드포인트는 **하나**(`/graphql`)
- **스키마**(타입) + **Query/Mutation/Subscription** + **리졸버**(필드 채우기)
- 스프링: `spring-boot-starter-graphql` + `@QueryMapping`·`@MutationMapping`·`@Argument`
- **단점**: 캐싱 어려움, N+1(→DataLoader), 러닝 커브
- **선택**: 단순·캐싱이면 REST, 복잡한 관계·유연한 요청이면 GraphQL

GraphQL은 REST를 **대체**하는 게 아니라 **다른 트레이드오프**를 고른 것이다. REST가 *"서버가 정한 응답을 URL마다"* 라면, GraphQL은 *"클라이언트가 원하는 응답을 한곳에서"* 다. 나에게는 오버페칭으로 모바일이 느려지던 화면을 GraphQL로 바꿔 본 뒤에야, 이게 *"멋져서"* 가 아니라 *"필요해서"* 나온 도구임이 이해됐다. 결국 여기서도 방향은 하나였다 — 주고받는 데이터의 낭비를, 필요한 만큼으로 줄인다.
