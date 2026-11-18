// node hojas/hoja-avatar.mjs → hojas/avatar-1.png (poses y caras) y hojas/avatar-2.png (cambio de forma)
import { avatar, busto } from '../nucleo/avatar.mjs';
import { nombresDeFormas } from '../nucleo/formas.mjs';
import { hoja } from './hoja.mjs';
const aqui = new URL('.', import.meta.url).pathname;
const t = 1.0;   // un instante sin parpadeo

const poses = [
  ['neutra', { }], ['saluda', { pose: 'saluda' }], ['señala', { pose: 'senala' }],
  ['teclea', { pose: 'teclea' }], ['lupa', { pose: 'lupa', animo: 'curioso' }], ['camina', { pose: 'camina', mira: 'der' }],
  ['de espaldas', { mira: 'espalda', pose: 'teclea' }], ['mira a la izquierda', { mira: 'izq' }], ['descansa', { pose: 'descansa' }],
].map(([rotulo, e]) => ({ rotulo, celdas: avatar(e, rotulo === 'camina' ? 0.2 : t) }));
console.log(hoja(aqui + 'avatar-1a', 'Sendell · poses', poses, { porFila: 3, cw: 15 }));

const caras = [
  ['callado', { }], ['habla (voz baja)', { voz: 0.3 }], ['habla (voz alta)', { voz: 0.8 }],
  ['contento', { animo: 'contento' }], ['curioso', { animo: 'curioso' }], ['sorpresa', { animo: 'sorpresa' }],
  ['cansado', { animo: 'cansado' }], ['parpadea', { }], ['contento y habla', { animo: 'contento', voz: 0.6 }],
].map(([rotulo, e]) => ({ rotulo, celdas: busto(e, rotulo === 'parpadea' ? 0.05 : t) }));
console.log(hoja(aqui + 'avatar-1b', 'Sendell · busto, boca y ánimo', caras, { porFila: 3, cw: 19, filas: 9 }));

const pasos = [0, 0.25, 0.45, 0.65, 0.85, 1].map(k => ({ rotulo: k === 0 ? 'Sendell' : k === 1 ? 'araña' : `${Math.round(k * 100)} %`, celdas: avatar({ forma: { hacia: 'arana', k } }, t) }));
console.log(hoja(aqui + 'avatar-2a', 'Sendell se transforma en araña', pasos, { porFila: 3, cw: 14, cols: 17, filas: 18 }));

const formas = nombresDeFormas().map(n => ({ rotulo: n, celdas: avatar({ forma: { hacia: n, k: 1 } }, 2.3) }));
console.log(hoja(aqui + 'avatar-2b', 'Formas vivas', formas, { porFila: 3, cw: 14 }));
