---
title: 반복 렌더링 — React map vs Vue v-for
description: "배열 데이터를 목록 UI로 반복해 그리는 법. React는 JSX 안에서 배열의 map()으로(자바스크립트), Vue는 v-for 디렉티브로(HTML 속성처럼) 처리한다. 함수형·클래스·Composition·Options 네 스타일, 그리고 둘 다 필수인 key의 이유까지 정리한다."
pubDate: 2026-08-09
category: frontend
---

[조건부 렌더링](/blog/react-vue-conditional-rendering/)에서 조건에 따라 화면을 갈랐다면, 이번엔 **배열을 목록으로** 반복해 그린다 — 상품 리스트, 댓글 목록처럼. 이걸 **반복 렌더링(list rendering)**이라 한다. 여기서도 React와 Vue의 그 결이 이어진다.

## 한 줄 핵심 — 접근이 또 갈린다

```
React → 배열의 map()으로 (자바스크립트 메서드)
Vue   → v-for 디렉티브로 (HTML 속성처럼)
```

[데이터 바인딩](/blog/react-vue-data-binding/)·[조건부](/blog/react-vue-conditional-rendering/)와 똑같다 — React는 JS 중심, Vue는 템플릿 중심. 이제 이 패턴이 익숙할 것이다.

## React — 배열의 map()

React엔 반복 문법이 따로 없다. **자바스크립트 배열의 `map()`** 으로 요소 배열을 만들어 JSX에 넣는다.

**함수형 컴포넌트**
```jsx
function App() {
  const fruits = [
    { id: 1, name: "사과" },
    { id: 2, name: "바나나" },
  ];
  return (
    <ul>
      {fruits.map(fruit => (
        <li key={fruit.id}>{fruit.name}</li>   {/* key 필수! */}
      ))}
    </ul>
  );
}
```

**클래스 컴포넌트**
```jsx
class App extends React.Component {
  render() {
    const fruits = [
      { id: 1, name: "사과" },
      { id: 2, name: "바나나" },
    ];
    return (
      <ul>
        {fruits.map(fruit => <li key={fruit.id}>{fruit.name}</li>)}
      </ul>
    );
  }
}
```

`map()`은 배열을 돌며 **각 요소를 JSX로 변환**한다. `[사과, 바나나]` → `[<li>사과</li>, <li>바나나</li>]`. 함수형·클래스 모두 **`map()` 쓰는 방식은 동일**하다(render 위치만 다름).

## Vue — v-for 디렉티브

Vue는 **`v-for`** 를 태그에 붙인다. script 방식(Composition/Options)만 다르고 **`<template>`의 `v-for`는 동일**하다.

**Composition API**
```vue
<script setup>
const fruits = [
  { id: 1, name: "사과" },
  { id: 2, name: "바나나" },
]
</script>

<template>
  <ul>
    <li v-for="fruit in fruits" :key="fruit.id">{{ fruit.name }}</li>
  </ul>
</template>
```

**Options API**
```vue
<script>
export default {
  data() {
    return {
      fruits: [
        { id: 1, name: "사과" },
        { id: 2, name: "바나나" },
      ]
    }
  }
}
</script>

<template>
  <ul>
    <li v-for="fruit in fruits" :key="fruit.id">{{ fruit.name }}</li>
  </ul>
</template>
```

`v-for="fruit in fruits"` 가 *"fruits를 돌면서 각 fruit로 이 태그를 반복해"* 로 자연스럽게 읽힌다. 인덱스가 필요하면 `v-for="(fruit, index) in fruits"` 로 받는다 (React도 `map((fruit, index) => ...)`).

## 비교표 (4스타일)

| 스타일 | 반복 렌더링 방식 |
|---|---|
| React **함수형** | `{items.map(i => <li key={i.id}>...</li>)}` |
| React **클래스** | `render()` 안, 위와 동일 |
| Vue **Composition** | `<template>`에 `v-for` + `:key` |
| Vue **Options** | `<template>`에 `v-for` + `:key` (동일) |

```
React (함수형·클래스) → map()      (자바스크립트 메서드)
Vue   (Composition·Options) → v-for  (디렉티브)
```

## 둘 다 필수 — key (제일 중요)

React든 Vue든 **각 항목에 `key`(Vue는 `:key`)를 꼭** 붙여야 한다. 안 붙이면 경고가 뜨고, 목록이 바뀔 때 버그가 난다.

**왜 필요하냐면** — [가상 DOM](/blog/react-vs-vue/)이 목록이 바뀔 때 *"어느 항목이 추가·삭제·이동됐는지"* 를 알아야 **최소한만 다시 그린다.** key가 그 **식별표** 역할을 한다.

```
key 없으면 → "뭐가 바뀐 건지 몰라" → 전부 다시 그리거나, 순서 꼬임(버그)
key 있으면 → "id=2가 사라졌네" → 그것만 정확히 제거 (효율적)
```

- **key는 고유한 값** — 보통 데이터의 `id`
- **배열 인덱스(index)를 key로 쓰는 건 지양** — 순서가 바뀌거나 중간이 삭제되면 인덱스가 어긋나 버그가 난다

```jsx
{/* ❌ 인덱스 key — 순서 바뀌면 문제 */}
{fruits.map((fruit, i) => <li key={i}>{fruit.name}</li>)}

{/* ✅ 고유 id key */}
{fruits.map(fruit => <li key={fruit.id}>{fruit.name}</li>)}
```

이건 React·Vue **공통 원칙**이다. 프레임워크는 달라도 *"리스트엔 고유 key"* 는 똑같다.

## 정리

- **반복 렌더링** = 배열을 목록 UI로 반복
- **React** — 배열의 **`map()`** 으로 JSX 변환 (함수형·클래스 동일)
- **Vue** — **`v-for`** 디렉티브 (Composition·Options 동일, template)
- **접근 차이** — React는 **JS 메서드(map)**, Vue는 **디렉티브(v-for)** → [바인딩](/blog/react-vue-data-binding/)·[조건부](/blog/react-vue-conditional-rendering/)와 같은 결
- **공통 필수 — `key`** — 가상 DOM이 항목을 식별하는 표. **고유 id로**, 인덱스는 지양

반복 렌더링까지 오니 패턴이 확실해진다 — **React는 뭐든 자바스크립트로**(삼항·map), **Vue는 뭐든 디렉티브로**(v-if·v-for). 데이터 바인딩에서 시작된 *"JS 중심 vs 템플릿 중심"* 이 조건부·반복까지 일관되게 흐른다. 이 큰 결 하나를 잡으면, 앞으로 어떤 문법을 만나도 *"React는 이렇게, Vue는 저렇게 하겠구나"* 가 먼저 그려진다. 그리고 그 위에, 값이 바뀌면 목록도 다시 그려지게 하는 **상태(state)** 가 얹히면 — 화면이 진짜로 살아 움직이기 시작한다.
