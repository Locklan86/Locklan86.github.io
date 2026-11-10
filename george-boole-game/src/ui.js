import { classes } from "./config.js";

const overlay = document.getElementById("overlay");
let onPick = null;
let onResume = null;

export function setupUi(pickHandler, resumeHandler) {
  onPick = pickHandler;
  onResume = resumeHandler;
  overlay.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.class) {
      overlay.style.display = "none";
      onPick(button.dataset.class);
    } else if (button.dataset.action === "menu") showMenu();
    else if (button.dataset.action === "resume") onResume();
  });
}

function classCards() {
  let html = "<div class='cards'>";
  for (const key in classes) {
    const c = classes[key];
    html += "<button class='card' data-class='" + key + "'><img src='assets/" + c.icon + ".png' alt=''><b>" + c.name + "</b><span>" + c.blurb + "</span></button>";
  }
  return html + "</div>";
}

export function showMenu() {
  overlay.style.display = "flex";
  overlay.innerHTML =
    "<h1>George Boole Simulator</h1>" +
    "<p>You are instacarting. Collect everything on the list that the customer wants and bag it all at the checkout counter before the store closes. Evil george Booles will stop you.</p>" +
    "<p><b>Pick how you carry things:</b></p>" + classCards() +
    "<p class='keys'>WASD move &nbsp;|&nbsp; mouse aim &nbsp;|&nbsp; click or space attack &nbsp;|&nbsp; right click or F free hand &nbsp;|&nbsp; E pick up / use &nbsp;|&nbsp; Q drop &nbsp;|&nbsp; P pause</p>";
}

export function showPause(on) {
  if (!on) {
    overlay.style.display = "none";
    return;
  }
  overlay.style.display = "flex";
  overlay.innerHTML = "<h2>Paused</h2><button class='btn' data-action='resume'>Resume</button>";
}

function bestKey(classKey) {
  return "boole_best_" + classKey;
}

export function showResult(r) {
  let best = 0;
  let newBest = false;
  try {
    best = Number(localStorage.getItem(bestKey(r.classKey))) || 0;
    if (r.won && r.total > best) {
      localStorage.setItem(bestKey(r.classKey), String(r.total));
      best = r.total;
      newBest = true;
    }
  } catch (e) {
    // storage can be blocked, the best score just will not be saved
  }
  overlay.style.display = "flex";
  overlay.innerHTML =
    "<h2>" + (r.won ? "Day complete" : "Day failed") + "</h2><p>" + r.reason + "</p>" +
    "<div class='sheet'>" +
    "<div><span>style</span><span>" + r.style + "</span></div>" +
    (r.won ? "<div><span>time bonus</span><span>+" + r.timeBonus + "</span></div><div><span>money spent</span><span>-" + r.spentPenalty + "</span></div>" : "") +
    "<div><span>wrong items</span><span>" + r.wrong + "</span></div>" +
    "<div><span>deals found</span><span>" + r.deals + "</span></div>" +
    "<div><span>shoppers beaten</span><span>" + r.kills + "</span></div>" +
    "<div><b>score</b><b>" + r.total + "</b></div>" +
    "<div><span>best with " + classes[r.classKey].name + "</span><span>" + best + (newBest ? " (new!)" : "") + "</span></div></div>" +
    "<div class='cards'><button class='btn' data-class='" + r.classKey + "'>Try again</button><button class='btn' data-action='menu'>Change loadout</button></div>";
}
