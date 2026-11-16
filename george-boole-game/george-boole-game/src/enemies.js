import { game, say, setTv } from "./state.js";
import { enemyKinds, looks, VIEW_W, VIEW_H } from "./config.js";
import { dist } from "./helpers.js";
import { moveBody, openSpot, zoneAt } from "./world.js";
import { hurtGeorge, hurtEnemy, nearMiss } from "./combat.js";
import { holdingCart } from "./carry.js";
import { burst, shake, floatText } from "./fx.js";

// ---------- spawning ----------

function chooseKind(element) {
  const t = game.elapsed;
  const r = Math.random();
  let kind = "regular";
  // new enemy types show up over the day instead of all at once
  if (t >= 60 && r < 0.12) kind = "cart";
  else if (t >= 40 && r < 0.3) kind = "basket";
  else if (t >= 20 && r < 0.42) kind = "thief";
  else kind = Math.random() < (element === "normal" ? 0.55 : 0.3) ? "dumb" : "regular";

  const looksLike = looks[element];
  if (kind === "cart" && !looksLike.includes("cart")) kind = looksLike.includes("basket") ? "basket" : "regular";
  if (kind === "basket" && !looksLike.includes("basket")) kind = looksLike.includes("cart") ? "cart" : "regular";
  return kind;
}

function spawnEnemy() {
  const g = game.george;
  const cam = game.cam;
  let spot = openSpot(game.world, null);
  for (let i = 0; i < 40; i++) {
    const onScreen = spot.x > cam.x - 60 && spot.x < cam.x + VIEW_W + 60 && spot.y > cam.y - 60 && spot.y < cam.y + VIEW_H + 60;
    if (!onScreen && dist(spot, g) > 380) break;
    spot = openSpot(game.world, null);
  }
  const zone = zoneAt(spot.x, spot.y);
  const element = zone ? zone.element : "normal";
  const kind = chooseKind(element);
  const k = enemyKinds[kind];
  game.enemies.push({
    x: spot.x, y: spot.y, r: 14, kind, element, hp: k.hp, maxHp: k.hp, range: k.range,
    state: "chase", t: 0, cd: 1, kx: 0, ky: 0, flash: 0, slow: 0, stun: 0, grace: 0.9, ramCd: 0,
    loot: null, lockAng: 0, hitDone: false, minD: 999, flee: 0, seed: Math.random() * 10,
  });
}

export function updateSpawner(dt) {
  const t = game.elapsed;
  [70, 100].forEach((at, i) => {
    if (t < at || game.surges[i]) return;
    game.surges[i] = true;
    say("rush hour!", 2);
    setTv("angry", 2);
    for (let n = 0; n < 3; n++) spawnEnemy();
  });
  const cap = Math.min(9, 3 + Math.floor(t / 20));
  game.spawnT -= dt;
  if (game.spawnT <= 0 && game.enemies.length < cap) {
    spawnEnemy();
    game.spawnT = Math.max(1.8, 4.5 - t / 40);
  }
}

// ---------- behavior ----------

export function updateEnemies(dt) {
  for (const e of [...game.enemies]) {
    const k = enemyKinds[e.kind];
    e.cd -= dt;
    e.flash -= dt;
    e.slow -= dt;
    e.stun -= dt;
    e.grace -= dt;
    e.ramCd -= dt;

    const decay = Math.exp(-9 * dt);
    e.kx *= decay;
    e.ky *= decay;
    moveBody(game.world, e, e.kx * dt, e.ky * dt);

    cartRam(e);
    if (!game.enemies.includes(e) || e.stun > 0) continue;

    const speed = k.speed * (e.slow > 0 ? 0.5 : 1);
    if (e.state === "chase") chase(e, k, speed, dt);
    else if (e.state === "windup") windup(e, k, dt);
    else if (e.state === "charge") charge(e, k, dt);
    else if (e.state === "flee") flee(e, speed, dt);
    else if (e.state === "recover") {
      e.t -= dt;
      if (e.t <= 0) e.state = "chase";
    }
    separate(e, dt);
  }
}

// thieves go for anything george dropped, including a parked cart
function findBait(e) {
  let best = null;
  let bestD = 450;
  for (const f of game.floor) {
    if (!f.dropped) continue;
    const d = dist(e, f);
    if (d < bestD) {
      best = f;
      bestD = d;
    }
  }
  const cart = game.cart;
  if (cart && cart.dropped && !cart.stolen && dist(e, cart) < bestD) best = cart;
  return best;
}

function steal(e, bait) {
  if (bait.kind === "cart") {
    bait.stolen = true;
    e.loot = bait;
  } else {
    game.floor.splice(game.floor.indexOf(bait), 1);
    e.loot = bait;
  }
  e.state = "flee";
  e.flee = 9;
  setTv("angry", 1.3);
  say("thief! kill it to get it back");
}

function chase(e, k, speed, dt) {
  const g = game.george;
  let target = g;
  let bait = null;
  if (e.kind === "thief") {
    bait = findBait(e);
    if (bait) target = bait;
  }
  const dx = target.x - e.x;
  const dy = target.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  let ux = dx / d;
  let uy = dy / d;
  if (e.kind === "dumb") {
    // wanders side to side on the way, which makes it easy to read and easy to dodge
    const sway = Math.sin(game.elapsed * 2.2 + e.seed) * 0.9;
    const px = -uy;
    const py = ux;
    ux += px * sway;
    uy += py * sway;
  }
  const stopAt = target !== g ? 10 : e.kind === "cart" ? 200 : Math.max(18, e.range * 0.7);
  if (d > stopAt) moveBody(game.world, e, ux * speed * dt, uy * speed * dt);

  if (bait && d < 24) return steal(e, bait);
  if (target !== g || e.grace > 0 || e.cd > 0) return;
  if (e.kind === "cart" ? d > 90 && d < 340 : d < e.range + 14) {
    e.state = "windup";
    e.t = k.windup;
    e.lockAng = Math.atan2(g.y - e.y, g.x - e.x);
  }
}

function windup(e, k, dt) {
  e.t -= dt;
  if (e.t > 0) return;
  if (e.kind === "cart") {
    e.state = "charge";
    e.t = 0.5;
    e.hitDone = false;
    e.minD = 999;
    return;
  }
  const g = game.george;
  const d = dist(e, g);
  if (d <= e.range + g.r) hurtGeorge(k.damage, e.element, e.x, e.y);
  else if (d <= e.range + g.r + 26) nearMiss();
  e.state = "recover";
  e.t = k.recover;
  e.cd = k.cooldown;
}

// the cart shopper picks a line, waits, then rushes down it
function charge(e, k, dt) {
  const g = game.george;
  e.t -= dt;
  const bumped = moveBody(game.world, e, Math.cos(e.lockAng) * 340 * dt, Math.sin(e.lockAng) * 340 * dt);
  const d = dist(e, g);
  e.minD = Math.min(e.minD, d);
  if (!e.hitDone && d < e.r + g.r + 6) e.hitDone = hurtGeorge(k.damage, e.element, e.x, e.y);
  if (bumped) {
    e.stun = 0.9;
    shake(5);
    burst("ui/fx_impact", e.x, e.y - 30, 70, 0.2);
    floatText(e.x, e.y - 70, "crash", "#ffffff", 16);
  }
  if (e.t <= 0 || bumped) {
    if (!e.hitDone && e.minD < 46) nearMiss();
    e.state = "recover";
    e.t = k.recover;
    e.cd = k.cooldown;
  }
}

function flee(e, speed, dt) {
  const g = game.george;
  const away = Math.atan2(e.y - g.y, e.x - g.x);
  moveBody(game.world, e, Math.cos(away) * speed * 1.25 * dt, Math.sin(away) * speed * 1.25 * dt);
  e.flee -= dt;
  if (e.flee > 0) return;
  game.enemies.splice(game.enemies.indexOf(e), 1);
  say("the thief got away");
  // the store puts a stolen cart back at the cart return, empty
  if (e.loot && e.loot.kind === "cart") {
    const ret = game.world.props.find(p => p.type === "cartreturn");
    e.loot.stolen = false;
    e.loot.dropped = true;
    e.loot.items = [];
    e.loot.x = ret.x;
    e.loot.y = ret.y + 26;
  }
}

// enemies push each other apart so they do not stack
function separate(e, dt) {
  for (const other of game.enemies) {
    const d = dist(e, other);
    if (other !== e && d > 0 && d < 24) moveBody(game.world, e, ((e.x - other.x) / d) * 70 * dt, ((e.y - other.y) / d) * 70 * dt);
  }
}

// a fast cart hurts whatever it hits, speed is the damage
function cartRam(e) {
  const g = game.george;
  if (!holdingCart() || e.ramCd > 0) return;
  const speed = Math.hypot(g.vx, g.vy);
  if (speed < 170 || dist(e, g) > e.r + g.r + 12) return;
  e.ramCd = 0.45;
  hurtEnemy(e, (speed - 110)*9 / 55, Math.atan2(g.vy, g.vx), 380);
}
