// short lived pictures and numbers that pop up in the world
export const fx = { parts: [], texts: [], shake: 0 };

export function burst(key, x, y, size, life = 0.25, rot = 0, rise = 0) {
  fx.parts.push({ key, x, y, size, life, max: life, rot, rise });
}

export function floatText(x, y, text, color = "#fff", size = 16) {
  fx.texts.push({ x, y, text, color, size, life: 1, max: 1 });
}

export function shake(amount) {
  fx.shake = Math.max(fx.shake, amount);
}

export function resetFx() {
  fx.parts = [];
  fx.texts = [];
  fx.shake = 0;
}

export function updateFx(dt) {
  for (const p of fx.parts) {
    p.life -= dt;
    p.y -= p.rise * dt;
  }
  fx.parts = fx.parts.filter(p => p.life > 0);
  for (const t of fx.texts) {
    t.life -= dt;
    t.y -= 38 * dt;
  }
  fx.texts = fx.texts.filter(t => t.life > 0);
  fx.shake = Math.max(0, fx.shake - 30 * dt);
}
