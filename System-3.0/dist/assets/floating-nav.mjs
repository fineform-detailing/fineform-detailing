// Shared customer navigation. Native links keep every destination usable without
// a router, another loader, or changes to the booking and tracking flows.
const paths = {
  home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2Z"/>',
  care: '<path d="m5 10 2-5h10l2 5M3 11l2-1h14l2 1v7H3Z"/><path d="M5 18v2m14-2v2M7 14h.01M17 14h.01M10 14h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  plans: '<rect x="4" y="5" width="16" height="16" rx="4"/><path d="M8 3v4m8-4v4M4 10h16m-12 5 3 3 5-5"/>',
  orders: '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 3h6v4H9Zm0 9h6m-6 4h4"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;

export function mountFloatingNav({root = './', window = globalThis.window} = {}) {
  const {document} = window;
  const footer = document.querySelector('[data-footer]');
  if (!footer || document.querySelector('.ff-dock') || document.body.dataset.page === 'admin') return;
  const page = document.body.dataset.page;
  const items = [
    ['home', 'Início', page === 'home' ? '#conteudo' : root, 'home'],
    ['care', 'Cuidados', root + '#cuidados', 'care'],
    ['quote', 'Orçar', page === 'booking' ? '#conteudo' : root + 'atendimento/', 'plus'],
    ['plans', 'Care', root + '#care', 'plans'],
    ['orders', 'Pedidos', root + 'acompanhar/', 'orders'],
  ];
  const nav = document.createElement('nav');
  nav.className = 'ff-dock';
  nav.setAttribute('aria-label', 'Atalhos Fine Form');
  const indicator = document.createElement('span');
  indicator.className = 'ff-dock-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  nav.append(indicator);
  const links = items.map(([key, label, href, glyph]) => {
    const link = document.createElement('a');
    link.className = 'ff-dock-link' + (key === 'quote' ? ' ff-dock-primary' : '');
    link.href = href;
    link.dataset.dock = key;
    link.setAttribute('aria-label', label === 'Orçar' ? 'Orçar atendimento' : label);
    link.innerHTML = `<span class="ff-dock-icon">${icon(glyph)}</span><span class="ff-dock-label">${label}</span>`;
    nav.append(link);
    return link;
  });
  footer.append(nav);
  document.body.classList.add('has-ff-dock');
  let active;
  function select(key) {
    if (key === active) return;
    active = key;
    const index = items.findIndex(item => item[0] === key);
    // A aba ativa ganha espaço para o rótulo; as outras permanecem só com ícone.
    // O CSS interpola as cinco colunas, criando a cápsula deslizante da referência.
    nav.dataset.active = index >= 0 ? key : '';
    nav.style.setProperty('--dock-columns', items.map((_, i) => i === index ? '2.3fr' : '1fr').join(' '));
    links.forEach((link, i) => {
      const selected = i === index;
      link.classList.toggle('is-selected', selected);
      if (selected) link.setAttribute('aria-current', page === 'home' ? 'location' : 'page');
      else link.removeAttribute('aria-current');
    });
    indicator.hidden = index < 0 || key === 'quote';
    if (index >= 0) indicator.style.transform = `translateX(${index * 100}%)`;
  }

  // Durante rolagem manual, a barra inteira apenas desaparece por opacidade.
  // Ao parar, reaparece no mesmo tamanho, sem círculo nem transformação.
  let idleTimer = 0;
  let lastScrollY = window.scrollY || 0;
  let keepVisibleUntil = 0;
  function setScrollHidden(hidden) {
    if (hidden && (links.includes(document.activeElement) || Date.now() < keepVisibleUntil)) return;
    nav.classList.toggle('ff-dock-scroll-hidden', hidden);
    links.forEach(link => { link.tabIndex = hidden ? -1 : 0; });
  }
  function onDockScroll() {
    const y = window.scrollY || 0;
    if (Math.abs(y - lastScrollY) < 1) return;
    lastScrollY = y;
    setScrollHidden(true);
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      setScrollHidden(false);
      idleTimer = 0;
    }, 300);
  }
  window.addEventListener('scroll', onDockScroll, {passive: true});
  window.addEventListener('pageshow', () => {
    lastScrollY = window.scrollY || 0;
    window.clearTimeout(idleTimer);
    idleTimer = 0;
    keepVisibleUntil = 0;
    setScrollHidden(false);
  });

  // Tocar em Cuidados ou Care destaca a aba imediatamente, antes do
  // deslocamento até a âncora. Assim, a cápsula anima mesmo no segundo botão.
  if (page === 'home') {
    links.forEach(link => link.addEventListener('click', () => {
      const key = link.dataset.dock;
      if (key !== 'home' && key !== 'care' && key !== 'plans') return;
      keepVisibleUntil = Date.now() + 750;
      setScrollHidden(false);
      select(key);
      window.setTimeout(() => scheduleSection(), 760);
    }));
  }

  let frame = 0;
  const services = document.getElementById('cuidados');
  const plans = document.getElementById('care');
  function updateSection() {
    frame = 0;
    if (page !== 'home' || Date.now() < keepVisibleUntil) return;
    const line = window.innerHeight * .38;
    const care = services?.getBoundingClientRect();
    const plan = plans?.getBoundingClientRect();
    // Care vem ANTES de Cuidados na home: não deixar o bloco anterior
    // bloquear o destaque do segundo botão quando Cuidados entra na tela.
    if (care && care.top <= line && care.bottom > line) select('care');
    else if (plan && plan.top <= line && plan.bottom > line) select('plans');
    else if ((care && care.top > line) || (plan && plan.top > line)) select('home');
    else select(null);
  }
  function scheduleSection() {
    if (!frame) frame = window.requestAnimationFrame(updateSection);
  }
  if (page === 'home') {
    updateSection();
    window.addEventListener('scroll', scheduleSection, {passive: true});
    window.addEventListener('resize', scheduleSection, {passive: true});
    window.addEventListener('pageshow', scheduleSection);
  } else {
    select(({booking: 'quote', membership: 'plans', tracking: 'orders', review: 'orders'})[page] ?? null);
  }

  // Give the keyboard and form fields the whole available screen on phones.
  function syncKeyboard() {
    const input = document.activeElement;
    const editable = input?.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable="true"]');
    const keyboard = editable && window.innerWidth <= 760;
    nav.classList.toggle('ff-dock-keyboard', Boolean(keyboard));
  }
  document.addEventListener('focusin', syncKeyboard);
  document.addEventListener('focusout', () => window.queueMicrotask(syncKeyboard));
  window.addEventListener('resize', syncKeyboard, {passive: true});
  return nav;
}
