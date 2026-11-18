// Fondo «matrix blanco»: lluvia tenue de ceros y unos, blanco sobre casi negro. El mismo en el video y en el hábitat.
import { rnd } from './rejilla.mjs';

// Celdas de lluvia para una rejilla de cols × filas. fuerza 0..1 regula cuánto se ve (0,6 = sutil).
export function lluvia(t, cols, filas, fuerza = 0.6) {
  const o = [];
  for (let c = 0; c < cols; c += 2) {
    const vel = 2.2 + rnd(c) * 4, salida = rnd(c + 50) * filas;
    for (let k = 0; k < 6; k++) {
      const y = (salida + t * vel + k * 1.7) % (filas + 8) - 4;
      o.push({ x: c, y, c: (c * 7 + k + Math.floor(t * 4)) % 5 ? '0' : '1', a: (0.05 + 0.022 * k) * fuerza, p: 'd' });
    }
  }
  return o;
}
