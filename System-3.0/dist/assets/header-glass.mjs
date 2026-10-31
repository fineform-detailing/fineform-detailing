// Header Fine Form: inicia sem fundo e assume vidro fosco após o início do scroll.
// Sem modificação do loader, menu ou estrutura da página.
export function mountHeaderGlass(header, {win=window, threshold=24}={}) {
 if (!header) return () => {};
 const update=()=>header.classList.toggle('is-scrolled',win.scrollY>threshold);
 update();
 win.addEventListener('scroll',update,{passive:true});
 win.addEventListener('pageshow',update);
 win.addEventListener('resize',update,{passive:true});
 return ()=>{
  win.removeEventListener('scroll',update);
  win.removeEventListener('pageshow',update);
  win.removeEventListener('resize',update);
 };
}
