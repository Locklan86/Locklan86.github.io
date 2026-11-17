import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, zones, weapons } from "./config.js";
import { game } from "./state.js";
import { drawSprite, spriteAspect, images } from "./sprites.js";
import { fx } from "./fx.js";
import { holdingCart } from "./carry.js";

const FONT = "'Trebuchet MS', 'Comic Sans MS', sans-serif";
let c = null;
let floorCanvas = null;

// the checkered floor with colored departments never changes, so it is drawn once
function floorLayer() {
  if (floorCanvas) return floorCanvas;
  floorCanvas = document.createElement("canvas");
  floorCanvas.width = WORLD_W;
  floorCanvas.height = WORLD_H;
  const f = floorCanvas.getContext("2d");
  for (let y = 0; y < WORLD_H; y += 50) {
    for (let x = 0; x < WORLD_W; x += 50) {
      f.fillStyle = (x + y) % 100 === 0 ? "#efe9d9" : "#e5decb";
      f.fillRect(x, y, 50, 50);
    }
  }
  f.globalAlpha = 0.5;
  for (const name in zones) {
    f.fillStyle = zones[name].color;
    f.fillRect(zones[name].x, zones[name].y, zones[name].w, zones[name].h);
  }
  f.globalAlpha = 1;
  f.fillStyle = "#3a3347";
  f.fillRect(0, 0, WORLD_W, 8);
  return floorCanvas;
}

function shadow(x, y, rx) {
  c.fillStyle = "rgba(0,0,0,0.22)";
  c.beginPath();
  c.ellipse(x, y, rx, rx * 0.35, 0, 0, Math.PI * 2);
  c.fill();
}

function label(text, x, y, size, fill, align = "center") {
  c.font = "bold " + size + "px " + FONT;
  c.textAlign = align;
  c.lineWidth = size / 4;
  c.lineJoin = "round";
  c.strokeStyle = "#000";
  c.strokeText(text, x, y);
  c.fillStyle = fill;
  c.fillText(text, x, y);
}

function inView(o) {
  const cam = game.cam;
  return o.x > cam.x - 180 && o.x < cam.x + VIEW_W + 180 && o.y > cam.y - 40 && o.y < cam.y + VIEW_H + 260;
}

export function render(ctx) {
  c = ctx;
  const cam = game.cam;
  const cx = Math.round(cam.x);
  const cy = Math.round(cam.y);
  c.fillStyle = "#2b2634";
  c.fillRect(0, 0, VIEW_W, VIEW_H);
  c.save();
  if (fx.shake > 0) c.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
  c.drawImage(floorLayer(), cx, cy, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
  c.translate(-cx, -cy);

  drawFloorMarks();
  drawThings();
  drawFx();
  drawPrompt();
  c.restore();
}

function drawFloorMarks() {
  for (const hz of game.world.hazards) {
    if (inView(hz)) drawSprite(c, hz.kind === "ice" ? "props/icepuddle" : "props/slime", hz.x, hz.y, { w: hz.r * 2.8, ay: 0.5 });
  }
  for (const d of game.world.decals) drawSprite(c, d.sprite, d.x, d.y, { w: 44, ay: 0.5 });
}

// everything that stands up is drawn from the back of the store to the front
function drawThings() {
  const g = game.george;
  const things = [];
  for (const p of game.world.props) {
    if (inView(p)) things.push({ y: p.y, draw: () => drawSprite(c, p.sprite, p.x, p.y, { w: p.w, alpha: hidesSomeone(p) ? 0.4 : 1 }) });
  }
  for (const f of game.floor) if (inView(f)) things.push({ y: f.y, draw: () => drawFloorThing(f) });
  if (game.cart && game.cart.dropped && !game.cart.stolen) things.push({ y: game.cart.y, draw: drawParkedCart });
  for (const e of game.enemies) things.push({ y: e.y, draw: () => drawEnemy(e) });
  things.push({ y: g.y, draw: drawGeorge });
  things.sort((a, b) => a.y - b.y);
  for (const t of things) t.draw();
}

// a tall prop turns see-through when george or an enemy is standing behind it
function hidesSomeone(p) {
  const top = p.y - p.w / spriteAspect(p.sprite);
  const covers = o => o.y < p.y && o.y > top && Math.abs(o.x - p.x) < p.w / 2 + 12;
  return covers(game.george) || game.enemies.some(covers);
}

function ring(x, y) {
  c.strokeStyle = "rgba(255,255,255,0.9)";
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(x, y, 20 + Math.sin(game.elapsed * 8) * 2, 8, 0, 0, Math.PI * 2);
  c.stroke();
}

function drawFloorThing(f) {
  const lift = Math.sin(game.elapsed * 3 + f.phase) * 2;
  const isTarget = game.target && game.target.ref === f;
  shadow(f.x, f.y + 2, 13);
  if (isTarget) ring(f.x, f.y + 2);
  const grow = isTarget ? 1.15 : 1;

  if (f.kind === "item") {
    drawSprite(c, "items/" + f.item.id, f.x, f.y - 4 + lift, { h: 38 * grow });
    if (f.paid) return;
    c.fillStyle = "#fff";
    c.strokeStyle = "#000";
    c.lineWidth = 2;
    c.fillRect(f.x - 15, f.y + 6, 30, 15);
    c.strokeRect(f.x - 15, f.y + 6, 30, 15);
    label("$" + f.price, f.x, f.y + 18, 12, f.discounted ? "#ff5a4a" : "#ffffff");
    if (f.discounted) drawSprite(c, "items/tag", f.x + 16, f.y - 22 + lift, { h: 20 });
  } else if (f.kind === "weapon") {
    drawSprite(c, "tools/" + f.id, f.x, f.y - 2 + lift, { h: 42 * grow, rot: -0.3 });
  } else {
    drawSprite(c, "tools/potion_red", f.x, f.y - 2 + lift, { h: 32 * grow });
  }
}

function drawParkedCart() {
  const cart = game.cart;
  const isTarget = game.target && game.target.ref === cart;
  shadow(cart.x, cart.y + 2, 28);
  if (isTarget) ring(cart.x, cart.y + 2);
  drawSprite(c, cart.items.length ? "tools/cart_right" : "tools/cart_left", cart.x, cart.y + 4, { h: 58 });
}

function enemyKey(e) {
  const own = "enemies/" + e.element + "_" + e.kind;
  return images[own] ? own : "enemies/" + e.element + "_regular";
}

function drawEnemy(e) {
  const g = game.george;
  shadow(e.x, e.y + 2, 18);

  // a cart shopper shows the lane it is about to charge down
  if (e.state === "windup" && e.kind === "cart") {
    c.save();
    c.translate(e.x, e.y);
    c.rotate(e.lockAng);
    c.fillStyle = "rgba(230,40,40,0.2)";
    c.fillRect(0, -16, 340, 32);
    c.restore();
  }

  const o = { h: e.kind === "cart" ? 74 : 66, flip: g.x < e.x };
  const hop = e.state === "windup" || e.stun > 0 ? 0 : Math.abs(Math.sin(game.elapsed * 9 + e.seed)) * 3;
  if (e.flash > 0) {
    o.tint = "#ffffff";
    o.strength = 0.85;
  } else if (e.slow > 0) {
    o.tint = "#7ec8ff";
    o.strength = 0.4;
  }
  let x = e.x;
  if (e.state === "windup") {
    // crouching and shaking before the hit
    o.sx = 1.08;
    o.sy = 0.9;
    x += Math.sin(game.elapsed * 60) * 1.5;
  }
  if (e.stun > 0) o.rot = Math.sin(game.elapsed * 30) * 0.08;
  drawSprite(c, enemyKey(e), x, e.y + 4 - hop, o);

  if (e.state === "windup") {
    drawSprite(c, "ui/fx_impact", e.x, e.y - 86, { h: 34 + Math.sin(game.elapsed * 20) * 3, ay: 0.5 });
    label("!", e.x, e.y - 78, 22, "#e01010");
  }
  if (e.hp < e.maxHp) {
    c.fillStyle = "#000";
    c.fillRect(e.x - 19, e.y - 82, 38, 7);
    c.fillStyle = "#e84040";
    c.fillRect(e.x - 17, e.y - 80, 34 * (e.hp / e.maxHp), 3);
  }
}

function georgeSprite(g) {
  const cos = Math.cos(g.aim);
  const sin = Math.sin(g.aim);
  if (g.hurtAnim > 0) return { key: "chars/george_hurt", flip: cos < 0 };
  if (g.swing) return { key: "chars/george_attack", flip: cos < 0 };
  if (Math.abs(cos) > Math.abs(sin) * 1.1) return { key: cos < 0 ? "chars/george_left" : "chars/george_right", flip: false };
  if (sin < 0) return { key: "chars/george_back", flip: false };
  if (g.speed > 30) return { key: Math.floor(g.walk) % 2 ? "chars/george_walk1" : "chars/george_walk2", flip: false };
  return { key: "chars/george_front", flip: false };
}

// what george holds is drawn behind him when he faces up, in front otherwise
function drawGear(g, behind) {
  if (Math.sin(g.aim) < -0.35 !== behind) return;
  const cos = Math.cos(g.aim);
  const sin = Math.sin(g.aim);
  const swinging = g.swing ? Math.sin((g.swing.t / g.swing.dur) * Math.PI) : 0;

  function getCartDirection(angle) {
    const directions = [
        "right",
        "down_right",
        "down",
        "down_left",
        "left",
        "up_left",
        "up",
        "up_right"
    ];

    return directions[
        Math.round(angle / (Math.PI / 4) + 8) % 8
    ];
}
if (holdingCart()) {
    const angle = g.aim;

    const directions = [
        "right",
        "down_right",
        "down",
        "down_left",
        "left",
        "up_left",
        "up",
        "up_right"
    ];

    const direction = directions[
        Math.round(angle / (Math.PI / 4) + 8) % 8
    ];

    drawSprite(
        c,
        "tools/cart_" + direction,
        g.x + cos * 32,
        g.y + sin * 16 + 4,
        { h: 58 }

  
    );} 
else if (game.classKey === "basket") {
    const reach = 18 + (g.swing && g.swing.id === "basket" ? 26 * swinging : 0);
    drawSprite(c, g.items.length ? "tools/basket_full" : "tools/basket_empty", g.x + cos * reach, g.y - 8 + sin * reach * 0.6, { h: 32, ay: 0.5, rot: swinging * 0.5 * (cos < 0 ? -1 : 1) });
  

}
  if (g.weapon) {
    const side = cos < 0 ? -1 : 1;
    if (g.swing && g.swing.id === g.weapon.id) {
      drawSprite(c, "tools/" + g.weapon.id, g.x + cos * 30, g.y - 28 + sin * 16, { h: 40, ay: 0.5, rot: (g.swing.t / g.swing.dur) * 1.6 * side - 0.6 * side });
    } else {
      drawSprite(c, "tools/" + g.weapon.id, g.x + side * 18, g.y - 24, { h: 36, ay: 0.5, rot: 0.3 * side });
    }
  }
}

function drawGeorge() {
  const g = game.george;
  shadow(g.x, g.y + 2, 18);
  const s = georgeSprite(g);
  const o = { h: 76, flip: s.flip };
  if (g.status.frozen > 0) {
    o.tint = "#8fd4ff";
    o.strength = 0.5;
  } else if (g.status.chill > 0) {
    o.tint = "#8fd4ff";
    o.strength = 0.25;
  }
  if (g.invuln > 0 && Math.floor(g.invuln * 14) % 2 === 0) o.alpha = 0.5;
  const bob = g.speed > 30 && g.status.frozen <= 0 ? Math.abs(Math.sin(g.walk * Math.PI)) * 3 : 0;

  drawGear(g, true);
  drawSprite(c, s.key, g.x, g.y + 5 - bob, o);
  drawGear(g, false);

  if (g.status.frozen > 0) drawSprite(c, "ui/fx_ice", g.x, g.y - 34, { h: 72, ay: 0.5, alpha: 0.85 });
  if (g.status.burn > 0) drawSprite(c, "ui/fx_fire", g.x + 10, g.y - 22 + Math.sin(game.elapsed * 14) * 2, { h: 34 });
  if (g.status.poison > 0) drawSprite(c, "ui/fx_poison", g.x, g.y - 70, { h: 30, ay: 0.5, alpha: 0.85 });
}

function drawFx() {
  for (const p of fx.parts) {
    const t = p.life / p.max;
    if (p.flat) drawSprite(c, p.key, p.x, p.y, { h: p.size, alpha: Math.min(1, t * 2) });
    else drawSprite(c, p.key, p.x, p.y, { h: p.size * (1.2 - 0.3 * t), ay: 0.5, rot: p.rot, alpha: Math.min(1, t * 2.5) });
  }
  for (const t of fx.texts) {
    c.globalAlpha = Math.min(1, t.life * 2);
    label(t.text, t.x, t.y, t.size, t.color);
    c.globalAlpha = 1;
  }
}

function drawPrompt() {
  const t = game.target;
  if (!t) return;
  const f = t.ref;
  let text = "";
  let color = "#ffffff";
  let y = f.y - 62;
  if (t.kind === "item") {
    text = "E  " + f.item.name.replace("_", " ") + (f.paid ? "" : "  $" + f.price);
    if (!f.paid && f.price > game.money) color = "#ff7b7b";
  } else if (t.kind === "weapon") text = "E  " + weapons[f.id].name;
  else if (t.kind === "potion") text = "E  drink";
  else if (t.kind === "cart") text = game.george.items.length ? "E  put in cart" : "E  take cart";
  else {
    const carrying = game.george.items.length + (holdingCart() ? game.cart.items.length : 0);
    text = carrying > 0 ? "E  bag " + carrying + (carrying > 1 ? " items" : " item") : "bring your items here";
    color = carrying > 0 ? "#7dff7d" : "#bbbbbb";
    y = f.y - 120;
  }
  c.font = "bold 14px " + FONT;
  const w = c.measureText(text).width + 16;
  c.fillStyle = "rgba(20,16,30,0.85)";
  c.strokeStyle = "#000";
  c.lineWidth = 2;
  c.fillRect(f.x - w / 2, y - 16, w, 24);
  c.strokeRect(f.x - w / 2, y - 16, w, 24);
  label(text, f.x, y + 2, 14, color);
}
