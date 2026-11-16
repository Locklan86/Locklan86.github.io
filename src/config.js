export const VIEW_W = 960;
export const VIEW_H = 540;
export const WORLD_W = 2000;
export const WORLD_H = 1400;

// numbers to tweak while playtesting
export const DAY_LENGTH = 120;
export const START_MONEY = 60;
export const MAX_HP = 75;
export const POISON_AMOUNT = 50;
export const POISON_PERCENT = 0.05;
export const BURN_AMOUNT = 20;
export const BURN_PERCENT = 0.2;

export const classes = {
  basket: {
    name: "Basket", icon: "tools/basket_empty", maxSpeed: 275, accel: 2400, capacity: 4,
    blurb: "One handed. Swing the basket for big damage (it smashes fragiles inside) or use your free hand for a weapon.",
  },
  cart: {
    name: "Cart", icon: "tools/cart_left", maxSpeed: 400, accel: 650, capacity: 8,
    blurb: "Two handed. Carries the most and rams enemies, faster hits harder. Park it with E to use weapons, but thieves will take it.",
  },
  bare: {
    name: "Bare Hands", icon: "chars/george_attack", maxSpeed: 300, accel: 2800, capacity: 1,
    blurb: "Quick and always armed, but you can only carry one thing at a time.",
  },
};

export const baseAttacks = {
  basket: { damage: 30, range: 62, arc: 1.7, cooldown: 0.5, knock: 320 },
  punch: { damage: 10, range: 52, arc: 1.6, cooldown: 0.3, knock: 120 },
};

export const weapons = {
  hammer: { name: "Hammer", damage: 40, range: 60, arc: 1.3, cooldown: 0.75, knock: 340, uses: 6 },
  pan: { name: "Frying Pan", damage: 30, range: 54, arc: 1.5, cooldown: 0.5, knock: 240, uses: 8 },
  rollingpin: { name: "Rolling Pin", damage: 20, range: 52, arc: 1.2, cooldown: 0.27, knock: 140, uses: 12 },
  frozenpizza: { name: "Frozen Pizza", damage: 30, range: 52, arc: 1.4, cooldown: 0.5, knock: 200, uses: 5, chills: true },
};

// where each weapon tends to lie around
export const weaponAreas = { hammer: "cleaning", pan: "bakery", rollingpin: null, frozenpizza: "frozen" };

export const groceries = [
  { id: "beans", name: "Beans", price: 3, dept: "aisle", required: true },
  { id: "eggs", name: "Eggs", price: 5, dept: "fridge", fragile: true, required: true },
  { id: "hotdogs", name: "Hotdogs", price: 4, dept: "freezer", required: true },
  { id: "butter", name: "Unsalted_Butter", price: 4, dept: "fridge", required: true },
  { id: "milk", name: "2%_Milk", price: 4, dept: "fridge", required: true },
  { id: "pizza", name: "Frozen_Pizza", price: 7, dept: "freezer", required: true },
  { id: "apple", name: "Apple", price: 2, dept: "aisle" },
  { id: "bananas", name: "Bananas", price: 2, dept: "aisle" },
  { id: "grapes", name: "Grapes", price: 4, dept: "aisle" },
  { id: "steak", name: "Steak", price: 8, dept: "freezer" },
  { id: "bread", name: "Bread", price: 3, dept: "bakery" },
  { id: "chicken", name: "Chicken", price: 7, dept: "bakery" },
  { id: "chocolate", name: "Chocolate", price: 2, dept: "snacks", fragile: true },
  { id: "candy", name: "Candy", price: 2, dept: "snacks", fragile: true },
];
export const required = groceries.filter(i => i.required);

export const enemyKinds = {
  regular: { hp: 30, speed: 100, damage: 12, range: 40, windup: 0.5, recover: 0.5, cooldown: 1.2 },
  dumb: { hp: 20, speed: 62, damage: 8, range: 38, windup: 0.75, recover: 0.7, cooldown: 1.6 },
  thief: { hp: 20, speed: 150, damage: 6, range: 36, windup: 0.45, recover: 0.5, cooldown: 1.4 },
  basket: { hp: 40, speed: 92, damage: 12, range: 44, windup: 0.55, recover: 0.6, cooldown: 1.3 },
  cart: { hp: 50, speed: 78, damage: 16, range: 0, windup: 0.8, recover: 0.7, cooldown: 2.2 },
};

// which enemy drawings exist for each element
export const looks = {
  normal: ["regular", "dumb", "thief", "basket", "cart"],
  frozen: ["regular", "basket", "cart"],
  candy: ["regular", "basket"],
  flaming: ["regular", "cart"],
  chemical: ["regular", "basket"],
};

export const zones = {
  frozen: { x: 420, y: 0, w: 1580, h: 350, element: "frozen", color: "#bfe3f4" },
  bakery: { x: 0, y: 0, w: 420, h: 350, element: "flaming", color: "#f6d7a8" },
  snacks: { x: 1600, y: 350, w: 1000, h: 600, element: "candy", color: "#f8c4e0" },
  cleaning: { x: 0, y: 450, w: 400, h: 650, element: "chemical", color: "#cbe9a8" },
  checkout: { x: 1600, y: 1100, w: 400, h: 300, element: "candy", color: "#f4cde0" },
};

// w is the drawn width, sw and sh are the solid footprint at the base of the sprite

export const propTypes = {
  shelf: { sprite: "props/shelf", w: 250, sw: 190, sh: 40 },
  freezer: { sprite: "props/freezer", w: 175, sw: 165, sh: 70 },
  fridge: { sprite: "props/fridge", w: 150, sw: 150, sh: 50 },
  checkout: { sprite: "props/checkout", w: 190, sw: 150, sh: 46 },
  bakery: { sprite: "props/bakery", w: 120, sw: 92, sh: 38 },
  oven: { sprite: "props/oven", w: 116, sw: 90, sh: 36 },
  candystand: { sprite: "props/candystand", w: 130, sw: 90, sh: 40 },
  cleaning: { sprite: "props/cleaning", w: 185, sw: 175, sh: 45 },
  cartreturn: { sprite: "props/cartreturn", w: 120, sw: 100, sh: 36 },
  door: { sprite: "props/door", w: 140, sw: 110, sh: 30 },
  boxes: { sprite: "props/boxes", w: 96, sw: 70, sh: 34 },
};
