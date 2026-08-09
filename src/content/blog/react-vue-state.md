---
title: 상태(state) — React useState vs Vue ref, 화면을 살아있게
description: "값이 바뀌면 화면이 자동으로 다시 그려지는 '상태'. 그냥 변수와 뭐가 다른지, React는 명시적으로(useState·setState) Vue는 반응형으로(ref·data) 다루는 차이를, 함수형·클래스·Composition·Options 네 스타일의 카운터로 정리한다."
pubDate: 2026-08-09T16:00:00
category: frontend
---

[데이터 바인딩](/blog/react-vue-data-binding/) 글 끝에서 *"바뀌면 화면이 갱신되는 값은 상태(state)"* 라고 예고했다. 이제 그 **상태**다. 여기서부터 화면이 정적인 그림에서 **살아 움직이는 UI**로 바뀐다. 프론트의 진짜 핵심이다.

## 그냥 변수는 왜 안 되나

먼저 문제부터. 그냥 변수를 바꾸면 **화면이 안 바뀐다.**

```jsx
let count = 0;
count = count + 1;   // 값은 1이 됐지만... 화면은 그대로 0
```

프레임워크는 *"어? 값이 바뀌었네, 다시 그려야지"* 를 **알아채지 못한다.** 그래서 *"이 값이 바뀌면 화면을 다시 그려라"* 라고 **특별하게 관리하는 값** — 그게 **상태(state)** 다.

## React — 명시적으로 (setter로 알림)

React는 상태를 바꿀 때 **반드시 setter를 호출**한다. *"값 바뀌었어!"* 하고 명시적으로 알려야 다시 그린다.

**함수형 컴포넌트 — useState**
```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);   // [상태, 바꾸는 함수]
  return (
    <button onClick={() => setCount(count + 1)}>   {/* setter로 변경 */}
      {count}
    </button>
  );
}
```

**클래스 컴포넌트 — this.state / setState**
```jsx
class Counter extends React.Component {
  state = { count: 0 };
  render() {
    return (
      <button onClick={() => this.setState({ count: this.state.count + 1 })}>
        {this.state.count}
      </button>
    );
  }
}
```

핵심은 — **직접 바꾸면 안 되고 setter로만** 바꾼다.

```jsx
count++;                    // ❌ 화면 안 바뀜
setCount(count + 1);        // ✅ setter로 → 다시 그림
this.state.count++;         // ❌ (클래스도) 안 됨
this.setState({ count });   // ✅ setState로
```

## Vue — 반응형으로 (그냥 바꾸면 됨)

Vue는 상태를 **그냥 바꾸면** 알아서 화면을 갱신한다. 변화를 **자동으로 추적**하기 때문이다.

**Composition API — ref**
```vue
<script setup>
import { ref } from 'vue'
const count = ref(0)      // ref로 감싸면 반응형
</script>

<template>
  <button @click="count++">{{ count }}</button>   <!-- 그냥 ++ -->
</template>
```

**Options API — data**
```vue
<script>
export default {
  data() { return { count: 0 } }   // data의 값은 자동으로 반응형
}
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>
```

Vue는 `count++` 처럼 **평범하게 바꾸면** 화면이 따라온다. 단, Composition의 `ref`는 **script에서 `.value`** 로 접근한다(템플릿에선 자동으로 벗겨져서 그냥 `count`).

```js
// script 안에서는
count.value++       // ✅ ref는 .value 필요
// template 안에서는
{{ count }}         // ✅ .value 없이 (자동 언랩)
```

## 비교표 (4스타일)

| 스타일 | 상태 선언 | 상태 변경 |
|---|---|---|
| React **함수형** | `useState(0)` | `setCount(...)` (명시적) |
| React **클래스** | `state = {count:0}` | `this.setState(...)` (명시적) |
| Vue **Composition** | `ref(0)` | `count.value++` (그냥) |
| Vue **Options** | `data(){return{count:0}}` | `this.count++` (그냥) |

```
React → setter를 "호출"해야 갱신   (명시적)
Vue   → 값을 "그냥 바꾸면" 갱신     (반응형)
```

이게 [React vs Vue 글](/blog/react-vs-vue/)에서 본 **"명시적 vs 반응형"** 의 실제 코드다. 개념으로만 봤던 그 차이가, 상태를 다뤄보면 손끝에서 느껴진다.

## 각 방식의 주의점

**React — 불변성(immutability)**
React는 *"기존 걸 바꾸지 말고, 새 값을 setter에 넘겨라"* 가 원칙이다. 객체·배열 상태는 특히 **새로 만들어** 교체한다.
```jsx
// ❌ 기존 배열을 직접 수정
items.push(newItem); setItems(items);
// ✅ 새 배열을 만들어 교체
setItems([...items, newItem]);
```

**Vue — ref의 .value**
Composition의 `ref`는 script에서 `.value`를 빠뜨리기 쉽다. `count++`가 아니라 **`count.value++`** 다(template에선 생략). Options의 `data`는 `this.count`로 이 고민이 없다.

## 정리

- **상태(state)** = 바뀌면 **화면이 자동으로 다시 그려지는** 값 (그냥 변수는 바꿔도 화면 안 바뀜)
- **React — 명시적**: `useState`+setter(함수형) / `state`+`setState`(클래스) — **직접 바꾸지 말고 setter로**
- **Vue — 반응형**: `ref`(Composition, `.value`) / `data`(Options) — **그냥 바꾸면** 자동 갱신
- **핵심 차이** = [명시적 vs 반응형](/blog/react-vs-vue/) — React는 "바뀌었어!" 신고, Vue는 알아서 추적
- **주의** — React는 불변성(새 값 교체) / Vue Composition은 `.value`

상태를 이해하면 프론트의 절반은 온 것이다. [데이터 바인딩](/blog/react-vue-data-binding/)이 *"값을 화면에 보여주기"* 였다면, 상태는 *"그 값이 바뀌면 화면도 바뀌기"* 다 — 이 둘이 만나 화면이 사용자의 클릭에 반응하고, [조건부](/blog/react-vue-conditional-rendering/)·[반복](/blog/react-vue-list-rendering/)이 상태에 따라 실시간으로 달라진다. 여기서 UI가 비로소 **살아 움직인다.** 그리고 그 "클릭에 반응하는" 연결 — 이벤트 처리(`onClick` vs `@click`)가 다음 조각이다.
