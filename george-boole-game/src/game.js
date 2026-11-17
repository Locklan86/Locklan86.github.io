import { game } from "./state.js";
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H } from "./config.js";
import { tickBuffers } from "./input.js";
import { updateFx } from "./fx.js";
import { updatePlayer } from "./player.js";
import { updateEnemies, updateSpawner } from "./enemies.js";
import { updateFood } from "./food.js";
import { zoneAt } from "./world.js";

function calculateGroceryBonuses() {
  const results = game.required.map(required => {
    const item = game.bagged.find(i => i.id === required.id);

    const hasTemperatureRequirement =
      required.requiredTemperature !== "any";

    const hasVariant =
      Object.keys(required.attributes || {}).length > 0;

    const hasWeight =
      required.weight !== null &&
      required.weight !== undefined;

    return {
      correctTemperature:
        !!item &&
        hasTemperatureRequirement &&
        item.temperature === required.requiredTemperature,

      correctVariant:
        !!item &&
        hasVariant &&
        Object.keys(required.attributes || {}).every(
          key => item.attributes?.[key] === required.attributes[key]
        ),

      correctWeight:
        !!item &&
        hasWeight &&
        item.weight === required.weight,

      hasTemperatureRequirement,
      hasVariant,
      hasWeight,
    };
  });

  const temperaturePoints =
    results.filter(r => r.correctTemperature).length * 30;

  const variantPoints =
    results.filter(r => r.correctVariant).length * 25;

  const weightPoints =
    results.filter(r => r.correctWeight).length * 25;

  const temperatureItems = results.filter(
    r => r.hasTemperatureRequirement
  );

  const allCorrectTemperatures =
    temperatureItems.length > 0 &&
    temperatureItems.every(r => r.correctTemperature);

  const allCorrectVariants = results.every(
    r => !r.hasVariant || r.correctVariant
  );

  const allCorrectWeights = results.every(
    r => !r.hasWeight || r.correctWeight
  );

  const perfectTemperatureBonus =
    allCorrectTemperatures ? 30 : 0;

  const completeAccuracyBonus =
    allCorrectTemperatures &&
    allCorrectVariants &&
    allCorrectWeights
      ? 100
      : 0;

  const total =
    temperaturePoints +
    variantPoints +
    weightPoints +
    perfectTemperatureBonus +
    completeAccuracyBonus;

  return {
    temperaturePoints,
    variantPoints,
    weightPoints,
    perfectTemperatureBonus,
    completeAccuracyBonus,
    total,
    allCorrectTemperatures,
    allCorrectVariants,
    allCorrectWeights,
    completeAccuracy: completeAccuracyBonus > 0,
  };
}
export function finish(won, reason) {
  game.running = false;

  const groceryBonuses = won
    ? calculateGroceryBonuses()
    : {
        temperaturePoints: 0,
        variantPoints: 0,
        weightPoints: 0,
        perfectTemperatureBonus: 0,
        completeAccuracyBonus: 0,
        total: 0,
        allCorrectTemperatures: false,
        allCorrectVariants: false,
        allCorrectWeights: false,
        completeAccuracy: false,
      };

  const timeBonus = won ? Math.round(game.time * 3) : 0;
  const spentPenalty = won ? game.spent * 4 : 0;

  const total =
    Math.round(game.style) +
    timeBonus +
    groceryBonuses.total -
    spentPenalty;

  let rank = "D";
  if (total >= 200) rank = "C";
  if (total >= 400) rank = "B";
  if (total >= 650) rank = "A";
  if (total >= 900) rank = "S";

  if (groceryBonuses.completeAccuracy && total >= 1100) {
    rank = "S+";
  }

  game.result = {
    won,
    reason,
    classKey: game.classKey,
    style: Math.round(game.style),
    timeBonus,
    spentPenalty,
    groceryBonuses,
    groceryBonusTotal: groceryBonuses.total,
    wrong: game.stats.wrong,
    deals: game.stats.deals,
    kills: game.stats.kills,
    total,
    rank,
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
function updateAllFood(dt) {
  // Food lying on the floor.
  for (const f of game.floor) {
    if (f.kind !== "item") continue;

    updateFood(
      f.item,
      dt,
      zoneAt(f.x, f.y),
      "floor"
    );
  }

  // Food George is carrying.
  for (const item of game.george.items) {
    updateFood(item, dt, null, "inventory");
  }

  // Food inside the cart.
  if (game.cart && !game.cart.stolen) {
    for (const item of game.cart.items) {
      updateFood(item, dt, null, "inventory");
    }
  }
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
  updateAllFood(dt);
  updateEnemies(dt);
  updateSpawner(dt);
  updateCamera(dt);

  if (game.endRequest) return finish(game.endRequest.won, game.endRequest.reason);
  if (game.george.hp <= 0) return finish(false, "george caught pneumonia");
  if (game.time <= 0) return finish(false, "the store closed on you");
}
