import { game } from "./state.js";
import { classes, required } from "./config.js";

export function holdingCart() {
  return game.classKey === "cart" && !game.cart.dropped;
}

// the list george currently puts new groceries into
export function carrier() {
  if (holdingCart()) return { list: game.cart.items, cap: classes.cart.capacity };
  return { list: game.george.items, cap: game.classKey === "basket" ? classes.basket.capacity : 1 };
}

// a stolen cart takes its groceries with it
export function allCarried() {
  const list = [...game.george.items];
  if (game.cart && !game.cart.stolen) list.push(...game.cart.items);
  return list;
}

// the list shows True once an item is carried or already bagged at the checkout
export function haveItem(id) {
  return allCarried().some(i => i.id === id) || game.bagged.some(i => i.id === id);
}

// the day is only won when everything on the list has been bagged at the counter
export function listDone() {
  return required.every(r => game.bagged.some(i => i.id === r.id));
}

export function baggedCount() {
  return required.filter(r => game.bagged.some(i => i.id === r.id)).length;
}
