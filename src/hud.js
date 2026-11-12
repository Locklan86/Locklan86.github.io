import { VIEW_W, VIEW_H, MAX_HP, weapons } from "./config.js";
import { game } from "./state.js";
import { drawSprite, spriteAspect } from "./sprites.js";
import { haveItem, carrier } from "./carry.js";

const FONT = "'Trebuchet MS', 'Comic Sans MS', sans-serif";

function label(ctx, text, x, y, size, fill, align = "center") {
  ctx.font = "bold " + size + "px " + FONT;
  ctx.textAlign = align;
  ctx.lineWidth = size / 4;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#000";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

// the shopping list is a scroll, each item reads like a boolean
function drawList(ctx) {
  // the scroll is squashed a little so the list stays wide and short
  const w = 280;
  const h = 260;
  drawSprite(ctx, "ui/scroll", 10 + w / 2, 10 + h, { w, sy: h / (w / spriteAspect("ui/scroll")) });
  const left = 55 + w * 0.14;
  const innerW = w * 0.72;
  const size = Math.min(13, innerW / (23 * 0.6));
  const step = (h * 0.55) / game.required.length;
  ctx.textAlign = "left";
  ctx.font = "bold " + size + "px Consolas, 'Courier New', monospace";
  game.required.forEach((item, i) => {
    const y = 10 + h * 0.2 + step * (i + 0.75);
    const text = item.name + " = ";
    const have = haveItem(item.id);
    ctx.fillStyle = "#3a2a14";
    ctx.fillText(text, left, y);
    ctx.fillStyle = have ? "#17801a" : "#d11b1b";
    ctx.fillText(have ? "True" : "False", left + ctx.measureText(text).width, y);
  });
}

// the tv reacts to what just happened, health sits under it
function drawTv(ctx) {
  const tv = game.tv;
  const pop = 1 + tv.bounce * 0.12;
  drawSprite(ctx, "ui/tv_" + tv.mood, VIEW_W - 80, 120, { h: 135 * pop });
  const hp = game.george.hp;
  for (let i = 0; i < 5; i++) {
    const x = VIEW_W - 76 - 56 + i * 28;
    drawSprite(ctx, "ui/heart_empty", x, 145, { h: 30 });
    const frac = Math.max(0, Math.min(1, (hp - i * (MAX_HP / 5)) / (MAX_HP / 5)));
    if (frac <= 0) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 14, 120, 28 * frac, 50);
    ctx.clip();
    drawSprite(ctx, "ui/heart", x, 145, { h: 30 });
    ctx.restore();
  }
}

function drawTimer(ctx) {
  const seconds = Math.max(0, Math.ceil(game.time));
  const low = seconds <= 15;
  const text = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
  label(ctx, text, VIEW_W / 2, 40, low ? 34 + Math.sin(game.elapsed * 10) * 2 : 32, low ? "#ff6b6b" : "#fff6dc");
  drawSprite(ctx, "items/coin", VIEW_W / 2 - 34, 72, { h: 26 });
  label(ctx, "$" + game.money, VIEW_W / 2 - 14, 66, 22, "#ffe14a", "left");
}

function drawStyle(ctx) {
  const pop = 1 + game.stylePulse * 0.25;
  drawSprite(ctx, "ui/star", VIEW_W - 150, VIEW_H - 14, { h: 42 * pop });
  label(ctx, String(Math.round(game.style)), VIEW_W - 120, VIEW_H - 22, 30 * pop, "#ffe14a", "left");
  if (game.combo > 1) label(ctx, "combo x" + game.combo, VIEW_W - 120, VIEW_H - 56, 20, "#fff6dc", "left");
}

// what george is carrying, in slots
function drawLoadout(ctx) {
  const g = game.george;
  const c = carrier();
  const slot = 42;
  const baseY = VIEW_H - 14;
  ctx.fillStyle = "rgba(20,16,30,0.6)";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.fillRect(12, baseY - slot, slot, slot);
  ctx.strokeRect(12, baseY - slot, slot, slot);
  if (g.weapon) {
    drawSprite(ctx, "tools/" + g.weapon.id, 12 + slot / 2, baseY - 4, { h: 34, ay: 1 });
    const max = weapons[g.weapon.id].uses;
    for (let i = 0; i < max; i++) {
      ctx.fillStyle = i < g.weapon.uses ? "#ffe14a" : "#3a3347";
      ctx.fillRect(14 + i * (slot - 4) / max, baseY - slot - 8, (slot - 4) / max - 1, 5);
    }
  }
  for (let i = 0; i < c.cap; i++) {
    const x = 12 + slot + 8 + i * 36;
    ctx.fillStyle = "rgba(20,16,30,0.6)";
    ctx.fillRect(x, baseY - 34, 32, 34);
    ctx.strokeRect(x, baseY - 34, 32, 34);
    if (c.list[i]) drawSprite(ctx, "items/" + c.list[i].id, x + 16, baseY - 3, { h: 26 });
  }
}

export function drawHud(ctx) {
  const g = game.george;
  if (g.hp < 30) {
    const edge = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 200, VIEW_W / 2, VIEW_H / 2, 560);
    edge.addColorStop(0, "rgba(200,0,0,0)");
    edge.addColorStop(1, "rgba(200,0,0," + (0.35 + Math.sin(game.elapsed * 6) * 0.1) + ")");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  drawList(ctx);
  drawTv(ctx);
  drawTimer(ctx);
  drawStyle(ctx);
  drawLoadout(ctx);
  if (game.msg.t > 0) label(ctx, game.msg.text, VIEW_W / 2, VIEW_H - 78, 20, "#fff6dc");
}
