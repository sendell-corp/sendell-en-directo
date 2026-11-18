// Hojas de prueba: una imagen fija con varias vistas rotuladas, para juzgar el dibujo de un vistazo (también en el teléfono).
import { writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { aSVG, marco, textoSVG, ALTO } from '../nucleo/rejilla.mjs';

// vistas: [{ celdas, rotulo, cols, filas }] colocadas en una cuadrícula de `porFila` columnas.
export function hoja(ruta, titulo, vistas, { ancho = 1080, porFila = 3, cw = 14, margen = 30, cols = 17, filas = 18, dx = 0 } = {}) {
  const pasoX = (ancho - margen * 2) / porFila, altoVista = filas * cw * ALTO + 62;
  const nFilas = Math.ceil(vistas.length / porFila), alto = 96 + nFilas * altoVista + margen;
  let s = textoSVG(ancho / 2, 60, titulo, 34, 0.95, 'text-anchor="middle"');
  vistas.forEach((v, n) => {
    const cx = margen + pasoX * (n % porFila) + pasoX / 2, y0 = 96 + Math.floor(n / porFila) * altoVista;
    s += aSVG(v.celdas, { cw, ox: cx - (cols * cw) / 2 + dx * cw, oy: y0 });
    s += textoSVG(cx, y0 + filas * cw * ALTO + 34, v.rotulo, 22, 0.7, 'text-anchor="middle"');
  });
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta + '.svg', marco(ancho, alto, s));
  const r = spawnSync('rsvg-convert', [ruta + '.svg', '-o', ruta + '.png']);
  if (r.status !== 0) throw new Error('rsvg-convert falló: ' + r.stderr);
  return { ruta: ruta + '.png', ancho, alto };
}
