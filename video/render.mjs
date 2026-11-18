// Volcado de cuadros para clips cortos: SVG → rsvg-convert → ffmpeg. Los cuadros van a disco (nunca a /tmp, que es RAM)
// y se borran al terminar. Para piezas largas se usará el compositor por tramos; esto es la base común.
import { writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';

// cuadro(n, t) → string SVG. fps de dibujo 15; la salida se duplica a 30, como en el noticiero.
export async function renderizar({ dir, salida, cuadros, cuadro, fps = 15, par = 2, audio = null }) {
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  let sig = 0;
  const uno = () => new Promise((ok, mal) => {
    const n = sig++;
    if (n >= cuadros) return ok();
    const base = `${dir}/f${String(n).padStart(5, '0')}`;
    writeFileSync(base + '.svg', cuadro(n, n / fps));
    spawn('nice', ['-n', '10', 'rsvg-convert', base + '.svg', '-o', base + '.png'])
      .on('exit', c => (c ? mal(new Error('rsvg-convert falló en el cuadro ' + n)) : (rmSync(base + '.svg'), ok(uno()))));
  });
  await Promise.all(Array.from({ length: par }, uno));
  const args = ['-n', '10', 'ffmpeg', '-y', '-loglevel', 'error', '-framerate', String(fps), '-i', `${dir}/f%05d.png`];
  if (audio) args.push('-i', audio);
  args.push('-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-threads', '2');
  if (audio) args.push('-c:a', 'aac', '-b:a', '128k', '-shortest');
  args.push(salida);
  const r = spawnSync('nice', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('ffmpeg falló: ' + r.stderr);
  const n = readdirSync(dir).length;
  rmSync(dir, { recursive: true, force: true });
  return { salida, cuadros: n };
}
