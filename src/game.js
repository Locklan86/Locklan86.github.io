import { game } from "./state.js";
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H } from "./config.js";
import { tickBuffers } from "./input.js";
import { updateFx } from "./fx.js";
import { updatePlayer } from "./player.js";
import { updateEnemies, updateSpawner } from "./enemies.js";

export function finish(won, reason) {
  game.running = false;
  const timeBonus = won ? Math.round(game.time * 3) : 0;
  const spentPenalty = won ? game.spent * 4 : 0;
  game.result = {
    won, reason, classKey: game.classKey, style: Math.round(game.style), timeBonus, spentPenalty,
    wrong: game.stats.wrong, deals: game.stats.deals, kills: game.stats.kills,
    total: Math.round(game.style) + timeBonus - spentPenalty,
  };
  if (game.onEnd) game.onEnd(game.result);
}

function updateCamera(dt) {
  const g = game.george;
  const goalX = Math.max(0, Math.min(g.x - VIEW_W / 2 + g.vx * 0.2, WORLD_W - VIEW_W));
  const goalY = Math.max(0, Math.min(g.y - VIEW_H / 2 + g.vy * 0.2, WORLD_H - VIEW_H));
  const follow = Math.min(1, dt * 7);
  game.cam.x += (goalX - game.cam.x) * follow;
  game.cam.y += (goalY - game.cam.y) * follow;
}

export function update(dt) {
  updateFx(dt);
  if (!game.running || game.paused) return;

  // everything freezes for a few frames when something gets hit
  if (game.hitstop > 0) {
    game.hitstop -= dt;
    return;
  }

  tickBuffers(dt);
  game.elapsed += dt;
  game.time -= dt;
  game.comboT -= dt;
  if (game.comboT <= 0) game.combo = 0;
  game.nearMissCd -= dt;
  game.stylePulse = Math.max(0, game.stylePulse - dt * 4);
  game.msg.t -= dt;
  game.tv.t -= dt;
  game.tv.bounce = Math.max(0, game.tv.bounce - dt * 5);
  if (game.tv.t <= 0) game.tv.mood = "neutral";

  updatePlayer(dt);
  updateEnemies(dt);
  updateSpawner(dt);
  updateCamera(dt);

  if (game.endRequest) return finish(game.endRequest.won, game.endRequest.reason);
  if (game.george.hp <= 0) return finish(false, "george caught pneumonia");
  if (game.time <= 0) return finish(false, "the store closed on you");
}
