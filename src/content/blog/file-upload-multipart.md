---
title: 파일 업로드·다운로드 — MultipartFile로 파일 다루기
description: "프론트가 FormData로 보낸 파일을 백엔드가 받는 법. @RequestParam MultipartFile로 받아 파일 정보를 읽고 저장하기, multipart 용량 설정, 여러 파일과 DTO를 함께 받는 @RequestPart, 그리고 파일 다운로드(ResponseEntity<Resource>)까지 정리한다."
pubDate: 2026-08-08
category: backend
parent: controller-method-arguments
---

[컨트롤러 인자 글](/blog/controller-method-arguments/)에서 *"업로드 파일 칸 = `MultipartFile`"* 이라고 짧게 짚었다. 그리고 [프론트 API 통신 글](/blog/react-vue-api/)에서 파일을 `FormData`에 담아 보냈다. 이제 그 반대편 — **백엔드가 파일을 받아 처리하는** 법을 정리한다. 프론트가 던진 파일을 여기서 받는다.

## 프론트와 백엔드의 연결

```
[프론트]                                [백엔드]
formData.append("avatar", 파일)   →    @RequestParam MultipartFile avatar
       (이름 "avatar")                        (같은 이름으로 받음)
```

파일은 JSON이 아니라 **`multipart/form-data`** 로 오고([API 통신 글](/blog/react-vue-api/)), 스프링은 그걸 **`MultipartFile`** 객체로 받는다.

## 파일 받기 — @RequestParam MultipartFile

```java
@PostMapping("/api/signup")
public String signup(@RequestParam String name,
                     @RequestParam MultipartFile avatar) {   // 파일 파트
    // name = 텍스트, avatar = 파일
    return "받음: " + avatar.getOriginalFilename();
}
```

프론트 `FormData`의 `"name"`·`"avatar"`가 각각 `@RequestParam String name`·`@RequestParam MultipartFile avatar`로 들어온다. **이름이 매칭**된다.

## MultipartFile로 할 수 있는 것

받은 `MultipartFile`에서 정보를 읽고 저장한다.

| 메서드 | 설명 |
|---|---|
| `getOriginalFilename()` | 원본 파일명 (`profile.png`) |
| `getSize()` | 크기(바이트) |
| `getContentType()` | MIME 타입 (`image/png`) |
| `isEmpty()` | 파일이 비었는지 |
| `getBytes()` / `getInputStream()` | 내용 읽기 |
| `transferTo(경로)` | **파일로 저장** |

## 파일 저장

가장 흔한 건 서버 디스크에 저장하는 것이다. `transferTo`가 간단하다.

```java
@PostMapping("/api/upload")
public String upload(@RequestParam MultipartFile file) throws IOException {
    if (file.isEmpty()) return "빈 파일";

    // 저장 경로 (원본명 그대로면 덮어쓰기·충돌 위험 → 보통 고유 이름 생성)
    String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
    Path path = Paths.get("uploads/" + filename);

    file.transferTo(path);   // ★ 저장
    return filename;
}
```

- **원본명 그대로 쓰지 말 것** — 같은 이름이 오면 덮어쓰이고, 경로 조작 공격 위험도 있다. 보통 **`UUID` 등으로 고유 이름**을 만든다
- 실무에선 디스크 대신 **S3 같은 클라우드 스토리지**에 올리는 경우가 많다 (원리는 같다 — `getInputStream()`으로 읽어 업로드)

## 용량 설정 — application.yml

기본은 파일 하나 1MB, 요청 전체 10MB로 제한된다. 넘으면 에러가 나므로 [설정](/blog/application-yml-properties/)에서 늘린다.

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 10MB       # 파일 하나 최대
      max-request-size: 50MB    # 요청 전체 최대
```

## 여러 파일 · DTO와 함께

**여러 파일** — `List<MultipartFile>`로 받는다.
```java
public String upload(@RequestParam("files") List<MultipartFile> files) {
    files.forEach(f -> { /* 각각 저장 */ });
}
```

**JSON 데이터 + 파일 함께** — 이땐 `@RequestParam`이 아니라 **`@RequestPart`** 를 쓴다. multipart 안의 JSON 파트를 객체로 받아준다.
```java
@PostMapping("/api/signup")
public String signup(@RequestPart("data") UserRequest data,     // JSON 파트 → 객체
                     @RequestPart("avatar") MultipartFile avatar) {  // 파일 파트
    // data.getName(), avatar...
}
```

- **`@RequestParam`** — 단순 텍스트·파일 파트
- **`@RequestPart`** — 파트를 **객체로 변환**해야 할 때(JSON 등), 파일과 DTO를 섞어 받을 때

## 반대 방향 — 파일 다운로드

받기만 하는 게 아니라 **내려주기**도 한다. `ResponseEntity<Resource>`로 파일을 응답한다.

```java
@GetMapping("/api/files/{name}")
public ResponseEntity<Resource> download(@PathVariable String name) throws IOException {
    Path path = Paths.get("uploads/" + name);
    Resource resource = new UrlResource(path.toUri());

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"" + name + "\"")   // 다운로드로 처리
        .body(resource);
}
```

`Content-Disposition: attachment` 헤더가 브라우저에게 *"화면에 열지 말고 다운로드해라"* 를 알린다.

## 정리

- 프론트 `FormData` 파일 → 백엔드 **`@RequestParam MultipartFile`** (이름 매칭)
- **MultipartFile** — `getOriginalFilename()`·`getSize()`·`getContentType()`·**`transferTo()`**(저장)
- **저장** — 원본명 그대로 X, **UUID 등 고유 이름**으로 (덮어쓰기·보안). 실무는 S3 등도
- **용량** — `application.yml`의 `max-file-size`·`max-request-size`
- **여러 파일** `List<MultipartFile>` / **JSON+파일** `@RequestPart`
- **다운로드** — `ResponseEntity<Resource>` + `Content-Disposition`

이 글로 [프론트의 파일 전송](/blog/react-vue-api/)과 백엔드의 파일 수신이 **완전히 이어진다.** 프론트가 `FormData`에 담아 `axios`로 보내면, 백엔드가 `MultipartFile`로 받아 저장하고, 필요하면 다시 `Resource`로 내려준다. [컨트롤러 인자 글](/blog/controller-method-arguments/)에서 *"HTTP의 각 칸마다 전용 도구"* 라 했던 그 **파일 칸**의 앞뒤가, 프론트와 백엔드 양쪽에서 이제 다 채워졌다.
