export const keys = {};
export const mouse = { x: 480, y: 270, down: false, right: false };
// a press stays "live" for a moment so a slightly early press still counts
export const buffer = { attack: 0, alt: 0, interact: 0, drop: 0, pause: false };

export function bindInput(canvas) {
  window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    if (!keys[key]) {
      if (key === "e") buffer.interact = 0.15;
      if (key === "q") buffer.drop = 0.15;
      if (key === " ") buffer.attack = 0.15;
      if (key === "f") buffer.alt = 0.15;
      if (key === "p" || key === "escape") buffer.pause = true;
    }
    keys[key] = true;
    if (key === " " || key.startsWith("arrow")) event.preventDefault();
  });
  window.addEventListener("keyup", event => {
    keys[event.key.toLowerCase()] = false;
  });
  window.addEventListener("blur", () => {
    for (const key in keys) keys[key] = false;
    mouse.down = false;
    mouse.right = false;
  });

  canvas.addEventListener("mousemove", event => {
    const box = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - box.left) * canvas.width) / box.width;
    mouse.y = ((event.clientY - box.top) * canvas.height) / box.height;
  });
  canvas.addEventListener("mousedown", event => {
    if (event.button === 0) {
      mouse.down = true;
      buffer.attack = 0.15;
    } else if (event.button === 2) {
      mouse.right = true;
      buffer.alt = 0.15;
    }
  });
  window.addEventListener("mouseup", event => {
    if (event.button === 0) mouse.down = false;
    if (event.button === 2) mouse.right = false;
  });
  canvas.addEventListener("contextmenu", event => event.preventDefault());
}

export function tickBuffers(dt) {
  for (const name of ["attack", "alt", "interact", "drop"]) buffer[name] = Math.max(0, buffer[name] - dt);
}
