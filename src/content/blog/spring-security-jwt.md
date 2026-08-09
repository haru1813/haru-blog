---
title: JWT 토큰 기반 인증 — 서버가 아무것도 기억하지 않는 방식
description: "세션의 반대편. 로그인하면 서명된 토큰(JWT)을 발급하고, 클라이언트가 매 요청에 실어 보내면 서버는 토큰만 검증한다. JWT의 구조(header.payload.signature), OncePerRequestFilter로 만드는 JWT 필터, stateless의 장단점과 리프레시 토큰까지 정리한다."
pubDate: 2026-08-08
category: backend
parent: spring-security-overview
---

[세션 기반 인증](/blog/spring-security-session/)의 한계는 *"서버가 세션을 기억해야 한다"* 였다 — 서버가 여러 대면 세션 공유가 골칫거리였다. **JWT 기반**은 이걸 정반대로 뒤집는다: **서버는 아무것도 기억하지 말자.** 로그인 상태를 **토큰에 담아 클라이언트가 들고 다니게** 하는 것이다.

## 발상의 전환 — 상태를 클라이언트에게

```
세션 → 서버가 "이 사람 로그인함"을 기억 (stateful)
JWT  → 서버는 기억 안 함. 클라이언트가 "나 로그인했음" 증표(토큰)를 들고 다님 (stateless)
```

매 요청마다 클라이언트가 **토큰을 내밀고**, 서버는 그 토큰이 **진짜인지만 검증**한다. 서버는 세션을 저장하지 않으니 메모리 부담도, 세션 공유 문제도 없다.

## JWT의 구조 — 점으로 나뉜 세 조각

JWT(JSON Web Token)는 `.`으로 나뉜 **세 부분**이다.

```
eyJhbGc...  .  eyJzdWI...  .  SflKxwRJ...
  헤더           페이로드         서명
 (Header)       (Payload)     (Signature)
```

| 부분 | 내용 |
|---|---|
| **Header** | 토큰 타입·서명 알고리즘 |
| **Payload** | 실제 데이터 (사용자 id, 권한, **만료 시각** 등) |
| **Signature** | **위조 방지 서명** (서버 비밀키로 만듦) |

핵심은 **Signature**다. 서버가 자기 비밀키로 서명하기 때문에, 누군가 Payload를 조작하면 서명이 안 맞아 **바로 들킨다.** 그래서 서버는 토큰만 보고 *"내가 발급한 진짜"* 임을 확인할 수 있다 — DB나 세션을 안 봐도 된다.

> 주의: Payload는 **암호화가 아니라 인코딩**(Base64)일 뿐이다. 누구나 열어볼 수 있으니 **비밀번호 같은 민감정보를 넣으면 안 된다.**

## 로그인 흐름 — 토큰 발급

```
① 사용자가 아이디·비번으로 로그인
        ▼
② 서버가 검증 후 → JWT 발급 (비밀키로 서명)
        ▼
③ 클라이언트가 토큰을 저장 (localStorage·쿠키 등)
```

세션과 달리 서버는 **아무것도 저장하지 않는다.** 토큰을 만들어 건네줄 뿐이다.

## 이후 요청 — 토큰 검증

이후 모든 요청에 클라이언트가 토큰을 **Authorization 헤더**에 실어 보낸다.

```
요청 (Authorization: Bearer eyJhbGc...)
   ▼
서버: 서명 검증 (내 비밀키로 만든 게 맞나?) + 만료 확인
   ▼
통과 → SecurityContext에 인증 정보 세팅 (DB·세션 조회 없이!)
```

서버는 **서명만 검증**하면 되니, 어느 서버가 받든 상관없다. 세션의 그 확장 문제가 애초에 없다.

## JWT 필터 만들기 — OncePerRequestFilter

JWT 검증은 보통 **커스텀 필터**로 만든다. [필터 글](/blog/filter-types/)에서 본 `OncePerRequestFilter`를 상속한다 (요청당 1회 + HttpServletRequest로 바로 받는 그 이유들 때문에).

```java
public class JwtFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain)
            throws ServletException, IOException {

        String token = resolveToken(req);   // "Bearer xxx"에서 토큰 추출

        if (token != null && jwtProvider.validate(token)) {   // 서명·만료 검증
            Authentication auth = jwtProvider.getAuthentication(token);
            SecurityContextHolder.getContext().setAuthentication(auth);  // 인증 세팅
        }
        chain.doFilter(req, res);   // 다음 필터로
    }
}
```

이 필터를 [시큐리티 필터 체인](/blog/spring-security-overview/)에 끼우면, 매 요청마다 토큰을 검증해 인증을 세팅한다. [필터 글](/blog/filter-types/)에서 예고한 *"나중에 JWT 필터 만들 때"* 가 바로 이거다.

## 세션 vs JWT — 트레이드오프

JWT가 무조건 좋은 건 아니다. 세션과 정확히 **반대의 장단점**을 가진다.

| | 세션 | JWT |
|---|---|---|
| 상태 | 서버가 기억 (stateful) | 서버가 안 기억 (stateless) |
| 서버 확장 | 세션 공유 필요 (번거로움) | **쉬움** |
| 즉시 로그아웃 | **가능** (세션 삭제) | **어려움** (만료까지 유효) |
| 탈취 시 | 세션 무효화로 차단 | 만료 전까지 계속 유효 (위험) |
| 크기 | 쿠키 작음 | 토큰이 매 요청에 실려 큼 |
| 주 무대 | 전통적 웹 | **MSA·모바일·SPA** |

JWT의 가장 큰 약점은 **"즉시 무효화가 어렵다"** 는 것이다. 서버가 기억하지 않으니, 발급한 토큰은 **만료될 때까지 계속 유효**하다. 토큰이 탈취돼도 만료 전엔 못 막는다.

## 리프레시 토큰 — 약점을 보완

그래서 보통 **두 개의 토큰**을 쓴다.

```
Access Token  → 짧은 수명(예: 30분). 실제 요청에 사용
Refresh Token → 긴 수명(예: 2주). Access가 만료되면 새로 발급받는 용도
```

Access Token을 **짧게** 만들어 탈취 위험을 줄이고, 만료되면 Refresh Token으로 조용히 재발급한다. Refresh Token은 서버(또는 [Redis](/blog/caching-event-async-middleware/))에 저장해서 **무효화 가능**하게 두기도 한다 — 완전한 stateless와 약간의 상태 관리를 절충하는 것이다.

## 정리

- JWT는 세션의 반대 — **서버가 상태를 안 가지고**, 클라이언트가 토큰을 들고 다님 (stateless)
- **구조**: `header.payload.signature` — 서명으로 위조 방지 (Payload는 인코딩일 뿐, 민감정보 X)
- **흐름**: 로그인 → 토큰 발급 / 이후 요청 → `Authorization: Bearer`로 서명 검증
- **JWT 필터**: `OncePerRequestFilter` 상속해 토큰 검증 → SecurityContext 세팅
- **트레이드오프**: 확장 쉬움(장점) ↔ 즉시 무효화 어려움(단점) → **리프레시 토큰**으로 보완
- **선택**: 전통 웹이면 [세션](/blog/spring-security-session/), MSA·모바일·SPA면 JWT

세션과 JWT는 *"서버가 기억하느냐"* 를 두고 갈리는 정반대의 답이다. 세션은 서버가 쥐고 있어 통제하기 좋지만 확장이 어렵고, JWT는 확장이 쉽지만 통제(무효화)가 어렵다. **어느 게 맞다가 아니라, 무엇을 포기할 것인가**의 문제다. 나에게는 이 둘을 나란히 놓고 나서야, JWT가 *"멋져서"* 가 아니라 *"MSA에서 세션 공유가 지긋지긋해서"* 나온 답임이 이해됐다. 결국 여기서도 방향은 하나였다 — 로그인 상태를 어디에 둘 것인가, 그 하나의 선택이 나머지를 결정한다.
