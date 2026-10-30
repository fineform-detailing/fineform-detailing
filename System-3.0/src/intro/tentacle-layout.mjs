/**
 * Keep the curled tip and suction cups proportional at every viewport size.
 * Only the long tail changes length. Geometry is fitted once, never per frame.
 */
export function tentacleGeometry({ width, height, left, viewportWidth }) {
  const scale = height / 420;
  const minX = 115 - (viewportWidth * .035 - left) / scale;
  const viewWidth = width / scale;
  const endX = Math.max(620, minX + viewWidth + 55);
  const stretch = (endX - 346) / 604;
  const x = value => Math.round((value < 346 ? value : 346 + (value - 346) * stretch) * 100) / 100;
  const count = Math.max(4, Math.min(22, Math.round((endX - 327) / 90) + 1));
  const cups = Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1);
    return { x: 327 + (endX - 422) * t, y: 315 + 76 * t ** .55, rx: 17 + 12 * t, ry: 10 + 6 * t, angle: 22 * (1 - t) ** 3 };
  });
  return {
    viewBox: [minX, 0, viewWidth, 420],
    base: `M310 260C322 265 333 269 346 275C${x(438)} 317 ${x(528)} 299 ${x(635)} 308C${x(733)} 317 ${x(825)} 335 ${x(950)} 327L${x(950)} 428C${x(750)} 389 ${x(568)} 382 ${x(387)} 355C${x(347)} 349 312 338 280 320`,
    shade: `M298 288C${x(402)} 356 ${x(575)} 336 ${x(699)} 353C${x(785)} 364 ${x(865)} 366 ${x(950)} 364L${x(950)} 428C${x(750)} 389 ${x(568)} 382 ${x(387)} 355C337 348 289 330 255 307Z`,
    highlight: `M${x(364)} 292C${x(446)} 326 ${x(535)} 312 ${x(625)} 323C${x(738)} 337 ${x(823)} 347 ${x(916)} 344`,
    cups,
  };
}

export function fitTentacle(svg, dimensions) {
  if (!svg || !(dimensions.width > 0) || !(dimensions.height > 0)) return;
  const geometry = tentacleGeometry(dimensions);
  svg.setAttribute('viewBox', geometry.viewBox.join(' '));
  svg.querySelector('[data-arm-base]').setAttribute('d', geometry.base);
  svg.querySelector('[data-arm-shade]').setAttribute('d', geometry.shade);
  svg.querySelector('[data-arm-highlight]').setAttribute('d', geometry.highlight);

  const document = svg.ownerDocument;
  const element = (name, attributes) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  };
  const cups = geometry.cups.map(cup => {
    const group = element('g', { transform: `translate(${cup.x} ${cup.y}) rotate(${cup.angle})` });
    group.append(
      element('ellipse', { rx: cup.rx, ry: cup.ry, fill: '#b4caa2', stroke: '#07110b', 'stroke-width': 3 }),
      element('ellipse', { cy: 1, rx: cup.rx * .44, ry: cup.ry * .46, fill: '#204b33', stroke: 'none' }),
    );
    return group;
  });
  svg.querySelector('[data-intro-tail-cups]').replaceChildren(...cups);
}
