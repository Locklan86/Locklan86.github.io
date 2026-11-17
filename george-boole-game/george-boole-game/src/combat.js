import { game, setTv, say, addStyle } from "./state.js";
import { baseAttacks, weapons, groceries } from "./config.js";
import { pick, angleDiff, rand } from "./helpers.js";
import { carrier, holdingCart } from "./carry.js";
import { burst, floatText, shake, fx } from "./fx.js";

// ---------- george attacking ----------

function attackFor(slot) {
  const g = game.george;
  if (holdingCart()) return null;
  if (game.classKey === "basket") {
    if (slot === "primary") return { ...baseAttacks.basket, id: "basket" };
    return g.weapon ? { ...weapons[g.weapon.id], id: g.weapon.id, weapon: true } : null;
  }
  if (g.weapon) return { ...weapons[g.weapon.id], id: g.weapon.id, weapon: true };
  return { ...baseAttacks.punch, id: "punch" };
}

export function tryAttack(slot, fresh) {
  const g = game.george;
  if (g.attackCd > 0 || g.status.frozen > 0) return false;
  const a = attackFor(slot);
  if (!a) {
    if (fresh) say(holdingCart() ? "two hands on the cart: ram them" : "no weapon in your free hand");
    return false;
  }
  swing(a);
  return true;
}

function swing(a) {
  const g = game.george;
  g.attackCd = a.cooldown;
  g.swing = { t: 0, dur: 0.2, id: a.id };
  burst("ui/fx_swoosh", g.x + Math.cos(g.aim) * 34, g.y - 26 + Math.sin(g.aim) * 18, 80, 0.16, g.aim);

  let hits = 0;
  let kills = 0;
  for (const e of [...game.enemies]) {
    const dx = e.x - g.x;
    const dy = e.y - g.y;
    const d = Math.hypot(dx, dy);
    const inFront = Math.abs(angleDiff(Math.atan2(dy, dx), g.aim)) <= a.arc / 2 || d < e.r + 12;
    if (d > a.range + e.r || !inFront) continue;
    hits++;
    if (hurtEnemy(e, a.damage, Math.atan2(dy, dx), a.knock, { chill: a.chills })) kills++;
  }

  if (a.id === "basket") smashFragiles();
  if (a.weapon) wearWeapon();
  if (hits > 0) noteAttack(a.id);
  if (kills > 1) addStyle(15 * (kills - 1), kills === 2 ? "double kill" : "multi kill", g.x, g.y - 70);
}

// the basket is strong, but whatever is breakable inside it is not
function smashFragiles() {
  const list = carrier().list;
  const broken = list.filter(i => i.fragile);
  if (broken.length === 0) return;
  const g = game.george;
  for (const item of broken) {
    list.splice(list.indexOf(item), 1);
    game.world.decals.push({ sprite: "props/brokeneggs", x: g.x + rand(-20, 20), y: g.y + rand(10, 24) });
    floatText(g.x, g.y - 60, item.name + " broke", "#ff6b6b", 16);
  }
  shake(4);
  setTv("hurt", 1);
}

function wearWeapon() {
  const g = game.george;
  g.weapon.uses--;
  if (g.weapon.uses <= 0) {
    floatText(g.x, g.y - 60, weapons[g.weapon.id].name + " broke", "#ffffff", 16);
    g.weapon = null;
  }
}

// three different ways of fighting in a row is worth showing off
function noteAttack(id) {
  const g = game.george;
  game.recent = game.recent.filter(r => game.elapsed - r.t < 8);
  game.recent.push({ id, t: game.elapsed });
  const lastThree = game.recent.slice(-3).map(r => r.id);
  if (lastThree.length === 3 && new Set(lastThree).size === 3) {
    addStyle(40, "variety", g.x, g.y - 90);
    game.recent = [];
  }
}

// ---------- enemies taking damage ----------

export function hurtEnemy(e, damage, angle, knock, opts = {}) {
  e.hp -= damage;
  e.flash = 0.12;
  e.kx = Math.cos(angle) * knock;
  e.ky = Math.sin(angle) * knock;
  e.stun = Math.max(e.stun, knock >= 300 ? 0.28 : 0.15);
  if (e.state === "windup" || e.state === "charge") {
    e.state = "recover";
    e.t = 0.4;
  }
  if (opts.chill) e.slow = 2.5;
  floatText(e.x, e.y - 62, String(Math.round(damage * 10) / 10), "#ffffff", 14);
  burst("ui/fx_impact", e.x, e.y - 30, 52, 0.16);
  game.hitstop = Math.max(game.hitstop, 0.045);
  shake(3);
  if (e.hp <= 0) {
    killEnemy(e);
    return true;
  }
  return false;
}

export function killEnemy(e) {
  game.enemies.splice(game.enemies.indexOf(e), 1);
  game.stats.kills++;

  // a killed thief gives back whatever it grabbed
  if (e.loot) {
    if (e.loot.kind === "cart") {
      game.cart.stolen = false;
      game.cart.dropped = true;
      game.cart.x = e.x;
      game.cart.y = e.y;
    } else {
      e.loot.x = e.x;
      e.loot.y = e.y;
      game.floor.push(e.loot);
    }
    say("got it back");
  }

  // shoppers pushing baskets and carts drop groceries, usually on sale
  if (e.kind === "basket" || e.kind === "cart") {
    for (let i = 0; i < (e.kind === "cart" ? 2 : 1); i++) {
      const base = pick(groceries);
      const discounted = Math.random() < 0.6;
      game.floor.push({
        kind: "item", x: e.x + rand(-26, 26), y: e.y + rand(-10, 22), item: base, discounted, paid: false, dropped: false,
        price: discounted ? Math.ceil(base.price / 2) : base.price, phase: Math.random() * 6,
      });
    }
    if (Math.random() < 0.15) game.floor.push({ kind: "potion", x: e.x, y: e.y + 20, dropped: false, phase: 0 });
  }

  game.combo++;
  game.comboT = 2.5;
  addStyle(10 + (game.combo - 1) * 5, game.combo > 1 ? "combo x" + game.combo : "", e.x, e.y - 76);
  setTv("happy", 1.1);
  fx.parts.push({ key: "enemies/normal_ko", x: e.x, y: e.y + 6, size: 38, life: 0.9, max: 0.9, rot: 0, rise: 0, flat: true });
}

// ---------- george taking damage ----------

export function applyStatus(element) {
  const g = game.george;
  if (element === "candy") element = pick(["chemical", "flaming", "frozen"]);
  if (element === "chemical") {
    g.status.poison = 6;
    burst("ui/fx_poison", g.x, g.y - 40, 70, 0.5);
  }
  if (element === "flaming") {
    g.status.burn = 6;
    burst("ui/fx_fire", g.x, g.y - 30, 60, 0.5);
  }
  if (element === "frozen") {
    // being hit again while chilled freezes george in place for a moment
    if (g.status.chill > 0 && g.chillHits >= 1) {
      g.status.frozen = 1.1;
      g.status.chill = 0;
      g.chillHits = 0;
      burst("ui/fx_ice", g.x, g.y - 30, 90, 0.6);
    } else {
      g.status.chill = 4;
      g.chillHits++;
    }
  }
}
// 
export function hurtGeorge(damage, element, fromX, fromY) {
  const g = game.george;
  if (g.invuln > 0) return false;
  g.hp = Math.max(0, g.hp - damage);
  g.invuln = 0.9;
  game.combo = 0;
  game.comboT = 0;
  game.hitstop = 0.09;
  const away = Math.atan2(g.y - fromY, g.x - fromX);
  g.vx += Math.cos(away) * 240;
  g.vy += Math.sin(away) * 240;
  shake(7);
  setTv("hurt", 1.3);
  floatText(g.x, g.y - 74, "-" + damage, "#ff5555", 20);
  burst("ui/fx_impact", g.x, g.y - 34, 64, 0.2);
  applyStatus(element);
  return true;
}

// dodging by a hair is rewarded, but not twice in a row
export function nearMiss() {
  const g = game.george;
  if (game.nearMissCd > 0 || g.invuln > 0) return;
  game.nearMissCd = 0.8;
  addStyle(25, "close call", g.x, g.y - 80);
  setTv("happy", 0.9);
}

