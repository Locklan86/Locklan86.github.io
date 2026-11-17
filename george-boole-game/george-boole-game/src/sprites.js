import { spriteList } from "../spriteList.js";

export const images = {};

export function loadSprites() {
  return Promise.all(spriteList.map(key => new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      images[key] = img;
      resolve();
    };
    img.onerror = () => {
      console.warn("missing sprite", key);
      resolve();
    };
    img.src = "assets/" + key + ".png";
  })));
}

// colored copies (white flash, frozen blue...) are made once and reused
const tintCache = {};
function tinted(key, color, strength) {
  const id = key + color + strength;
  if (!tintCache[id]) {
    const img = images[key];
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const t = c.getContext("2d");
    t.drawImage(img, 0, 0);
    t.globalCompositeOperation = "source-atop";
    t.globalAlpha = strength;
    t.fillStyle = color;
    t.fillRect(0, 0, c.width, c.height);
    tintCache[id] = c;
  }
  return tintCache[id];
}

// options: h or w (size), ay (0 top, 0.5 middle, 1 bottom), flip, rot, alpha, sx, sy, tint, strength
export function drawSprite(ctx, key, x, y, o = {}) {
  let img = images[key];
  if (!img) return;
  if (o.tint) img = tinted(key, o.tint, o.strength || 0.6);
  const scale = o.h ? o.h / img.height : o.w ? o.w / img.width : 1;
  const w = img.width * scale * (o.sx || 1);
  const h = img.height * scale * (o.sy || 1);
  const ay = o.ay === undefined ? 1 : o.ay;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  if (o.flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h * ay, w, h);
  ctx.restore();
}

export function spriteAspect(key) {
  const img = images[key];
  return img ? img.width / img.height : 1;
}
