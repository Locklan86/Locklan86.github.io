import { DAY_LENGTH, START_MONEY, MAX_HP, VIEW_W, VIEW_H } from "./config.js";
import { buildWorld, stockStore } from "./world.js";
import { floatText, resetFx } from "./fx.js";


// one shared object that every file reads and changes
export const game = { running: false, paused: false };

export function say(text, secs = 1.6) {
  game.msg = { text, t: secs };
}

export function setTv(mood, secs = 1.2) {
  game.tv.mood = mood;
  game.tv.t = secs;
  game.tv.bounce = 1;
}

export function addStyle(points, label, x, y) {
  game.style += points;
  game.stylePulse = 1;
  const text = (label ? label + " " : "") + (points > 0 ? "+" : "") + points;
  floatText(x, y, text, points > 0 ? "#ffe14a" : "#ff6b6b", 20);
}

export function newRun(classKey) {
  const world = buildWorld();
  resetFx();
  Object.assign(game, {
    classKey, world, running: true, paused: false, endRequest: null, result: null,
    time: DAY_LENGTH, elapsed: 0, money: START_MONEY, spent: 0,
    style: 0, stylePulse: 0, combo: 0, comboT: 0, hitstop: 0, nearMissCd: 0,
    spawnT: 6, surges: [false, false], recent: [],
    stats: { kills: 0, wrong: 0, deals: 0 },
    enemies: [], bagged: [], target: null, msg: { text: "", t: 0 },
    tv: { mood: "neutral", t: 0, bounce: 0 },
    cam: { x: 0, y: 0 },
    floor: stockStore(world),
    cart: classKey === "cart" ? { kind: "cart", x: 0, y: 0, items: [], dropped: false, stolen: false } : null,
    george: {
      x: world.start.x, y: world.start.y, r: 14, vx: 0, vy: 0, speed: 0, walk: 0,
      hp: MAX_HP, aim: Math.PI / 2, items: [], weapon: null,
      attackCd: 0, swing: null, invuln: 0, hurtAnim: 0,
      status: { chill: 0, frozen: 0, burn: 0, poison: 0 }, burnTick: 0, poisonTick: 0, chillHits: 0,
    },
  });
  
  game.cam.x = Math.max(0, Math.min(game.george.x - VIEW_W / 2, 1600 - VIEW_W));
  game.cam.y = Math.max(0, Math.min(game.george.y - VIEW_H / 2, 1000 - VIEW_H));
  say("find everything on the list, then check out", 3);
}
