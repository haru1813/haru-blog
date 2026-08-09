---
title: React·Vue 개발환경 세팅 — Vite로 시작하기
description: "React와 Vue 프로젝트를 실제로 만들어 띄우는 법. Node.js·npm 준비, 요즘 표준 빌드 도구 Vite로 React/Vue 프로젝트 생성, 폴더 구조, 개발 서버 실행(npm run dev)까지 — 손으로 시작하는 첫걸음을 정리한다."
pubDate: 2026-08-09
category: frontend
parent: frontend-spa-ssr
---

[배경](/blog/frontend-spa-ssr/)과 [차이](/blog/react-vs-vue/)를 봤으니, 이제 **직접 만들어 띄워본다.** 요즘은 **Vite**라는 도구로 몇 줄이면 React·Vue 프로젝트가 뜬다. 준비물부터 실행까지 정리한다.

## 준비물 — Node.js

프론트엔드 개발엔 **Node.js**가 필요하다. 자바스크립트를 브라우저 밖에서 실행하는 런타임인데, 여기 딸려오는 **npm**([백엔드의 Maven/Gradle](/blog/maven-vs-gradle/) 같은 패키지 매니저)으로 라이브러리를 관리한다.

```bash
node -v    # 설치 확인 (LTS 버전 권장)
npm -v
```

[nodejs.org](https://nodejs.org)에서 **LTS 버전**을 받으면 된다.

## 왜 Vite인가 — CRA는 옛날

예전엔 React를 **CRA(Create React App)**로 시작했는데, 느리고 이제 권장되지 않는다. 요즘 표준은 **Vite(비트)**다.

- **빠름** — 개발 서버가 즉시 뜨고, 저장하면 바로 반영(HMR)
- **가벼움** — 설정이 간단
- **React·Vue 둘 다** 지원

빌드 도구가 뭔지 헷갈리면 — 소스코드(JSX·Vue 파일)를 브라우저가 이해하는 JS로 **변환·묶어주는** 도구다. 백엔드의 [Gradle이 빌드하듯](/blog/maven-vs-gradle/), 프론트는 Vite가 한다.

## React 프로젝트 만들기

```bash
npm create vite@latest my-react-app -- --template react
cd my-react-app
npm install       # 의존성 설치 (node_modules 생성)
npm run dev       # 개발 서버 실행
```

실행하면 `http://localhost:5173` 같은 주소가 뜨고, 브라우저로 열면 React 앱이 보인다.

## Vue 프로젝트 만들기

**템플릿만 바꾸면** 된다. 나머지는 똑같다.

```bash
npm create vite@latest my-vue-app -- --template vue
cd my-vue-app
npm install
npm run dev
```

React든 Vue든 **Vite로 시작하는 명령이 거의 같다** — `--template` 뒤만 다르다. 이게 Vite의 편리함이다.

## 폴더 구조 (React · Vue)

**React**
```
my-react-app/
├── node_modules/     ← 설치된 라이브러리 (건드릴 일 없음)
├── public/           ← 정적 파일 (이미지 등)
├── src/              ← ★ 우리가 작업하는 곳
│   ├── App.jsx       ← 최상위 컴포넌트
│   ├── main.jsx      ← 진입점 (App을 화면에 붙임)
│   └── components/   ← (직접 만드는) 컴포넌트들
├── index.html        ← SPA의 그 "하나의 페이지"
├── package.json      ← 의존성·스크립트 목록 (백엔드 pom.xml/build.gradle 격)
└── vite.config.js    ← Vite 설정
```

**Vue**
```
my-vue-app/
├── node_modules/
├── public/
├── src/              ← ★ 우리가 작업하는 곳
│   ├── App.vue       ← 최상위 컴포넌트 (SFC: 템플릿+스크립트+스타일 한 파일)
│   ├── main.js       ← 진입점 (App을 화면에 붙임)
│   ├── components/   ← (직접 만드는) 컴포넌트들
│   └── assets/       ← 정적 자원(css 등)
├── index.html        ← SPA의 그 "하나의 페이지"
├── package.json      ← 의존성·스크립트 목록
└── vite.config.js    ← Vite 설정
```

거의 똑같고, **핵심 파일만 다르다** — React는 `App.jsx`·`main.jsx`, Vue는 `App.vue`·`main.js`다. 특히 Vue의 **`.vue` 파일은 SFC(Single File Component)** 로, [차이 글](/blog/react-vs-vue/)에서 본 **템플릿·스크립트·스타일을 한 파일**에 담는다. 나머지(`index.html`·`package.json`·`vite.config.js`)는 Vite를 쓰니 **동일**하다.

- **`src/`** 에서 대부분 작업한다
- **`index.html`** 이 [배경 글](/blog/frontend-spa-ssr/)에서 말한 SPA의 *"하나의 페이지"* 다 — 여기 `<div id="root">`에 JS가 화면을 그린다
- **`package.json`** 은 [백엔드의 `pom.xml`/`build.gradle`](/blog/maven-vs-gradle/)과 같은 역할 (의존성·명령 정의)

## 자주 쓰는 npm 명령

```bash
npm install         # package.json의 의존성 설치
npm install axios   # 새 라이브러리 추가 (예: HTTP 클라이언트)
npm run dev         # 개발 서버 (작업할 때)
npm run build       # 배포용 빌드 (dist/ 생성)
npm run preview     # 빌드 결과 미리보기
```

개발 중엔 `npm run dev`로 띄워두고 코드를 고치면, **저장하는 순간 브라우저에 바로 반영**된다(HMR). 이 즉각적인 피드백이 프론트 개발의 재미다.

## 정리

- **준비**: Node.js(LTS) 설치 → `npm` 딸려옴
- **도구**: **Vite** (CRA는 옛날, 이제 Vite가 표준 — 빠르고 가벼움)
- **생성**: `npm create vite@latest 앱이름 -- --template react`(또는 `vue`)
- **실행**: `npm install` → `npm run dev` → `localhost:5173`
- **구조**: `src/`에서 작업, `index.html`이 SPA의 한 페이지, `package.json`이 의존성 관리

여기까지 하면 **React·Vue 앱이 눈앞에 뜬다.** 이제 배경(왜)·차이(무엇)·세팅(실전)이 다 갖춰졌으니, 진짜 시작은 `src/App.jsx`(또는 `App.vue`)를 열어 **첫 컴포넌트를 고쳐보는 것**이다. `npm run dev`를 켜두고 글자 하나 바꿔 저장해보면, 브라우저가 즉시 반응하는 그 순간에 *"아, 이게 프론트구나"* 가 손에 잡힌다. 결국 여기서도 방향은 하나였다 — 복잡한 빌드의 수고를 도구(Vite)에 맡기고, 우리는 화면을 만드는 데 집중한다.
