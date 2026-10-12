/* Star Maths: game flow, controls and heads up display.
   Rendering is handled by SM.Scene (PlayCanvas). This file holds the rules. */
(function (root) {
    'use strict';

    const Q = root.SM.Q, C = root.SM.C, Snd = root.SM.Audio, Scene = root.SM.Scene, THEMES = root.SM.THEMES;
    const $ = (id) => document.getElementById(id);
    const MISSION = 20;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const store = {
        get(k, d) { try { const v = localStorage.getItem('starmaths.' + k); return v === null ? d : v; } catch (e) { return d; } },
        set(k, v) { try { localStorage.setItem('starmaths.' + k, v); } catch (e) { /* ignore */ } }
    };

    const G = {
        state: 'boot',            // boot | menu | ready | play | paused | over
        prev: 'play',
        subj: Math.min(Q.SUBJECTS.length - 1, parseInt(store.get('subj', '0'), 10) || 0),
        level: clamp(parseInt(store.get('level', '0'), 10) || 0, 0, 4),
        t: 0, dist: 0, speed: 20,
        ship: { x: 0, y: 0, vx: 0, vy: 0, roll: 0, alive: true },
        gates: [], phase: 'idle', phaseT: 0,
        warnedLow: false, fuel: 100, score: 0, streak: 0, best: 0, qIdx: 0, correct: 0, wrong: 0, missed: [], q: null, lastText: '',
        shake: 0, readyT: 0, endT: 0, endKind: '', rollT: 0, rollCd: 0, lowT: 0,
        input: 'key', mx: 0.5, my: 0.5, outcome: null
    };
    root.SM.G = G;
    const keys = {};

    /* ---------- home screen ---------- */
    function buildMenu() {
        const cards = $('subjects');
        cards.innerHTML = '';
        Q.SUBJECTS.forEach((s, i) => {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'card'; b.dataset.i = i;
            b.innerHTML = `<span class="ic">${s.icon}</span><span>${s.name}</span>`;
            b.addEventListener('click', () => { Snd.init(); setSubject(i); Snd.blip(); });
            cards.appendChild(b);
        });
        const pills = $('levels');
        pills.innerHTML = '';
        Q.LEVELS.forEach((l, i) => {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'pill'; b.dataset.i = i;
            b.innerHTML = `<b>${i + 1}</b>${l.name}`;
            b.addEventListener('click', () => { Snd.init(); setLevel(i); Snd.blip(); });
            pills.appendChild(b);
        });
        refreshMenu();
    }

    const pad6 = (n) => String(Math.max(0, Math.floor(n))).padStart(6, '0');
    const hiKey = () => `hi.${Q.SUBJECTS[G.subj].id}.${G.level}`;

    function refreshMenu() {
        document.querySelectorAll('.card').forEach((el) => el.classList.toggle('on', +el.dataset.i === G.subj));
        document.querySelectorAll('.pill').forEach((el) => el.classList.toggle('on', +el.dataset.i === G.level));
        const L = Q.LEVELS[G.level];
        const sample = Q.SUBJECTS[G.subj].gen(G.level).text.replace('= ?', '= ?');
        const secs = ((C.SPAWN_D) / L.speed).toFixed(1);
        $('lvlinfo').innerHTML = `EXAMPLE: <b>${sample}</b><br>${secs} SECONDS PER GATE &nbsp;&bull;&nbsp; WRONG LOSES <b>${L.penalty}</b> FUEL &nbsp;&bull;&nbsp; RIGHT GAINS <b>${L.gain}</b>`;
        $('mHi').textContent = pad6(parseInt(store.get(hiKey(), '0'), 10) || 0);
        store.set('subj', G.subj); store.set('level', G.level);
        if (Scene.ready) Scene.setTheme(Q.SUBJECTS[G.subj].theme);
    }
    function setSubject(i) { G.subj = (i + Q.SUBJECTS.length) % Q.SUBJECTS.length; refreshMenu(); }
    function setLevel(i) { G.level = clamp(i, 0, 4); refreshMenu(); }

    function showMenu() {
        G.state = 'menu';
        ['hud', 'pause', 'result'].forEach((id) => $(id).classList.add('hidden'));
        $('menu').classList.remove('hidden');
        G.ship.alive = true; G.gates = []; G.pending = null;
        hideComms(); Scene.resetWingmen();
        refreshMenu();
        Snd.startMusic('menu', Q.SUBJECTS[G.subj].theme);
    }

    /* ---------- mission flow ---------- */
    function startMission() {
        Snd.init();
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        Object.assign(G, {
            warnedLow: false, fuel: 100, score: 0, streak: 0, best: 0, qIdx: 0, correct: 0, wrong: 0, missed: [], lastText: '', q: null,
            briefed: G.briefed, gates: [], phase: 'idle', phaseT: 0, shake: 0, endT: 0, endKind: '', rollT: 0, rollCd: 0, lowT: 0, outcome: null,
            state: 'ready', readyT: 4.1
        });
        G.ship.x = 0; G.ship.y = 0; G.ship.vx = 0; G.ship.vy = 0; G.ship.roll = 0; G.ship.alive = true;
        $('menu').classList.add('hidden');
        $('result').classList.add('hidden');
        $('pause').classList.add('hidden');
        $('hud').classList.remove('hidden');
        $('hSubj').textContent = Q.SUBJECTS[G.subj].name + '  LV' + (G.level + 1);
        $('hQ').innerHTML = '&nbsp;';
        $('hQLabel').textContent = 'GET READY';
        $('hQBar').style.width = '0%';
        $('hMsg').className = 'msg';
        hideComms();
        Scene.resetWingmen();
        G.pending = null;
        updateHud(true);
        Snd.start();
        Snd.startMusic('play', Q.SUBJECTS[G.subj].theme);
        G.lastCount = 4;
    }

    function spawnQuestion() {
        const q = Q.nextQuestion(G.subj, G.level, G.lastText);
        G.lastText = q.text; G.q = q;
        const choices = Q.makeChoices(q);
        G.gates = choices.map((v, i) => ({
            active: true, lane: i, x: C.LANES[i], y: (Math.random() * 6 - 2.8),
            d: C.SPAWN_D, val: v, ok: v === q.ans, state: 'idle', t: 0
        }));
        G.qIdx++;
        G.phase = 'approach'; G.phaseT = 0;
        $('hQ').textContent = q.text;
        $('hQLabel').textContent = Q.SUBJECTS[G.subj].id === 'mis' ? 'FIND THE MISSING NUMBER' : 'FLY THROUGH THE ANSWER';
        fitQuestion();
        updateHud(true);
    }

    function fitQuestion() {
        const el = $('hQ');
        el.style.fontSize = '';
        const panel = el.parentElement;
        let guard = 0;
        while (el.scrollWidth > panel.clientWidth - 2 && guard++ < 10) {
            el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * 0.9) + 'px';
        }
    }

    /* Wingmen fly in beside the player, give advice over comms, then boost away. */
    const WING_COL = { SPARK: '#10c9b4', NOVA: '#a58bff', ORBIT: '#ff9a3a' };
    function hideComms() { $('hComms').classList.remove('on'); }
    function advise(text, prio) {
        if (G.state !== 'play' && G.state !== 'ready') return;
        if (Scene.wingBusy) { if (prio) G.pending = { text, prio }; return; }
        G.wingIdx = ((G.wingIdx === undefined ? -1 : G.wingIdx) + 1 + (Math.random() < 0.4 ? 1 : 0)) % 3;
        const idx = G.wingIdx, name = Scene.wingName(idx);
        const hold = clamp(2.2 + text.length * 0.042, 3, 7.5);
        Scene.callWingman(idx, hold, {
            onArrive() { Snd.flyIn(); },
            onHold() {
                const c = $('hComms');
                c.style.setProperty('--wc', WING_COL[name]);
                $('hCallsign').textContent = name + ' ON COMMS';
                $('hCommsText').textContent = text;
                c.classList.add('on');
                Snd.comm();
            },
            onLeave() { hideComms(); Snd.flyOut(); }
        }, G.ship.x);
    }

    function banner(text, sub, kind) {
        const m = $('hMsg');
        m.className = 'msg';
        void m.offsetWidth;
        m.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
        m.className = 'msg ' + kind;
    }
    function flash(kind) {
        const f = $('flash');
        f.className = '';
        void f.offsetWidth;
        f.className = kind;
    }

    function resolveGates() {
        const L = Q.LEVELS[G.level];
        const s = G.ship;
        let hit = null, hitD = 1e9;
        for (const g of G.gates) {
            const d = Math.hypot(s.x - g.x, s.y - g.y);
            if (d <= C.GATE_R + 0.45 && d < hitD) { hit = g; hitD = d; }
        }
        const right = G.gates.find((g) => g.ok);
        G.phase = 'resolve'; G.phaseT = 0;
        const px = s.x, py = s.y;

        if (hit && hit.ok) {
            const rolled = G.rollT > 0;
            const pts = Math.round((100 + Math.min(G.streak, 10) * 20) * (1 + G.level * 0.25)) + (rolled ? 50 : 0);
            G.score += pts; G.streak++; G.best = Math.max(G.best, G.streak); G.correct++;
            G.fuel = Math.min(100, G.fuel + L.gain);
            G.gates.forEach((g) => { g.state = g === hit ? 'ok' : 'dim'; });
            Scene.burst('good', px, py, 0);
            Snd.good(G.streak);
            flash('good');
            banner('CORRECT!', `+${pts} POINTS &nbsp; +${L.gain} FUEL${rolled ? ' &nbsp; ROLL BONUS' : ''}`, 'good');
            if (G.streak === 5 || G.streak === 10 || G.streak === 15) advise(`${G.streak} in a row! You are flying like an ace. Keep it up!`);
            else if (Math.random() < 0.14) advise(Q.TIPS[(Math.random() * Q.TIPS.length) | 0]);
        } else {
            const missedAll = !hit;
            G.fuel = Math.max(0, G.fuel - L.penalty);
            G.streak = 0; G.wrong++;
            G.missed.push(G.q.eq);
            G.gates.forEach((g) => { g.state = g === hit ? 'bad' : g.ok ? 'reveal' : 'dim'; });
            Scene.burst('bad', px, py, 0);
            G.shake = 1;
            missedAll ? Snd.miss() : Snd.bad();
            flash('bad');
            banner(missedAll ? 'MISSED THE GATES!' : 'WRONG ANSWER!', `${G.q.eq} &nbsp; -${L.penalty} FUEL`, 'bad');
            advise((missedAll ? 'You flew past all three gates! ' : 'Not that one! ') + G.q.eq + '. ' + Q.hintFor(G.q), true);
            if (right) right.t = 0;
        }
        updateHud(true);

        if (G.fuel <= 0) {
            G.outcome = 'dead';
            G.endT = 0.9;
        } else if (G.qIdx >= MISSION) {
            G.outcome = 'win';
            G.endT = 2.0;
        }
    }

    function die() {
        G.state = 'dying';
        hideComms();
        G.ship.alive = false;
        G.shake = 1.6;
        Scene.burst('boom', G.ship.x, G.ship.y, 0);
        Snd.explode();
        flash('bad');
        G.endT = 2.1;
    }

    function finish(win) {
        G.state = 'over';
        hideComms();
        Snd.stopMusic();
        if (win) { Snd.win(); G.score += Math.round(G.fuel) * 10; } else Snd.lose();
        const key = hiKey();
        const old = parseInt(store.get(key, '0'), 10) || 0;
        const isNew = G.score > old && G.score > 0;
        if (isNew) store.set(key, String(Math.floor(G.score)));
        const total = G.correct + G.wrong;
        const acc = total ? Math.round(G.correct / total * 100) : 0;
        $('hud').classList.add('hidden');
        $('rTitle').textContent = win ? 'MISSION COMPLETE' : 'OUT OF FUEL';
        $('rRank').textContent = win ? (acc >= 95 ? 'S' : acc >= 85 ? 'A' : acc >= 70 ? 'B' : 'C') : `${G.correct}/${MISSION}`;
        $('rScore').textContent = pad6(G.score);
        $('rAcc').textContent = acc + '%';
        $('rStreak').textContent = G.best;
        $('rFuel').textContent = Math.round(G.fuel);
        $('rNew').classList.toggle('hidden', !isNew);
        const m = $('rMissed');
        if (G.missed.length) {
            const list = [...new Set(G.missed)].slice(0, 6);
            m.innerHTML = '<b>TRICKY ONES TO PRACTISE</b>' + list.join(' &nbsp;&bull;&nbsp; ');
        } else {
            m.innerHTML = win ? '<b>PERFECT RUN! NO MISTAKES</b>' : '';
        }
        $('result').classList.remove('hidden');
    }

    function pause() {
        if (G.state !== 'play' && G.state !== 'ready') return;
        G.prev = G.state; G.state = 'paused';
        $('pause').classList.remove('hidden');
    }
    function resume() {
        if (G.state !== 'paused') return;
        G.state = G.prev;
        $('pause').classList.add('hidden');
    }

    /* ---------- heads up display ---------- */
    const last = {};
    function setText(id, v) { if (last[id] !== v) { last[id] = v; $(id).textContent = v; } }
    function updateHud(force) {
        setText('hScore', pad6(G.score));
        setText('hGate', `GATE ${String(Math.min(G.qIdx, MISSION)).padStart(2, '0')}/${MISSION}`);
        setText('hStreak', G.streak >= 2 ? `STREAK x${G.streak}` : '');
        const f = Math.round(G.fuel);
        setText('hFuelNum', String(f));
        $('hFuelBar').style.width = clamp(G.fuel, 0, 100) + '%';
        const fe = $('fuel');
        fe.classList.toggle('low', G.fuel <= 25);
        fe.classList.toggle('mid', G.fuel > 25 && G.fuel <= 50);
    }

    /* ---------- per frame ---------- */
    function steer(dt) {
        const s = G.ship;
        const ox = s.x, oy = s.y;
        if (G.input === 'mouse') {
            const tx = (G.mx - 0.5) * 2 * C.XMAX * 1.05;
            const ty = C.YMAX - clamp(G.my, 0, 1) * (C.YMAX - C.YMIN);
            const k = 1 - Math.exp(-9 * dt);
            s.x += (clamp(tx, -C.XMAX, C.XMAX) - s.x) * k;
            s.y += (clamp(ty, C.YMIN, C.YMAX) - s.y) * k;
            s.vx = (s.x - ox) / dt; s.vy = (s.y - oy) / dt;
        } else {
            const dx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
            const dy = (keys.ArrowUp || keys.KeyW ? 1 : 0) - (keys.ArrowDown || keys.KeyS ? 1 : 0);
            const k = 1 - Math.exp(-8 * dt);
            s.vx += (dx * 15 - s.vx) * k;
            s.vy += (dy * 11 - s.vy) * k;
            s.x = clamp(s.x + s.vx * dt, -C.XMAX, C.XMAX);
            s.y = clamp(s.y + s.vy * dt, C.YMIN, C.YMAX);
            if ((s.x === C.XMAX && s.vx > 0) || (s.x === -C.XMAX && s.vx < 0)) s.vx = 0;
            if ((s.y === C.YMAX && s.vy > 0) || (s.y === C.YMIN && s.vy < 0)) s.vy = 0;
        }
    }

    function doRoll() {
        if ((G.state !== 'play' && G.state !== 'ready') || G.rollT > 0 || G.rollCd > 0) return;
        G.rollT = 0.7; G.rollCd = 1.0;
        Snd.roll();
        Scene.burst('roll', G.ship.x, G.ship.y, 0);
    }

    function tick(dt) {
        if (!Scene.ready || G.state === 'boot') return;
        const paused = G.state === 'paused';
        if (!paused) G.t += dt;
        const L = Q.LEVELS[G.level];

        // forward speed
        let target = 22;
        if (G.state === 'play') target = L.speed * (1 + 0.012 * Math.min(G.qIdx, MISSION));
        else if (G.state === 'dying') target = 6;
        else if (G.state === 'over') target = 10;
        if (paused) target = 0;
        G.speed += (target - G.speed) * Math.min(1, dt * 3);
        if (paused) G.speed = 0;
        const sdt = paused ? 0 : dt;
        G.dist += G.speed * sdt;

        // ship
        const s = G.ship;
        if (G.state === 'menu' || G.state === 'over') {
            const ox = s.x, oy = s.y;
            s.x = Math.sin(G.t * 0.55) * 6.5; s.y = 0.6 + Math.sin(G.t * 0.8) * 2.4;
            s.vx = (s.x - ox) / Math.max(dt, 1e-3); s.vy = (s.y - oy) / Math.max(dt, 1e-3);
        } else if ((G.state === 'ready' || G.state === 'play') && !paused) {
            steer(dt);
        } else if (G.state === 'dying') { s.vx = 0; s.vy = 0; }
        if (G.rollT > 0) { G.rollT = Math.max(0, G.rollT - sdt); s.roll = G.rollT > 0 ? 1 - G.rollT / 0.7 : 0; } else s.roll = 0;
        if (G.rollCd > 0) G.rollCd -= sdt;
        G.shake = Math.max(0, G.shake - sdt * 2.2);

        // state logic
        if (G.state === 'ready') {
            G.readyT -= dt;
            const n = Math.ceil(G.readyT - 0.6);
            const r = $('hReady');
            if (G.readyT > 0.6) {
                if (n !== G.lastCount) { G.lastCount = n; Snd.count(); }
                const txt = String(n);
                if (last.ready !== txt) {
                    last.ready = txt;
                    r.className = 'ready';
                    r.innerHTML = txt + '<small>STEER WITH ARROWS, WASD OR THE MOUSE<br>SPACE OR CLICK TO BARREL ROLL</small>';
                }
            } else if (G.readyT > 0) {
                if (last.ready !== 'GO') { last.ready = 'GO'; Snd.go(); r.className = 'ready go'; r.innerHTML = 'GO!'; }
            } else {
                last.ready = ''; r.innerHTML = ''; r.className = 'ready';
                G.state = 'play';
                spawnQuestion();
                if (!G.briefed) { G.briefed = true; advise('Fly through the gate with the right answer. Press space or click for a barrel roll. Roll through the right gate for bonus points!', true); }
            }
        } else if (G.state === 'play' && !paused) {
            for (const g of G.gates) {
                g.d -= G.speed * dt;
                if (g.state !== 'idle') g.t = Math.min(1, g.t + dt / 0.9);
            }
            if (G.phase === 'approach') {
                const d = G.gates[0].d;
                $('hQBar').style.width = clamp((1 - d / C.SPAWN_D) * 100, 0, 100) + '%';
                if (d <= 0) resolveGates();
            } else if (G.phase === 'resolve') {
                G.phaseT += dt;
                $('hQBar').style.width = '100%';
                const hold = G.outcome ? G.endT : (G.level >= 3 ? 1.0 : 1.3);
                if (G.phaseT >= hold) {
                    if (G.outcome === 'dead') die();
                    else if (G.outcome === 'win') { finish(true); }
                    else spawnQuestion();
                }
            }
            if (G.fuel <= 25 && G.fuel > 0) {
                G.lowT -= dt;
                if (G.lowT <= 0) { G.lowT = 1.1; Snd.lowFuel(); if (!G.warnedLow) { G.warnedLow = true; advise('Fuel is getting low. Read the question, work it out, then pick your gate.'); } }
            }
        } else if (G.state === 'dying') {
            G.endT -= dt;
            for (const g of G.gates) { g.d -= G.speed * dt; if (g.state !== 'idle') g.t = Math.min(1, g.t + dt / 0.9); }
            if (G.endT <= 0) finish(false);
        }

        if (G.pending && !Scene.wingBusy && G.state === 'play') { const p = G.pending; G.pending = null; advise(p.text, true); }
        if (G.state === 'play' || G.state === 'ready') updateHud();

        Scene.frame({
            ship: { x: s.x, y: s.y, vx: s.vx, vy: s.vy, roll: s.roll, alive: s.alive },
            gates: G.gates, speed: G.speed, dist: G.dist, shake: G.shake * 0.5
        }, sdt || 0);
    }

    /* ---------- input ---------- */
    const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter']);
    window.addEventListener('keydown', (e) => {
        Snd.init();
        if (G.state === 'boot') return;
        if (GAME_KEYS.has(e.code)) e.preventDefault();
        if (e.repeat && e.code !== 'ArrowLeft' && e.code !== 'ArrowRight' && e.code !== 'ArrowUp' && e.code !== 'ArrowDown') return;
        keys[e.code] = true;
        if (e.code === 'KeyM') return toggleMute();
        if (e.code === 'KeyF') return toggleFull();

        switch (G.state) {
            case 'menu':
                if (e.code === 'ArrowLeft') { setSubject(G.subj - 1); Snd.blip(); }
                else if (e.code === 'ArrowRight') { setSubject(G.subj + 1); Snd.blip(); }
                else if (e.code === 'ArrowUp') { setLevel(G.level - 1); Snd.blip(); }
                else if (e.code === 'ArrowDown') { setLevel(G.level + 1); Snd.blip(); }
                else if (e.code === 'Enter' || e.code === 'Space') startMission();
                break;
            case 'ready':
            case 'play':
                if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'ArrowUp' || e.code === 'ArrowDown' ||
                    e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD') G.input = 'key';
                if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'KeyZ') doRoll();
                if (e.code === 'Escape' || e.code === 'KeyP') pause();
                break;
            case 'paused':
                if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Enter' || e.code === 'Space') resume();
                break;
            case 'over':
                if (e.code === 'Enter' || e.code === 'Space') startMission();
                else if (e.code === 'Escape') showMenu();
                break;
            default:
        }
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; pause(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

    const stage = $('stage'), view = $('view');
    stage.addEventListener('pointermove', (e) => {
        const r = view.getBoundingClientRect();
        G.mx = (e.clientX - r.left) / r.width;
        G.my = (e.clientY - r.top) / r.height;
        if (G.state === 'ready' || G.state === 'play') G.input = 'mouse';
    });
    stage.addEventListener('pointerdown', (e) => {
        Snd.init();
        if (e.target.closest('button')) return;
        const r = view.getBoundingClientRect();
        G.mx = (e.clientX - r.left) / r.width;
        G.my = (e.clientY - r.top) / r.height;
        if (G.state === 'ready' || G.state === 'play') { if (e.pointerType === 'touch') G.input = 'mouse'; doRoll(); }
    });

    function toggleMute() {
        Snd.setMuted(!Snd.muted);
        $('bMute').classList.toggle('muted', Snd.muted);
    }
    function toggleFull() {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (stage.requestFullscreen) stage.requestFullscreen().catch(() => { /* ignore */ });
    }

    $('start').addEventListener('click', startMission);
    $('bResume').addEventListener('click', resume);
    $('bQuit').addEventListener('click', () => { $('pause').classList.add('hidden'); Snd.stopMusic(); showMenu(); });
    $('bRetry').addEventListener('click', startMission);
    $('bMenu').addEventListener('click', showMenu);
    $('bMute').addEventListener('click', toggleMute);
    $('bPause').addEventListener('click', () => (G.state === 'paused' ? resume() : pause()));
    $('bFull').addEventListener('click', toggleFull);
    $('bMute').classList.toggle('muted', Snd.muted);

    /* ---------- boot ---------- */
    buildMenu();
    Scene.init($('view')).then(() => {
        Scene.onUpdate((dt) => tick(Math.min(dt, 0.05)));
        $('boot').classList.add('hidden');
        showMenu();
    }).catch((err) => {
        console.error(err);
        $('boot').classList.add('hidden');
        $('fail').classList.remove('hidden');
    });
})(window);
