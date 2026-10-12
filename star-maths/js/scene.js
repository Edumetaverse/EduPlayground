/* Star Maths: 3D rendering layer, built on the PlayCanvas engine (see lib/).
   This file only draws. It reads a plain "view" object from the game each frame:

   view = {
     ship:  { x, y, vx, vy, roll (barrel roll, 0 to 1), alive },
     gates: [{ active, x, y, d, val, state, t }]   d = distance ahead of the ship, state = idle | ok | bad | reveal | dim
     speed, dist, shake, lowFuel
   }
*/
(function (root) {
    'use strict';

    const pc = root.pc;

    const C = {
        GY: -8.5,            // ground height
        SHIP_Z: 0,           // the ship stays at z = 0, the world flows towards the camera
        SPAWN_D: 150,        // how far ahead gates appear
        GATE_R: 3.3,
        LANES: [-8, 0, 8],
        XMAX: 10.5, YMIN: -5, YMAX: 5.5,
        LANE_COL: ['#2ec8ff', '#ffd23f', '#ff5fb0']
    };

    /* ---------- stage themes ---------- */
    const THEMES = [
        {   // 0 azure: bright day over green plains and towers
            name: 'AZURE SECTOR', seed: 11,
            sky: ['#1743b8', '#4f93f0', '#bfe3ff'], below: ['#9ccf9a', '#1d5a38'],
            sun: { az: 28, el: 24, col: '#fff3c9', r: 90 }, clouds: 1, stars: 0,
            fog: '#bfe3ff', fogStart: 70, fogEnd: 330,
            ground: { a: '#237a45', b: '#2c9556', line: '#a8ffd0', lineI: 0.35 },
            scenery: 'towers', body: '#c9d2e4', band: '#58d0ff', bandI: 1.6,
            key: '#fff1d6', keyI: 2.4, bloom: 0.04
        },
        {   // 1 frost: pale ice world with crystal spires
            name: 'FROST SECTOR', seed: 23,
            sky: ['#274c99', '#7fb4f0', '#e6f5ff'], below: ['#e8f6ff', '#b6d9f0'],
            sun: { az: -30, el: 18, col: '#ffffff', r: 70 }, clouds: 1, stars: 0,
            fog: '#e6f5ff', fogStart: 60, fogEnd: 300,
            ground: { a: '#dff2ff', b: '#c3e2f6', line: '#7fd6ff', lineI: 0.5 },
            scenery: 'spires', body: '#b9dcf5', band: '#8fe3ff', bandI: 1.0,
            key: '#f2f8ff', keyI: 2.6, bloom: 0.05
        },
        {   // 2 asteroid belt: deep space and rocks
            name: 'ASTEROID BELT', seed: 37,
            sky: ['#02030d', '#0a0b2a', '#241347'], below: ['#1a0f38', '#05030f'],
            sun: null, planet: { az: -35, el: 14, col: '#d7743c', r: 230 }, clouds: 0, stars: 1,
            nebula: [['#7a2cc0', 0.5, 40, 12], ['#1f64d8', 0.4, -80, 30], ['#d8307a', 0.3, 130, -8]],
            fog: '#120a2c', fogStart: 90, fogEnd: 360,
            ground: null,
            scenery: 'rocks', body: '#8c8279', band: '#ffb070', bandI: 0.8,
            key: '#ffe9d0', keyI: 2.8, bloom: 0.05
        },
        {   // 3 crimson canyon: red sky, dark ground, glowing lava lines
            name: 'CRIMSON CANYON', seed: 41,
            sky: ['#1c0505', '#8a1e12', '#ff8a3a'], below: ['#ff7a2a', '#2a0a08'],
            sun: { az: 10, el: 8, col: '#ffd9a0', r: 140 }, clouds: 0, stars: 0, smoke: 1,
            fog: '#c04a1c', fogStart: 55, fogEnd: 280,
            ground: { a: '#2c0f0c', b: '#3a1612', line: '#ff7a2a', lineI: 1.6 },
            scenery: 'spires', body: '#4a1c16', band: '#ff6a1c', bandI: 2.0,
            key: '#ffcfa0', keyI: 2.2, bloom: 0.07
        },
        {   // 4 neon: synthwave grid
            name: 'NEON NEBULA', seed: 53,
            sky: ['#0a0030', '#4a0f8a', '#ff4fa8'], below: ['#c0307a', '#12002e'],
            sun: { az: 0, el: 6, col: '#ffe36b', r: 170 }, clouds: 0, stars: 1,
            nebula: [['#00e5ff', 0.22, -60, 40], ['#ff2fa0', 0.3, 80, 20]],
            fog: '#6a1a9a', fogStart: 70, fogEnd: 320,
            ground: { a: '#14003a', b: '#1c0650', line: '#27e8ff', lineI: 2.4 },
            scenery: 'towers', body: '#251060', band: '#ff35b0', bandI: 2.6,
            key: '#ffd0f0', keyI: 2.0, bloom: 0.09
        },
        {   // 5 sunset ridge: warm dusk with crystals
            name: 'SUNSET RIDGE', seed: 67,
            sky: ['#3a2a8c', '#d8628a', '#ffc27a'], below: ['#f5a45a', '#5a2a22'],
            sun: { az: -12, el: 7, col: '#fff0b0', r: 160 }, clouds: 1, stars: 0,
            fog: '#f5b37a', fogStart: 60, fogEnd: 300,
            ground: { a: '#7a3d28', b: '#8e4a30', line: '#ffd08a', lineI: 0.5 },
            scenery: 'crystals', body: '#7b4a8c', band: '#7af0ff', bandI: 1.8,
            key: '#ffd9a8', keyI: 2.5, bloom: 0.06
        }
    ];

    const S = {
        ready: false, app: null, device: null, theme: -1,
        time: 0, camX: 0, camY: 0, fpsAcc: 0, fpsN: 0, quality: 2
    };

    // ?q=0 (low), ?q=1 (medium) or ?q=2 (high, the default). The game also steps down by itself if the frame rate drops.
    const qParam = parseInt(new URLSearchParams(root.location.search).get('q'), 10);
    if (qParam >= 0 && qParam <= 2) S.quality = qParam;

    const col = (hex, k) => {
        const c = new pc.Color().fromString(hex);
        if (k) { c.r *= k; c.g *= k; c.b *= k; }
        return c;
    };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const rand = (a, b) => a + Math.random() * (b - a);

    function rng(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function makeTex(name, w, h, srgb, repeat, mips) {
        return new pc.Texture(S.device, {
            name, width: w, height: h,
            format: srgb ? pc.PIXELFORMAT_SRGBA8 : pc.PIXELFORMAT_RGBA8,
            mipmaps: mips !== false,
            minFilter: mips === false ? pc.FILTER_LINEAR : pc.FILTER_LINEAR_MIPMAP_LINEAR,
            magFilter: pc.FILTER_LINEAR,
            anisotropy: 8,
            addressU: repeat ? pc.ADDRESS_REPEAT : pc.ADDRESS_CLAMP_TO_EDGE,
            addressV: repeat ? pc.ADDRESS_REPEAT : pc.ADDRESS_CLAMP_TO_EDGE
        });
    }
    function newCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        return c;
    }

    function std(opts) {
        const m = new pc.StandardMaterial();
        m.useMetalness = true;
        Object.assign(m, opts);
        m.update();
        return m;
    }
    function glowMat(hex, intensity, extra) {
        return std(Object.assign({
            diffuse: new pc.Color(0, 0, 0), emissive: col(hex), emissiveIntensity: intensity,
            useFog: false
        }, extra));
    }
    function entityWith(mesh, mat, opts) {
        const e = new pc.Entity();
        e.addComponent('render', Object.assign({ meshInstances: [new pc.MeshInstance(mesh, mat)] }, opts));
        return e;
    }
    function prim(type, mat, opts) {
        const e = new pc.Entity();
        e.addComponent('render', Object.assign({ type, material: mat }, opts));
        return e;
    }

    /* ---------- faceted mesh builder (flat shaded, auto-oriented) ---------- */
    function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

    function facetMesh(tris, centre) {
        const pos = [], idx = [];
        for (const t of tris) {
            let [a, b, c] = t;
            if (centre) {
                const n = cross(sub(b, a), sub(c, a));
                const cen = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
                if (dot(n, sub(cen, centre)) < 0) { const tmp = b; b = c; c = tmp; }
            }
            const base = pos.length / 3;
            pos.push(...a, ...b, ...c);
            idx.push(base, base + 1, base + 2);
        }
        const m = new pc.Mesh(S.device);
        m.setPositions(pos);
        m.setNormals(pc.calculateNormals(pos, idx));
        m.setIndices(idx);
        m.update();
        return m;
    }
    const quad = (a, b, c, d) => [[a, b, c], [a, c, d]];

    function rockMesh(seed) {
        const g = new pc.SphereGeometry({ radius: 1, latitudeBands: 10, longitudeBands: 12 });
        const r = rng(seed);
        const pos = g.positions;
        const cache = new Map();
        for (let i = 0; i < pos.length; i += 3) {
            const key = pos[i].toFixed(3) + pos[i + 1].toFixed(3) + pos[i + 2].toFixed(3);
            let k = cache.get(key);
            if (k === undefined) { k = 0.72 + r() * 0.5; cache.set(key, k); }
            pos[i] *= k; pos[i + 1] *= k * 0.9; pos[i + 2] *= k;
        }
        g.normals = pc.calculateNormals(pos, g.indices);
        return pc.Mesh.fromGeometry(S.device, g);
    }

    /* ---------- sky, environment and stage theme ---------- */
    function paintSky(ctx, w, h, T) {
        const r = rng(T.seed);
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0.0, T.sky[0]);
        g.addColorStop(0.3, T.sky[1]);
        g.addColorStop(0.495, T.sky[2]);
        g.addColorStop(0.505, T.below[0]);
        g.addColorStop(1.0, T.below[1]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        const wrap = (x, fn) => { fn(x); if (x < w * 0.2) fn(x + w); if (x > w * 0.8) fn(x - w); };
        const azToX = (az) => ((1 - az / 360) % 1 + 1) % 1 * w;
        const elToY = (el) => (0.5 - el / 180) * h;

        if (T.nebula) {
            ctx.globalCompositeOperation = 'lighter';
            for (const [c, a, az, el] of T.nebula) {
                for (let i = 0; i < 7; i++) {
                    const x = azToX(az + (r() - 0.5) * 80), y = elToY(el + (r() - 0.5) * 40);
                    const rad = h * (0.12 + r() * 0.18);
                    wrap(x, (xx) => {
                        const rg = ctx.createRadialGradient(xx, y, 0, xx, y, rad);
                        rg.addColorStop(0, c + Math.round(a * 60).toString(16).padStart(2, '0'));
                        rg.addColorStop(1, c + '00');
                        ctx.fillStyle = rg;
                        ctx.fillRect(xx - rad, y - rad, rad * 2, rad * 2);
                    });
                }
            }
            ctx.globalCompositeOperation = 'source-over';
        }
        if (T.stars) {
            for (let i = 0; i < 1400; i++) {
                const x = r() * w, y = r() * h * 0.62;
                const s = r() < 0.06 ? 2.2 : r() < 0.3 ? 1.4 : 0.9;
                ctx.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.65})`;
                ctx.fillRect(x, y, s, s);
            }
        }
        if (T.clouds) {
            for (let i = 0; i < 46; i++) {
                const x = r() * w, y = h * (0.34 + r() * 0.15), s = h * (0.03 + r() * 0.05);
                ctx.fillStyle = 'rgba(255,255,255,0.0)';
                wrap(x, (xx) => {
                    for (let k = 0; k < 6; k++) {
                        const cx = xx + (k - 2.5) * s * 0.9, cy = y + (r() - 0.5) * s * 0.35, cr = s * (0.7 + r() * 0.6);
                        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
                        rg.addColorStop(0, 'rgba(255,255,255,0.55)');
                        rg.addColorStop(1, 'rgba(255,255,255,0)');
                        ctx.fillStyle = rg;
                        ctx.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
                    }
                });
            }
        }
        if (T.smoke) {
            for (let i = 0; i < 40; i++) {
                const x = r() * w, y = h * (0.3 + r() * 0.2), s = h * (0.05 + r() * 0.07);
                wrap(x, (xx) => {
                    const rg = ctx.createRadialGradient(xx, y, 0, xx, y, s);
                    rg.addColorStop(0, 'rgba(40,10,6,0.45)');
                    rg.addColorStop(1, 'rgba(40,10,6,0)');
                    ctx.fillStyle = rg;
                    ctx.fillRect(xx - s, y - s, s * 2, s * 2);
                });
            }
        }
        const disc = (d, glow) => {
            const x = azToX(d.az), y = elToY(d.el);
            wrap(x, (xx) => {
                if (glow) {
                    const rg = ctx.createRadialGradient(xx, y, d.r * 0.2, xx, y, d.r * 4.5);
                    rg.addColorStop(0, d.col + 'aa');
                    rg.addColorStop(1, d.col + '00');
                    ctx.fillStyle = rg;
                    ctx.fillRect(xx - d.r * 5, y - d.r * 5, d.r * 10, d.r * 10);
                }
                ctx.fillStyle = d.col;
                ctx.beginPath(); ctx.arc(xx, y, d.r * 0.55, 0, 6.2832); ctx.fill();
            });
        };
        if (T.sun) disc(T.sun, true);
        if (T.planet) {
            const p = T.planet, x = azToX(p.az), y = elToY(p.el);
            wrap(x, (xx) => {
                const rg = ctx.createRadialGradient(xx - p.r * 0.35, y - p.r * 0.35, p.r * 0.1, xx, y, p.r);
                rg.addColorStop(0, p.col);
                rg.addColorStop(0.7, '#5a2a18');
                rg.addColorStop(1, '#0a0508');
                ctx.fillStyle = rg;
                ctx.beginPath(); ctx.arc(xx, y, p.r, 0, 6.2832); ctx.fill();
                ctx.strokeStyle = 'rgba(255,200,150,0.35)';
                ctx.lineWidth = 6;
                ctx.beginPath(); ctx.ellipse(xx, y, p.r * 1.7, p.r * 0.32, -0.35, 0, 6.2832); ctx.stroke();
            });
        }
    }

    function applySky(T) {
        const cv = newCanvas(2048, 1024);
        paintSky(cv.getContext('2d'), 2048, 1024, T);
        const src = new pc.Texture(S.device, {
            name: 'sky-equirect', width: 2048, height: 1024, format: pc.PIXELFORMAT_RGBA8,
            mipmaps: false, projection: pc.TEXTUREPROJECTION_EQUIRECT, magFilter: pc.FILTER_LINEAR, minFilter: pc.FILTER_LINEAR
        });
        src.setSource(cv);
        const scene = S.app.scene;
        const oldBox = scene.skybox, oldAtlas = scene.envAtlas;
        const cube = pc.EnvLighting.generateSkyboxCubemap(src, 1024);
        const lighting = pc.EnvLighting.generateLightingSource(src);
        const atlas = pc.EnvLighting.generateAtlas(lighting);
        lighting.destroy();
        src.destroy();
        scene.skybox = cube;
        scene.envAtlas = atlas;
        scene.skyboxMip = 0;
        scene.skyboxIntensity = 1;
        if (oldBox) oldBox.destroy();
        if (oldAtlas) oldAtlas.destroy();
    }

    function aimLight(e, dx, dy, dz) {
        const h = Math.sqrt(dx * dx + dz * dz);
        const theta = Math.atan2(h, -dy) * 180 / Math.PI;
        const psi = Math.atan2(-dx, -dz) * 180 / Math.PI;
        e.setEulerAngles(theta, psi, 0);
    }

    function paintGround(T) {
        const G = T.ground;
        const dc = S.groundDiffuseCv, ec = S.groundGlowCv;
        const d = dc.getContext('2d'), e = ec.getContext('2d');
        const n = dc.width, hlf = n / 2;
        d.clearRect(0, 0, n, n);
        d.fillStyle = G.a; d.fillRect(0, 0, n, n);
        d.fillStyle = G.b; d.fillRect(0, 0, hlf, hlf); d.fillRect(hlf, hlf, hlf, hlf);
        // subtle speckle so big flat areas read as a surface
        const r = rng(T.seed + 5);
        for (let i = 0; i < 900; i++) {
            d.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + r() * 0.04})`;
            d.fillRect(r() * n, r() * n, 3 + r() * 6, 3 + r() * 6);
        }
        e.clearRect(0, 0, n, n);
        e.fillStyle = '#000'; e.fillRect(0, 0, n, n);
        e.strokeStyle = G.line;
        e.shadowColor = G.line;
        e.shadowBlur = 14;
        e.lineWidth = 5;
        e.beginPath();
        e.moveTo(0, 0); e.lineTo(n, 0); e.moveTo(0, hlf); e.lineTo(n, hlf);
        e.moveTo(0, 0); e.lineTo(0, n); e.moveTo(hlf, 0); e.lineTo(hlf, n);
        e.stroke();
        S.groundDiffuseTex.setSource(dc);
        S.groundGlowTex.setSource(ec);
        S.groundMat.emissiveIntensity = G.lineI;
        S.groundMat.update();
    }

    function setTheme(idx) {
        if (!S.ready || idx === S.theme) return;
        const T = THEMES[idx];
        S.theme = idx;
        S.T = T;
        applySky(T);

        const sc = S.app.scene;
        sc.fog.type = pc.FOG_LINEAR;
        sc.fog.color = col(T.fog);
        sc.fog.start = T.fogStart;
        sc.fog.end = T.fogEnd;
        sc.exposure = 1.0;

        S.key.light.color = col(T.key);
        S.key.light.intensity = T.keyI;
        S.rim.light.color = col(T.sky[1]);
        if (S.frame) { S.frame.bloom.intensity = T.bloom; S.frame.update(); }

        S.ground.enabled = !!T.ground;
        S.shadowBlob.enabled = !!T.ground;
        if (T.ground) paintGround(T);

        buildScenery(T);
        resetStreaks(T);
    }

    /* ---------- ground ---------- */
    function buildGround() {
        const size = 1000, tile = 8;
        S.GROUND_TILE = tile; S.GROUND_SIZE = size;
        S.groundDiffuseCv = newCanvas(512, 512);
        S.groundGlowCv = newCanvas(512, 512);
        S.groundDiffuseTex = makeTex('ground-diffuse', 512, 512, true, true);
        S.groundGlowTex = makeTex('ground-glow', 512, 512, true, true);
        const rep = size / tile;
        S.groundMat = std({
            diffuse: new pc.Color(1, 1, 1), diffuseMap: S.groundDiffuseTex,
            emissive: new pc.Color(1, 1, 1), emissiveMap: S.groundGlowTex, emissiveIntensity: 0.5,
            metalness: 0.1, gloss: 0.55,
            diffuseMapTiling: new pc.Vec2(rep, rep), emissiveMapTiling: new pc.Vec2(rep, rep)
        });
        const mesh = pc.Mesh.fromGeometry(S.device, new pc.PlaneGeometry({ halfExtents: new pc.Vec2(size / 2, size / 2) }));
        S.ground = entityWith(mesh, S.groundMat, { castShadows: false, receiveShadows: true });
        S.ground.setPosition(0, C.GY, -size / 2 + 80);
        S.app.root.addChild(S.ground);
    }

    function updateGround(camX, dist) {
        const t = S.GROUND_TILE;
        const ou = camX / t, ov = -dist / t;
        S.ground.setPosition(camX, C.GY, -S.GROUND_SIZE / 2 + 80);
        const m = S.groundMat;
        m.diffuseMapOffset.set(ou, ov); m.emissiveMapOffset.set(ou, ov);
        m.update();
    }

    /* ---------- scenery ---------- */
    function buildScenery(T) {
        if (S.sceneryRoot) S.sceneryRoot.destroy();
        S.sceneryRoot = new pc.Entity('scenery');
        S.app.root.addChild(S.sceneryRoot);
        S.items = [];
        const body = std({ diffuse: col(T.body), metalness: 0.35, gloss: 0.55 });
        const band = glowMat(T.band, T.bandI);
        const kind = T.scenery;
        const count = kind === 'rocks' ? 26 : 22;
        for (let i = 0; i < count; i++) {
            const root = new pc.Entity('item');
            const it = { root, kind, parts: [] };
            if (kind === 'towers') {
                it.body = prim('box', body, { castShadows: true, receiveShadows: true });
                root.addChild(it.body);
                for (let b = 0; b < 3; b++) {
                    const band1 = prim('box', band, { castShadows: false });
                    root.addChild(band1);
                    it.parts.push(band1);
                }
                it.cap = prim('box', band, { castShadows: false });
                root.addChild(it.cap);
            } else if (kind === 'spires') {
                it.body = prim('cone', body, { castShadows: true });
                it.glow = prim('cone', band, { castShadows: false });
                root.addChild(it.body); root.addChild(it.glow);
            } else if (kind === 'rocks') {
                const mesh = rockMesh(T.seed * 100 + (i % 6));
                it.body = entityWith(mesh, body, { castShadows: true });
                root.addChild(it.body);
                it.spin = new pc.Vec3(rand(-30, 30), rand(-40, 40), rand(-30, 30));
            } else {
                for (let k = 0; k < 3; k++) {
                    const c = prim('cone', band, { castShadows: false });
                    root.addChild(c);
                    it.parts.push(c);
                }
                it.base = prim('cone', body, { castShadows: true });
                root.addChild(it.base);
            }
            S.sceneryRoot.addChild(root);
            S.items.push(it);
            placeItem(it, rand(-310, 18));
        }
    }

    function placeItem(it, z) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const x = side * rand(13, 55);
        const GY = C.GY;
        it.root.enabled = true;
        it.z = z;
        if (it.kind === 'towers') {
            const w = rand(3, 7), h = rand(6, 34), dpt = rand(3, 7);
            it.root.setPosition(x, GY, z);
            it.body.setLocalScale(w, h, dpt); it.body.setLocalPosition(0, h / 2, 0);
            it.parts.forEach((p, i) => {
                const f = 0.25 + i * 0.25;
                p.setLocalScale(w + 0.12, 0.28, dpt + 0.12);
                p.setLocalPosition(0, h * f, 0);
            });
            it.cap.setLocalScale(w * 0.5, 0.35, dpt * 0.5); it.cap.setLocalPosition(0, h + 0.2, 0);
        } else if (it.kind === 'spires') {
            const w = rand(2.5, 6), h = rand(8, 36);
            it.root.setPosition(x, GY, z);
            it.body.setLocalScale(w, h, w); it.body.setLocalPosition(0, h / 2, 0);
            it.glow.setLocalScale(w * 0.35, h * 1.02, w * 0.35); it.glow.setLocalPosition(0, h / 2 + 0.2, 0);
            it.root.setEulerAngles(0, rand(0, 360), 0);
        } else if (it.kind === 'rocks') {
            const s = rand(1.4, 6.5);
            const y = rand(-12, 20);
            it.root.setPosition(x * (Math.random() < 0.25 ? 0.4 : 1) + (Math.random() < 0.25 ? side * 9 : 0), y, z);
            it.body.setLocalScale(s, s, s);
            it.root.setEulerAngles(rand(0, 360), rand(0, 360), rand(0, 360));
        } else {
            const h = rand(6, 22);
            it.root.setPosition(x, GY, z);
            it.base.setLocalScale(5, 1.2, 5); it.base.setLocalPosition(0, 0.5, 0);
            it.parts.forEach((p, i) => {
                const hh = h * (1 - i * 0.25), w = 1.6 + (2 - i) * 0.4;
                const a = (i - 1) * 0.28;
                p.setLocalScale(w, hh, w);
                p.setLocalPosition((i - 1) * 1.6, hh / 2, (i % 2) * 1.2);
                p.setLocalEulerAngles(0, 0, -a * 57);
            });
        }
    }

    function updateScenery(dz, dt) {
        for (const it of S.items) {
            it.z += dz;
            const p = it.root.getPosition();
            it.root.setPosition(p.x, p.y, it.z);
            if (it.spin) it.root.rotate(it.spin.x * dt, it.spin.y * dt, it.spin.z * dt);
            if (it.z > 24) placeItem(it, -rand(280, 330));
        }
    }

    /* ---------- speed streaks and particles ---------- */
    function buildFx() {
        S.fx = new pc.Entity('fx');
        S.app.root.addChild(S.fx);
        S.streakMat = glowMat('#cfe8ff', 1.4, { blendType: pc.BLEND_ADDITIVE, opacity: 0.6, depthWrite: false });
        S.streaks = [];
        for (let i = 0; i < 70; i++) {
            const e = prim('box', S.streakMat, { castShadows: false });
            S.fx.addChild(e);
            S.streaks.push({ e, x: 0, y: 0, z: 0 });
        }
        S.pmats = {
            green: glowMat('#6dffb0', 3, { blendType: pc.BLEND_ADDITIVE, depthWrite: false }),
            white: glowMat('#ffffff', 3, { blendType: pc.BLEND_ADDITIVE, depthWrite: false }),
            red: glowMat('#ff4040', 3, { blendType: pc.BLEND_ADDITIVE, depthWrite: false }),
            orange: glowMat('#ff9a2a', 3, { blendType: pc.BLEND_ADDITIVE, depthWrite: false }),
            yellow: glowMat('#ffe36b', 3, { blendType: pc.BLEND_ADDITIVE, depthWrite: false })
        };
        S.parts = [];
        for (let i = 0; i < 110; i++) {
            const e = prim('box', S.pmats.white, { castShadows: false });
            e.enabled = false;
            S.fx.addChild(e);
            S.parts.push({ e, life: 0, max: 1, vel: new pc.Vec3(), size: 0.2 });
        }
    }

    function resetStreaks(T) {
        const space = !T.ground;
        S.streakMat.opacity = space ? 0.75 : 0.28;
        S.streakMat.update();
        for (const s of S.streaks) {
            s.x = rand(-45, 45); s.y = space ? rand(-25, 30) : rand(C.GY + 1, 30); s.z = rand(-300, 20);
            if (Math.abs(s.x) < 8 && Math.abs(s.y) < 8) s.x += s.x < 0 ? -12 : 12;
        }
    }

    function updateStreaks(dz, speed) {
        const len = clamp(speed * 0.14, 1.5, 7);
        for (const s of S.streaks) {
            s.z += dz * 1.25;
            if (s.z > 16) {
                s.z = -rand(240, 320);
                s.x = rand(-45, 45); s.y = S.T.ground ? rand(C.GY + 1, 30) : rand(-25, 30);
                if (Math.abs(s.x) < 8 && Math.abs(s.y) < 8) s.x += s.x < 0 ? -12 : 12;
            }
            s.e.setPosition(s.x, s.y, s.z);
            s.e.setLocalScale(0.045, 0.045, len);
        }
    }

    function burst(kind, x, y, z) {
        const set = {
            good: { n: 42, mats: ['green', 'white', 'yellow'], sp: [4, 13], life: [0.5, 1.0], size: [0.12, 0.26] },
            bad: { n: 32, mats: ['red', 'orange'], sp: [3, 11], life: [0.5, 0.9], size: [0.14, 0.3] },
            boom: { n: 100, mats: ['orange', 'yellow', 'white', 'red'], sp: [4, 24], life: [0.7, 1.6], size: [0.2, 0.55] },
            roll: { n: 16, mats: ['white'], sp: [2, 6], life: [0.3, 0.6], size: [0.08, 0.16] }
        }[kind];
        if (!set) return;
        let made = 0;
        for (const p of S.parts) {
            if (p.life > 0) continue;
            const a = Math.random() * 6.2832, b = Math.acos(rand(-1, 1)), sp = rand(set.sp[0], set.sp[1]);
            p.vel.set(Math.sin(b) * Math.cos(a) * sp, Math.sin(b) * Math.sin(a) * sp, Math.cos(b) * sp);
            p.max = p.life = rand(set.life[0], set.life[1]);
            p.size = rand(set.size[0], set.size[1]);
            p.e.render.meshInstances[0].material = S.pmats[set.mats[(Math.random() * set.mats.length) | 0]];
            p.e.setPosition(x, y, z);
            p.e.enabled = true;
            if (++made >= set.n) break;
        }
    }

    function updateParticles(dt, dz) {
        for (const p of S.parts) {
            if (p.life <= 0) continue;
            p.life -= dt;
            if (p.life <= 0) { p.e.enabled = false; continue; }
            const pos = p.e.getPosition();
            p.e.setPosition(pos.x + p.vel.x * dt, pos.y + p.vel.y * dt, pos.z + p.vel.z * dt + dz);
            const k = p.life / p.max;
            const s = p.size * (0.3 + k);
            p.e.setLocalScale(s, s, s);
        }
    }

    /* ---------- spacecraft (player and wingmen share one builder) ---------- */
    const CRAFT = {
        player: { paint: '#d6232a', trim: '#f0b72a', glass: '#1aa8ff', flame: '#ff9a3a', span: 17, sweep: 1.0, bw: 1.0, len: 1.0, fin: 7.2 },
        spark: { name: 'SPARK', paint: '#10c9b4', trim: '#f4f8ff', glass: '#8cff5e', flame: '#59f0ff', span: 15, sweep: 0.8, bw: 0.95, len: 1.05, fin: 8.4 },
        nova: { name: 'NOVA', paint: '#7d4dff', trim: '#ffc94a', glass: '#ff7ad8', flame: '#ff6bd6', span: 13, sweep: 1.25, bw: 1.28, len: 0.92, fin: 6.2 },
        orbit: { name: 'ORBIT', paint: '#ff8a1f', trim: '#ffffff', glass: '#4ad0ff', flame: '#ffd25a', span: 19, sweep: 1.45, bw: 0.86, len: 1.2, fin: 7.8 }
    };

    function makeCraft(st) {
        const mChrome = std({ diffuse: col('#eef2fa'), metalness: 1, gloss: 0.92 });
        const mPaint = std({
            diffuse: col(st.paint), metalness: 0.75, gloss: 0.92, cull: pc.CULLFACE_NONE, twoSidedLighting: true,
            clearCoat: 1, clearCoatGloss: 0.98
        });
        const mTrim = std({ diffuse: col(st.trim), metalness: 1, gloss: 0.88, cull: pc.CULLFACE_NONE, twoSidedLighting: true });
        const mDark = std({ diffuse: col('#2a3148'), metalness: 1, gloss: 0.8 });
        const mGlass = std({ diffuse: col('#06121f'), metalness: 0.3, gloss: 1, emissive: col(st.glass), emissiveIntensity: 0.5 });

        const bw = st.bw, ln = st.len;
        const P = (x, y, z) => [x * bw, y, z < 0 ? z * ln : z];
        const N = P(0, 0, -16), Tp = P(0, 3.2, -3), R = P(3, 0, -3), B = P(0, -2.2, -3), L = P(-3, 0, -3);
        const tT = P(0, 1.6, 9), tR = P(1.6, 0, 9), tB = P(0, -1.2, 9), tL = P(-1.6, 0, 9);
        const bodyTris = [
            [N, Tp, R], [N, R, B], [N, B, L], [N, L, Tp],
            ...quad(Tp, R, tR, tT), ...quad(R, B, tB, tR), ...quad(B, L, tL, tB), ...quad(L, Tp, tT, tL)
        ];
        const capTris = [[tT, tR, tB], [tT, tB, tL]];
        const A = P(0, 5.2, -3.5), P1 = P(-1.6, 3.0, -0.5), P2 = P(1.6, 3.0, -0.5), P3 = P(0, 2.9, -9);
        const glassTris = [[A, P1, P2], [A, P2, P3], [A, P3, P1]];

        const sp = st.span, sw = st.sweep;
        const wing = (sg) => quad([sg * 3 * bw, 0, -5 * ln], [sg * (sp - 1), -1.2, 3 * sw], [sg * sp, -1.5, 9 + sw], [sg * 3 * bw, 0, 6]);
        const stripe = (sg) => quad([sg * 3.2 * bw, 0.05, -4 * ln], [sg * (sp - 3), -1.1, 3.2 * sw], [sg * (sp - 2.7), -1.15, 5.5 * sw], [sg * 3.2 * bw, 0.05, 2]);
        const tip = (sg) => [[[sg * (sp - 0.4), -1.4, 9 + sw], [sg * (sp - 1), -1.2, 3 * sw], [sg * (sp - 0.4), 4.4, 9 + sw]]];
        const tail = [[P(0, 1.6, 9), P(0, 2.6, 0), P(0, st.fin, 9)]];

        const model = new pc.Entity('craftModel');
        const holder = new pc.Entity('holder');
        holder.setLocalScale(0.1, 0.1, 0.1);
        model.addChild(holder);
        const add = (tris, mat, centre, shadow) => {
            holder.addChild(entityWith(facetMesh(tris, centre), mat, { castShadows: shadow !== false, receiveShadows: false }));
        };
        add(bodyTris, mChrome, [0, 0, -3 * ln]);
        add(capTris, mDark, [0, 0, 9]);
        add(glassTris, mGlass, [0, 3.6, -3.3]);
        add(wing(-1).concat(wing(1)), mPaint, null);
        add(stripe(-1).concat(stripe(1)), mChrome, null, false);
        add(tip(-1).concat(tip(1)), mTrim, null);
        add(tail, mTrim, null);

        // engine pods, flames and navigation lights
        const flameMat = glowMat(st.flame, 3.2, { blendType: pc.BLEND_ADDITIVE, opacity: 0.85, depthWrite: false });
        const coreMat = glowMat('#e8f4ff', 4, { blendType: pc.BLEND_ADDITIVE, opacity: 0.95, depthWrite: false });
        const flames = [];
        for (const sx of [-1, 1]) {
            const x = sx * 2.6 * bw;
            const pod = prim('cylinder', mDark, { castShadows: false });
            pod.setLocalScale(2.2, 6, 2.2); pod.setLocalEulerAngles(90, 0, 0); pod.setLocalPosition(x, -0.6, 6.5);
            holder.addChild(pod);
            const ring = prim('cylinder', glowMat(st.flame, 1.4), { castShadows: false });
            ring.setLocalScale(2.35, 0.5, 2.35); ring.setLocalEulerAngles(90, 0, 0); ring.setLocalPosition(x, -0.6, 9.6);
            holder.addChild(ring);
            const fl = prim('cone', flameMat, { castShadows: false });
            fl.setLocalEulerAngles(90, 0, 0); fl.setLocalPosition(x, -0.6, 12);
            holder.addChild(fl);
            const core = prim('cone', coreMat, { castShadows: false });
            core.setLocalEulerAngles(90, 0, 0); core.setLocalPosition(x, -0.6, 10.2);
            holder.addChild(core);
            flames.push({ fl, core });
        }
        const cf = prim('cone', flameMat, { castShadows: false });
        cf.setLocalEulerAngles(90, 0, 0); cf.setLocalPosition(0, 0.1, 13);
        holder.addChild(cf);
        flames.push({ fl: cf, core: null, centre: true });

        const navL = prim('sphere', glowMat('#ff2a2a', 5), { castShadows: false });
        navL.setLocalScale(1.1, 1.1, 1.1); navL.setLocalPosition(-(sp - 0.4), -1.2, 9 + sw);
        const navR = prim('sphere', glowMat('#2aff6a', 5), { castShadows: false });
        navR.setLocalScale(1.1, 1.1, 1.1); navR.setLocalPosition(sp - 0.4, -1.2, 9 + sw);
        const strobeMat = glowMat('#ffffff', 6);
        const strobe = prim('sphere', strobeMat, { castShadows: false });
        strobe.setLocalScale(1, 1, 1); strobe.setLocalPosition(0, st.fin + 0.4, 9);
        holder.addChild(navL); holder.addChild(navR); holder.addChild(strobe);

        return { model, flames, strobeMat, flameMat };
    }

    function buildShip() {
        const c = makeCraft(CRAFT.player);
        S.shipRoot = new pc.Entity('ship');
        S.shipModel = c.model;
        S.shipRoot.addChild(c.model);
        S.flames = c.flames;
        S.strobeMat = c.strobeMat;

        const glow = new pc.Entity('engineGlow');
        glow.addComponent('light', { type: 'omni', color: col('#ff9a4a'), intensity: 1.6, range: 7, castShadows: false });
        glow.setLocalPosition(0, 0.1, 1.2);
        S.shipModel.addChild(glow);
        S.engineGlow = glow;
        S.app.root.addChild(S.shipRoot);

        // soft contact shadow on the ground
        const cv = newCanvas(128, 128);
        const g = cv.getContext('2d');
        const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        rg.addColorStop(0, 'rgba(0,0,0,0.85)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
        const tex = makeTex('blob', 128, 128, true, false, false);
        tex.setSource(cv);
        S.blobMat = std({
            diffuse: new pc.Color(0, 0, 0), opacityMap: tex, opacityMapChannel: 'a',
            blendType: pc.BLEND_NORMAL, depthWrite: false, useLighting: false
        });
        S.blobMat.opacity = 0.5;
        S.shadowBlob = entityWith(pc.Mesh.fromGeometry(S.device, new pc.PlaneGeometry({ halfExtents: new pc.Vec2(1, 1) })), S.blobMat, { castShadows: false });
        S.app.root.addChild(S.shadowBlob);
    }

    /* ---------- wingmen: pull up alongside, give advice, then boost away ---------- */
    function buildWingmen() {
        S.wing = [];
        ['spark', 'nova', 'orbit'].forEach((key) => {
            const st = CRAFT[key];
            const c = makeCraft(st);
            const root = new pc.Entity('wing_' + key);
            root.addChild(c.model);
            root.enabled = false;
            const trailMat = glowMat(st.flame, 3, { blendType: pc.BLEND_ADDITIVE, opacity: 0.55, depthWrite: false });
            const trail = prim('box', trailMat, { castShadows: false });
            trail.enabled = false;
            c.model.addChild(trail);
            S.app.root.addChild(root);
            S.wing.push({ key, name: st.name, root, craft: c, trail, state: 'idle', t: 0, side: 1, hold: 4, cb: null, pos: new pc.Vec3(), vz: 0, seed: Math.random() * 10 });
        });
    }

    /* Asks wingman idx to fly in. Callbacks: onArrive, onHold (formation reached), onLeave (about to boost away). */
    function callWingman(idx, hold, cb, shipX) {
        const w = S.wing[idx];
        if (!S.ready || !w || w.state !== 'idle') return false;
        w.state = 'arrive'; w.t = 0; w.hold = hold; w.cb = cb || {};
        w.side = shipX > 0 ? -1 : 1;
        w.root.enabled = true;
        w.start = null;
        if (w.cb.onArrive) w.cb.onArrive();
        return true;
    }
    const wingBusy = () => S.ready && S.wing.some((w) => w.state !== 'idle');

    const smooth = (t) => t * t * (3 - 2 * t);

    function updateWingmen(dt, ship) {
        for (const w of S.wing) {
            if (w.state === 'idle') continue;
            w.t += dt;
            const tt = S.time + w.seed;
            // formation slot, relative to the player's ship
            const slot = new pc.Vec3(ship.x + w.side * 5.4, ship.y + 1.9 + Math.sin(tt * 1.7) * 0.3, 1.8 + Math.cos(tt * 1.1) * 0.35);
            let roll = -w.side * 8 + Math.sin(tt * 1.3) * 5, pitch = Math.sin(tt * 1.7) * 3, yaw = 0, boost = 1, trailLen = 0;

            if (w.state === 'arrive') {
                const D = 1.6;
                if (!w.start) w.start = new pc.Vec3(w.side * 17, slot.y + 6, 34);
                const k = smooth(clamp(w.t / D, 0, 1));
                w.pos.set(lerp(w.start.x, slot.x, k), lerp(w.start.y, slot.y, k), lerp(w.start.z, slot.z, k));
                boost = 2.2 - k * 1.3;
                roll = -w.side * 38 * (1 - k) + roll * k;
                yaw = w.side * 14 * (1 - k);
                trailLen = (1 - k) * 12;
                if (w.t >= D) { w.state = 'hold'; w.t = 0; if (w.cb.onHold) w.cb.onHold(); }
            } else if (w.state === 'hold') {
                const f = 1 - Math.exp(-5 * dt);
                w.pos.set(lerp(w.pos.x, slot.x, f), lerp(w.pos.y, slot.y, f), lerp(w.pos.z, slot.z, f));
                if (w.t >= w.hold) { w.state = 'depart'; w.t = 0; w.vz = -6; w.dx = w.side * 2.5; if (w.cb.onLeave) w.cb.onLeave(); }
            } else if (w.state === 'depart') {
                w.vz -= (30 + w.t * 150) * dt;           // accelerating hard
                w.pos.set(w.pos.x + w.dx * dt * (1 + w.t), w.pos.y + (1.2 + w.t * 2.4) * dt, w.pos.z + w.vz * dt);
                const roll1 = clamp(w.t / 0.9, 0, 1);
                roll = -w.side * 8 + w.side * 360 * smooth(roll1);
                pitch = 6;
                boost = 3.2;
                trailLen = clamp(-w.vz * 0.12, 4, 40);
                if (w.pos.z < -330) { w.state = 'idle'; w.root.enabled = false; continue; }
            }

            w.root.setPosition(w.pos);
            const m = w.craft.model;
            m.setLocalEulerAngles(pitch, yaw, 0);
            m.rotateLocal(0, 0, roll);
            const fl = 0.85 + Math.random() * 0.35;
            for (const f of w.craft.flames) {
                f.fl.setLocalScale(f.centre ? 1.1 : 1.5, (f.centre ? 5 : 7) * fl * boost, f.centre ? 1.1 : 1.5);
                if (f.core) f.core.setLocalScale(0.8, 5.2 * fl * boost, 0.8);
            }
            w.trail.enabled = trailLen > 0.5;
            if (w.trail.enabled) {
                w.trail.setLocalScale(0.14, 0.14, trailLen);
                w.trail.setLocalPosition(0, 0, 0.9 + trailLen * 0.5);
            }
        }
    }

    /* ---------- gates ---------- */
    function buildGates() {
        S.gates = [];
        const R = C.GATE_R;
        const ringMesh = pc.Mesh.fromGeometry(S.device, new pc.TorusGeometry({ tubeRadius: 0.2, ringRadius: R, segments: 64, sides: 14 }));
        const ring2Mesh = pc.Mesh.fromGeometry(S.device, new pc.TorusGeometry({ tubeRadius: 0.06, ringRadius: R + 0.55, segments: 64, sides: 8 }));
        const discMesh = pc.Mesh.fromGeometry(S.device, new pc.CircleGeometry({ radius: R - 0.1, segments: 48 }));
        const planeMesh = pc.Mesh.fromGeometry(S.device, new pc.PlaneGeometry({ halfExtents: new pc.Vec2(R * 0.92, R * 0.92) }));
        for (let i = 0; i < 3; i++) {
            const hex = C.LANE_COL[i];
            const root = new pc.Entity('gate' + i);
            const ringMat = glowMat(hex, 2.6, { blendType: pc.BLEND_NORMAL });
            const ring2Mat = glowMat(hex, 1.6, { blendType: pc.BLEND_ADDITIVE, opacity: 0.8, depthWrite: false });
            const discMat = glowMat(hex, 1.0, { blendType: pc.BLEND_ADDITIVE, opacity: 0.06, depthWrite: false, cull: pc.CULLFACE_NONE });
            const podMat = glowMat('#ffffff', 3);
            const numCv = newCanvas(256, 256);
            const numTex = makeTex('num' + i, 256, 256, true, false);
            const numMat = std({
                diffuse: new pc.Color(0, 0, 0), emissive: new pc.Color(1, 1, 1), emissiveMap: numTex, emissiveIntensity: 1.7,
                opacityMap: numTex, opacityMapChannel: 'a', blendType: pc.BLEND_NORMAL, depthWrite: false, useFog: false
            });

            const ring = entityWith(ringMesh, ringMat, { castShadows: false });
            ring.setLocalEulerAngles(90, 0, 0);
            const ring2 = entityWith(ring2Mesh, ring2Mat, { castShadows: false });
            ring2.setLocalEulerAngles(90, 0, 0);
            const disc = entityWith(discMesh, discMat, { castShadows: false });
            disc.setLocalEulerAngles(90, 0, 0);
            const num = entityWith(planeMesh, numMat, { castShadows: false });
            num.setLocalEulerAngles(90, 0, 0);
            num.setLocalPosition(0, 0, 0.05);

            const pivot = new pc.Entity('pivot');
            for (let k = 0; k < 8; k++) {
                const pod = prim('box', podMat, { castShadows: false });
                const a = k / 8 * Math.PI * 2;
                pod.setLocalPosition(Math.cos(a) * (R + 0.55), Math.sin(a) * (R + 0.55), 0);
                pod.setLocalScale(0.34, 0.34, 0.34);
                pod.setLocalEulerAngles(0, 0, a * 57.3 + 45);
                pivot.addChild(pod);
            }
            root.addChild(ring); root.addChild(ring2); root.addChild(disc); root.addChild(num); root.addChild(pivot);

            root.enabled = false;
            S.app.root.addChild(root);
            S.gates.push({ root, ringMat, ring2Mat, discMat, podMat, numMat, numTex, numCv, pivot, hex, val: null });
        }
    }

    function drawNumber(g, val, hex) {
        const c = g.numCv.getContext('2d');
        c.clearRect(0, 0, 256, 256);
        const s = String(val);
        let size = 150;
        c.font = `${size}px "Press Start 2P", monospace`;
        const wTxt = c.measureText(s).width;
        if (wTxt > 220) { size = Math.floor(size * 220 / wTxt); c.font = `${size}px "Press Start 2P", monospace`; }
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineJoin = 'round';
        c.shadowColor = hex; c.shadowBlur = 26;
        c.lineWidth = Math.max(10, size / 6); c.strokeStyle = 'rgba(2,6,24,0.92)';
        c.strokeText(s, 128, 134);
        c.shadowBlur = 0;
        c.fillStyle = '#ffffff';
        c.fillText(s, 128, 134);
        g.numTex.setSource(g.numCv);
    }

    function updateGates(view) {
        const t = S.time;
        for (let i = 0; i < 3; i++) {
            const g = S.gates[i], v = view.gates[i];
            if (!v || !v.active || v.d < -5.2) { g.root.enabled = false; continue; }
            g.root.enabled = true;
            if (g.val !== v.val) { g.val = v.val; drawNumber(g, v.val, g.hex); }
            g.root.setPosition(v.x, v.y, -v.d);

            let ringHex = g.hex, k = 1, sc = 1, disc = 0.06;
            if (v.state === 'ok') { ringHex = '#59ff9a'; k = 3.6; sc = 1 + v.t * 1.1; disc = 0.22 * (1 - v.t); }
            else if (v.state === 'bad') { ringHex = '#ff3b3b'; k = 3.0; sc = 1 + v.t * 0.25; disc = 0.16; }
            else if (v.state === 'reveal') { ringHex = '#59ff9a'; k = 2.6 + Math.sin(t * 16) * 1.0; disc = 0.18; }
            else if (v.state === 'dim') { k = 0.5; disc = 0.03; }
            // fade out as the gate sweeps past the camera so it never blocks the view
            const pass = v.d < 0 ? clamp(1 + v.d / 5, 0, 1) : 1;
            const fade = (v.state === 'ok' ? 1 - v.t * v.t : 1) * pass;
            g.root.setLocalScale(sc, sc, sc);
            g.ringMat.emissive = col(ringHex);
            g.ringMat.emissiveIntensity = k * 2.6;
            g.ringMat.opacity = fade;
            g.ring2Mat.emissive = col(ringHex);
            g.ring2Mat.opacity = 0.8 * fade;
            g.discMat.emissive = col(ringHex);
            g.discMat.opacity = disc * fade;
            g.numMat.emissiveIntensity = (v.state === 'dim' ? 0.8 : 1.7) * fade;
            g.numMat.opacity = fade;
            g.podMat.emissive = col(ringHex);
            g.ringMat.update(); g.ring2Mat.update(); g.discMat.update(); g.numMat.update(); g.podMat.update();
            g.pivot.setLocalEulerAngles(0, 0, t * 55 * (i % 2 ? -1 : 1));
        }
    }

    /* ---------- init ---------- */
    async function init(canvas) {
        const device = await pc.createGraphicsDevice(canvas, { deviceTypes: ['webgl2'], antialias: false, powerPreference: 'high-performance' });
        S.device = device;
        const opts = new pc.AppOptions();
        opts.graphicsDevice = device;
        opts.componentSystems = [pc.RenderComponentSystem, pc.CameraComponentSystem, pc.LightComponentSystem];
        opts.resourceHandlers = [pc.TextureHandler];
        const app = new pc.AppBase(canvas);
        app.init(opts);
        S.app = app;
        S.canvas = canvas;
        app.setCanvasFillMode(pc.FILLMODE_NONE);
        device.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        const fit = () => {
            const r = canvas.getBoundingClientRect();
            device.resizeCanvas(Math.max(2, Math.round(r.width)), Math.max(2, Math.round(r.height)));
        };
        fit();
        new ResizeObserver(fit).observe(canvas);

        if (document.fonts && document.fonts.load) {
            try { await document.fonts.load('40px "Press Start 2P"'); } catch (e) { /* font optional */ }
        }

        // camera with a modern post pipeline
        const cam = new pc.Entity('camera');
        cam.addComponent('camera', { fov: 58, nearClip: 0.1, farClip: 1400, clearColor: new pc.Color(0, 0, 0) });
        app.root.addChild(cam);
        S.cam = cam;
        if (S.quality >= 1) {
            try {
                const f = new pc.CameraFrame(app, cam.camera);
                f.rendering.toneMapping = pc.TONEMAP_NEUTRAL;
                f.rendering.samples = S.quality === 2 ? 4 : 1;
                f.rendering.renderTargetScale = S.quality === 2 ? 1 : 0.8;
                f.bloom.intensity = 0.05;
                f.bloom.blurLevel = 7;
                f.vignette.intensity = 0.45;
                f.vignette.inner = 0.55; f.vignette.outer = 1.25;
                f.grading.enabled = true;
                f.grading.saturation = 1.12;
                f.grading.contrast = 1.06;
                f.update();
                S.frame = f;
            } catch (e) {
                console.warn('Post processing unavailable, continuing without it.', e);
                S.quality = 0;
            }
        }
        if (!S.frame) cam.camera.toneMapping = pc.TONEMAP_NEUTRAL;

        // lights
        S.key = new pc.Entity('key');
        S.key.addComponent('light', {
            type: 'directional', castShadows: true, shadowDistance: 90, shadowResolution: 2048,
            shadowBias: 0.25, normalOffsetBias: 0.05, intensity: 2.4
        });
        aimLight(S.key, -0.35, -0.8, -0.5);
        app.root.addChild(S.key);
        S.rim = new pc.Entity('rim');
        S.rim.addComponent('light', { type: 'directional', castShadows: false, intensity: 0.9, color: col('#8fb8ff') });
        aimLight(S.rim, 0.25, -0.25, 0.9);
        app.root.addChild(S.rim);

        buildGround();
        buildShip();
        buildWingmen();
        buildGates();
        buildFx();

        S.key.light.castShadows = S.quality >= 2;
        S.ready = true;
        setTheme(0);

        // Show everything once behind the loading screen so every shader is compiled before play starts.
        S.gates.forEach((g) => { drawNumber(g, 88, g.hex); });
        await new Promise((resolve) => {
            let n = 0;
            const warm = () => {
                S.wing.forEach((w) => { w.root.enabled = true; w.root.setPosition(0, 0, -14); });
                S.gates.forEach((g) => { g.root.enabled = true; g.root.setPosition(0, 0, -30); });
                S.parts.forEach((p) => { p.e.enabled = true; p.e.setPosition(0, 0, -10); });
                if (++n >= 4) {
                    app.off('update', warm);
                    S.wing.forEach((w) => { w.root.enabled = false; });
                    S.gates.forEach((g) => { g.root.enabled = false; g.val = null; });
                    S.parts.forEach((p) => { p.e.enabled = false; });
                    resolve();
                }
            };
            app.on('update', warm);
            app.start();
        });
        return app;
    }

    /* ---------- per frame ---------- */
    function frame(view, dt) {
        if (!S.ready) return;
        S.time += dt;
        const ship = view.ship;
        const dz = view.speed * dt;

        // camera follows with a little lag
        const k = 1 - Math.exp(-6 * dt);
        S.camX = lerp(S.camX, ship.x * 0.62, k);
        S.camY = lerp(S.camY, ship.y * 0.5, k);
        const sh = view.shake || 0;
        const sx = (Math.random() - 0.5) * sh * 0.9, sy = (Math.random() - 0.5) * sh * 0.9;
        S.cam.setPosition(S.camX + sx, 3.3 + S.camY + sy, 11.5);
        S.cam.lookAt(ship.x * 0.3 + S.camX * 0.3, ship.y * 0.4 + 0.6 + S.camY * 0.2, -26);
        S.cam.rotateLocal(0, 0, -clamp(ship.vx * 0.09, -3.2, 3.2) - sh * (Math.random() - 0.5) * 2);
        S.cam.camera.fov = 58 + clamp(view.speed - 19, 0, 30) * 0.08 + (ship.roll > 0 ? Math.sin(ship.roll * Math.PI) * 4 : 0);

        // ship attitude
        const roll = -clamp(ship.vx * 2.6, -48, 48) + ship.roll * 360;
        const pitch = clamp(ship.vy * 2.4, -26, 26);
        const yaw = -clamp(ship.vx * 1.1, -22, 22);
        S.shipRoot.enabled = ship.alive !== false;
        S.shipRoot.setPosition(ship.x, ship.y, C.SHIP_Z);
        S.shipModel.setLocalEulerAngles(pitch, yaw, 0);
        S.shipModel.rotateLocal(0, 0, roll);

        const flick = 0.85 + Math.random() * 0.35;
        const boost = clamp(view.speed / 30, 0.7, 1.5);
        for (const f of S.flames) {
            f.fl.setLocalScale(f.centre ? 1.1 : 1.5, (f.centre ? 5 : 7) * flick * boost, f.centre ? 1.1 : 1.5);
            if (f.core) f.core.setLocalScale(0.8, 5.2 * flick * boost, 0.8);
        }
        S.engineGlow.light.intensity = 1.3 * flick * boost;

        // ground shadow blob
        if (S.T.ground) {
            const h = Math.max(0, ship.y - C.GY);
            const sc = 1.7 + h * 0.07;
            S.shadowBlob.setPosition(ship.x, C.GY + 0.03, C.SHIP_Z + 0.5);
            S.shadowBlob.setLocalScale(sc, 1, sc * 1.4);
            S.blobMat.opacity = clamp(0.62 - h * 0.025, 0.08, 0.6) * (ship.alive === false ? 0 : 1);
            S.blobMat.update();
            updateGround(S.camX, view.dist);
        }

        updateScenery(dz, dt);
        updateStreaks(dz, view.speed);
        updateParticles(dt, dz);
        updateGates(view);
        updateWingmen(dt, ship);
        const strobe = (S.time % 1.4) < 0.08 ? 6 : 0.1;
        S.strobeMat.emissiveIntensity = strobe;
        for (const w of S.wing) w.craft.strobeMat.emissiveIntensity = ((S.time + w.seed) % 1.4) < 0.08 ? 6 : 0.1;

        // keep an eye on the frame rate and trade resolution for smoothness if needed
        S.fpsAcc += dt; S.fpsN++;
        if (S.fpsN >= 120) {
            const avg = S.fpsAcc / S.fpsN;
            S.fpsAcc = 0; S.fpsN = 0;
            if (avg > 1 / 38 && S.quality > 0) stepQuality(S.quality - 1);
        }
    }

    function stepQuality(q) {
        S.quality = q;
        S.key.light.castShadows = q >= 2;
        if (q === 0) {
            if (S.frame) S.frame.enabled = false;
            S.cam.camera.toneMapping = pc.TONEMAP_NEUTRAL;
        } else if (S.frame) {
            S.frame.rendering.samples = q === 2 ? 4 : 1;
            S.frame.rendering.renderTargetScale = q === 2 ? 1 : 0.8;
            S.frame.update();
        }
    }

    root.SM = root.SM || {};
    root.SM.C = C;
    root.SM.THEMES = THEMES;
    root.SM.Scene = {
        init, setTheme, frame, burst, callWingman,
        get wingBusy() { return wingBusy(); },
        wingName(i) { return S.wing[i].name; },
        resetWingmen() { if (S.ready) S.wing.forEach((w) => { w.state = 'idle'; w.root.enabled = false; }); },
        get quality() { return S.quality; },
        onUpdate(fn) { S.app.on('update', fn); },
        get app() { return S.app; },
        get ready() { return S.ready; },
        get themeName() { return S.T ? S.T.name : ''; },
        _state: S
    };
})(window);
