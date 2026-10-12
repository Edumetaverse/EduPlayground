/* Star Maths: synthesised sound effects and a small looping soundtrack (WebAudio, no files). */
(function (root) {
    'use strict';

    let ac = null, master, mus, sfx, noiseBuf;
    let muted = false;
    let timer = null, step = 0, nextT = 0, bpm = 120, mode = 'menu', themeIdx = 0;

    try { muted = localStorage.getItem('starmaths.mute') === '1'; } catch (e) { /* storage unavailable */ }

    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const ROOTS = [57, 55, 52, 53, 50, 59];          // per stage, MIDI note of the key centre
    const BARS = [0, -4, -2, -5];                    // simple four bar progression
    const ARP = [0, 7, 12, 19, 12, 7, 15, 7];
    const LEAD = [12, -1, 14, -1, 16, -1, 19, -1, 16, -1, 14, -1, 12, -1, -1, -1];

    function init() {
        if (ac) {
            if (ac.state === 'suspended') ac.resume();
            return;
        }
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return;
        ac = new C();
        master = ac.createGain();
        master.gain.value = muted ? 0 : 0.9;
        master.connect(ac.destination);
        mus = ac.createGain(); mus.gain.value = 0.15; mus.connect(master);
        sfx = ac.createGain(); sfx.gain.value = 0.55; sfx.connect(master);
        noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }

    function tone(f, dur, type, vol, delay, slideTo, dest) {
        if (!ac) return;
        const t = ac.currentTime + (delay || 0);
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type || 'square';
        o.frequency.setValueAtTime(f, t);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(dest || sfx);
        o.start(t); o.stop(t + dur + 0.03);
    }

    function noise(dur, vol, f0, f1, delay) {
        if (!ac) return;
        const t = ac.currentTime + (delay || 0);
        const s = ac.createBufferSource(); s.buffer = noiseBuf;
        const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
        f.frequency.setValueAtTime(f0, t);
        f.frequency.exponentialRampToValueAtTime(f1, t + dur);
        const g = ac.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f); f.connect(g); g.connect(sfx);
        s.start(t); s.stop(t + dur + 0.03);
    }

    function playStep(s, t) {
        const bar = Math.floor(s / 16) % 4, i = s % 16;
        const root = ROOTS[themeIdx] + BARS[bar];
        const at = (t - ac.currentTime);
        if (i % 2 === 0) tone(mtof(root - 24), 0.2, 'sawtooth', 0.55, at, null, mus);
        tone(mtof(root + ARP[i % 8]), 0.12, 'square', 0.2, at, null, mus);
        if (mode === 'play' && (bar === 1 || bar === 3)) {
            const n = LEAD[i];
            if (n >= 0) tone(mtof(root + 12 + n), 0.3, 'triangle', 0.5, at, null, mus);
        }
        if (mode === 'play' && i % 4 === 0) noise(0.05, 0.14, 6000, 3000, at);
    }

    function pump() {
        if (!ac || muted) return;
        const sd = 60 / bpm / 4;
        if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
        while (nextT < ac.currentTime + 0.2) {
            playStep(step, nextT);
            nextT += sd;
            step = (step + 1) % 64;
        }
    }

    function startMusic(m, theme) {
        mode = m; themeIdx = theme || 0;
        bpm = m === 'play' ? 138 : 112;
        if (!ac) return;
        if (!timer) timer = setInterval(pump, 50);
    }
    function stopMusic() {
        if (timer) { clearInterval(timer); timer = null; }
    }
    function setMuted(v) {
        muted = v;
        try { localStorage.setItem('starmaths.mute', v ? '1' : '0'); } catch (e) { /* ignore */ }
        if (master) master.gain.value = v ? 0 : 0.9;
    }

    root.SM = root.SM || {};
    root.SM.Audio = {
        init, startMusic, stopMusic, setMuted,
        get muted() { return muted; },
        blip() { tone(880, 0.06, 'square', 0.3); },
        select() { tone(660, 0.05, 'square', 0.25); tone(990, 0.07, 'square', 0.25, 0.05); },
        start() { tone(220, 0.5, 'sawtooth', 0.3, 0, 880); noise(0.5, 0.25, 400, 5000); },
        count() { tone(520, 0.12, 'square', 0.3); },
        go() { tone(1040, 0.35, 'square', 0.3); },
        roll() { noise(0.45, 0.35, 700, 3200); },
        flyIn() { noise(1.1, 0.4, 400, 3600); tone(180, 1.1, 'sawtooth', 0.12, 0, 520); },
        flyOut() { noise(1.3, 0.45, 3800, 240); tone(420, 1.2, 'sawtooth', 0.14, 0, 90); },
        comm() { tone(1320, 0.05, 'square', 0.2); tone(1760, 0.07, 'square', 0.2, 0.07); },
        good(streak) {
            const b = 660 * Math.pow(1.0595, Math.min(streak || 0, 8));
            tone(b, 0.1, 'square', 0.3);
            tone(b * 1.26, 0.1, 'square', 0.3, 0.08);
            tone(b * 1.5, 0.22, 'square', 0.3, 0.16);
        },
        bad() { tone(180, 0.4, 'sawtooth', 0.45, 0, 60); noise(0.4, 0.5, 1800, 120); },
        miss() { tone(300, 0.3, 'triangle', 0.4, 0, 120); },
        lowFuel() { tone(1200, 0.08, 'square', 0.25); tone(1200, 0.08, 'square', 0.25, 0.14); },
        explode() { noise(1.2, 0.8, 1500, 60); tone(120, 1, 'sawtooth', 0.4, 0, 30); },
        win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.18, 'square', 0.3, i * 0.14)); },
        lose() { [440, 370, 311, 220].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.3, i * 0.22)); }
    };
})(window);
