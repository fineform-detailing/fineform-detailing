// Fine Form Care: real, swipeable portrait cards; the neighbouring plan is an actual card,
// not an image painted behind the current one. No decorative autoplay or transitions.
export function mountCarePlans(host, {plans, money, root}) {
  const photos = [
    ['modern-gt3.webp', 'Porsche 911 GT3, fotografia editorial', 933, 1400],
    ['modern-mclaren.webp', 'McLaren preto, fotografia editorial', 1200, 1800],
    ['modern-ducati.webp', 'Ducati Panigale, fotografia editorial', 1600, 1068],
  ];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
  const arrow = '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
  host.innerHTML =
    '<div class="care-stage" role="region" aria-roledescription="carrossel" aria-label="Planos Fine Form Care; arraste para conhecer outros planos" tabindex="0">' +
    plans.map((plan, index) => {
      const [photo, alt, width, height] = photos[index];
      return '<article class="care-feature" data-plan="' + escape(plan.id) +
        '" data-active="' + (index === 0) + '" aria-labelledby="plan-title-' + escape(plan.id) + '">' +
        '<div class="care-photo">' +
          '<img src="' + root + 'assets/' + photo + '" srcset="' +
            root + 'assets/' + photo.replace('.webp', '-mobile.webp') + ' 560w, ' +
            root + 'assets/' + photo + ' ' + width + 'w" sizes="(max-width:760px) 74vw, 360px" width="' +
            width + '" height="' + height + '" decoding="async" alt="' + escape(alt) +
            '" loading="' + (index === 0 ? 'eager' : 'lazy') + '" draggable="false">' +
          '<span class="care-photo-brand">FINE FORM <b>CARE</b></span>' +
          '<span class="care-photo-number">0' + (index + 1) + ' / 0' + plans.length + '</span>' +
          '<span class="care-photo-arrow" aria-hidden="true">' + arrow + '</span>' +
        '</div>' +
        '<div class="care-copy">' +
          '<p class="care-kind">' + (plan.vehicle === 'car' ? 'Para seu carro' : 'Para sua moto') + ' · plano mensal</p>' +
          '<h3 id="plan-title-' + escape(plan.id) + '">' + escape(plan.name) + '</h3>' +
          '<p class="care-description">' + escape(plan.description) + '</p>' +
          '<div class="care-price"><strong>' + escape(money(plan.price)) + '</strong><span>/ mês</span></div>' +
          '<dl class="care-facts"><div><dt>Visitas no mês</dt><dd>' + plan.visits +
            ' atendimentos</dd></div><div><dt>Economia mensal</dt><dd>' + escape(money(plan.saving)) +
            '</dd></div></dl>' +
          '<a class="button care-interest" href="' + root + 'atendimento/?plan=' +
            encodeURIComponent(plan.id) + '">Escolher este plano <span aria-hidden="true">↗</span></a>' +
          '<p class="care-agreement">Para um veículo cadastrado. Agenda combinada com Mateus.</p>' +
        '</div></article>';
    }).join('') + '</div>' +
    '<div class="care-controls" aria-label="Navegação dos planos">' +
      '<button type="button" class="care-arrow" data-plan-step="-1" aria-label="Plano anterior">' +
        '<span aria-hidden="true">←</span></button>' +
      '<div class="care-selectors" role="group" aria-label="Selecionar plano">' +
        plans.map((plan, index) =>
          '<button type="button" data-plan-index="' + index + '" aria-pressed="' + (index === 0) +
          '" aria-label="Ver ' + escape(plan.name) + '"><span class="care-dot" aria-hidden="true"></span></button>'
        ).join('') +
      '</div>' +
      '<span class="care-counter" aria-hidden="true">01 / 0' + plans.length + '</span>' +
      '<button type="button" class="care-arrow" data-plan-step="1" aria-label="Próximo plano">' +
        '<span aria-hidden="true">→</span></button>' +
    '</div>' +
    '<p class="care-status sr-only" role="status" aria-live="polite" aria-atomic="true"></p>';

  const stage = host.querySelector('.care-stage');
  const cards = [...host.querySelectorAll('.care-feature')];
  const selectors = [...host.querySelectorAll('[data-plan-index]')];
  const counter = host.querySelector('.care-counter');
  const status = host.querySelector('.care-status');
  let active = 0;
  let scrollFrame = 0;

  function update(index, {scroll = true, announce = true} = {}) {
    const next = (index + plans.length) % plans.length;
    active = next;
    cards.forEach((card, i) => { card.dataset.active = String(i === active); });
    selectors.forEach((button, i) => button.setAttribute('aria-pressed', String(i === active)));
    counter.textContent = String(active + 1).padStart(2, '0') + ' / ' + String(plans.length).padStart(2, '0');
    if (announce) {
      status.textContent = plans[active].name + ', ' + money(plans[active].price) +
        ' por mês. Plano ' + (active + 1) + ' de ' + plans.length + '.';
      host.dispatchEvent(new CustomEvent('ff:plan', {detail: {id: plans[active].id}}));
    }
    if (scroll) {
      const card = cards[active];
      const left = Math.max(0, card.offsetLeft - (stage.clientWidth - card.offsetWidth) / 2);
      if (typeof stage.scrollTo === 'function') stage.scrollTo({left, behavior: 'instant'});
      else stage.scrollLeft = left;
    }
  }

  function select(index) {
    const next = (index + plans.length) % plans.length;
    if (next === active) return;
    update(next);
  }
  host.querySelectorAll('[data-plan-step]').forEach(button =>
    button.addEventListener('click', () => select(active + Number(button.dataset.planStep))));
  selectors.forEach(button =>
    button.addEventListener('click', () => select(Number(button.dataset.planIndex))));
  cards.forEach((card, index) => {
    card.addEventListener('click', event => {
      if (!event.target.closest('a,button')) select(index);
    });
    card.addEventListener('focusin', () => select(index));
  });
  stage.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const keys = {ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: plans.length - 1};
    if (!(event.key in keys)) return;
    event.preventDefault();
    select(keys[event.key]);
  });
  // Native touch swipes scroll real cards. Sync pagination with the card nearest the centre.
  stage.addEventListener('scroll', () => {
    if (scrollFrame) return;
    const tick = () => {
      scrollFrame = 0;
      if (!stage.clientWidth) return;
      const viewport = stage.getBoundingClientRect();
      const center = viewport.left + viewport.width / 2;
      const distances = cards.map(card => {
        const rect = card.getBoundingClientRect();
        return Math.abs(rect.left + rect.width / 2 - center);
      });
      const nearest = distances.indexOf(Math.min(...distances));
      if (nearest >= 0 && nearest !== active) update(nearest, {scroll: false});
    };
    const raf = stage.ownerDocument.defaultView?.requestAnimationFrame;
    if (raf) scrollFrame = raf.call(stage.ownerDocument.defaultView, tick);
    else tick();
  }, {passive: true});
  update(0, {scroll: false, announce: false});
  return {select};
}
