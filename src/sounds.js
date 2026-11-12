
//L- add the sounds here
export const sounds = {
    impact: new Audio("assets/sfx/impact.mp3"),
};

// Preload sounds
for (const sound of Object.values(sounds)) {
    sound.preload = "auto";
}

export function playSound(name, volume = 1) {
    const sound = sounds[name];
    if (!sound) return;

    sound.volume = volume;
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

export function stopSound(name) {
    const sound = sounds[name];
    if (!sound) return;

    sound.pause();
    sound.currentTime = 0;
}
//L- playSound("impact", 0.5); is an example