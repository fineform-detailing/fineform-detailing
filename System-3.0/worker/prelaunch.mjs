// A server-side gate: only this page and its explicit presentation assets are public.
// Change PRELAUNCH_MODE to "false" and deploy to reopen the original application.
const assets = new Set([
 '/assets/logo-original.png',
 '/assets/fineform-home.webp',
 '/assets/fineform-home-mobile.webp',
 '/assets/fonts/body-400-latin-v1.woff2',
 '/assets/fonts/body-600-latin-v1.woff2',
]);

export const prelaunchCss = `
@font-face{font-family:FineForm;src:url('/assets/fonts/body-400-latin-v1.woff2') format('woff2');font-weight:400;font-display:swap}
@font-face{font-family:FineForm;src:url('/assets/fonts/body-600-latin-v1.woff2') format('woff2');font-weight:600 800;font-display:swap}
:root{color-scheme:light;--ink:#0b0d0c;--paper:#ffffff;--orange:#ff8000;--muted:#697078;font-family:FineForm,Arial,sans-serif;background:var(--paper);color:var(--ink)}
*{box-sizing:border-box}body{margin:0}a{color:inherit;text-decoration:none}button,a{-webkit-tap-highlight-color:transparent}::selection{background:var(--orange);color:var(--ink)}
a:focus-visible{outline:3px solid var(--orange);outline-offset:6px}.shell{max-width:1480px;margin:auto;padding:0 clamp(24px,5vw,80px)}
.topbar{min-height:116px;display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid #e5e7e1}.brand{display:flex;align-items:center;gap:14px}.brand img{width:44px;height:44px;border-radius:9px}.brand-name{font-size:24px;font-weight:600;letter-spacing:-1px}.brand-caption{display:block;font-size:9px;letter-spacing:1.5px;color:var(--muted);margin-top:2px}.top-note{display:flex;align-items:center;gap:10px;font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:var(--muted)}.dot{width:6px;height:6px;background:var(--orange);border-radius:50%;box-shadow:0 0 0 5px #ff800017}
.main{display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(36px,6vw,100px);padding:clamp(40px,6vh,80px) 0;align-items:center;min-height:calc(100svh - 204px)}
.eyebrow{display:flex;align-items:center;gap:12px;margin:0 0 32px;color:var(--muted);font-size:11px;letter-spacing:1.4px;text-transform:uppercase}.eyebrow:before{content:'';width:30px;height:1px;background:var(--orange)}
h1{margin:0;font-size:clamp(54px,5.8vw,88px);font-weight:400;line-height:1.02;letter-spacing:-.065em}h1 span{color:var(--orange)}
.description{font-size:15px;line-height:1.85;max-width:390px;color:var(--muted);margin:30px 0 0}.description strong{font-weight:600;color:var(--ink)}
.actions{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-top:36px}.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;gap:24px;min-height:52px;padding:15px 23px;border-radius:50px;font-size:12px;font-weight:600;transition:background .2s,transform .2s}.primary{background:var(--orange);color:var(--ink)}.secondary{border:1px solid #d4d7d0}.primary:hover{background:#ff9b37;transform:translateY(-2px)}.secondary:hover{background:#f4f5f1;transform:translateY(-2px)}.actions svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.6;flex-shrink:0}.reassurance{display:flex;align-items:center;gap:9px;font-size:10px;color:#697078;margin-top:20px}.reassurance:before{content:'';width:4px;height:4px;background:#697078;border-radius:50%}
.visual{color:#f7f5ef;position:relative;aspect-ratio:1/1.1;max-height:570px;border-radius:24px;overflow:hidden;background:#262927;isolation:isolate;margin:0}.visual picture,.visual img{width:100%;height:100%;display:block}.visual img{object-fit:cover;object-position:50% 50%;animation:reveal 1s both}.visual:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#00000015 30%,#000000c9 100%);z-index:0}.visual-top{position:absolute;left:26px;right:26px;top:25px;display:flex;align-items:center;justify-content:space-between;z-index:1}.visual-label{border:1px solid #ffffff55;padding:9px 13px;border-radius:30px;font-size:9px;letter-spacing:1px;text-transform:uppercase;background:#11111130;backdrop-filter:blur(8px)}.visual-sign{font-size:26px;color:var(--orange);line-height:1}.visual-bottom{position:absolute;bottom:27px;left:28px;right:28px;z-index:1}.visual-bottom p{font-size:clamp(21px,2.3vw,32px);line-height:1.25;letter-spacing:-.04em;margin:0;max-width:280px}.visual-bottom small{display:block;color:#c0c3bd;font-size:9px;line-height:1.6;margin-top:20px}.rule{width:34px;height:2px;background:var(--orange);margin-bottom:18px}
.footer{min-height:88px;border-top:1px solid #e5e7e1;display:flex;align-items:center;justify-content:space-between;gap:20px;font-size:10px;color:#697078}.footer p{margin:0}.footer b{font-weight:400;color:#4b524b}.footer a{padding:10px 0}.footer a:hover{color:var(--ink)}
.copy{animation:rise .7s both}@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes reveal{from{opacity:0;transform:scale(1.025)}to{opacity:1;transform:scale(1)}}
@media(min-width:1600px){.main{min-height:750px}}
@media(max-width:760px){.shell{padding:0 24px}.topbar{min-height:94px}.brand img{width:35px;height:35px;border-radius:7px}.brand{gap:10px}.brand-name{font-size:22px}.brand-caption{font-size:7px;letter-spacing:1.2px}.top-note{font-size:8px;letter-spacing:.9px;gap:8px}.main{grid-template-columns:1fr;gap:34px;min-height:0;padding:42px 0 32px}.eyebrow{font-size:9px;letter-spacing:1.1px;margin-bottom:24px}h1{font-size:clamp(48px,12vw,72px);line-height:1.04}.description{font-size:13px;line-height:1.8;max-width:350px;margin-top:23px}.actions{margin-top:26px;gap:10px}.primary,.secondary{min-height:48px;padding:13px 19px;gap:18px;font-size:11px}.reassurance{font-size:9px;margin-top:16px}.visual{aspect-ratio:1.25;max-height:390px;border-radius:19px}.visual img{object-position:50% 51%}.visual-top{left:20px;right:20px;top:18px}.visual-bottom{left:21px;right:21px;bottom:20px}.visual-bottom p{font-size:24px;max-width:220px}.visual-bottom small{font-size:8px;margin-top:12px}.rule{margin-bottom:13px}.footer{min-height:100px;align-items:flex-start;flex-direction:column;justify-content:center;gap:10px;font-size:9px}.footer a{padding:3px 0}}
@media(max-width:360px){.shell{padding:0 20px}.top-note{letter-spacing:0;font-size:7px}.brand-caption{letter-spacing:.7px}.actions{align-items:stretch}.primary,.secondary{flex:1;gap:12px;padding-inline:14px}.visual-bottom p{font-size:21px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}
`;

export const prelaunchHtml = `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#ffffff">
<title>Fine Form — Em breve, um novo cuidado</title>
<meta name="description" content="A Fine Form está preparando sua inauguração. Nosso espaço e nosso site estão em construção. Acompanhe as novidades no Instagram.">
<meta name="robots" content="noindex, nofollow"><meta property="og:title" content="Fine Form — Em breve, um novo cuidado"><meta property="og:description" content="Estamos preparando cada detalhe para a nossa inauguração. Acompanhe as novidades."><meta property="og:type" content="website">
<link rel="icon" href="/assets/logo-original.png"><link rel="stylesheet" href="/inauguracao/estilo.css"><link rel="preload" href="/assets/fonts/body-400-latin-v1.woff2" as="font" type="font/woff2" crossorigin>
</head><body><div class="shell">
<header class="topbar"><div class="brand"><img src="/assets/logo-original.png" width="44" height="44" alt=""><div><span class="brand-name">Fine Form</span><span class="brand-caption">ESTÉTICA AUTOMOTIVA</span></div></div><div class="top-note"><span class="dot" aria-hidden="true"></span>Em preparação</div></header>
<main class="main"><div class="copy"><p class="eyebrow">A nossa próxima forma</p><h1>Um novo<br>cuidado.<br><span>Em breve.</span></h1>
<p class="description"><strong>Cada detalhe tem seu tempo.</strong><br>Estamos preparando nosso espaço e nosso site para a inauguração da Fine Form. O começo de um cuidado feito por inteiro, para o seu carro ou sua moto.</p>
<div class="actions"><a class="primary" href="https://www.instagram.com/fineform.detailing/" target="_blank" rel="noopener noreferrer">Acompanhar novidades<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></a><a class="secondary" href="https://wa.me/5511959473298" target="_blank" rel="noopener noreferrer">Falar com Mateus<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></a></div>
<p class="reassurance">A data de inauguração será divulgada nas nossas redes.</p></div>
<figure class="visual"><picture><source media="(max-width:760px)" srcset="/assets/fineform-home-mobile.webp"><img src="/assets/fineform-home.webp" alt="Conceito visual de estúdio de estética automotiva com um carro ao centro" width="1280" height="720" fetchpriority="high"></picture><div class="visual-top"><span class="visual-label">Fine Form · Em construção</span></div><figcaption class="visual-bottom"><div class="rule" aria-hidden="true"></div><p>Seu veículo.<br>Em boa forma.</p><small>Imagem ilustrativa do conceito da Fine Form.</small></figcaption></figure></main>
<footer class="footer"><p><b>Fine Form</b> · Um veículo por vez. Atenção por inteiro.</p><a href="https://www.instagram.com/fineform.detailing/" target="_blank" rel="noopener noreferrer">@fineform.detailing ↗</a></footer>
</div></body></html>`;

export async function prelaunchResponse(req, env) {
 const path = new URL(req.url).pathname;
 const read = req.method === 'GET' || req.method === 'HEAD';
 const headers = {'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'};
 if (!read || path.startsWith('/api/')) return new Response(req.method === 'HEAD' ? null : JSON.stringify({error:'A Fine Form está em preparação para a inauguração. O atendimento pelo site ainda não está disponível.',code:'prelaunch'}),{status:503,headers:{...headers,'Content-Type':'application/json; charset=utf-8','Retry-After':'86400'}});
 if (path === '/inauguracao/estilo.css') return new Response(req.method === 'HEAD' ? null : prelaunchCss,{headers:{...headers,'Content-Type':'text/css; charset=utf-8'}});
 if (path === '/robots.txt') return new Response(req.method === 'HEAD' ? null : 'User-agent: *\nDisallow: /\n',{headers:{...headers,'Content-Type':'text/plain; charset=utf-8'}});
 if (assets.has(path) && env.ASSETS) return env.ASSETS.fetch(req);
 return new Response(req.method === 'HEAD' ? null : prelaunchHtml,{status:path === '/' ? 200 : 503,headers:{...headers,'Content-Type':'text/html; charset=utf-8',...(path === '/' ? {} : {'Retry-After':'86400'})}});
}
