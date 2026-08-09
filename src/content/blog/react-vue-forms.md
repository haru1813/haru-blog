---
title: 폼 처리 — React 제어 컴포넌트 vs Vue v-model
description: "입력값을 상태와 연결하는 폼 처리. React는 value+onChange로 직접 묶는 '제어 컴포넌트', Vue는 v-model 한 줄로 양방향 바인딩한다. 그 차이와 v-model의 정체(:value+@input)를, 함수형·클래스·Composition·Options 네 스타일로 정리한다."
pubDate: 2026-07-31
category: frontend
---

[이벤트 처리](/blog/react-vue-events/)와 [상태](/blog/react-vue-state/)가 만나는 가장 흔한 곳이 **폼(입력 양식)** 이다. 사용자가 `<input>`에 타이핑하면 그 값을 상태에 담아 다뤄야 한다. 여기서 React와 Vue의 접근이 가장 극명하게 갈린다 — React는 손으로 묶고, Vue는 한 줄로 묶는다.

## 문제 — 입력값을 어떻게 상태와 연결하나

`<input>`에 사용자가 친 글자를 프로그램이 알려면, **입력 → 상태**로 연결해야 한다. 이 연결을 React와 Vue가 다르게 푼다.

```
React → value + onChange 로 직접 묶기 (제어 컴포넌트)
Vue   → v-model 한 줄로 자동 (양방향 바인딩)
```

## React — 제어 컴포넌트 (value + onChange)

React는 **input의 `value`를 상태에 묶고, `onChange`로 상태를 갱신**한다. 입력값을 React가 "제어"한다고 해서 **제어 컴포넌트(controlled component)** 라 한다.

**함수형 컴포넌트**
```jsx
function Form() {
  const [name, setName] = useState("");
  return (
    <input
      value={name}                              // ① 상태를 value에
      onChange={(e) => setName(e.target.value)} // ② 입력 시 상태 갱신
    />
  );
}
```

**클래스 컴포넌트**
```jsx
class Form extends React.Component {
  state = { name: "" };
  render() {
    return (
      <input
        value={this.state.name}
        onChange={(e) => this.setState({ name: e.target.value })}
      />
    );
  }
}
```

흐름이 **한 바퀴 돈다**:
```
입력 → onChange → setState(상태 갱신) → value에 반영 → 화면 갱신
```

`value`(상태 → 화면)와 `onChange`(화면 → 상태)를 **둘 다 손으로 연결**해야 한다. 번거롭지만, 입력값이 항상 상태를 거치니 흐름이 명확하다([상태 글](/blog/react-vue-state/)의 "명시적"과 같은 결).

## Vue — v-model (양방향 바인딩)

Vue는 **`v-model`** 한 줄이면 끝이다. input과 상태를 **양방향으로 자동 연결**한다.

**Composition API**
```vue
<script setup>
import { ref } from 'vue'
const name = ref("")
</script>
<template>
  <input v-model="name" />   <!-- 이 한 줄로 양방향 -->
</template>
```

**Options API**
```vue
<script>
export default {
  data() { return { name: "" } }
}
</script>
<template>
  <input v-model="name" />
</template>
```

`v-model="name"` 하나로, 사용자가 타이핑하면 `name`이 자동 갱신되고, `name`이 바뀌면 input에 자동 반영된다. React에서 `value`+`onChange`로 손수 했던 걸 **한 줄이 대신**한다.

### v-model의 정체

사실 `v-model`은 마법이 아니라 **축약**이다. 내부적으로 이렇다.

```vue
<!-- v-model 은 사실 이것의 축약 -->
<input :value="name" @input="name = $event.target.value" />
```

`:value`(상태 → input)와 `@input`(input → 상태)을 합친 것 — **React의 `value`+`onChange`와 정확히 같은 구조**다! 방식은 같은데, Vue는 그걸 `v-model` 한 단어로 감춰준 것뿐이다.

## 비교표 (4스타일)

| 스타일 | 폼 연결 |
|---|---|
| React **함수형** | `value={s}` + `onChange={e=>setS(...)}` |
| React **클래스** | `value={this.state.s}` + `onChange` |
| Vue **Composition** | `v-model="s"` (ref) |
| Vue **Options** | `v-model="s"` (data) |

```
React → value + onChange (직접 묶기, 제어 컴포넌트)
Vue   → v-model (한 줄, 양방향 자동)
        └ 사실 :value + @input 의 축약
```

## input 말고 다른 폼 요소들

지금까진 텍스트 `<input>`이었다. 다른 요소들도 대부분 원리는 같지만, **몇 개는 주의**가 필요하다.

**① textarea·select — input과 똑같다**
```jsx
// React
<textarea value={text} onChange={e => setText(e.target.value)} />
<select value={picked} onChange={e => setPicked(e.target.value)}>...</select>
```
```vue
<!-- Vue -->
<textarea v-model="text" />
<select v-model="picked">...</select>
```
`value`/`v-model` 패턴 그대로다.

**② checkbox·radio — value가 아니라 `checked`**
체크박스는 "값"이 아니라 "켜짐/꺼짐"이라, React는 `value` 대신 **`checked`** 를 쓴다.
```jsx
// React — value가 아니라 checked, e.target.checked
<input type="checkbox" checked={agree}
       onChange={e => setAgree(e.target.checked)} />
```
```vue
<!-- Vue — v-model이 알아서 boolean으로 -->
<input type="checkbox" v-model="agree" />
```
React는 `value→checked`, `e.target.value→e.target.checked`로 바뀐다. Vue는 `v-model`이 자동으로 boolean에 묶는다.

**③ file — 특별하다 (제어가 안 됨)**
파일 입력은 보안상 값을 코드로 넣을 수 없다. 그래서 **제어 컴포넌트도 `v-model`도 안 되고**, `onChange`/`@change`로 파일을 **읽기만** 한다.
```jsx
// React — value 없이, files를 읽음
<input type="file" onChange={e => setFile(e.target.files[0])} />
```
```vue
<!-- Vue — file은 v-model 불가, @change로 -->
<input type="file" @change="e => file = e.target.files[0]" />
```

**④ form 제출 — onSubmit / @submit.prevent**
```jsx
// React — preventDefault 직접
<form onSubmit={e => { e.preventDefault(); /* 전송 */ }}>
```
```vue
<!-- Vue — .prevent 수식어로 간단히 ([이벤트 글](/blog/react-vue-events/)의 그 수식어) -->
<form @submit.prevent="onSubmit">
```

### 요약표

| 요소 | React | Vue |
|---|---|---|
| text · textarea · select | `value` + `onChange` | `v-model` |
| **checkbox · radio** | **`checked`** + `onChange` | `v-model` (boolean 자동) |
| **file** | `onChange` (**제어 불가**) | `@change` (**v-model 불가**) |
| form 제출 | `onSubmit` + `preventDefault` | `@submit.prevent` |

대부분은 `value`/`v-model` 패턴이 그대로 간다. **예외는 딱 둘** — checkbox/radio는 `checked`, file은 제어가 안 된다(읽기만). 이 두 개만 기억하면 된다.

## 전체 예시 — 회원가입 폼

조각으로 봤으니, 이제 **실제 동작하는 폼 하나**를 통째로 보자. 이름·소개·성별·약관 동의를 받아 제출하는 폼이다.

**React (함수형)**
```jsx
import { useState } from 'react';

function SignupForm() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("male");
  const [agree, setAgree] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!agree) { alert("약관에 동의해주세요"); return; }
    console.log({ name, bio, gender, agree });   // 제출 데이터
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="이름" />
      <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="소개" />
      <select value={gender} onChange={e => setGender(e.target.value)}>
        <option value="male">남성</option>
        <option value="female">여성</option>
      </select>
      <label>
        <input type="checkbox" checked={agree}
               onChange={e => setAgree(e.target.checked)} />
        약관 동의
      </label>
      <button type="submit">가입</button>
    </form>
  );
}
```

**React (클래스)**
```jsx
class SignupForm extends React.Component {
  state = { name: "", bio: "", gender: "male", agree: false };

  handleSubmit = (e) => {
    e.preventDefault();
    if (!this.state.agree) { alert("약관에 동의해주세요"); return; }
    console.log(this.state);
  };

  render() {
    const { name, bio, gender, agree } = this.state;
    return (
      <form onSubmit={this.handleSubmit}>
        <input value={name}
               onChange={e => this.setState({ name: e.target.value })} placeholder="이름" />
        <textarea value={bio}
                  onChange={e => this.setState({ bio: e.target.value })} placeholder="소개" />
        <select value={gender}
                onChange={e => this.setState({ gender: e.target.value })}>
          <option value="male">남성</option>
          <option value="female">여성</option>
        </select>
        <label>
          <input type="checkbox" checked={agree}
                 onChange={e => this.setState({ agree: e.target.checked })} />
          약관 동의
        </label>
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

const name = ref("")
const bio = ref("")
const gender = ref("male")
const agree = ref(false)

const handleSubmit = () => {
  if (!agree.value) { alert("약관에 동의해주세요"); return }
  console.log({ name: name.value, bio: bio.value, gender: gender.value, agree: agree.value })
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="name" placeholder="이름" />
    <textarea v-model="bio" placeholder="소개" />
    <select v-model="gender">
      <option value="male">남성</option>
      <option value="female">여성</option>
    </select>
    <label>
      <input type="checkbox" v-model="agree" />
      약관 동의
    </label>
    <button type="submit">가입</button>
  </form>
</template>
```

**Vue (Options)**
```vue
<script>
export default {
  data() {
    return { name: "", bio: "", gender: "male", agree: false }
  },
  methods: {
    handleSubmit() {
      if (!this.agree) { alert("약관에 동의해주세요"); return }
      console.log({ name: this.name, bio: this.bio, gender: this.gender, agree: this.agree })
    }
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="name" placeholder="이름" />
    <textarea v-model="bio" placeholder="소개" />
    <select v-model="gender">
      <option value="male">남성</option>
      <option value="female">여성</option>
    </select>
    <label>
      <input type="checkbox" v-model="agree" />
      약관 동의
    </label>
    <button type="submit">가입</button>
  </form>
</template>
```

네 코드를 나란히 보면 차이가 확 보인다:
- **React** — 필드마다 `value` + `onChange`를 **각각** 써야 한다 (4개 필드 = 8번). 대신 흐름이 명시적이다
- **Vue** — 필드마다 `v-model` **한 번**이면 끝이다 (4개 필드 = 4번). 훨씬 짧다

같은 폼인데 **React는 손이 두 배** 가는 셈이다. 대신 그만큼 *"입력이 상태를 거친다"* 는 게 눈에 보인다. 이게 [지금껏 본](/blog/react-vue-state/) **명시적(React) vs 편리함(Vue)** 의 트레이드오프다. (클래스·Options로 써도 구조는 같다 — 상태 선언 위치만 [바뀔 뿐](/blog/react-vue-state/)이다.)

## 정리

- **폼 처리** = 입력값을 상태와 연결
- **React — 제어 컴포넌트**: `value`(상태→화면) + `onChange`(화면→상태)를 **손으로** 묶음 → 흐름이 명시적
- **Vue — v-model**: 한 줄로 **양방향 자동** → 사실은 `:value` + `@input`의 축약(React와 같은 구조를 감춤)
- **결** — React는 명시적으로 직접, Vue는 편리하게 한 줄 (지금껏 본 그 차이 그대로)

폼까지 오면 프론트의 기본 루프가 완성된다 — `입력 → 이벤트 → 상태 → 화면`. [데이터 바인딩](/blog/react-vue-data-binding/)으로 값을 보여주고, [상태](/blog/react-vue-state/)로 바뀌게 하고, [이벤트](/blog/react-vue-events/)로 사용자와 연결하고, 폼으로 입력을 받는다. 이 네 조각이 맞물리면 **사용자와 대화하는 화면**이 된다. 그리고 여기서도 관통하는 결은 하나였다 — **React는 자바스크립트로 명시적으로, Vue는 디렉티브로 선언적으로**. 이 큰 줄기 하나를 손에 쥐면, 앞으로 어떤 프론트 문법을 만나도 두 프레임워크가 각각 어떻게 풀지 먼저 그려진다.
