// El dibujo: figura fiel a la del sitio, funciones puras y cambio de forma que no pierde ni inventa ceros.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { COLS, FILAS, TORSO, BRAZOS, PIERNAS, figura, celdasDe } from '../nucleo/matriz.mjs';
import { avatar, busto, POSES, ANIMOS } from '../nucleo/avatar.mjs';
import { nombresDeFormas, forma } from '../nucleo/formas.mjs';
import { patron, PATRONES, NOMBRE } from '../nucleo/lenguaje.mjs';
import { aSVG, marco } from '../nucleo/rejilla.mjs';
import { TIPOS } from '../captura/esquema.mjs';

// Copia de la figura en la web de sendell.co (repositorio privado): SENDELL_SITIO=/ruta/al/character-matrix.config.ts
const SITIO = process.env.SENDELL_SITIO ?? '';

test('la figura mide 17 × 18 y tiene dos ojos y una boca', () => {
  const f = figura();
  assert.equal(f.length, FILAS);
  for (const fila of f) assert.equal(fila.length, COLS);
  const c = celdasDe(f);
  assert.equal(c.filter(q => q.p === 'o').length, 2);
  assert.equal(c.filter(q => q.p === 'b').length, 1);
  assert.equal(c.length, 96);
});

test('la figura coincide con la del sitio (si el clon está en esta máquina)', { skip: !SITIO || !existsSync(SITIO) }, () => {
  const src = readFileSync(SITIO, 'utf8');
  const bloque = nombre => new RegExp('const ' + nombre + ' = `\\n([\\s\\S]*?)\\n`;').exec(src)[1].split('\n');
  assert.deepEqual(TORSO.frente, bloque('TORSO_FRONT'));
  assert.deepEqual(TORSO.der, bloque('TORSO_RIGHT'));
  assert.deepEqual(TORSO.izq, bloque('TORSO_LEFT'));
  assert.deepEqual(TORSO.espalda, bloque('TORSO_BACK'));
  assert.deepEqual(BRAZOS.neutro, bloque('ARMS_NEUTRAL'));
  assert.deepEqual(BRAZOS.der_delante, bloque('ARMS_RIGHT_FORWARD'));
  assert.deepEqual(BRAZOS.izq_delante, bloque('ARMS_LEFT_FORWARD'));
  assert.deepEqual(PIERNAS.neutro, bloque('LEGS_NEUTRAL'));
  assert.deepEqual(PIERNAS.paso1, bloque('LEGS_FRAME_1'));
  assert.deepEqual(PIERNAS.paso2, bloque('LEGS_FRAME_2'));
});

test('el avatar es función pura: mismo estado y mismo instante, mismas celdas', () => {
  for (const pose of POSES) for (const animo of ANIMOS) {
    const e = { pose, animo, voz: 0.4, semilla: 3 };
    assert.deepEqual(avatar(e, 12.34), avatar(e, 12.34));
  }
});

test('toda pose, ánimo y mirada dan celdas válidas', () => {
  for (const pose of POSES) for (const animo of ANIMOS) for (const mira of ['frente', 'izq', 'der', 'espalda']) {
    const c = avatar({ pose, animo, mira }, 2.2);
    assert.ok(c.length >= 90, `${pose}/${animo}/${mira}: ${c.length} celdas`);
    for (const q of c) { assert.ok(Number.isFinite(q.x) && Number.isFinite(q.y)); assert.equal([...q.c].length, 1); }
  }
});

test('la boca se abre con la voz y solo con la voz', () => {
  const boca = v => avatar({ voz: v }, 1).find(q => q.p === 'b').c;
  assert.equal(boca(0), '_'); assert.equal(boca(0.3), 'o'); assert.equal(boca(0.9), 'O');
  for (let t = 0; t < 30; t += 0.37) assert.equal(avatar({}, t).find(q => q.p === 'b').c, '_', 'sin voz, la boca no se mueve');
});

test('parpadea a ratos, no siempre ni nunca', () => {
  let cerrado = 0, total = 0;
  for (let t = 0; t < 82; t += 0.04) { total++; if (avatar({}, t).filter(q => q.p === 'o').every(q => q.c === '-')) cerrado++; }
  assert.ok(cerrado > 20 && cerrado < total * 0.1, `cerrado en ${cerrado} de ${total} muestras`);
});

test('el busto son las filas de arriba', () => {
  assert.ok(busto({}, 1).every(q => q.y < 8.6));
  assert.ok(busto({}, 1).length > 50);
});

test('cada forma devuelve siempre los mismos puntos, en el mismo número', () => {
  for (const n of nombresDeFormas()) {
    const a = forma(n, 0), b = forma(n, 7.7);
    assert.ok(a.length >= 30, `${n}: ${a.length}`);
    assert.equal(a.length, b.length, n);
    for (const q of b) assert.ok(Number.isFinite(q.x) && Number.isFinite(q.y), n);
  }
  assert.deepEqual(forma('no-existe', 1), []);
});

test('el cambio de forma acaba en la forma y vuelve a Sendell entero, con sus ojos', () => {
  for (const n of nombresDeFormas()) {
    const fin = avatar({ forma: { hacia: n, k: 1 } }, 3).filter(q => q.a > 0.5);
    const destino = forma(n, 3).filter(q => (q.a ?? 1) > 0.5);
    assert.ok(Math.abs(fin.length - destino.length) <= 2, `${n}: ${fin.length} frente a ${destino.length}`);
    const vuelta = avatar({ forma: { desde: n, hacia: 'sendell', k: 1 } }, 3).filter(q => q.a > 0.5);
    assert.equal(vuelta.length, 96, n);
    assert.equal(vuelta.filter(q => q.p === 'o').length, 2, n + ': conserva los ojos');
  }
  assert.equal(avatar({ forma: { hacia: 'arana', k: 0 } }, 1).length, 96);
});

test('una forma desconocida no rompe: se queda como Sendell', () => {
  assert.equal(avatar({ forma: { hacia: 'unicornio', k: 0.5 } }, 1).length, 96);
});

test('cada tipo de evento tiene patrón y nombre, y el patrón no se sale de su caja', () => {
  for (const tipo of [...TIPOS, 'sin_senal']) {
    assert.ok(PATRONES[tipo], 'falta el patrón de ' + tipo);
    assert.ok(NOMBRE[tipo], 'falta el nombre de ' + tipo);
    for (let t = 0; t < 12; t += 0.31) {
      const c = patron(tipo, t, { ancho: 18, alto: 6, semilla: 2, fuerza: 0.7 });
      for (const q of c) assert.ok(q.x > -0.5 && q.x < 17.5 && q.y > -0.5 && q.y < 5.5, `${tipo} en t=${t}: (${q.x}, ${q.y})`);
      assert.deepEqual(c, patron(tipo, t, { ancho: 18, alto: 6, semilla: 2, fuerza: 0.7 }), tipo + ' es puro');
    }
  }
  assert.ok(patron('lo-que-sea', 1).length > 0, 'un tipo desconocido cae en «otro»');
});

test('«sin señal» está quieto: no finge actividad', () => {
  assert.deepEqual(patron('sin_senal', 1), patron('sin_senal', 9.5));
});

test('el SVG escapa los caracteres', () => {
  const s = marco(100, 100, aSVG([{ x: 0, y: 0, c: '<' }, { x: 1, y: 0, c: '&' }], { cw: 10 }));
  assert.ok(s.includes('&lt;') && s.includes('&amp;'));
  assert.ok(!/<text[^>]*><</.test(s));
});
