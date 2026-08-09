---
title: 조건부 렌더링 — React 삼항·&& vs Vue v-if
description: "조건에 따라 화면을 다르게 그리는 법. React는 JSX 안에서 삼항연산자·&&로(자바스크립트), Vue는 v-if·v-else·v-show 디렉티브로(HTML 속성처럼) 처리한다. 함수형·클래스·Composition·Options 네 스타일로 나눠 정리한다."
pubDate: 2026-08-09
category: frontend
---

[데이터 바인딩](/blog/react-vue-data-binding/)에서 값을 화면에 꽂았다면, 이번엔 **조건에 따라 화면을 다르게** 그린다 — 로그인했으면 이걸, 아니면 저걸. 이걸 **조건부 렌더링(conditional rendering)**이라 한다. 여기서 React와 Vue의 결이 또 한 번 선명하게 갈린다.

## 한 줄 핵심 — 접근이 다르다

```
React → JSX 안에서 자바스크립트로 (삼항연산자 · &&)
Vue   → 디렉티브로, HTML 속성처럼 (v-if · v-else · v-show)
```

[데이터 바인딩](/blog/react-vue-data-binding/)의 `{}` vs `{{}}` 와 같은 결이다 — React는 JS 중심, Vue는 템플릿 중심.

## React — JSX 표현식으로

React엔 조건문 문법이 따로 없다. **JSX의 `{}` 안에 자바스크립트 표현식**을 넣어 처리한다.

**함수형 컴포넌트**
```jsx
function App() {
  const isLogin = true;
  return (
    <div>
      {/* 삼항연산자: 조건 ? 참일때 : 거짓일때 */}
      {isLogin ? <p>환영합니다</p> : <p>로그인하세요</p>}

      {/* && : 참일 때만 렌더 (거짓이면 아무것도 안 그림) */}
      {isLogin && <button>로그아웃</button>}
    </div>
  );
}
```

**클래스 컴포넌트**
```jsx
class App extends React.Component {
  render() {
    const isLogin = true;
    return (
      <div>
        {isLogin ? <p>환영합니다</p> : <p>로그인하세요</p>}
        {isLogin && <button>로그아웃</button>}
      </div>
    );
  }
}
```

- **삼항연산자 `? :`** — 참/거짓 **둘 다** 보여줄 게 있을 때
- **`&&`** — 참일 때만 보여주고, 거짓이면 안 그릴 때

함수형이든 클래스든 **JSX 안에 삼항·&& 를 쓰는 방식은 똑같다**(render 위치만 다름). 조건문이 아니라 **표현식**이라는 게 포인트다 — JSX엔 `if`를 직접 못 쓰고, 삼항·&&로 푼다.

## Vue — 디렉티브로

Vue는 **`v-if` 디렉티브**를 HTML 속성처럼 붙인다. script 방식(Composition/Options)만 다르고 **`<template>`의 `v-if`는 동일**하다.

**Composition API**
```vue
<script setup>
const isLogin = true
</script>

<template>
  <p v-if="isLogin">환영합니다</p>
  <p v-else>로그인하세요</p>
  <button v-if="isLogin">로그아웃</button>
</template>
```

**Options API**
```vue
<script>
export default {
  data() { return { isLogin: true } }
}
</script>

<template>
  <p v-if="isLogin">환영합니다</p>
  <p v-else>로그인하세요</p>
  <button v-if="isLogin">로그아웃</button>
</template>
```

- **`v-if` / `v-else-if` / `v-else`** — 조건 분기 (if/else 그대로 읽힌다)
- 삼항·&& 같은 JS 표현식이 아니라, **태그에 붙이는 속성**이라 HTML처럼 읽기 쉽다

Vue의 강점이 여기서 드러난다 — `v-if="isLogin"` 이 *"이 조건이면 이 태그를 보여줘"* 로 **자연어에 가깝게** 읽힌다.

## 비교표 (4스타일)

| 스타일 | 조건부 렌더링 방식 |
|---|---|
| React **함수형** | JSX에 `{cond ? <A/> : <B/>}` · `{cond && <A/>}` |
| React **클래스** | `render()` 안, 위와 동일 |
| Vue **Composition** | `<template>`에 `v-if` / `v-else` |
| Vue **Options** | `<template>`에 `v-if` / `v-else` (동일) |

```
React (함수형·클래스) → 삼항 ? : / &&   (자바스크립트 표현식)
Vue   (Composition·Options) → v-if / v-else  (디렉티브)
```

React는 스타일이 뭐든 **삼항·&&**, Vue는 스타일이 뭐든 **v-if** — 데이터 바인딩과 똑같이, **출력 방식은 프레임워크별로 고정**이고 변수 선언만 스타일별로 다르다.

## Vue만의 것 — v-if vs v-show

Vue엔 조건부에 **두 가지**가 있다. 차이를 알아두면 좋다.

| | v-if | v-show |
|---|---|---|
| 거짓일 때 | **DOM에서 아예 제거** (안 그림) | 그리되 **CSS로 숨김**(`display:none`) |
| 유리한 경우 | 거의 안 바뀌는 조건 | **자주 토글**하는 조건 |

```vue
<p v-if="show">조건 거짓이면 DOM에서 사라짐</p>
<p v-show="show">조건 거짓이면 숨겨질 뿐, DOM엔 있음</p>
```

- **`v-if`** — 껐다 켰다 비용이 큼(DOM 생성·제거). 조건이 잘 안 바뀌면 이게 낫다
- **`v-show`** — 항상 만들어두고 보이기만 토글. **자주 껐다 켰다** 하면 이게 빠르다

React엔 `v-show`에 딱 맞는 게 없다 — 숨기려면 `style={{ display: 'none' }}`이나 CSS 클래스로 직접 처리한다.

## 정리

- **조건부 렌더링** = 조건에 따라 화면을 다르게
- **React** — JSX의 `{}` 안에서 **삼항 `? :`** (둘 다 보여줄 때) · **`&&`** (참일 때만) — 함수형·클래스 동일
- **Vue** — **`v-if` / `v-else-if` / `v-else`** 디렉티브 — Composition·Options 동일(template)
- **접근 차이** — React는 **JS 표현식**, Vue는 **디렉티브(HTML 속성처럼)** → [데이터 바인딩](/blog/react-vue-data-binding/)의 `{}` vs `{{}}` 와 같은 결
- **Vue 보너스** — `v-if`(DOM 제거) vs `v-show`(CSS 숨김) — 자주 토글하면 `v-show`

조건부 렌더링에서 두 프레임워크의 철학이 다시 드러난다 — React는 *"어차피 자바스크립트니 삼항으로 풀자"*, Vue는 *"HTML 속성처럼 v-if로 선언하자"*. 어느 쪽이 옳다기보다, [데이터 바인딩](/blog/react-vue-data-binding/)에서 본 그 **"JS 중심 vs 템플릿 중심"** 이 여기서도 일관되게 이어진다. 이 결을 알면, 다음에 반복 렌더링(`map` vs `v-for`)을 봐도 *"아, React는 JS로, Vue는 디렉티브로 하겠구나"* 가 미리 그려진다.
