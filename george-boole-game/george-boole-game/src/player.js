import { game, say, setTv, addStyle } from "./state.js";
import { classes, MAX_HP, POISON_AMOUNT, POISON_PERCENT, BURN_AMOUNT, BURN_PERCENT, weapons } from "./config.js";
import { keys, mouse, buffer } from "./input.js";
import { dist, approach } from "./helpers.js";
import { moveBody, blocked } from "./world.js";
import { carrier, holdingCart, listDone, baggedCount } from "./carry.js";
import { tryAttack } from "./combat.js";
import { floatText, burst, shake } from "./fx.js";

function tickStatus(dt) {
  const g = game.george;
  const s = g.status;
  if (s.poison > 0) {
    s.poison -= dt;
    g.poisonTick += dt;
    if (g.poisonTick >= 1) {
      g.poisonTick -= 1;
      g.hp -= POISON_AMOUNT * POISON_PERCENT;
    }
  }
  if (s.burn > 0) {
    s.burn -= dt;
    g.burnTick += dt;
    if (g.burnTick >= 2) {
      g.burnTick -= 2;
      g.hp -= BURN_AMOUNT * BURN_PERCENT;
    }
  }
  if (s.frozen > 0) s.frozen -= dt;
  else if (s.chill > 0) s.chill -= dt;
  else g.chillHits = 0;
}

export function updatePlayer(dt) {
  const g = game.george;
  const cls = classes[game.classKey];
  g.attackCd -= dt;
  g.invuln -= dt;
  g.hurtAnim -= dt;
  if (g.swing) {
    g.swing.t += dt;
    if (g.swing.t >= g.swing.dur) g.swing = null;
  }
  tickStatus(dt);

  // movement: quick to start and stop, except the cart which has weight
  const ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  const iy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  const len = Math.hypot(ix, iy) || 1;
  const slow = g.status.frozen > 0 ? 0 : g.status.chill > 0 ? 0.55 : 1;
  const top = cls.maxSpeed * slow;
  g.vx = approach(g.vx, (ix / len) * top, cls.accel * dt);
  g.vy = approach(g.vy, (iy / len) * top, cls.accel * dt);

  const before = Math.hypot(g.vx, g.vy);
  const bumped = moveBody(game.world, g, g.vx * dt, g.vy * dt);
  if (bumped && holdingCart() && before > 220) {
    shake(4);
    burst("ui/fx_impact", g.x + g.vx * 0.05, g.y - 20, 44, 0.14);
  }
  g.speed = Math.hypot(g.vx, g.vy);
  g.walk += g.speed * dt * 0.02;

  // aim follows the mouse, but a cart driver just looks where the cart goes
  if (holdingCart()) {
    if (g.speed > 30) g.aim = Math.atan2(g.vy, g.vx);
  } else {
    g.aim = Math.atan2(mouse.y + game.cam.y + 26 - g.y, mouse.x + game.cam.x - g.x);
  }

  for (const hz of game.world.hazards) {
    if (dist(hz, g) >= hz.r) continue;
    if (hz.kind === "ice") g.status.chill = Math.max(g.status.chill, 1.2);
    else g.status.poison = Math.max(g.status.poison, 1.2);
  }

  if (buffer.attack > 0 || mouse.down || keys[" "]) {
    if (tryAttack("primary", buffer.attack > 0.12)) buffer.attack = 0;
  }
  if (buffer.alt > 0 || mouse.right || keys.f) {
    if (tryAttack("secondary", buffer.alt > 0.12)) buffer.alt = 0;
  }

  findTarget();
  if (buffer.interact > 0) {
    buffer.interact = 0;
    interact();
  }
  if (buffer.drop > 0) {
    buffer.drop = 0;
    dropLast();
  }
}

// picks the one thing e would act on right now
function findTarget() {
  const g = game.george;
  let best = null;
  let bestD = 38;
  for (const f of game.floor) {
    const d = dist(f, g);
    if (d < bestD) {
      best = { kind: f.kind, ref: f };
      bestD = d;
    }
  }
  const cart = game.cart;
  if (cart && cart.dropped && !cart.stolen && dist(cart, g) < Math.max(bestD, 48)) best = { kind: "cart", ref: cart };
  if (!best) {
    const counter = game.world.props.find(p => p.type === "checkout" && dist(p, g) < 120);
    if (counter) best = { kind: "checkout", ref: counter };
  }
  game.target = best;
}
// L- we need to fix the controls completely, it is very confusing, 
// the number keys should select which slot
// you want to drop and if none is specified it defaults to the
// first weapon slot
function interact() {
  const t = game.target;
  if (!t) {
    if (holdingCart()) parkCart();
    return;
  }
  if (t.kind === "item") buyItem(t.ref);
  else if (t.kind === "weapon") grabWeapon(t.ref);
  else if (t.kind === "potion") drinkPotion(t.ref);
  else if (t.kind === "cart") useCart();
  else if (t.kind === "checkout") checkout(t.ref);
}

function buyItem(f) {
  const g = game.george;
  const c = carrier();
  if (c.list.length >= c.cap) return say(game.classKey === "bare" || !holdingCart() && game.classKey === "cart" ? "hands full (Q to drop)" : "no room left");
  const cost = f.paid ? 0 : f.price;
  if (cost > game.money) {
    setTv("angry", 0.9);
    return say("too expensive");
  }
  game.money -= cost;
  game.spent += cost;
  c.list.push(f.item);
  game.floor.splice(game.floor.indexOf(f), 1);
  if (f.paid) return;
  if (!f.item.required) {
    game.stats.wrong++;
    addStyle(-30, "wrong item", g.x, g.y - 74);
    setTv("angry", 1.3);
  } else {
    setTv("happy", 1);
    if (f.discounted) {
      game.stats.deals++;
      addStyle(20, "deal", g.x, g.y - 74);
    }
  }
}

function grabWeapon(f) {
  const g = game.george;
  if (holdingCart()) return say("hands full: park the cart with E");
  game.floor.splice(game.floor.indexOf(f), 1);
  // swapping leaves the old one on the floor
  if (g.weapon) game.floor.push({ kind: "weapon", x: g.x, y: g.y, id: g.weapon.id, uses: g.weapon.uses, dropped: true, phase: 0 });
  g.weapon = { id: f.id, uses: f.uses > 0 ? f.uses : weapons[f.id].uses };
  say(weapons[f.id].name);
}

function drinkPotion(f) {
  const g = game.george;
  game.floor.splice(game.floor.indexOf(f), 1);
  g.hp = Math.min(MAX_HP, g.hp + 35);
  g.status.poison = 0;
  g.status.burn = 0;
  floatText(g.x, g.y - 74, "+35", "#7dff7d", 20);
  setTv("happy", 1);
}

function parkCart() {
  const g = game.george;
  const cart = game.cart;
  let x = g.x + Math.cos(g.aim) * 34;
  let y = g.y + Math.sin(g.aim) * 20;
  if (blocked(game.world, x, y, 16)) {
    x = g.x;
    y = g.y;
  }
  cart.x = x;
  cart.y = y;
  cart.dropped = true;
  say("cart parked, thieves will go for it");
}

function useCart() {
  const g = game.george;
  const cart = game.cart;
  // with something in your hand, e puts it in the cart
  if (g.items.length > 0) {
    if (cart.items.length >= classes.cart.capacity) return say("the cart is full");
    cart.items.push(g.items.pop());
    return;
  }
  if (g.weapon) {
    game.floor.push({ kind: "weapon", x: g.x, y: g.y, id: g.weapon.id, uses: g.weapon.uses, dropped: true, phase: 0 });
    g.weapon = null;
  }
  cart.dropped = false;
}

// bagging empties your hands, so a small carrier just makes more trips
function checkout(counter) {
  const g = game.george;
  let moved = 0;
  const bag = list => {
    while (list.length) {
      game.bagged.push(list.pop());
      moved++;
    }
  };
  bag(g.items);
  if (game.cart && !game.cart.stolen && (holdingCart() || dist(game.cart, counter) < 170)) bag(game.cart.items);
  if (listDone()) {
    game.endRequest = { won: true, reason: "everything on the list is bagged" };
    return;
  }
  say(moved > 0 ? "bagged " + moved + ", list " + baggedCount() + "/6" : "nothing to bag, list " + baggedCount() + "/6");
  if (moved > 0) setTv("happy", 0.9);
}

function dropLast() {
  const g = game.george;
  const list = carrier().list;
  if (list.length === 0) return say("nothing to drop");
  const item = list.pop();
  game.floor.push({
    kind: "item", x: g.x + Math.cos(g.aim) * 22, y: g.y + Math.sin(g.aim) * 14, item,
    price: item.price, discounted: false, paid: true, dropped: true, phase: 0,
  });
}
