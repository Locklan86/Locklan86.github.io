import { foodRules } from "./config.js";

export function createFoodInstance(base) {
  const rules = foodRules[base.id] || {};

  const attributes = base.attributes || (rules.random ? rules.random() : {});

  const displayName = base.id === "milk"
    ? `${attributes.fat}% Milk`
    : base.name;

  let weight = base.weight ?? null;

if (weight === null && rules.weight) {
  const [min, max] = rules.weight;
  weight = Math.round(min + Math.random() * (max - min));
}

const startingTemperature =
  base.dept === "freezer" ? 0 :
  base.dept === "fridge" ? 10 :
  25;

const originalTemperature = startingTemperature <= 10
  ? "cold"
  : "lukewarm";

  return {
    ...base,

    attributes,
    displayName,
    weight,

    temperature: originalTemperature,
    originalTemperature,
    temperatureLevel: startingTemperature,

    temperatureTimer: 0,
    spoilTimer: 0,
    meltTimer: 0,
    toxicTimer: 0,

    spoiled: false,
    softened: false,
    melted: false,
    wet: false,
    toxic: false,
  };
}

const FOOD_TEMPERATURE = {
  cold: 10,
  lukewarm: 30,
  warm: 45,
  hot: 60,
};

function updateTemperature(food, dt, zone, location) {
  const rules = foodRules[food.id] || {};

  // Candy never changes.
  if (rules.immune) return;

  let target = food.temperatureLevel;

  // Food on the floor changes temperature faster.
  const rate = location === "floor"
    ? (zone?.element === "candy" || !zone ? 0.15 : 5)
    : 1;

  if (zone?.element === "frozen") {
    target = 0;
  } else if (zone?.element === "flaming") {
    target = 75;
  } else if (zone?.element === "chemical") {
    target = food.temperatureLevel;
  } else if (zone?.element === "candy" || !zone) {
    // Slowly return toward room temperature.
    target = food.temperatureLevel;
  } else if (location === "inventory") {
    target = 25;
  } else {
    return;
  }

  // Frozen foods warm more slowly.
  const warmingMultiplier = rules.slowMelting ? 0.15 : 1;

  const difference = target - food.temperatureLevel;
  const speed = rate * warmingMultiplier;

  if (Math.abs(difference) < speed * dt) {
    food.temperatureLevel = target;
  } else {
    food.temperatureLevel += Math.sign(difference) * speed * dt;
  }

  food.temperatureTimer += dt;

  if (food.temperatureLevel <= FOOD_TEMPERATURE.cold) {
    food.temperature = "cold";
  } else if (food.temperatureLevel <= FOOD_TEMPERATURE.lukewarm) {
    food.temperature = "lukewarm";
  } else if (food.temperatureLevel <= FOOD_TEMPERATURE.warm) {
    food.temperature = "warm";
  } else {
    food.temperature = "hot";
  }
}

function updateSpoilage(food, dt) {
  const rules = foodRules[food.id] || {};

  if (rules.spoilAt === "hot" && food.temperature === "hot") {
    food.spoilTimer += dt;

    if (food.spoilTimer >= 10) {
      food.spoiled = true;
    }
  }
}

function updateMelting(food, dt, zone) {
  const rules = foodRules[food.id] || {};

  if (rules.immune) return;

  // Butter and chocolate respond to high temperatures.
  if (rules.meltsInBakery) {
    if (food.temperatureLevel >= 60) {
      food.melted = true;
    } else if (food.temperatureLevel >= 35 && food.id === "butter") {
      food.softened = true;
    }
  }

  // Frozen foods need time at high temperatures to melt.
  if (rules.slowMelting && food.temperature === "hot") {
    food.meltTimer += dt;

    if (food.meltTimer >= 15) {
      food.melted = true;
    }
  }

  // Only completely melted foods become wet.
  if (food.melted && rules.becomesWet) {
    food.wet = true;
  }
}

function updateToxicity(food, dt, zone) {
  const rules = foodRules[food.id] || {};

  if (rules.immune || food.toxic) return;

  if (zone?.element === "chemical") {
    food.toxicTimer += dt;

    if (food.toxicTimer >= 3) {
      food.toxic = true;
    }
  }
}

export function updateFood(food, dt, zone, location) {
  if (!food || (food.spoiled && food.toxic)) return;

  const rules = foodRules[food.id] || {};

  if (rules.immune) return;

  updateTemperature(food, dt, zone, location);
  updateSpoilage(food, dt);
  updateMelting(food, dt, zone);
  updateToxicity(food, dt, zone);
}