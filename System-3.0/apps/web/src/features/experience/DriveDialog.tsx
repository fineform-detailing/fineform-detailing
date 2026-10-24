"use client";
import { useEffect, useRef, useState } from 'react';
import { keyAction, type DriveAction } from './drive-model';
import type { DriveScene } from './drive-scene';

export function DriveDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<DriveScene | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [paused, setPaused] = useState(false);
  const [overview, setOverview] = useState(false);
  const [lightMode, setLightMode] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState<DriveAction[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const release = () => { engine.current?.release(); setActive([]); };
  useEffect(() => {
    const node = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    node.showModal(); document.body.style.overflow = 'hidden';
    setReduceMotion(matchMedia('(prefers-reduced-motion: reduce)').matches);
    return () => { node.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    setStatus('loading'); setSpeed(0); setDistance(0); setPaused(false); setOverview(false);
    import('./drive-scene').then(async ({ createDriveScene }) => {
      if (disposed || !canvas.current) return;
      const scene = await createDriveScene(canvas.current, controller.signal, (s) => {
        if (!disposed) { setSpeed(Math.round(Math.abs(s.speed) * 3.6)); setDistance(Math.floor(s.distance)); }
      }, () => { if (!disposed) setStatus('error'); });
      if (disposed) { scene.dispose(); return; }
      engine.current = scene; setLightMode(scene.mode === '2d'); setStatus('ready');
    }).catch(() => { if (!disposed) setStatus('error'); });
    return () => { disposed = true; controller.abort(); engine.current?.dispose(); engine.current = null; };
  }, [attempt]);
  useEffect(() => {
    const hidden = () => {
      release();
      engine.current?.pause(true); setPaused(true);
    };
    window.addEventListener('blur', hidden);
    document.addEventListener('visibilitychange', hidden);
    const lostPointer = () => release();
    window.addEventListener('pointerup', lostPointer);
    window.addEventListener('pointercancel', lostPointer);
    return () => { window.removeEventListener('blur', hidden); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pointerup', lostPointer); window.removeEventListener('pointercancel', lostPointer); };
  }, []);
  const control = (action: DriveAction, pressed: boolean) => {
    if (status !== 'ready' || paused) return;
    engine.current?.control(action, pressed);
    setActive(v => pressed ? v.includes(action) ? v : [...v, action] : v.filter(a => a !== action));
  };
  const togglePause = () => { release(); engine.current?.pause(!paused); setPaused(!paused); };
  const reset = () => { release(); engine.current?.reset(); setSpeed(0); setDistance(0); };
  const camera = () => { engine.current?.camera(!overview); setOverview(!overview); };
  const button = (action: DriveAction, label: string, text: string) => <button type="button" className={`drive-pedal ${active.includes(action) ? 'is-pressed' : ''}`} aria-label={label} disabled={status !== 'ready' || paused}
    onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); control(action, true); }}
    onPointerUp={e => { control(action, false); e.currentTarget.releasePointerCapture(e.pointerId); }}
    onLostPointerCapture={() => control(action, false)} onPointerCancel={() => control(action, false)}
    onKeyDown={e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); control(action, true); } }}
    onKeyUp={e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); control(action, false); } }}
    onBlur={() => control(action, false)}>{text}</button>;
  return <dialog ref={dialog} className="drive-dialog" aria-labelledby="drive-title" aria-describedby="drive-instructions" onCancel={e => { e.preventDefault(); onClose(); }}
    onKeyDown={e => {
      if (e.altKey || e.metaKey || e.ctrlKey || e.target instanceof HTMLInputElement) return;
      const action = keyAction(e.code);
      if (action && (e.code !== 'Space' || e.target === dialog.current || e.target === canvas.current)) { e.preventDefault(); control(action, true); }
      if (!e.repeat && e.code === 'KeyR') reset();
      if (!e.repeat && e.code === 'KeyC') camera();
      if (!e.repeat && e.code === 'KeyP' && status === 'ready') togglePause();
    }} onKeyUp={e => { const action = keyAction(e.code); if (action) { e.preventDefault(); control(action, false); } }}>
    <header className="drive-header"><div><span className="drive-eyebrow">FINE FORM / UM RESPIRO</span><h2 id="drive-title">O próximo caminho é seu.</h2></div><button type="button" className="drive-close" onClick={onClose} aria-label="Fechar passeio e voltar ao site">Fechar <span aria-hidden="true">×</span></button></header>
    <div className="drive-viewport">
      <canvas ref={canvas} tabIndex={0} aria-label="Porsche 930 em um pátio virtual. Use os controles abaixo ou as setas do teclado." />
      <div className="drive-readout" aria-hidden="true"><strong>{speed.toString().padStart(2, '0')}</strong><span>km/h</span><small>{distance} m percorridos</small></div>
      <span className="drive-car-label">Porsche 911 (930) Turbo · 1975{lightMode ? " · Vista leve" : ""}</span>
      {status === 'loading' && <div className="drive-overlay" role="status"><span className="drive-spinner" /><h3>Preparando o Porsche.</h3><p>Só mais um instante.</p></div>}
      {status === 'error' && <div className="drive-overlay" role="alert"><h3>O passeio não carregou.</h3><p>Você pode tentar novamente ou continuar pelo site.</p><button type="button" onClick={() => { engine.current?.dispose(); engine.current = null; setAttempt(a => a + 1); }}>Tentar novamente</button><button type="button" onClick={onClose}>Voltar ao site</button></div>}
      {paused && status === 'ready' && <div className="drive-overlay"><h3>Uma pausa.</h3><button type="button" onClick={togglePause}>Continuar passeio</button></div>}
    </div>
    <footer className="drive-footer">
      <div className="drive-toolbar"><p id="drive-instructions">Segure os botões ou use <strong>W A S D / setas</strong>. Espaço freia. <span>Ré: segure Frear / ré depois de parar.</span></p><div><button type="button" disabled={status !== 'ready'} onClick={camera}>{overview ? 'Câmera próxima' : 'Vista ampla'}</button><button type="button" disabled={status !== 'ready'} onClick={reset}>Recomeçar</button><button type="button" disabled={status !== 'ready'} onClick={togglePause}>{paused ? 'Continuar' : 'Pausar'}</button></div></div>
      <div className="drive-controls"><div className="drive-steering">{button('left', 'Virar à esquerda', '←')}{button('right', 'Virar à direita', '→')}</div><div className="drive-pedals">{button('reverse', 'Frear e dar ré', 'Frear / ré')}{button('accelerate', 'Acelerar', 'Acelerar ↑')}</div></div>
      <div className="drive-note"><span>Passeio virtual, sem pontuação.{reduceMotion ? ' Movimento iniciado apenas pelos seus controles.' : ' Explore no seu ritmo.'}</span><a href="/atendimento/">Agora, cuidar do meu veículo ↗</a></div>
    </footer>
  </dialog>;
}
