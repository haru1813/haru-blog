---
title: API 통신 — fetch·axios로 백엔드와 데이터·파일 주고받기
description: "프론트에서 받은 데이터를 백엔드로 보내고 응답을 받는 법. 일반 데이터는 JSON으로, 파일은 FormData(multipart)로 보내며, fetch와 axios로 요청한다. 그리고 이게 하루가 배운 백엔드(@RequestBody·@RequestParam MultipartFile)와 어떻게 이어지는지 — 프론트와 백엔드가 만나는 다리를 정리한다."
pubDate: 2026-07-30
category: frontend
---

[폼 처리](/blog/react-vue-forms/)에서 사용자 입력을 받았다. 그런데 받기만 하면 끝이 아니다 — 그걸 **백엔드로 보내야** 한다. 이 **API 통신**이 프론트와 백엔드를 잇는 다리다. 하루의 [스프링 백엔드](/blog/controller-method-arguments/)가 여기서 프론트와 만난다.

## 두 갈래 — JSON vs FormData

무엇을 보내느냐에 따라 방식이 갈린다.

```
일반 데이터(텍스트·숫자)  → JSON으로 (application/json)
파일 포함                → FormData로 (multipart/form-data)
```

파일은 **바이너리**라 JSON에 못 담는다. 그래서 파일이 있으면 `FormData`라는 특별한 그릇을 쓴다.

## 요청 도구 — fetch vs axios

둘 다 HTTP 요청을 보내는 도구다. **프레임워크와 무관**하다(React·Vue 공통).

| | fetch | axios |
|---|---|---|
| 출처 | 브라우저 **내장** | 라이브러리(설치) |
| JSON | 직접 `JSON.stringify` + `.json()` | **자동** 변환 |
| 편의 | 기본적 | 인터셉터·에러처리 등 풍부 |

`fetch`는 설치 없이 바로 쓰고, `axios`는 편해서 실무에서 많이 쓴다. 개념은 같으니 둘 다 본다.

## ① 일반 데이터 보내기 — JSON

텍스트·숫자 데이터는 **JSON**으로 보낸다.

```js
const data = { name: "하루", age: 34 };

// fetch — 직접 JSON.stringify, 헤더 지정
await fetch("/api/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

// axios — 객체만 넘기면 알아서 JSON으로
await axios.post("/api/users", data);
```

`axios`가 `JSON.stringify`와 헤더를 **자동으로** 처리해줘서 짧다.

## ② 파일 보내기 — FormData

파일이 있으면 **FormData**에 담는다. 텍스트와 파일을 **같이** 넣을 수 있다.

```js
const formData = new FormData();
formData.append("name", name);       // 텍스트
formData.append("avatar", avatar);   // 파일(File 객체)

// fetch — Content-Type을 직접 지정하지 않는다! (자동으로 multipart 설정됨)
await fetch("/api/signup", { method: "POST", body: formData });

// axios
await axios.post("/api/signup", formData);
```

> 주의: FormData를 보낼 땐 **`Content-Type`을 직접 넣지 않는다.** 브라우저가 `multipart/form-data; boundary=...`를 자동으로 붙여준다. 손으로 넣으면 오히려 깨진다.

## ③ 응답 받기

보냈으면 백엔드의 **응답**을 받아 화면에 쓴다.

```js
// fetch — .json()으로 파싱 (한 단계 더)
const res = await fetch("/api/users/1");
const user = await res.json();
setUser(user);   // 상태에 담아 화면에

// axios — res.data에 이미 파싱돼 있음
const res = await axios.get("/api/users/1");
setUser(res.data);
```

받은 데이터를 [상태](/blog/react-vue-state/)에 담으면, [데이터 바인딩](/blog/react-vue-data-binding/)으로 화면에 뿌려진다. 요청 → 응답 → 상태 → 화면의 흐름이다.

## 그리고 — 하루가 배운 백엔드가 받는다

여기가 **프론트와 백엔드가 만나는 지점**이다. 프론트가 보낸 걸 스프링이 받는데, 하루는 이미 다 배웠다.

```
[프론트]                              [백엔드 — 하루가 배운 것]

JSON 보내기                            @RequestBody
axios.post("/api/users", data)    →   @PostMapping("/api/users")
                                       User create(@RequestBody UserRequest req)

파일(FormData) 보내기                   @RequestParam MultipartFile
formData.append("avatar", file)   →   void signup(@RequestParam String name,
                                                   @RequestParam MultipartFile avatar)
```

- **JSON 본문** → 백엔드 **[`@RequestBody`](/blog/request-response-body/)** 로 받음 (JSON → 객체)
- **파일(FormData)** → 백엔드 **[`@RequestParam MultipartFile`](/blog/controller-method-arguments/)** 로 받음
- 프론트 `formData.append("avatar", ...)`의 이름 **"avatar" ↔** 백엔드 `MultipartFile avatar` 로 연결

[컨트롤러 인자 글](/blog/controller-method-arguments/)에서 *"HTTP 요청의 각 칸마다 전용 도구"* 라 했는데 — 그 칸을 **채우는 쪽이 프론트**(fetch/axios)이고, **꺼내는 쪽이 백엔드**(@RequestBody·MultipartFile)다. 이제 두 세계가 이어졌다.

## 풀스택 루프

```
[프론트] 폼에서 입력·파일 받기
      → FormData/JSON에 담기
        → fetch/axios로 백엔드에 전송
          → [백엔드] @RequestBody · MultipartFile 로 수신 → 저장/처리
            → 응답(JSON) 반환
          ← [프론트] 응답 받아 상태에 담기
        ← 데이터 바인딩으로 화면에 반영
```

## 전체 예시 — 파일 업로드 폼

이름과 프로필 사진을 받아 백엔드로 보내는 완성 폼이다. (요청은 `axios`로)

**React (함수형)**
```jsx
import { useState } from 'react';
import axios from 'axios';

function SignupForm() {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("avatar", avatar);
    try {
      const res = await axios.post("/api/signup", formData);
      console.log("성공:", res.data);
    } catch (err) {
      console.error("실패:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="이름" />
      <input type="file" onChange={e => setAvatar(e.target.files[0])} />
      <button type="submit">가입</button>
    </form>
  );
}
```

**React (클래스)**
```jsx
import axios from 'axios';

class SignupForm extends React.Component {
  state = { name: "", avatar: null };

  handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", this.state.name);
    formData.append("avatar", this.state.avatar);
    const res = await axios.post("/api/signup", formData);
    console.log("성공:", res.data);
  };

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <input value={this.state.name}
               onChange={e => this.setState({ name: e.target.value })} placeholder="이름" />
        <input type="file" onChange={e => this.setState({ avatar: e.target.files[0] })} />
        <button type="submit">가입</button>
      </form>
    );
  }
}
```

**Vue (Composition)**
```vue
<script setup>
import { ref } from 'vue'
import axios from 'axios'

const name = ref("")
const avatar = ref(null)

const handleSubmit = async () => {
  const formData = new FormData()
  formData.append("name", name.value)
  formData.append("avatar", avatar.value)
  const res = await axios.post("/api/signup", formData)
  console.log("성공:", res.data)
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="name" placeholder="이름" />
    <input type="file" @change="e => avatar = e.target.files[0]" />
    <button type="submit">가입</button>
  </form>
</template>
```

**Vue (Options)**
```vue
<script>
import axios from 'axios'

export default {
  data() {
    return { name: "", avatar: null }
  },
  methods: {
    async handleSubmit() {
      const formData = new FormData()
      formData.append("name", this.name)
      formData.append("avatar", this.avatar)
      const res = await axios.post("/api/signup", formData)
      console.log("성공:", res.data)
    }
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="name" placeholder="이름" />
    <input type="file" @change="e => avatar = e.target.files[0]" />
    <button type="submit">가입</button>
  </form>
</template>
```

네 스타일 모두 **핵심은 같다** — `FormData`에 텍스트와 파일을 담아 `axios.post`로 보낸다. [상태 관리 방식](/blog/react-vue-state/)(useState/state/ref/data)과 [입력 연결](/blog/react-vue-forms/)(value+onChange/v-model)만 스타일별로 다를 뿐, **FormData 전송 부분은 완전히 동일**하다. 이게 [폼](/blog/react-vue-forms/)에서 받은 걸 백엔드([`MultipartFile`](/blog/controller-method-arguments/))로 보내는 실전 코드다.

## 정리

- **보내기 두 갈래** — 일반 데이터는 **JSON**(`application/json`), 파일은 **FormData**(`multipart/form-data`)
- **도구** — `fetch`(브라우저 내장) / `axios`(라이브러리, JSON 자동·편의) — **React·Vue 공통**
- **주의** — FormData 보낼 땐 `Content-Type`을 **직접 넣지 말 것**(브라우저가 자동)
- **응답** — `fetch`는 `.json()`, `axios`는 `res.data` → [상태](/blog/react-vue-state/)에 담아 화면에
- **백엔드 연결** — JSON은 **[`@RequestBody`](/blog/request-response-body/)**, 파일은 **[`@RequestParam MultipartFile`](/blog/controller-method-arguments/)**

이 글로 프론트와 백엔드가 **하나로 이어진다.** 하루는 백엔드에서 *"요청이 컨트롤러까지 오는 길"* 을 배웠고, 프론트에서 *"화면이 사용자에게 반응하는 법"* 을 배웠다. API 통신은 그 둘 사이의 **다리** — 프론트가 요청을 만들어 보내면, 백엔드가 받아 처리하고 응답한다. 이제 하루는 **한 요청이 화면에서 시작해 DB까지 갔다가 다시 화면으로 돌아오는 전 여정**을 그릴 수 있다. 그게 풀스택이다.
