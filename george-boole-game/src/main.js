import { VIEW_W, VIEW_H } from "./config.js";
import { game, newRun } from "./state.js";
import { bindInput, buffer } from "./input.js";
import { loadSprites } from "./sprites.js";
import { update } from "./game.js";
import { render } from "./render.js";
import { drawHud } from "./hud.js";
import { setupUi, showMenu, showResult, showPause } from "./ui.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function togglePause() {
  if (!game.running) return;
  game.paused = !game.paused;
  showPause(game.paused);
}

bindInput(canvas);
game.onEnd = result => showResult(result);
setupUi(newRun, togglePause);

let lastFrame = 0;
function loop(now) {
  const dt = Math.min(0.033, (now - lastFrame) / 1000 || 0);
  lastFrame = now;
  if (buffer.pause) {
    buffer.pause = false;
    togglePause();
  }
  update(dt);
  if (game.george) {
    render(ctx);
    drawHud(ctx);
  } else {
    ctx.fillStyle = "#2b2634";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  requestAnimationFrame(loop);
}

loadSprites().then(() => {
  showMenu();
  requestAnimationFrame(loop);
});
