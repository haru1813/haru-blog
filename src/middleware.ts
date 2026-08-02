import { defineMiddleware } from 'astro:middleware';

// 일기(/diary)는 아래 공인 IP에서 접속한 단말기만 접근 가능.
// 여러 IP를 허용하려면 배열에 추가하세요. IP가 바뀌면 이 값을 수정.
const ALLOWED_IPS = new Set(['1.241.43.216']);

export const onRequest = defineMiddleware((context, next) => {
	const path = context.url.pathname;
	const isDiary = path === '/diary' || path.startsWith('/diary/');

	if (isDiary) {
		const ip = context.clientAddress;
		if (!ALLOWED_IPS.has(ip)) {
			// 허용되지 않은 IP → 존재하지 않는 것처럼 처리(정보 노출 최소화)
			return new Response('Not Found', {
				status: 404,
				headers: { 'content-type': 'text/plain; charset=utf-8' },
			});
		}
	}

	return next();
});
