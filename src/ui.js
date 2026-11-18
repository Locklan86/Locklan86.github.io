
import { classes } from "./config.js";

const overlay = document.getElementById("overlay");

let onPick = null;
let onResume = null;

// Title screen destinations
let titleActions = {};

export function setupUi(pickHandler, resumeHandler) {
  onPick = pickHandler;
  onResume = resumeHandler;


  overlay.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.class) {
      overlay.style.display = "none";
      onPick(button.dataset.class);
    } else if (button.dataset.action === "menu") {
      showMenu();
    } else if (button.dataset.action === "resume") {
      onResume();
    } else if (button.dataset.action === "title") {
      showTitle();
    } else if (button.dataset.titleAction) {
      const action = button.dataset.titleAction;
      titleActions[action]?.();
    }
  });
}

// Configure the four title screen buttons
export function setupTitleActions(actions) {
  titleActions = actions;
}

// TITLE SCREEN
export function showTitle() {
  overlay.style.display = "flex";

  overlay.innerHTML =
    "<h1>George Boole Simulator</h1>" +
    "<div class='title-buttons'>" +
      "<button class='btn' data-title-action='start'>Start New Run</button>" +
      "<button class='btn' data-title-action='button2'>Tutorial/Game mechanics</button>" +
      "<button class='btn' data-title-action='button3'>CREDITS</button>" +
    "</div>";
}

// CLASS SELECTION
function classCards() {
  let html = "<div class='cards'>";

  for (const key in classes) {
    const c = classes[key];

    html +=
      "<button class='card' data-class='" + key + "'>" +
        "<img src='assets/" + c.icon + ".png' alt=''>" +
        "<b>" + c.name + "</b>" +
        "<span>" + c.blurb + "</span>" +
      "</button>";
  }

  return html + "</div>";
}

export function showMenu() {
  overlay.style.display = "flex";

  overlay.innerHTML =
    "<h1>George Boole Simulator</h1>" +
    "<p>You are instacarting. Collect everything on the list that the customer wants and bag it all at the checkout counter before the store closes. There are clones of george booles that caught rabies though, so watch out.</p>" +
    "<p><b>Pick how you carry things:</b></p>" +
    classCards() +
    "<p class='keys'>WASD move &nbsp;|&nbsp; mouse to aim &nbsp;|&nbsp; click or space attack &nbsp;|&nbsp; right click or F uses alternate weapon &nbsp;|&nbsp; E pick up / use &nbsp;|&nbsp; Q drop</p>";
}

// PLACEHOLDER TITLE DESTINATIONS

export function showButton2Page() {
  showPlaceholderPage1("Tutorial");
}

export function showButton3Page() {
  showPlaceholderPage2("Credits");
}

function showPlaceholderPage1(name) {
  overlay.style.display = "flex";

  overlay.innerHTML =
    "<h1>" + name + "</h1>" +
    "<h2>Q to drop items | E to drop Cart | WASD to move | Mouse/touchpad to aim | Holding tab makes scrol visible | Tab toggles Scroll | Space/left click and F/Right click to attack</h2>" +
    "<h2>Buy and checkout all of the items on the list to win. Items have temperature, they cool in the freezer section, warm in the bakery section, in the candy aisles and checkout they do not change, anywhere else they go down to lukewarm</h2>" +
    "<h2>You can be lazy and not meet the correct type of item, or their weight. But it does count against accuracy.</p>" +
    "<button class='btn' data-action='title'>Back to Title</button>";
}
function showPlaceholderPage2(name) {
  overlay.style.display = "flex";

  overlay.innerHTML =
    "<h1>" + name + "</h1>" +
    "<h2>Music and orginal Game code- Asa (visit his youtube at asadirectly for ost) Sprite design, MOST Ideas, and New updates- Locklan</h2>" +
    "<button class='btn' data-action='title'>Back to Title</button>";
}
// PAUSE SCREEN
export function showPause(on) {
  if (!on) {
    overlay.style.display = "none";
    return;
  }

  overlay.style.display = "flex";

  overlay.innerHTML =
    "<h2>Paused</h2>" +
    "<button class='btn' data-action='resume'>Resume</button>";
}

// RESULTS SCREEN
function bestKey(classKey) {
  return "boole_best_" + classKey;
}
export  function getRankClass(rank) {
  if (rank === "S+") return "rank-splus";
  if (rank === "S") return "rank-s";
  if (rank === "A") return "rank-a";
  if (rank === "B") return "rank-b";
  if (rank === "C") return "rank-c";
  if (rank === "D") return "rank-d";
  if (rank === "F") return "rank-f";

  return "";
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
    // Storage can be blocked
  }

  const bonuses = r.groceryBonuses || {};

  overlay.style.display = "flex";

  overlay.innerHTML =
    "<h2>" + (r.won ? "Day complete" : "Day failed") + "</h2>" +
    "<p>" + r.reason + "</p>" +
    
    "<div class='rank-display " + getRankClass(r.rank) + "'>" +
  "<span>YOUR RANK: </span><b>" + r.rank + "(" + r.total + ")" + "</b>" +
"</div>" +

    "<div class='sheet'>" +
    "<div><span>style</span><span>" + r.style + "</span></div>" +

    (r.won ?
      "<div><span>time bonus</span><span>+" + r.timeBonus + "</span></div>" +
      "<div><span>correct temperatures</span><span>+" + (bonuses.temperaturePoints || 0) + "</span></div>" +
      "<div><span>correct variants</span><span>+" + (bonuses.variantPoints || 0) + "</span></div>" +
      "<div><span>correct weights</span><span>+" + (bonuses.weightPoints || 0) + "</span></div>" +
      "<div><span>perfect temperatures</span><span>+" + (bonuses.perfectTemperatureBonus || 0) + "</span></div>" +
      "<div><span>complete accuracy</span><span>+" + (bonuses.completeAccuracyBonus || 0) + "</span></div>" +
      "<div><span>money spent</span><span>-" + r.spentPenalty + "</span></div>"
      : "") +

    "<div><span>wrong items</span><span>" + r.wrong + "</span></div>" +
    "<div><span>deals found</span><span>" + r.deals + "</span></div>" +
    "<div><span>Booles beaten</span><span>" + r.kills + "</span></div>" +
    "<div><b>score</b><b>" + r.total + "</b></div>" +
    "<div><span>best with " + classes[r.classKey].name + "</span><span>" +
    best + (newBest ? " (new!)" : "") + "</span></div>" +
    "</div>" +

    "<div class='cards'>" +
    "<button class='btn' data-class='" + r.classKey + "'>Try again</button>" +
    "<button class='btn' data-action='menu'>Change loadout</button>" +
    "</div>";
}
