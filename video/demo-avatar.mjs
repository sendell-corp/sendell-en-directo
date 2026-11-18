// node video/demo-avatar.mjs → salida/demo-avatar.mp4. Sin voz: Sendell aparece, saluda y cambia de forma varias veces.
// Sirve para juzgar el avatar en movimiento antes de montar nada encima.
import { avatar } from '../nucleo/avatar.mjs';
import { lluvia } from '../nucleo/fondo.mjs';
import { aSVG, marco, textoSVG, clamp, suave, ALTO } from '../nucleo/rejilla.mjs';
import { renderizar } from './render.mjs';

const W = 1080, H = 1080, CW = 30, CWF = 24, FPS = 15;
const raiz = new URL('..', import.meta.url).pathname;
// Guion: [inicio, fin, estado(k, t), rótulo]. k va de 0 a 1 dentro del tramo.
const GUION = [
  [0.0, 1.9, k => ({ entra: k }), ''],
  [1.9, 3.7, () => ({ pose: 'saluda', animo: 'contento' }), 'Sendell'],
  [3.7, 4.5, () => ({ animo: 'curioso' }), 'Sendell'],
  [4.5, 6.4, k => ({ forma: { hacia: 'arana', k } }), ''],
  [6.4, 8.6, () => ({ forma: { hacia: 'arana', k: 1 } }), 'una araña'],
  [8.6, 10.2, k => ({ forma: { desde: 'arana', hacia: 'esqueleto', k } }), ''],
  [10.2, 11.8, () => ({ forma: { desde: 'arana', hacia: 'esqueleto', k: 1 } }), 'su esqueleto'],
  [11.8, 13.4, k => ({ forma: { desde: 'esqueleto', hacia: 'cubo', k } }), ''],
  [13.4, 15.2, () => ({ forma: { desde: 'esqueleto', hacia: 'cubo', k: 1 } }), 'un modelo 3D'],
  [15.2, 16.8, k => ({ forma: { desde: 'cubo', hacia: 'engranaje', k } }), ''],
  [16.8, 18.4, () => ({ forma: { desde: 'cubo', hacia: 'engranaje', k: 1 } }), 'la física'],
  [18.4, 20.2, k => ({ forma: { desde: 'engranaje', hacia: 'sendell', k } }), ''],
  [20.2, 22.0, () => ({ pose: 'senala', animo: 'contento' }), 'y otra vez Sendell'],
];
const FIN = GUION.at(-1)[1];

function cuadro(n, t) {
  const tramo = GUION.find(g => t >= g[0] && t < g[1]) ?? GUION.at(-1);
  const k = clamp((t - tramo[0]) / (tramo[1] - tramo[0]));
  const est = tramo[2](k, t);
  let s = aSVG(lluvia(t, Math.ceil(W / CWF), Math.ceil(H / (CWF * ALTO)), 0.7), { cw: CWF, brillo: false });
  s += aSVG(avatar(est, t), { cw: CW, ox: W / 2 - (17 * CW) / 2, oy: 190 });
  if (tramo[3]) {
    const a = suave(Math.min(k, 1 - k) * 6);
    s += textoSVG(W / 2, 985, tramo[3], 46, (0.85 * a).toFixed(2), 'text-anchor="middle"');
  }
  return marco(W, H, s);
}

const r = await renderizar({ dir: raiz + 'salida/cuadros-demo-avatar', salida: raiz + 'salida/demo-avatar.mp4', cuadros: Math.round(FIN * FPS), cuadro, fps: FPS });
console.log(JSON.stringify(r));
