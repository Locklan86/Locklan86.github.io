import { WORLD_W, WORLD_H, propTypes, zones, groceries, required, weaponAreas } from "./config.js";
import { rand, clamp, shuffle } from "./helpers.js";

export function zoneAt(x, y) {
  for (const name in zones) {
    const z = zones[name];
    if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return z;
  }
  return null;
}

// circle against the walls and the solid base of every prop
export function blocked(world, x, y, r) {
  if (x - r < 0 || x + r > WORLD_W || y - r < 0 || y + r > WORLD_H) return true;
  for (const p of world.props) {
    const s = p.solid;
    const nearestX = clamp(x, s.x0, s.x1);
    const nearestY = clamp(y, s.y0, s.y1);
    if ((x - nearestX) ** 2 + (y - nearestY) ** 2 < r * r) return true;
  }
  return false;
}

// moves one axis at a time so bodies slide along shelves, returns true if it bumped something
export function moveBody(world, o, dx, dy) {
  let bumped = false;
  if (!blocked(world, o.x + dx, o.y, o.r)) o.x += dx;
  else {
    bumped = true;
    if ("vx" in o) o.vx = 0;
  }
  if (!blocked(world, o.x, o.y + dy, o.r)) o.y += dy;
  else {
    bumped = true;
    if ("vy" in o) o.vy = 0;
  }
  return bumped;
}

export function openSpot(world, area) {
  const a = area || { x: 0, y: 0, w: WORLD_W, h: WORLD_H };
  for (let i = 0; i < 200; i++) {
    const x = a.x + 30 + Math.random() * (a.w - 60);
    const y = a.y + 30 + Math.random() * (a.h - 60);
    if (!blocked(world, x, y, 18) && Math.hypot(x - world.start.x, y - world.start.y) > 160) return { x, y };
  }
  return { x: world.start.x + 90, y: world.start.y };
}

function addProp(world, type, x, y) {
  const t = propTypes[type];
  world.props.push({
    type, x, y, sprite: t.sprite, w: t.w,
    solid: { x0: x - t.sw / 2, x1: x + t.sw / 2, y0: y - t.sh, y1: y },
  });
}

export function buildWorld() {
  const world = { props: [], hazards: [], decals: [], start: { x: 250, y: 880 } };

  // the middle aisles are different every run
for (const cx of [570, 850, 1130, 1410]) {
  for (const ry of [550, 700, 850, 1000]) {
    if (Math.random() < 0.85) {
      addProp(world, "shelf", cx + rand(-10, 10), ry + rand(-8, 8));
    }
  }
}
// Fridges along the back wall
for (const x of [600, 750, 900, 1050, 1200, 1350, 1500, 1650, 1800]) {
  addProp(world, "fridge", x, 90);
}

// L- Freezer spacing 265 for new pair, 150 for a pair ex 150, 300 is a pair
for (const x of [625, 770, 1035, 1185, 1445, 1595, 1860]) {
  addProp(world, "freezer", x, 270);
}
  addProp(world, "bakery", 110, 150);
  addProp(world, "bakery", 280, 150);
  addProp(world, "oven", 195, 310);
  addProp(world, "candystand", 1730, 510);
  addProp(world, "candystand", 1880, 510);
  addProp(world, "candystand", 1800, 670);
for (const x of [100, 280]) {
  for (const y of [600, 800, 1000]) {
    addProp(world, "cleaning", x, y);
  }
}
  addProp(world, "checkout", 1800, 1350);
  addProp(world, "door", 200, 1400);
  addProp(world, "cartreturn", 330, 1400);
  world.props.sort((a, b) => a.y - b.y);

  for (const h of [[210, 560, 40], [350, 400, 36], [230, 250, 34]]) world.hazards.push({ kind: "ice", x: h[0], y: h[1], r: h[2] });
  for (const h of [[650, 815, 38], [880, 800, 42], [1100, 840, 36]]) world.hazards.push({ kind: "slime", x: h[0], y: h[1], r: h[2] });
  return world;
}

// groceries sit in front of the department they belong to
const deptProps = { aisle: ["shelf"], fridge: ["fridge"], freezer: ["freezer"], bakery: ["bakery", "oven"], snacks: ["candystand"] };

function frontSpot(world, prop, floor) {
  for (let i = 0; i < 20; i++) {
    const x = prop.x + rand(-36, 36);
    const y = prop.y + rand(26, 40);
    if (!blocked(world, x, y, 14) && floor.every(f => Math.hypot(f.x - x, f.y - y) > 56)) return { x, y };
  }
  return null;
}

export function stockStore(world) {
  const floor = [];
  const decoys = shuffle(groceries.filter(i => !i.required)).slice(0, 5);
  for (const base of [...required, ...decoys]) {
    let spot = null;
    for (const p of shuffle(world.props.filter(p => deptProps[base.dept].includes(p.type)))) {
      spot = frontSpot(world, p, floor);
      if (spot) break;
    }
    if (!spot) spot = openSpot(world, null);
    const discounted = Math.random() < 0.25;
    floor.push({
      kind: "item", x: spot.x, y: spot.y, item: base, discounted, paid: false, dropped: false,
      price: discounted ? Math.ceil(base.price / 2) : base.price, phase: Math.random() * 6,
    });
  }
  for (const id in weaponAreas) {
    const spot = openSpot(world, weaponAreas[id] ? zones[weaponAreas[id]] : null);
    floor.push({ kind: "weapon", x: spot.x, y: spot.y, id, uses: 0, dropped: false, phase: Math.random() * 6 });
  }
  for (let i = 0; i < 2; i++) {
    const spot = openSpot(world, null);
    floor.push({ kind: "potion", x: spot.x, y: spot.y, dropped: false, phase: Math.random() * 6 });
  }
  return floor;
}
