// node video/demo-formas.mjs → salida/demo-formas.mp4. Segunda prueba sin voz: Sendell encadena formas en tres dimensiones.
import { avatar } from '../nucleo/avatar.mjs';
import { lluvia } from '../nucleo/fondo.mjs';
import { aSVG, marco, textoSVG, clamp, suave, ALTO } from '../nucleo/rejilla.mjs';
import { renderizar } from './render.mjs';

const W = 1080, H = 1080, CW = 30, CWF = 24, FPS = 15;
const raiz = new URL('..', import.meta.url).pathname;
const CADENA = [['robot', 'un robot que camina'], ['cuadrupedo', 'un perro robot'], ['brazo', 'un brazo robótico'], ['dron', 'un dron'],
  ['toro', 'una rosquilla 3D'], ['icosaedro', 'un sólido de veinte caras'], ['helice', 'una doble hélice'], ['atomo', 'un átomo'],
  ['red', 'una red neuronal'], ['terreno', 'un terreno simulado']];
const MORFO = 1.3, PAUSA = 2.3;
const GUION = [[0, 1.6, k => ({ entra: k }), ''], [1.6, 2.8, () => ({ animo: 'contento', pose: 'saluda' }), 'Sendell']];
let t0 = 2.8, antes = 'sendell';
for (const [nombre, rotulo] of CADENA) {
  const d = antes;
  GUION.push([t0, t0 + MORFO, k => ({ forma: { desde: d, hacia: nombre, k } }), '']);
  GUION.push([t0 + MORFO, t0 + MORFO + PAUSA, () => ({ forma: { desde: d, hacia: nombre, k: 1 } }), rotulo]);
  t0 += MORFO + PAUSA; antes = nombre;
}
const ult = antes;
GUION.push([t0, t0 + 1.5, k => ({ forma: { desde: ult, hacia: 'sendell', k } }), ''], [t0 + 1.5, t0 + 3.1, () => ({ pose: 'senala', animo: 'contento' }), 'Sendell']);
const FIN = GUION.at(-1)[1];

function cuadro(n, t) {
  const tramo = GUION.find(g => t >= g[0] && t < g[1]) ?? GUION.at(-1);
  const k = clamp((t - tramo[0]) / (tramo[1] - tramo[0]));
  let s = aSVG(lluvia(t, Math.ceil(W / CWF), Math.ceil(H / (CWF * ALTO)), 0.7), { cw: CWF, brillo: false });
  s += aSVG(avatar(tramo[2](k, t), t), { cw: CW, ox: W / 2 - (17 * CW) / 2, oy: 190 });
  if (tramo[3]) s += textoSVG(W / 2, 985, tramo[3], 46, (0.85 * suave(Math.min(k, 1 - k) * 6)).toFixed(2), 'text-anchor="middle"');
  return marco(W, H, s);
}
const r = await renderizar({ dir: raiz + 'salida/cuadros-demo-formas', salida: raiz + 'salida/demo-formas.mp4', cuadros: Math.round(FIN * FPS), cuadro, fps: FPS });
console.log(JSON.stringify(r));
