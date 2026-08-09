---
title: 이벤트 처리 — React onClick vs Vue @click
description: "클릭·입력 같은 사용자 동작에 반응하는 법. React는 onClick처럼 카멜케이스 함수로, Vue는 @click 디렉티브(+수식어)로 처리한다. 이벤트 객체(e / $event)와 기본동작 막기까지, 함수형·클래스·Composition·Options 네 스타일로 정리한다."
pubDate: 2026-08-01
category: frontend
---

[상태(state)](/blog/react-vue-state/)에서 *"클릭에 반응하는 연결은 이벤트"* 라고 슬쩍 넘겼다. 그 **이벤트 처리**를 정리한다. 버튼 클릭, 입력, 제출 같은 사용자 동작에 반응해 상태를 바꾸는 — UI가 살아 움직이는 그 연결고리다.

## 한 줄 핵심

```
React → onClick 처럼 "카멜케이스 + 함수"   (JS 스타일)
Vue   → @click 처럼 "디렉티브"             (HTML 속성 스타일)
```

[데이터 바인딩](/blog/react-vue-data-binding/)·[조건부](/blog/react-vue-conditional-rendering/)에서 본 그 결 그대로 — React는 JS, Vue는 디렉티브.

## React — onClick (카멜케이스 함수)

React는 `onClick`·`onChange`·`onSubmit` 처럼 **`on` + 카멜케이스**에 함수를 넘긴다.

**함수형 컴포넌트**
```jsx
function Button() {
  const handleClick = (e) => {   // e = 이벤트 객체
    console.log("클릭!", e);
  };
  return <button onClick={handleClick}>클릭</button>;
}
```

**클래스 컴포넌트**
```jsx
class Button extends React.Component {
  handleClick = (e) => {         // 화살표 함수로 this 바인딩
    console.log("클릭!");
  };
  render() {
    return <button onClick={this.handleClick}>클릭</button>;
  }
}
```

- `onClick={handleClick}` — **함수를 넘긴다**(호출 `handleClick()`이 아님)
- 인자로 **이벤트 객체 `e`** 를 받는다 (`e.target`, `e.preventDefault()` 등)
- 클래스는 `this` 바인딩 때문에 **화살표 함수**로 메서드를 정의하는 게 편하다

## Vue — @click (디렉티브)

Vue는 **`@click`**(= `v-on:click` 축약)을 태그에 붙인다. script 방식만 다르고 template의 `@click`은 동일하다.

**Composition API**
```vue
<script setup>
const handleClick = (e) => {     // e = 이벤트 객체
  console.log("클릭!", e)
}
</script>
<template>
  <button @click="handleClick">클릭</button>
</template>
```

**Options API**
```vue
<script>
export default {
  methods: {
    handleClick(e) { console.log("클릭!") }   // methods에 정의
  }
}
</script>
<template>
  <button @click="handleClick">클릭</button>
</template>
```

- `@click="handleClick"` — 디렉티브에 핸들러 연결
- 이벤트 객체는 **`$event`** 로 접근 (`@click="handleClick($event)"`)
- Options는 핸들러를 **`methods`** 에 모아 둔다

## Vue만의 편의 — 수식어(modifier)

Vue는 자주 쓰는 이벤트 처리를 **점(.)으로 붙이는 수식어**로 간단히 한다.

```vue
<form @submit.prevent="onSubmit">   <!-- .prevent = preventDefault() 자동 -->
<button @click.stop="...">           <!-- .stop = 전파 중단 -->
<input @keyup.enter="...">           <!-- 엔터키만 -->
```

React엔 이런 수식어가 없어서 **직접** 한다.
```jsx
const onSubmit = (e) => {
  e.preventDefault();   // 수동으로 호출
  // ...
};
```

`.prevent` 하나로 끝나는 Vue와, `e.preventDefault()`를 직접 부르는 React — 여기서도 *"Vue는 선언적, React는 명시적"* 이 드러난다.

## 비교표 (4스타일)

| 스타일 | 이벤트 연결 | 핸들러 위치 |
|---|---|---|
| React **함수형** | `onClick={fn}` | 함수 안 |
| React **클래스** | `onClick={this.fn}` | 클래스 메서드(화살표) |
| Vue **Composition** | `@click="fn"` | `<script setup>` |
| Vue **Options** | `@click="fn"` | `methods` |

```
React → onClick / onChange / onSubmit  (on + 카멜, 함수)
Vue   → @click / @change / @submit      (@ + 디렉티브, +수식어)
```

## 정리

- **이벤트 처리** = 사용자 동작(클릭·입력·제출)에 반응
- **React** — `onClick` 등 **카멜케이스에 함수** / 이벤트 객체 `e` / `e.preventDefault()` 직접
- **Vue** — `@click` **디렉티브** / 이벤트 객체 `$event` / **수식어**(`.prevent`·`.stop`)로 간단히
- **핸들러 위치** — 함수형(함수 안)·클래스(`methods` 격 메서드)·Composition(`script setup`)·Options(`methods`)
- **결** — React는 JS 함수, Vue는 디렉티브+수식어 (선언적 vs 명시적)

이벤트가 붙으면 화면이 드디어 **사용자에게 반응**한다. [상태](/blog/react-vue-state/)가 *"바뀌면 화면이 바뀐다"* 였다면, 이벤트는 *"사용자가 그 상태를 바꾸는 방아쇠"* 다. 이 둘이 만나 `클릭 → 이벤트 → 상태 변경 → 화면 갱신` 의 루프가 돈다. 그리고 이 루프가 가장 많이 쓰이는 곳이 **폼(입력 양식)** — 다음 글에서 이어진다.
