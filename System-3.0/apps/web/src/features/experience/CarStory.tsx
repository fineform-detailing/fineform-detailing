"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../../components/layout/AppProvider";
import { clampProgress, frameAt, stageAt, stages } from "./story";

/** Scroll owns the frame. React only updates at chapter boundaries. */
export function CarStory() {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const progress = useRef(0);
  const renderFrame = useRef<(p: number) => void>(() => {});
  const { paused } = useApp();
  const [chapter, setChapter] = useState(0);
  const [reduced, setReduced] = useState(true);
  const [manual, setManual] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [load, setLoad] = useState(false);
  const scrolling = load && !reduced && !paused && !manual && !failed;
  const chapterData = stages[chapter];

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync(); media.addEventListener("change", sync);
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (!media.matches && !connection?.saveData && !/2g/.test(connection?.effectiveType || "")) setLoad(true);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!load || reduced || !canvas.current) return;
    const element = canvas.current;
    const ctx = element.getContext("2d", { alpha: false });
    if (!ctx) { setFailed(true); return; }
    let disposed = false, wanted = 0, active = 0;
    const cache = new Map<number, HTMLImageElement>();
    const pending = new Set<number>();
    const queue: number[] = [];
    const size = matchMedia("(max-width: 760px)").matches ? "mobile" : "desktop";
    element.width = size === "mobile" ? 640 : 960;
    element.height = element.width * .75;
    const draw = () => {
      if (disposed || document.hidden) return;
      const img = cache.get(wanted);
      if (!img) return;
      ctx.drawImage(img, 0, 0, element.width, element.height);
      setReady(true); setFailed(false);
    };
    const pump = () => {
      while (!disposed && active < 3 && queue.length) {
        const index = queue.shift()!;
        if (cache.has(index)) { pending.delete(index); continue; }
        active++;
        const img = new Image(); img.decoding = "async";
        img.onload = () => {
          active--; pending.delete(index);
          if (disposed) return;
          cache.set(index, img);
          // 20 decoded frames max: ~55 MB desktop / ~25 MB mobile.
          while (cache.size > 20) {
            let victim = -1, distance = -1;
            for (const key of cache.keys()) if (Math.abs(key - wanted) > distance) { victim = key; distance = Math.abs(key - wanted); }
            cache.delete(victim);
          }
          draw(); pump();
        };
        img.onerror = () => {
          active--; pending.delete(index);
          if (!disposed) { if (index === wanted && !cache.size) setFailed(true); pump(); }
        };
        img.src = `/assets/experience/sequence/${size}/${String(index).padStart(3, "0")}.webp`;
      }
    };
    renderFrame.current = (p) => {
      wanted = frameAt(p);
      // Discard obsolete queued requests on a fast scroll or a chapter jump.
      queue.splice(0).forEach(i => pending.delete(i));
      for (const delta of [0, 1, -1, 2, -2, 3, -3]) {
        const index = wanted + delta;
        if (index < 0 || index > 100 || cache.has(index) || pending.has(index)) continue;
        pending.add(index); queue.push(index);
      }
      draw(); pump();
    };
    renderFrame.current(progress.current);
    const visible = () => { if (!document.hidden) renderFrame.current(progress.current); };
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true; queue.length = 0; cache.clear(); pending.clear();
      renderFrame.current = () => {};
      document.removeEventListener("visibilitychange", visible);
    };
  }, [load, reduced]);

  useEffect(() => {
    const el = section.current;
    if (!el || !scrolling) return;
    let request = 0;
    const update = () => {
      request = 0;
      const rect = el.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top > innerHeight || document.hidden) return;
      const p = clampProgress(-rect.top / Math.max(1, el.offsetHeight - innerHeight));
      progress.current = p;
      setChapter(stageAt(p));
      renderFrame.current(p);
    };
    const schedule = () => { if (!request) request = requestAnimationFrame(update); };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    update();
    return () => { cancelAnimationFrame(request); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [scrolling]);

  const choose = (index: number) => {
    const p = stages[index].at;
    progress.current = p; setChapter(index); renderFrame.current(p);
    if (scrolling && section.current) window.scrollTo({ top: window.scrollY + section.current.getBoundingClientRect().top + p * (section.current.offsetHeight - innerHeight), behavior: "instant" });
  };
  const toggleMode = () => {
    const top = section.current ? window.scrollY + section.current.getBoundingClientRect().top : 0;
    setManual(!manual);
    requestAnimationFrame(() => {
      const travel = section.current ? Math.max(0, section.current.offsetHeight - innerHeight) : 0;
      window.scrollTo({ top: top + (!manual ? 0 : progress.current * travel), behavior: "instant" });
    });
  };

  return (
    <section ref={section} id="o-cuidado" className={`car-story ${scrolling ? "with-scroll" : "without-scroll"}`} aria-label="O cuidado Fine Form, em quatro etapas do exterior">
      <div className="story-stage" data-chapter={chapter}>
        <div className="story-label"><span>Cuidado automotivo</span><span>Um veículo por vez.</span></div>
        <h1 className="story-title" id="hero-title"><span>{chapterData.title}</span><em>{chapterData.accent}</em></h1>
        <div className={`story-visual ${ready && !failed && !reduced ? "is-ready" : ""}`} aria-hidden="true">
          <img src={`/assets/experience/poster-${chapter}.webp`} alt="" width={960} height={720} fetchPriority="high" className="story-poster" />
          <canvas ref={canvas} className="story-canvas" />
        </div>
        <div className="story-copy">
          <p>{chapterData.text}</p>
          <a href={chapterData.href} className="story-action">{chapterData.action}<span aria-hidden="true">↗</span></a>
          <a href="#cuidados" className="story-skip">Ver os serviços <span aria-hidden="true">↓</span></a>
        </div>
        <span className="story-signature" aria-hidden="true">Do primeiro olhar<br/>ao último detalhe.</span>
        <div className="story-bottom">
          <div className="story-chapters" role="group" aria-label="Explorar etapas do cuidado">
            {stages.map((s, index) => <button key={s.label} type="button" aria-pressed={index === chapter} onClick={() => choose(index)} onKeyDown={e => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
              e.preventDefault(); const next = (index + (e.key === "ArrowRight" ? 1 : 3)) % 4;
              choose(next); (e.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
            }}><span>0{index + 1}</span>{s.label}</button>)}
          </div>
          <div className="story-meta"><a href="/creditos/#modelo">Porsche 930 · cena conceitual ↗</a>
            {reduced ? <span>Movimento reduzido</span> : <button type="button" onClick={toggleMode} aria-pressed={manual}>{manual ? "Ativar ao rolar" : "Explorar sem rolagem"}</button>}
            {!load && !reduced && <button type="button" onClick={() => setLoad(true)}>Carregar sequência</button>}
          </div>
        </div>
      </div>
    </section>
  );
}
