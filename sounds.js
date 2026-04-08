/**
 * sounds.js
 * Procedural sound effects via the Web Audio API.
 * No external audio files needed.
 */

const Sounds = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctx;
  }

  function playTone({ type = 'sine', freq = 440, duration = 0.12, gain = 0.18, ramp = true } = {}) {
    if (!enabled) return;
    try {
      const ac = getCtx();
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.connect(g);
      g.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      if (ramp) osc.frequency.exponentialRampToValueAtTime(freq * 0.85, ac.currentTime + duration);
      g.gain.setValueAtTime(gain, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + duration);
    } catch (e) { /* silent fail */ }
  }

  return {
    click() {
      playTone({ type: 'triangle', freq: 520, duration: 0.08, gain: 0.14 });
    },

    placeX() {
      playTone({ type: 'square', freq: 380, duration: 0.1, gain: 0.1 });
    },

    placeO() {
      playTone({ type: 'sine', freq: 480, duration: 0.1, gain: 0.12 });
    },

    win() {
      if (!enabled) return;
      try {
        const ac = getCtx();
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
          const osc = ac.createOscillator();
          const g = ac.createGain();
          osc.connect(g);
          g.connect(ac.destination);
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const start = ac.currentTime + i * 0.1;
          g.gain.setValueAtTime(0, start);
          g.gain.linearRampToValueAtTime(0.18, start + 0.03);
          g.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
          osc.start(start);
          osc.stop(start + 0.25);
        });
      } catch (e) {}
    },

    draw() {
      if (!enabled) return;
      try {
        const ac = getCtx();
        [300, 250, 220].forEach((freq, i) => {
          const osc = ac.createOscillator();
          const g = ac.createGain();
          osc.connect(g);
          g.connect(ac.destination);
          osc.type = 'sawtooth';
          osc.frequency.value = freq;
          const start = ac.currentTime + i * 0.12;
          g.gain.setValueAtTime(0.1, start);
          g.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
          osc.start(start);
          osc.stop(start + 0.25);
        });
      } catch (e) {}
    },

    toggle(val) { enabled = val; }
  };
})();
