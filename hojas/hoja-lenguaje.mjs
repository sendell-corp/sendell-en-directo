// node hojas/hoja-lenguaje.mjs → hojas/lenguaje.png: un cuadro de cada patrón de actividad, con su nombre llano.
import { patron, PATRONES, NOMBRE } from '../nucleo/lenguaje.mjs';
import { rotulo } from '../nucleo/rejilla.mjs';
import { hoja } from './hoja.mjs';
const aqui = new URL('.', import.meta.url).pathname;
const AN = 20, AL = 7;
const marco = () => {            // esquinas tenues para ver los límites de cada caja
  const o = [];
  for (const [x, y] of [[-1, -1], [AN, -1], [-1, AL], [AN, AL]]) o.push({ x, y, c: '+', a: 0.25 });
  return o;
};
const vistas = Object.keys(PATRONES).map((tipo, n) => ({
  rotulo: NOMBRE[tipo],
  celdas: patron(tipo, 3.37 + n * 0.41, { ancho: AN, alto: AL, semilla: n + 1, fuerza: 0.6, ok: tipo !== 'consola' || n % 2 === 0 }).concat(marco()),
}));
console.log(hoja(aqui + 'lenguaje', 'El lenguaje de la actividad', vistas, { porFila: 2, cw: 22, cols: AN, filas: AL + 1 }));
