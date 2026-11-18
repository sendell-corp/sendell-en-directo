// Sendell en un <canvas>, acompañando el flujo. Usa los mismos módulos de dibujo que el hábitat y los videos.
// escena.poner({ forma, color, pose, animo, mira, lado }) cambia lo que es y hace; si la forma cambia, se transforma.
// escena.pulso(animo, ms) le da un gesto pasajero (alegría al avanzar, sorpresa ante un error).
// Con prefers-reduced-motion: sin lluvia de fondo, sin transformación animada y sin respiración (un cuadro fijo
// que solo se repinta cuando algo cambia).
import { avatar, TAM } from '../nucleo/avatar.mjs';
import { pintar, ALTO, clamp } from '../nucleo/rejilla.mjs';
import { lluvia } from '../nucleo/fondo.mjs';

const MORFO_MS = 1100, ENTRA_MS = 1600, FILAS_VISTA = 20, COLS_MIN = 21;
const T_QUIETO = 0.6;                      // instante fijo del modo sin movimiento (ojos abiertos, sin parpadeo)

export function crearEscena(lienzo, { reducido = false, altoMax = () => 320, fondo = true, entrar = true } = {}) {
  const ctx = lienzo.getContext('2d');
  let ancho = 300, cw = 10, alto = 200;
  let est = { forma: 'sendell', color: '#f2f2f2', pose: 'saluda', animo: 'contento' };
  let morfo = { desde: 'sendell', hacia: 'sendell', t0: -1e9 };
  let pulsoAnimo = null, pulsoHasta = 0;
  const t0 = performance.now();
  const entraDesde = entrar && !reducido ? t0 : -1e9;
  let vivo = true, sucio = true, ultimo = 0, raf = 0;

  function mide() {
    ancho = Math.max(200, lienzo.parentElement.clientWidth);
    const max = Math.max(160, altoMax());
    cw = Math.min(ancho / COLS_MIN, max / (FILAS_VISTA * ALTO));
    alto = Math.round(FILAS_VISTA * cw * ALTO);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    lienzo.width = Math.round(ancho * dpr); lienzo.height = Math.round(alto * dpr);
    lienzo.style.height = alto + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sucio = true;
  }

  function estadoAvatar(ms) {
    const animo = pulsoAnimo && ms < pulsoHasta ? pulsoAnimo : est.animo;
    const e = { semilla: 2, pose: est.pose, animo, mira: est.mira, lado: est.lado };
    const k = reducido ? 1 : clamp((ms - morfo.t0) / MORFO_MS);
    if (morfo.hacia !== 'sendell' || k < 1) e.forma = { desde: morfo.desde, hacia: morfo.hacia, k };
    e.entra = clamp((ms - entraDesde) / ENTRA_MS);
    if (reducido && e.pose === 'camina') e.pose = 'neutra';
    return e;
  }

  function dibuja(ms) {
    const t = reducido ? T_QUIETO : (ms - t0) / 1000;
    ctx.fillStyle = '#0b0b0b';
    ctx.fillRect(0, 0, ancho, alto);
    if (fondo && !reducido) pintar(ctx, lluvia(t, Math.ceil(ancho / cw), FILAS_VISTA, 0.5), { cw });
    const ox = (ancho - TAM.cols * cw) / 2, oy = cw * ALTO * 1;
    pintar(ctx, avatar(estadoAvatar(ms), t), { cw, ox, oy, color: est.color });
  }

  // 15 cuadros por segundo bastan y cuidan la batería; con la pestaña oculta no se dibuja.
  function bucle(ms) {
    if (!vivo) return;
    if (!document.hidden && lienzo.offsetParent !== null && (reducido ? sucio : ms - ultimo > 66)) { ultimo = ms; sucio = false; dibuja(ms); }
    raf = requestAnimationFrame(bucle);
  }

  const alRedimensionar = () => mide();
  addEventListener('resize', alRedimensionar);
  mide();
  raf = requestAnimationFrame(bucle);

  return {
    poner(nuevo) {
      const ms = performance.now();
      if (nuevo.forma && nuevo.forma !== morfo.hacia) {
        // Si estaba a medio camino, arranca desde el destino anterior: un salto pequeño, pero nunca se queda a medias.
        morfo = { desde: morfo.hacia, hacia: nuevo.forma, t0: ms };
      }
      est = { ...est, ...nuevo, mira: nuevo.mira, lado: nuevo.lado };
      sucio = true;
    },
    pulso(animo, duracion = 1200) {
      pulsoAnimo = animo; pulsoHasta = performance.now() + duracion; sucio = true;
      if (reducido) setTimeout(() => { sucio = true; }, duracion + 20);      // un repintado al terminar el gesto
    },
    medir: mide,
    destruir() { vivo = false; cancelAnimationFrame(raf); removeEventListener('resize', alRedimensionar); },
  };
}
