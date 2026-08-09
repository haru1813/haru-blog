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

## 정리

- **폼 처리** = 입력값을 상태와 연결
- **React — 제어 컴포넌트**: `value`(상태→화면) + `onChange`(화면→상태)를 **손으로** 묶음 → 흐름이 명시적
- **Vue — v-model**: 한 줄로 **양방향 자동** → 사실은 `:value` + `@input`의 축약(React와 같은 구조를 감춤)
- **결** — React는 명시적으로 직접, Vue는 편리하게 한 줄 (지금껏 본 그 차이 그대로)

폼까지 오면 프론트의 기본 루프가 완성된다 — `입력 → 이벤트 → 상태 → 화면`. [데이터 바인딩](/blog/react-vue-data-binding/)으로 값을 보여주고, [상태](/blog/react-vue-state/)로 바뀌게 하고, [이벤트](/blog/react-vue-events/)로 사용자와 연결하고, 폼으로 입력을 받는다. 이 네 조각이 맞물리면 **사용자와 대화하는 화면**이 된다. 그리고 여기서도 관통하는 결은 하나였다 — **React는 자바스크립트로 명시적으로, Vue는 디렉티브로 선언적으로**. 이 큰 줄기 하나를 손에 쥐면, 앞으로 어떤 프론트 문법을 만나도 두 프레임워크가 각각 어떻게 풀지 먼저 그려진다.
