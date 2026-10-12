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
        LANES: [-9, 0, 9],
        XMAX: 11.5, YMIN: -5, YMAX: 5.5,
        LANE_COL: ['#2ec8ff', '#ffd23f', '#ff5fb0']
    };

    /* ---------- stage themes ---------- */
    const THEMES = [
        {   // 0 azure: green hills, rivers and glass towers
            name: 'AZURE SECTOR', seed: 11,
            sky: ['#1743b8', '#4f93f0', '#bfe3ff'], below: ['#9ccf9a', '#1d5a38'],
            sun: { az: 28, el: 24, col: '#fff3c9', r: 90 }, clouds: 1, stars: 0,
            fog: '#bfe3ff', fogStart: 80, fogEnd: 360,
            terrain: { kind: 'azure', gloss: 0.22, bump: 0.8 },
            fluid: { type: 'water', level: -0.9 },
            scenery: 'towers', body: '#cfd7e6', band: '#9fe6ff', bandI: 2.0,
            key: '#fff1d6', keyI: 2.4, bloom: 0.04
        },
        {   // 1 frost: snowfields, frozen lakes and ice crystals
            name: 'FROST SECTOR', seed: 23,
            sky: ['#274c99', '#7fb4f0', '#e6f5ff'], below: ['#e8f6ff', '#b6d9f0'],
            sun: { az: -30, el: 18, col: '#ffffff', r: 70 }, clouds: 1, stars: 0,
            fog: '#e6f5ff', fogStart: 70, fogEnd: 340,
            terrain: { kind: 'frost', gloss: 0.5, bump: 0.5, emissive: { map: 'crack', col: '#7fdcff', i: 0.7 } },
            fluid: { type: 'ice', level: -0.7 },
            scenery: 'shards', body: '#cfeeff', band: '#8fe3ff', bandI: 1.0,
            shard: { gloss: 0.95, metal: 0.05, emissive: '#5fd0ff', emissiveI: 0.35, hmin: 10, hmax: 34 },
            key: '#f2f8ff', keyI: 2.6, bloom: 0.05
        },
        {   // 2 asteroid belt: deep space and cratered rocks
            name: 'ASTEROID BELT', seed: 37,
            sky: ['#02030d', '#0a0b2a', '#241347'], below: ['#1a0f38', '#05030f'],
            sun: null, planet: { az: -35, el: 14, col: '#d7743c', r: 230 }, clouds: 0, stars: 1,
            nebula: [['#7a2cc0', 0.5, 40, 12], ['#1f64d8', 0.4, -80, 30], ['#d8307a', 0.3, 130, -8]],
            fog: '#120a2c', fogStart: 90, fogEnd: 380,
            scenery: 'rocks', body: '#a39a90', band: '#ffb070', bandI: 0.8,
            key: '#ffe9d0', keyI: 2.8, bloom: 0.05
        },
        {   // 3 crimson canyon: basalt, lava rivers and obsidian spires
            name: 'CRIMSON CANYON', seed: 41,
            sky: ['#1c0505', '#8a1e12', '#ff8a3a'], below: ['#ff7a2a', '#2a0a08'],
            sun: { az: 10, el: 8, col: '#ffd9a0', r: 140 }, clouds: 0, stars: 0, smoke: 1,
            fog: '#b8421a', fogStart: 60, fogEnd: 320,
            terrain: { kind: 'crimson', gloss: 0.3, bump: 1.0, emissive: { map: 'crack', col: '#ff5a1a', i: 1.5 } },
            fluid: { type: 'lava', level: -1.0 },
            scenery: 'shards', body: '#2a1818', band: '#ff6a1c', bandI: 2.0,
            shard: { gloss: 0.88, metal: 0.5, emissive: '#ff4a10', emissiveI: 0.06, hmin: 12, hmax: 34, lava: true },
            key: '#ffcfa0', keyI: 2.2, bloom: 0.07
        },
        {   // 4 neon: synthwave grid mountains
            name: 'NEON NEBULA', seed: 53,
            sky: ['#0a0030', '#4a0f8a', '#ff4fa8'], below: ['#c0307a', '#12002e'],
            sun: { az: 0, el: 6, col: '#ffe36b', r: 170 }, clouds: 0, stars: 1,
            nebula: [['#00e5ff', 0.22, -60, 40], ['#ff2fa0', 0.3, 80, 20]],
            fog: '#6a1a9a', fogStart: 80, fogEnd: 350,
            terrain: { kind: 'neon', gloss: 0.6, bump: 0.2, emissive: { map: 'grid', col: '#27e8ff', i: 2.6 } },
            scenery: 'towers', body: '#2a1470', band: '#ff35b0', bandI: 3.0,
            key: '#ffd0f0', keyI: 2.0, bloom: 0.09
        },
        {   // 5 sunset ridge: dunes, mesas and amethyst crystals
            name: 'SUNSET RIDGE', seed: 67,
            sky: ['#3a2a8c', '#d8628a', '#ffc27a'], below: ['#f5a45a', '#5a2a22'],
            sun: { az: -12, el: 7, col: '#fff0b0', r: 160 }, clouds: 1, stars: 0,
            fog: '#f5b37a', fogStart: 70, fogEnd: 330,
            terrain: { kind: 'sunset', gloss: 0.18, bump: 0.9 },
            scenery: 'shards', body: '#a45cd8', band: '#7af0ff', bandI: 1.8,
            shard: { gloss: 0.9, metal: 0.1, emissive: '#d070ff', emissiveI: 0.7, hmin: 8, hmax: 26 },
            key: '#ffd9a8', keyI: 2.5, bloom: 0.06
        }
    ];

    const S = {
        ready: false, app: null, device: null, theme: -1,
        time: 0, dist: 0, camX: 0, camY: 0, fpsAcc: 0, fpsN: 0, quality: 2
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

    /* ---------- noise and procedural textures ---------- */
    const hash2 = (ix, iy, s) => {
        let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(s, 2147483647);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const hash3 = (ix, iy, iz, s) => {
        let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(iz, 1274126177) ^ Math.imul(s, 2147483647);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    function vnoise(x, y, s) {
        const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
        const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
        const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
        return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    }
    function vnoise3(x, y, z, s) {
        const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
        const fx = x - ix, fy = y - iy, fz = z - iz;
        const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
        const l = (a, b, t) => a + (b - a) * t;
        return l(
            l(l(hash3(ix, iy, iz, s), hash3(ix + 1, iy, iz, s), ux), l(hash3(ix, iy + 1, iz, s), hash3(ix + 1, iy + 1, iz, s), ux), uy),
            l(l(hash3(ix, iy, iz + 1, s), hash3(ix + 1, iy, iz + 1, s), ux), l(hash3(ix, iy + 1, iz + 1, s), hash3(ix + 1, iy + 1, iz + 1, s), ux), uy),
            uz);
    }
    function fbm(x, y, s, oct) {
        let sum = 0, a = 0.5, f = 1, n = 0;
        for (let i = 0; i < oct; i++) { sum += a * vnoise(x * f, y * f, s + i * 17); n += a; a *= 0.5; f *= 2.03; }
        return sum / n;
    }
    function ridge(x, y, s, oct) {
        let sum = 0, a = 0.5, f = 1, n = 0;
        for (let i = 0; i < oct; i++) {
            const v = 1 - Math.abs(2 * vnoise(x * f, y * f, s + i * 23) - 1);
            sum += a * v * v; n += a; a *= 0.5; f *= 2.1;
        }
        return sum / n;
    }
    const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

    // tileable value noise, for textures that repeat without seams
    function pnoise(x, y, per, s) {
        const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
        const w = (i) => ((i % per) + per) % per;
        const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
        const a = hash2(w(ix), w(iy), s), b = hash2(w(ix + 1), w(iy), s), c = hash2(w(ix), w(iy + 1), s), d = hash2(w(ix + 1), w(iy + 1), s);
        return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    }
    function pfbm(x, y, per, s, oct) {
        let sum = 0, a = 0.5, f = 1, n = 0;
        for (let i = 0; i < oct; i++) { sum += a * pnoise(x * f, y * f, per * f, s + i); n += a; a *= 0.5; f *= 2; }
        return sum / n;
    }

    function dataTex(name, n, data, srgb) {
        const t = makeTex(name, n, n, srgb, true, true);
        t.lock().set(data);
        t.unlock();
        return t;
    }

    function normalFromHeight(h, n, strength) {
        const out = new Uint8Array(n * n * 4);
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                const dx = (h[y * n + (x + 1) % n] - h[y * n + (x + n - 1) % n]) * strength;
                const dy = (h[((y + 1) % n) * n + x] - h[((y + n - 1) % n) * n + x]) * strength;
                const l = Math.sqrt(dx * dx + dy * dy + 1);
                const i = (y * n + x) * 4;
                out[i] = (-dx / l * 0.5 + 0.5) * 255;
                out[i + 1] = (dy / l * 0.5 + 0.5) * 255;
                out[i + 2] = (1 / l * 0.5 + 0.5) * 255;
                out[i + 3] = 255;
            }
        }
        return out;
    }

    function buildTextures() {
        const N = 256;
        const T = {};
        const hgt = new Float32Array(N * N), rip = new Float32Array(N * N);
        const alb = new Uint8Array(N * N * 4), crack = new Uint8Array(N * N * 4), thin = new Uint8Array(N * N * 4);
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                const u = x / N, v = y / N, i = y * N + x;
                const h = pfbm(u * 8, v * 8, 8, 5, 4) * 0.65 + pfbm(u * 32, v * 32, 32, 9, 2) * 0.35;
                hgt[i] = h;
                rip[i] = pfbm(u * 6, v * 6, 6, 21, 4);
                const g = clamp(0.58 + h * 0.5 + (hash2(x, y, 3) - 0.5) * 0.12, 0, 1) * 255;
                alb[i * 4] = alb[i * 4 + 1] = alb[i * 4 + 2] = g; alb[i * 4 + 3] = 255;
                // glowing cracks: bright where ridged noise peaks, with a soft halo
                const r = 1 - Math.abs(2 * pfbm(u * 5, v * 5, 5, 31, 4) - 1);
                const c = Math.pow(sstep(0.86, 0.985, r), 1.2) + 0.18 * sstep(0.7, 0.9, r) + 0.06 * h;
                const cv = clamp(c, 0, 1) * 255;
                crack[i * 4] = crack[i * 4 + 1] = crack[i * 4 + 2] = cv; crack[i * 4 + 3] = 255;
                const tv = (Math.pow(sstep(0.94, 0.992, r), 1.3) * 0.95 + 0.04 * sstep(0.85, 0.94, r)) * 255;
                thin[i * 4] = thin[i * 4 + 1] = thin[i * 4 + 2] = tv; thin[i * 4 + 3] = 255;
            }
        }
        T.detail = dataTex('detail', N, alb, true);
        T.detailN = dataTex('detailN', N, normalFromHeight(hgt, N, 5), false);
        T.rippleN = dataTex('rippleN', N, normalFromHeight(rip, N, 3.2), false);
        T.crack = dataTex('crack', N, crack, true);
        T.crackThin = dataTex('crackThin', N, thin, true);

        // lit windows and panel lines for towers
        const wd = newCanvas(N, N), we = newCanvas(N, N);
        const d = wd.getContext('2d'), e = we.getContext('2d');
        d.fillStyle = '#c9ccd4'; d.fillRect(0, 0, N, N);
        e.fillStyle = '#000'; e.fillRect(0, 0, N, N);
        const rr = rng(9);
        for (let cy = 0; cy < 8; cy++) {
            for (let cx = 0; cx < 8; cx++) {
                const x0 = cx * 32, y0 = cy * 32;
                d.fillStyle = 'rgba(40,46,60,0.55)'; d.fillRect(x0, y0, 32, 2); d.fillRect(x0, y0, 2, 32);
                if (cx === 0 && cy === 0) continue;
                d.fillStyle = '#20283a'; d.fillRect(x0 + 5, y0 + 7, 22, 15);
                d.fillStyle = 'rgba(255,255,255,0.22)'; d.fillRect(x0 + 5, y0 + 7, 22, 3);
                if (rr() < 0.5) {
                    const b = 0.55 + rr() * 0.45;
                    e.fillStyle = `rgba(255,255,255,${b})`; e.fillRect(x0 + 6, y0 + 8, 20, 13);
                }
            }
        }
        T.win = makeTex('win', N, N, true, true, true); T.win.setSource(wd);
        T.winE = makeTex('winE', N, N, true, true, true); T.winE.setSource(we);

        // glowing grid
        const gc = newCanvas(N, N), g = gc.getContext('2d');
        g.fillStyle = '#000'; g.fillRect(0, 0, N, N);
        g.strokeStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 8; g.lineWidth = 4;
        g.strokeRect(0, 0, N, N);
        T.grid = makeTex('grid', N, N, true, true, true); T.grid.setSource(gc);
        return T;
    }

    /* ---------- terrain ---------- */
    const TL = 80, NZ = 32, NX = 72, XSPAN = 420, NT = 8;

    function terrainFns(T) {
        const k = T.terrain.kind, sd = T.seed;
        const lvl = T.fluid ? T.fluid.level : -99;
        const sideOf = (x) => sstep(9, 70, Math.abs(x));
        const cap = (x, y) => Math.min(y, 2.2 + sstep(10, 22, Math.abs(x)) * 90);
        let h;
        if (k === 'azure') {
            h = (x, u) => {
                const sd2 = sideOf(x);
                let y = 0.3 + (fbm(x * 0.02, u * 0.02, sd, 4) - 0.5) * 5 * (0.25 + 0.75 * sd2);
                y += sd2 * sd2 * fbm(x * 0.008 + 9, u * 0.008, sd + 3, 5) * 46 * (0.45 + ridge(x * 0.01, u * 0.01, sd + 7, 3) * 0.9);
                const xr = 15 * Math.sin(u * 0.012 + sd) + 8 * Math.sin(u * 0.031 + 1.7);
                const d = (x - xr) / 6.5;
                y -= 7.5 * Math.exp(-d * d);
                return cap(x, y);
            };
        } else if (k === 'frost') {
            h = (x, u) => {
                const sd2 = sideOf(x);
                let y = 0.3 + (fbm(x * 0.018, u * 0.018, sd, 4) - 0.5) * 6 * (0.3 + 0.7 * sd2);
                y += sd2 * sd2 * 52 * ridge(x * 0.011, u * 0.011, sd + 5, 4) * fbm(x * 0.006, u * 0.006, sd + 9, 3);
                y -= 6.5 * sstep(0.58, 0.72, fbm(x * 0.013, u * 0.013, sd + 11, 3));
                return cap(x, y);
            };
        } else if (k === 'crimson') {
            h = (x, u) => {
                const sd2 = sideOf(x);
                let y = 0.4 + (fbm(x * 0.03, u * 0.03, sd, 4) - 0.5) * 4.5 * (0.3 + 0.7 * sd2);
                y += sd2 * sd2 * 58 * ridge(x * 0.012, u * 0.012, sd + 4, 5);
                const xr = 17 * Math.sin(u * 0.015 + sd) + 9 * Math.sin(u * 0.037 + 2);
                const d = (x - xr) / 5;
                y -= 8.5 * Math.exp(-d * d);
                y -= 7 * sstep(0.64, 0.74, fbm(x * 0.02 + 5, u * 0.02, sd + 13, 3));
                return cap(x, y);
            };
        } else if (k === 'neon') {
            h = (x, u) => {
                const sd2 = sideOf(x);
                const y = 0.2 + Math.pow(sd2, 1.5) * 44 * (0.3 + ridge(x * 0.014, u * 0.014, sd + 2, 3)) + Math.sin(u * 0.2) * 0.12;
                return cap(x, y);
            };
        } else {
            h = (x, u) => {
                const sd2 = sideOf(x);
                const warp = fbm(x * 0.01, u * 0.01, sd, 3) * 3;
                let y = 0.3 + 9 * (0.5 + 0.5 * Math.sin(u * 0.05 + warp)) * (0.1 + 0.9 * sd2) + 1.6 * (0.5 + 0.5 * Math.sin(u * 0.05 + warp)) + (fbm(x * 0.03, u * 0.03, sd + 3, 3) - 0.5) * 1.5;
                const m = sstep(0.6, 0.66, fbm(x * 0.009 + 4, u * 0.009, sd + 6, 3));
                y += sd2 * (14 + 22 * ridge(x * 0.02, u * 0.02, sd + 8, 3)) * m + sd2 * sd2 * 14 * fbm(x * 0.01, u * 0.01, sd + 12, 3);
                return cap(x, y);
            };
        }

        const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
        const colour = (x, u, y, nx, ny, nz) => {
            const slope = 1 - ny;
            const n1 = fbm(x * 0.09, u * 0.09, sd + 40, 2), n2 = fbm(x * 0.03, u * 0.03, sd + 50, 2);
            if (k === 'azure') {
                if (y < lvl + 0.7) return mixc([196, 182, 134], [150, 134, 96], n1);
                if (y > 30) return [240, 244, 250];
                if (slope > 0.42 || y > 20) return mixc([118, 114, 108], [150, 144, 134], n1);
                let c = mixc([52, 118, 46], [96, 152, 58], n1);
                if (n2 > 0.6) c = mixc(c, [28, 78, 38], (n2 - 0.6) * 4);
                if (y > 12) c = mixc(c, [140, 134, 120], sstep(12, 20, y));
                return c;
            }
            if (k === 'frost') {
                if (slope > 0.5) return mixc([84, 100, 124], [120, 138, 160], n1);
                let c = mixc([212, 228, 244], [172, 202, 232], n1);
                if (y < lvl + 0.8) c = mixc(c, [130, 176, 220], 0.7);
                if (y > 26) c = [232, 240, 250];
                return c;
            }
            if (k === 'crimson') {
                if (y < lvl + 1.2) return [150, 44, 14];
                if (slope > 0.45) return mixc([84, 46, 36], [112, 62, 44], n1);
                let c = mixc([34, 24, 26], [62, 38, 34], n1);
                if (y > 28) c = mixc(c, [90, 80, 80], sstep(28, 40, y));
                return c;
            }
            if (k === 'neon') {
                const m = sstep(2, 26, y);
                return mixc([26, 10, 54], [60, 20, 110], m * 0.8 + n1 * 0.2);
            }
            // sunset
            const lit = clamp(0.5 + nx * -1.6 + (y - 3) * 0.04, 0.02, 1);
            if (slope > 0.5) return mixc([138, 66, 56], [168, 88, 70], n1);
            return mixc(mixc([92, 44, 40], [240, 168, 98], lit), [248, 196, 126], n2 * 0.35);
        };
        return { h, colour };
    }

    function makeTerrainTile(k) {
        const nv = (NX + 1) * (NZ + 1);
        const tile = {
            k, pos: new Float32Array(nv * 3), nor: new Float32Array(nv * 3), uv: new Float32Array(nv * 2), col: new Uint8Array(nv * 4),
            mesh: new pc.Mesh(S.device), entity: null
        };
        const idx = new Uint16Array(NX * NZ * 6);
        let q = 0;
        for (let j = 0; j < NZ; j++) {
            for (let i = 0; i < NX; i++) {
                const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
                // viewed from above: z runs away from the camera as j grows, so wind to face up
                idx[q++] = a; idx[q++] = b; idx[q++] = c;
                idx[q++] = b; idx[q++] = d; idx[q++] = c;
            }
        }
        genTile(tile);
        tile.mesh.setIndices(idx);
        tile.mesh.update(pc.PRIMITIVE_TRIANGLES);
        tile.entity = entityWith(tile.mesh, S.terrainMat, { castShadows: false, receiveShadows: true });
        S.terrainRoot.addChild(tile.entity);
        return tile;
    }

    // Fills rows j0..j1 of a tile for ground position k. Large tiles are filled a few rows per frame (see updateTerrain).
    function genRows(tile, k, j0, j1) {
        const tf = S.tf, { pos, nor, uv, col: cc } = tile;
        for (let j = j0; j <= j1; j++) {
            const ul = j * TL / NZ, u = k * TL + ul;
            let v = j * (NX + 1);
            for (let i = 0; i <= NX; i++) {
                const t = i / NX * 2 - 1;
                const x = Math.sign(t) * Math.pow(Math.abs(t), 1.9) * XSPAN;
                const y = tf.h(x, u);
                const e = 0.9;
                const hx = (tf.h(x + e, u) - y) / e;
                const hz = (tf.h(x, u + e) - y) / e;
                const il = 1 / Math.sqrt(hx * hx + 1 + hz * hz);
                const nx = -hx * il, ny = il, nz = hz * il;
                pos[v * 3] = x; pos[v * 3 + 1] = C.GY + y; pos[v * 3 + 2] = -ul;
                nor[v * 3] = nx; nor[v * 3 + 1] = ny; nor[v * 3 + 2] = nz;
                uv[v * 2] = x / 12; uv[v * 2 + 1] = u / 12;
                const c = tf.colour(x, u, y, nx, ny, nz);
                cc[v * 4] = c[0]; cc[v * 4 + 1] = c[1]; cc[v * 4 + 2] = c[2]; cc[v * 4 + 3] = 255;
                v++;
            }
        }
    }

    function uploadTile(tile) {
        const m = tile.mesh;
        m.setPositions(tile.pos); m.setNormals(tile.nor); m.setUvs(0, tile.uv); m.setColors32(tile.col);
    }

    function genTile(tile) {
        genRows(tile, tile.k, 0, NZ);
        uploadTile(tile);
    }

    function buildGround() {
        S.tex = buildTextures();
        S.terrainRoot = new pc.Entity('terrain');
        S.app.root.addChild(S.terrainRoot);
        S.terrainMat = std({
            diffuse: new pc.Color(1, 1, 1), diffuseVertexColor: true, diffuseMap: S.tex.detail,
            normalMap: S.tex.detailN, bumpiness: 0.8, metalness: 0, gloss: 0.3,
            emissive: new pc.Color(0, 0, 0)
        });
        S.tiles = [];

        const size = 1000, ft = 16;
        S.FLUID_SIZE = size; S.FLUID_TILE = ft;
        S.fluidMat = std({
            diffuse: new pc.Color(0.02, 0.1, 0.18), normalMap: S.tex.rippleN, bumpiness: 0.6, metalness: 0, gloss: 0.95,
            diffuseMapTiling: new pc.Vec2(size / ft, size / ft), normalMapTiling: new pc.Vec2(size / ft, size / ft),
            emissiveMapTiling: new pc.Vec2(size / ft / 1.5, size / ft / 1.5)
        });
        const mesh = pc.Mesh.fromGeometry(S.device, new pc.PlaneGeometry({ halfExtents: new pc.Vec2(size / 2, size / 2) }));
        S.fluid = entityWith(mesh, S.fluidMat, { castShadows: false, receiveShadows: true });
        S.app.root.addChild(S.fluid);
    }

    function setupTerrain(T) {
        S.terrainRoot.enabled = !!T.terrain;
        S.fluid.enabled = !!T.fluid;
        if (!T.terrain) return;
        const tp = T.terrain, tm = S.terrainMat;
        tm.gloss = tp.gloss; tm.bumpiness = tp.bump;
        if (tp.emissive) {
            tm.emissiveMap = tp.emissive.map === 'grid' ? S.tex.grid : S.tex.crackThin;
            tm.emissive = col(tp.emissive.col);
            tm.emissiveIntensity = tp.emissive.i;
            const rep = tp.emissive.map === 'grid' ? 2 : 0.5;
            tm.emissiveMapTiling = new pc.Vec2(rep, rep);
        } else {
            tm.emissiveMap = null; tm.emissive = new pc.Color(0, 0, 0); tm.emissiveIntensity = 1;
        }
        tm.update();

        S.tf = terrainFns(T);
        const k0 = Math.floor((S.dist - 40) / TL);
        for (let i = 0; i < NT; i++) {
            if (S.tiles[i]) { S.tiles[i].k = k0 + i; S.tiles[i].pending = null; genTile(S.tiles[i]); S.tiles[i].mesh.update(pc.PRIMITIVE_TRIANGLES); }
            else S.tiles.push(makeTerrainTile(k0 + i));
        }

        const f = T.fluid, fm = S.fluidMat;
        if (f) {
            if (f.type === 'water') {
                fm.diffuse = col('#0a3a5a'); fm.gloss = 0.96; fm.metalness = 0.0; fm.bumpiness = 0.7;
                fm.emissiveMap = null; fm.emissive = new pc.Color(0, 0, 0);
            } else if (f.type === 'ice') {
                fm.diffuse = col('#8cc8ea'); fm.gloss = 0.92; fm.metalness = 0.05; fm.bumpiness = 0.15;
                fm.emissiveMap = null; fm.emissive = new pc.Color(0, 0, 0);
            } else {
                fm.diffuse = col('#1a0804'); fm.gloss = 0.45; fm.metalness = 0; fm.bumpiness = 0.4;
                fm.emissiveMap = S.tex.crack; fm.emissive = col('#ff6a1c'); fm.emissiveIntensity = 3.2;
            }
            fm.update();
        }
    }

    function updateTerrain(camX, dist) {
        S.dist = dist;
        if (S.T.terrain) {
            let budget = 7;   // rows of terrain to generate this frame
            for (const t of S.tiles) {
                if (t.pending) {
                    if (budget > 0) {
                        const j1 = Math.min(NZ, t.pending.j + budget - 1);
                        genRows(t, t.pending.k, t.pending.j, j1);
                        budget -= j1 - t.pending.j + 1;
                        t.pending.j = j1 + 1;
                        if (t.pending.j > NZ) {
                            t.k = t.pending.k; t.pending = null;
                            uploadTile(t); t.mesh.update(pc.PRIMITIVE_TRIANGLES);
                        }
                    }
                } else if (dist - t.k * TL - TL > 40) {
                    t.pending = { k: t.k + NT, j: 0 };
                }
                const z = dist - t.k * TL;
                t.entity.enabled = !(t.pending && z - TL > 40);
                t.entity.setPosition(0, 0, z);
            }
        }
        if (S.T.fluid) {
            const ft = S.FLUID_TILE, fm = S.fluidMat;
            S.fluid.setPosition(camX, C.GY + S.T.fluid.level, -S.FLUID_SIZE / 2 + 80);
            const ou = camX / ft, ov = -dist / ft + S.time * 0.02;
            fm.diffuseMapOffset.set(ou, ov); fm.normalMapOffset.set(ou + S.time * 0.01, ov * 1.3); fm.emissiveMapOffset.set(ou, ov * 0.6);
            fm.update();
        }
    }

    function terrainY(x, u) { return S.T.terrain ? C.GY + S.tf.h(x, u) : C.GY; }

    /* ---------- sky and theme switching ---------- */
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

        S.shadowBlob.enabled = !!T.terrain;
        setupTerrain(T);
        buildScenery(T);
        resetStreaks(T);
    }

    /* ---------- scenery ---------- */
    function boxMeshUV(w, h, d, tile) {
        const hx = w / 2, hz = d / 2;
        const pos = [], nor = [], uv = [], idx = [];
        const face = (verts, n, uvs) => {
            const b = pos.length / 3;
            verts.forEach((v) => { pos.push(...v); nor.push(...n); });
            uvs.forEach((t) => uv.push(...t));
            idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
        };
        const uw = w / tile, ud = d / tile, vh = h / tile;
        face([[-hx, 0, hz], [hx, 0, hz], [hx, h, hz], [-hx, h, hz]], [0, 0, 1], [[0, 0], [uw, 0], [uw, vh], [0, vh]]);
        face([[hx, 0, -hz], [-hx, 0, -hz], [-hx, h, -hz], [hx, h, -hz]], [0, 0, -1], [[0, 0], [uw, 0], [uw, vh], [0, vh]]);
        face([[hx, 0, hz], [hx, 0, -hz], [hx, h, -hz], [hx, h, hz]], [1, 0, 0], [[0, 0], [ud, 0], [ud, vh], [0, vh]]);
        face([[-hx, 0, -hz], [-hx, 0, hz], [-hx, h, hz], [-hx, h, -hz]], [-1, 0, 0], [[0, 0], [ud, 0], [ud, vh], [0, vh]]);
        face([[-hx, h, hz], [hx, h, hz], [hx, h, -hz], [-hx, h, -hz]], [0, 1, 0], [[0.02, 0.02], [0.02, 0.02], [0.02, 0.02], [0.02, 0.02]]);
        face([[-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz]], [0, -1, 0], [[0.02, 0.02], [0.02, 0.02], [0.02, 0.02], [0.02, 0.02]]);
        const m = new pc.Mesh(S.device);
        m.setPositions(pos); m.setNormals(nor); m.setUvs(0, uv); m.setIndices(idx); m.update();
        return m;
    }

    function shardMesh(seed) {
        const r = rng(seed), n = 6;
        const base = [], mid = [];
        for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2 + (r() - 0.5) * 0.35;
            const a2 = (i + 0.5) / n * Math.PI * 2 + (r() - 0.5) * 0.35;
            const rb = 0.8 + r() * 0.4, rm = 0.6 + r() * 0.3;
            base.push([Math.cos(a) * rb, 0, Math.sin(a) * rb]);
            mid.push([Math.cos(a2) * rm, 0.55 + (r() - 0.5) * 0.12, Math.sin(a2) * rm]);
        }
        const apex = [(r() - 0.5) * 0.3, 1, (r() - 0.5) * 0.3];
        const tris = [];
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            tris.push([base[i], base[j], mid[j]], [base[i], mid[j], mid[i]], [mid[i], mid[j], apex]);
        }
        return facetMesh(tris, [0, 0.45, 0]);
    }

    function asteroidMesh(seed) {
        const g = new pc.SphereGeometry({ radius: 1, latitudeBands: 22, longitudeBands: 30 });
        const r = rng(seed);
        const craters = [];
        for (let i = 0; i < 7; i++) {
            const a = r() * 6.2832, b = Math.acos(r() * 2 - 1);
            craters.push({ x: Math.sin(b) * Math.cos(a), y: Math.cos(b), z: Math.sin(b) * Math.sin(a), rad: 0.28 + r() * 0.3, dep: 0.1 + r() * 0.12 });
        }
        const pos = g.positions;
        const sq = [0.9 + r() * 0.3, 0.7 + r() * 0.3, 0.85 + r() * 0.3];
        for (let i = 0; i < pos.length; i += 3) {
            const x = pos[i], y = pos[i + 1], z = pos[i + 2];
            let d = 0.8 + 0.45 * (vnoise3(x * 1.5 + seed, y * 1.5, z * 1.5, 5) * 0.65 + vnoise3(x * 3.7, y * 3.7 + seed, z * 3.7, 9) * 0.35);
            for (const c of craters) {
                const ang = Math.acos(clamp(x * c.x + y * c.y + z * c.z, -1, 1));
                if (ang < c.rad) { const t = ang / c.rad; d -= c.dep * (1 - t * t) * (1 - t * 0.3); }
                else if (ang < c.rad * 1.25) d += c.dep * 0.25 * (1 - (ang - c.rad) / (c.rad * 0.25));
            }
            pos[i] = x * d * sq[0]; pos[i + 1] = y * d * sq[1]; pos[i + 2] = z * d * sq[2];
        }
        // smooth normals, welded across the texture seam
        const acc = new Map(), ind = g.indices;
        const key = (i) => pos[i * 3].toFixed(4) + ',' + pos[i * 3 + 1].toFixed(4) + ',' + pos[i * 3 + 2].toFixed(4);
        for (let f = 0; f < ind.length; f += 3) {
            const a = ind[f], b = ind[f + 1], c = ind[f + 2];
            const ab = [pos[b * 3] - pos[a * 3], pos[b * 3 + 1] - pos[a * 3 + 1], pos[b * 3 + 2] - pos[a * 3 + 2]];
            const ac = [pos[c * 3] - pos[a * 3], pos[c * 3 + 1] - pos[a * 3 + 1], pos[c * 3 + 2] - pos[a * 3 + 2]];
            const n = cross(ab, ac);
            for (const v of [a, b, c]) {
                const k = key(v);
                const e = acc.get(k) || [0, 0, 0];
                e[0] += n[0]; e[1] += n[1]; e[2] += n[2];
                acc.set(k, e);
            }
        }
        const nor = new Array(pos.length);
        for (let i = 0; i < pos.length / 3; i++) {
            const e = acc.get(key(i)), l = Math.hypot(e[0], e[1], e[2]) || 1;
            nor[i * 3] = e[0] / l; nor[i * 3 + 1] = e[1] / l; nor[i * 3 + 2] = e[2] / l;
        }
        g.normals = nor;
        return pc.Mesh.fromGeometry(S.device, g);
    }

    function buildScenery(T) {
        if (S.sceneryRoot) S.sceneryRoot.destroy();
        S.sceneryRoot = new pc.Entity('scenery');
        S.app.root.addChild(S.sceneryRoot);
        S.items = [];
        const kind = T.scenery;
        const count = kind === 'rocks' ? 26 : 22;
        let bodyMat, glowM, shardMeshes, rockMeshes, lavaMat;
        if (kind === 'towers') {
            bodyMat = std({
                diffuse: col(T.body), diffuseMap: S.tex.win, emissiveMap: S.tex.winE, emissive: col(T.band), emissiveIntensity: T.bandI,
                metalness: 0.55, gloss: 0.62
            });
            glowM = glowMat(T.band, 4);
        } else if (kind === 'shards') {
            const sh = T.shard;
            bodyMat = std({ diffuse: col(T.body), metalness: sh.metal, gloss: sh.gloss, emissive: col(sh.emissive), emissiveIntensity: sh.emissiveI });
            if (sh.lava) lavaMat = glowMat('#ff5a14', 2.4, { useFog: true });
            shardMeshes = [0, 1, 2, 3, 4, 5].map((i) => shardMesh(T.seed * 10 + i));
        } else {
            bodyMat = std({
                diffuse: col(T.body), diffuseMap: S.tex.detail, normalMap: S.tex.detailN, bumpiness: 1.4, metalness: 0.08, gloss: 0.3,
                diffuseMapTiling: new pc.Vec2(3, 2), normalMapTiling: new pc.Vec2(3, 2)
            });
            rockMeshes = [0, 1, 2, 3, 4, 5].map((i) => asteroidMesh(T.seed * 10 + i));
        }
        for (let i = 0; i < count; i++) {
            const root = new pc.Entity('item');
            const it = { root, kind, parts: [], u: 0 };
            if (kind === 'towers') {
                let y = 0, w = rand(4.5, 8), dd = rand(4.5, 8);
                const tiers = 2 + ((Math.random() * 2) | 0);
                for (let t = 0; t < tiers; t++) {
                    const h = t === 0 ? rand(12, 28) : rand(5, 12);
                    const m = boxMeshUV(w, h, dd, 8);
                    const e = entityWith(m, bodyMat, { castShadows: true, receiveShadows: true });
                    e.setLocalPosition(0, y, 0);
                    root.addChild(e);
                    // glowing trim at the top of each tier
                    const trim = prim('box', glowM, { castShadows: false });
                    trim.setLocalScale(w + 0.25, 0.3, dd + 0.25); trim.setLocalPosition(0, y + h, 0);
                    root.addChild(trim);
                    y += h; w *= rand(0.55, 0.8); dd *= rand(0.55, 0.8);
                }
                const ant = prim('cone', bodyMat, { castShadows: false });
                ant.setLocalScale(0.5, 7, 0.5); ant.setLocalPosition(0, y + 3.5, 0);
                root.addChild(ant);
                const tip = prim('sphere', glowM, { castShadows: false });
                tip.setLocalScale(0.7, 0.7, 0.7); tip.setLocalPosition(0, y + 7.2, 0);
                root.addChild(tip);
                it.h = y;
            } else if (kind === 'shards') {
                const sh = T.shard, n = 3 + ((Math.random() * 3) | 0);
                for (let k = 0; k < n; k++) {
                    const e = entityWith(shardMeshes[(Math.random() * 6) | 0], bodyMat, { castShadows: true, receiveShadows: false });
                    const h = k === 0 ? rand(sh.hmin, sh.hmax) : rand(sh.hmin * 0.35, sh.hmax * 0.6), w = rand(1.6, 3.2) * (h > 20 ? 1.4 : 1);
                    e.setLocalScale(w, h, w);
                    e.setLocalPosition(k === 0 ? 0 : rand(-3, 3), -0.5, k === 0 ? 0 : rand(-3, 3));
                    e.setLocalEulerAngles(k === 0 ? rand(-6, 6) : rand(-18, 18), rand(0, 360), k === 0 ? rand(-6, 6) : rand(-18, 18));
                    root.addChild(e);
                }
                if (lavaMat) {
                    const m = prim('cone', lavaMat, { castShadows: false });
                    m.setLocalScale(8, 1.4, 8); m.setLocalPosition(0, 0.2, 0);
                    root.addChild(m);
                }
            } else {
                it.body = entityWith(rockMeshes[i % 6], bodyMat, { castShadows: true });
                root.addChild(it.body);
                it.spin = new pc.Vec3(rand(-25, 25), rand(-35, 35), rand(-25, 25));
            }
            S.sceneryRoot.addChild(root);
            S.items.push(it);
            placeItem(it, rand(-310, 18));
        }
    }

    function placeItem(it, z) {
        const T = S.T;
        const u = S.dist - z;
        let x = 0, y = C.GY;
        for (let tries = 0; tries < 8; tries++) {
            x = (Math.random() < 0.5 ? -1 : 1) * rand(it.kind === 'rocks' ? 14 : 17, it.kind === 'rocks' ? 62 : 64);
            if (it.kind === 'rocks') break;
            y = terrainY(x, u);
            if (!T.fluid || y > C.GY + T.fluid.level + 1.2) break;
        }
        it.u = u;
        it.root.enabled = true;
        const s = it.kind === 'rocks' ? rand(1.5, 7.5) : rand(0.85, 1.3);
        if (it.kind === 'rocks') {
            it.root.setPosition(x * (Math.random() < 0.25 ? 0.45 : 1), rand(-12, 22), z);
            it.body.setLocalScale(s, s, s);
            it.root.setEulerAngles(rand(0, 360), rand(0, 360), rand(0, 360));
            it.y = it.root.getPosition().y;
            it.x = it.root.getPosition().x;
        } else {
            it.x = x; it.y = y;
            it.root.setPosition(x, y - 0.3, z);
            it.root.setLocalScale(s, s, s);
            it.root.setEulerAngles(0, rand(0, 360), 0);
        }
    }

    function updateScenery(dt) {
        for (const it of S.items) {
            const z = S.dist - it.u;
            it.root.setPosition(it.x, it.kind === 'rocks' ? it.y : it.y - 0.3, z);
            if (it.spin) it.root.rotate(it.spin.x * dt, it.spin.y * dt, it.spin.z * dt);
            if (z > 26) placeItem(it, -rand(290, 340));
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
        const space = !T.terrain;
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
                s.x = rand(-45, 45); s.y = S.T.terrain ? rand(C.GY + 1, 30) : rand(-25, 30);
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
        player: { tint: '#ffffff', paint: '#d6232a', trim: '#f0b72a', glass: '#1aa8ff', flame: '#ff9a3a', span: 17, sweep: 1.0, bw: 1.0, len: 1.0, fin: 7.2 },
        spark: { name: 'SPARK', tint: '#4fffe0', paint: '#10c9b4', trim: '#f4f8ff', glass: '#8cff5e', flame: '#59f0ff', span: 15, sweep: 0.8, bw: 0.95, len: 1.05, fin: 8.4 },
        nova: { name: 'NOVA', tint: '#a98bff', paint: '#7d4dff', trim: '#ffc94a', glass: '#ff7ad8', flame: '#ff6bd6', span: 13, sweep: 1.25, bw: 1.28, len: 0.92, fin: 6.2 },
        orbit: { name: 'ORBIT', tint: '#ffa24a', paint: '#ff8a1f', trim: '#ffffff', glass: '#4ad0ff', flame: '#ffd25a', span: 19, sweep: 1.45, bw: 0.86, len: 1.2, fin: 7.8 }
    };

    function makeProcCraft(st) {
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

        const setFlame = (k) => {
            for (const f of flames) {
                f.fl.setLocalScale(f.centre ? 1.1 : 1.5, (f.centre ? 5 : 7) * k, f.centre ? 1.1 : 1.5);
                if (f.core) f.core.setLocalScale(0.8, 5.2 * k, 0.8);
            }
        };
        return { model, flames, strobeMat, flameMat, setFlame };
    }

    /* The F-2 jet fighter model from the engine's example assets (CC BY 4.0, see README). It faces +X in the
       file, so it is turned to fly down -Z. If the model could not be loaded the hand built craft is used. */
    const JET = { centre: [2.55, 0.58, 0], tail: -4.45, scale: 0.33 };

    function makeJetCraft(st) {
        const model = new pc.Entity('craftModel');
        const holder = new pc.Entity('holder');
        holder.setLocalScale(JET.scale, JET.scale, JET.scale);
        holder.setLocalEulerAngles(0, 90, 0);
        model.addChild(holder);
        const jet = S.jet.resource.instantiateRenderEntity({ castShadows: true, receiveShadows: false });
        jet.setLocalPosition(-JET.centre[0], -JET.centre[1], -JET.centre[2]);
        holder.addChild(jet);
        jet.findComponents('render').forEach((r) => {
            r.meshInstances.forEach((mi) => {
                const m = mi.material.clone();
                if (m.name === 'F-2-airframe') {
                    m.diffuse = col(st.tint);
                    m.clearCoat = 0.5; m.clearCoatGloss = 1;
                } else if (m.name === 'Glass') {
                    m.emissive = col(st.glass); m.emissiveIntensity = 0.12;
                }
                m.update();
                mi.material = m;
            });
        });

        // afterburner at the tail, built in the model's own coordinates
        const flameMat = glowMat(st.flame, 3.4, { blendType: pc.BLEND_ADDITIVE, opacity: 0.85, depthWrite: false });
        const coreMat = glowMat('#eaf6ff', 4.5, { blendType: pc.BLEND_ADDITIVE, opacity: 0.95, depthWrite: false });
        const pivot = new pc.Entity('flame');
        pivot.setLocalPosition(JET.tail + 0.15, 0.55, 0);
        pivot.setLocalEulerAngles(0, 0, 90);
        const fl = prim('cone', flameMat, { castShadows: false });
        const core = prim('cone', coreMat, { castShadows: false });
        pivot.addChild(fl); pivot.addChild(core);
        jet.addChild(pivot);

        const navMats = [glowMat('#ff2a2a', 5), glowMat('#2aff6a', 5)];
        [[-1, 0], [1, 1]].forEach(([sg, i]) => {
            const n = prim('sphere', navMats[i], { castShadows: false });
            n.setLocalScale(0.3, 0.3, 0.3);
            n.setLocalPosition(1.1, 0.35, sg * 4.85);
            jet.addChild(n);
        });
        const strobeMat = glowMat('#ffffff', 6);
        const strobe = prim('sphere', strobeMat, { castShadows: false });
        strobe.setLocalScale(0.28, 0.28, 0.28);
        strobe.setLocalPosition(-3.6, 2.7, 0);
        jet.addChild(strobe);

        const setFlame = (k) => {
            const L = 3.6 * k;
            fl.setLocalScale(1.25, L, 1.25); fl.setLocalPosition(0, L / 2, 0);
            const Lc = 2.4 * k;
            core.setLocalScale(0.42, Lc, 0.42); core.setLocalPosition(0, Lc / 2, 0);
        };
        return { model, flames: [], strobeMat, flameMat, setFlame };
    }

    function makeCraft(st) { return S.jet ? makeJetCraft(st) : makeProcCraft(st); }

    function buildShip() {
        const c = makeCraft(CRAFT.player);
        S.shipRoot = new pc.Entity('ship');
        S.shipModel = c.model;
        S.shipRoot.addChild(c.model);
        S.craft = c;
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
    function callWingman(idx, hold, cb, shipX, opts) {
        const w = S.wing[idx];
        if (!S.ready || !w || w.state !== 'idle') return false;
        opts = opts || {};
        w.state = 'arrive'; w.t = 0; w.hold = hold; w.cb = cb || {};
        w.side = opts.side || (shipX > 0 ? -1 : 1);
        w.ox = opts.ox !== undefined ? opts.ox : w.side * 5.4;
        w.oy = opts.oy !== undefined ? opts.oy : 1.9;
        w.peel = !!opts.peel;
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
            const slot = new pc.Vec3(ship.x + w.ox, ship.y + w.oy + Math.sin(tt * 1.7) * 0.3, 1.8 + Math.cos(tt * 1.1) * 0.35);
            let roll = -w.side * 8 + Math.sin(tt * 1.3) * 5, pitch = Math.sin(tt * 1.7) * 3, yaw = 0, boost = 1, trailLen = 0;

            if (w.state === 'arrive') {
                const D = 1.6;
                if (!w.start) w.start = new pc.Vec3(slot.x + w.side * 12, slot.y + 6, 34);
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
                if (w.peel) w.pos.set(w.pos.x + w.side * (6 + w.t * 18) * dt, w.pos.y + (5 + w.t * 12) * dt, w.pos.z + w.vz * 0.3 * dt);
                else w.pos.set(w.pos.x + w.dx * dt * (1 + w.t), w.pos.y + (1.2 + w.t * 2.4) * dt, w.pos.z + w.vz * dt);
                const roll1 = clamp(w.t / 0.9, 0, 1);
                roll = -w.side * 8 + w.side * 360 * smooth(roll1);
                pitch = 6;
                boost = 3.2;
                trailLen = clamp(-w.vz * 0.12, 4, 40);
                if (w.pos.z < -330 || w.pos.y > 70 || Math.abs(w.pos.x) > 90) { w.state = 'idle'; w.root.enabled = false; continue; }
            }

            w.root.setPosition(w.pos);
            const m = w.craft.model;
            m.setLocalEulerAngles(pitch, yaw, 0);
            m.rotateLocal(0, 0, roll);
            const fl = 0.85 + Math.random() * 0.35;
            w.craft.setFlame(fl * boost);
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
        S.ringMesh = ringMesh;
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

    /* ---------- hazards: meteorites and falling towers ---------- */
    function buildHazards() {
        S.haz = { meteors: [], tower: null };
        const rocks = [asteroidMesh(901), asteroidMesh(902), asteroidMesh(903)];
        const rockMat = std({
            diffuse: col('#7a6556'), diffuseMap: S.tex.detail, normalMap: S.tex.detailN, bumpiness: 1.4, metalness: 0.1, gloss: 0.3,
            emissive: col('#ff4a10'), emissiveIntensity: 0.9,
            diffuseMapTiling: new pc.Vec2(3, 2), normalMapTiling: new pc.Vec2(3, 2)
        });
        const shellMat = glowMat('#ff6a18', 1.6, { blendType: pc.BLEND_ADDITIVE, opacity: 0.2, depthWrite: false });
        const trailMat = glowMat('#ff9a3a', 2.8, { blendType: pc.BLEND_ADDITIVE, opacity: 0.55, depthWrite: false });
        const coreMat = glowMat('#fff2c0', 3.4, { blendType: pc.BLEND_ADDITIVE, opacity: 0.8, depthWrite: false });
        for (let i = 0; i < 3; i++) {
            const root = new pc.Entity('meteor' + i);
            const rock = entityWith(rocks[i], rockMat, { castShadows: false });
            const shell = prim('sphere', shellMat, { castShadows: false });
            shell.setLocalScale(2.5, 2.5, 2.5);
            const pivot = new pc.Entity('trail');
            const trail = prim('cone', trailMat, { castShadows: false });
            trail.setLocalEulerAngles(-90, 0, 0);
            const core = prim('cone', coreMat, { castShadows: false });
            core.setLocalEulerAngles(-90, 0, 0);
            pivot.addChild(trail); pivot.addChild(core);
            root.addChild(rock); root.addChild(shell); root.addChild(pivot);
            root.enabled = false;
            S.app.root.addChild(root);
            S.haz.meteors.push({ root, rock, shell, pivot, trail, core });
        }

        // a tall tower that topples across the lanes
        const mat = std({
            diffuse: col('#c4ccdc'), diffuseMap: S.tex.win, emissiveMap: S.tex.winE, emissive: col('#9fe6ff'), emissiveIntensity: 2,
            metalness: 0.55, gloss: 0.6
        });
        S.haz.towerMat = mat;
        const root = new pc.Entity('fallingTower');
        const tiers = [[5.6, 18, 5.6], [4, 11, 4], [2.6, 6, 2.6]];
        let y = 0;
        const glowM = glowMat('#ff3030', 4);
        for (const [w, h, d] of tiers) {
            const tier = entityWith(boxMeshUV(w, h, d, 8), mat, { castShadows: true });
            tier.setLocalPosition(0, y, 0);
            root.addChild(tier);
            y += h;
        }
        const ant = prim('cone', mat, { castShadows: false });
        ant.setLocalScale(0.5, 8, 0.5); ant.setLocalPosition(0, y + 4, 0); root.addChild(ant);
        const beacon = prim('sphere', glowM, { castShadows: false });
        beacon.setLocalScale(0.9, 0.9, 0.9); beacon.setLocalPosition(0, y + 8.2, 0); root.addChild(beacon);
        S.haz.towerH = y + 8;
        const pivot = new pc.Entity('towerPivot');
        pivot.addChild(root);
        pivot.enabled = false;
        S.app.root.addChild(pivot);
        S.haz.tower = { pivot, beacon, glowM };
    }

    function updateHazards(view) {
        const list = view.hazards || [];
        let mi = 0, tower = null;
        for (const h of list) {
            if (h.type === 'meteor' && mi < S.haz.meteors.length) {
                const m = S.haz.meteors[mi++];
                m.root.enabled = true;
                m.root.setPosition(h.x, h.y, -h.d);
                m.rock.setLocalScale(h.r, h.r, h.r);
                m.rock.setLocalEulerAngles(S.time * 40 + h.seed * 90, S.time * 55, S.time * 25);
                m.shell.setLocalScale(h.r * 1.7, h.r * 1.7, h.r * 1.7);
                // the fire trails back along the path the rock came down
                const dx = h.kx, dy = h.ky, dz = -1, l = Math.hypot(dx, dy, dz);
                m.pivot.setPosition(h.x, h.y, -h.d);
                m.pivot.lookAt(h.x + dx / l, h.y + dy / l, -h.d + dz / l);
                const L = h.r * 11 * (0.9 + Math.random() * 0.2);
                m.trail.setLocalScale(h.r * 2.1, L, h.r * 2.1); m.trail.setLocalPosition(0, 0, -L / 2);
                m.core.setLocalScale(h.r * 1.1, L * 0.6, h.r * 1.1); m.core.setLocalPosition(0, 0, -L * 0.3);
            } else if (h.type === 'tower') {
                tower = h;
            }
        }
        for (; mi < S.haz.meteors.length; mi++) S.haz.meteors[mi].root.enabled = false;
        const t = S.haz.tower;
        if (tower) {
            t.pivot.enabled = true;
            const gy = terrainY(tower.xb, view.dist + tower.d);
            t.pivot.setPosition(tower.xb, gy - 0.4, -tower.d);
            t.pivot.setEulerAngles(0, 0, tower.phi * tower.side);
            t.glowM.emissiveIntensity = (S.time * 3) % 1 < 0.5 ? 5 : 0.5;
        } else {
            t.pivot.enabled = false;
        }
    }

    /* ---------- docking hangar ---------- */
    const HANGAR = { W: 15, H: 10, CY: 0.5, DEPTH: 48 };

    function buildHangar() {
        const { W, H, CY, DEPTH } = HANGAR;
        const root = new pc.Entity('hangar');
        const hull = std({ diffuse: col('#8c97ad'), diffuseMap: S.tex.win, metalness: 0.75, gloss: 0.62 });
        const inner = std({ diffuse: col('#59627a'), metalness: 0.8, gloss: 0.7 });
        const cyan = glowMat('#7fe8ff', 3.6);
        const amber = glowMat('#ffa23a', 3.6);
        const OW = 90;
        const slab = (w, h, d, x, y, z, mat) => {
            const e = entityWith(boxMeshUV(w, h, d, mat ? 8 : 20), mat || hull, { castShadows: true, receiveShadows: true });
            e.setLocalPosition(x, y, z);
            root.addChild(e);
            return e;
        };
        const side = (OW - W) / 2;
        slab(OW, 34, DEPTH, 0, CY + H / 2, -DEPTH / 2);                       // above the bay
        slab(OW, 22, DEPTH, 0, CY - H / 2 - 22, -DEPTH / 2);                  // below the bay
        slab(side, H, DEPTH, -(W / 2 + side / 2), CY - H / 2, -DEPTH / 2);    // left
        slab(side, H, DEPTH, W / 2 + side / 2, CY - H / 2, -DEPTH / 2);       // right
        slab(W, H, 1.5, 0, CY - H / 2, -DEPTH + 0.2, inner);                  // back wall

        // light strips along the tunnel
        const strip = (x, y, w, h, mat) => {
            const e = prim('box', mat, { castShadows: false });
            e.setLocalScale(w, h, DEPTH - 2); e.setLocalPosition(x, y, -DEPTH / 2);
            root.addChild(e);
        };
        const hx = W / 2 - 0.25, top = CY + H / 2 - 0.25, bot = CY - H / 2 + 0.06;
        strip(-hx, top, 0.3, 0.3, cyan); strip(hx, top, 0.3, 0.3, cyan);
        strip(-hx, bot + 0.4, 0.3, 0.3, cyan); strip(hx, bot + 0.4, 0.3, 0.3, cyan);
        strip(-2.6, bot, 0.35, 0.1, amber); strip(2.6, bot, 0.35, 0.1, amber);

        // chasing cross lights
        S.hangarChase = [];
        for (let i = 0; i < 8; i++) {
            const m = glowMat('#7fe8ff', 0.5);
            const z = -3 - i * 5.4;
            const bar = prim('box', m, { castShadows: false });
            bar.setLocalScale(W - 0.8, 0.12, 0.35); bar.setLocalPosition(0, CY + H / 2 - 0.1, z);
            const bar2 = prim('box', m, { castShadows: false });
            bar2.setLocalScale(W - 0.8, 0.12, 0.35); bar2.setLocalPosition(0, bot, z);
            root.addChild(bar); root.addChild(bar2);
            S.hangarChase.push(m);
        }

        // blast doors that slide apart
        S.hangarDoors = [];
        for (const sg of [-1, 1]) {
            const d = slab(W / 2 + 0.3, H, 1.4, sg * W / 4, CY - H / 2, -0.8, inner);
            S.hangarDoors.push({ e: d, sg });
        }

        // approach guide rings and a sign above the bay
        S.hangarRings = [];
        for (let i = 0; i < 6; i++) {
            const m = glowMat('#7fe8ff', 0.5);
            const r = entityWith(S.ringMesh, m, { castShadows: false });
            r.setLocalEulerAngles(90, 0, 0);
            r.setLocalScale(2.35, 2.35, 2.35);
            r.setLocalPosition(0, CY, 12 + i * 22);
            root.addChild(r);
            S.hangarRings.push(m);
        }
        const sign = prim('box', cyan, { castShadows: false });
        sign.setLocalScale(30, 1.6, 0.4); sign.setLocalPosition(0, CY + H / 2 + 5, 0.25);
        root.addChild(sign);
        // amber frame round the bay mouth and light bands across the hull
        const frame = (w, h, x, y) => {
            const f = prim('box', amber, { castShadows: false });
            f.setLocalScale(w, h, 0.5); f.setLocalPosition(x, y, 0.3);
            root.addChild(f);
        };
        frame(W + 1.4, 0.5, 0, CY + H / 2 + 0.25); frame(W + 1.4, 0.5, 0, CY - H / 2 - 0.25);
        frame(0.5, H + 1, -W / 2 - 0.25, CY); frame(0.5, H + 1, W / 2 + 0.25, CY);
        for (const yy of [CY + H / 2 + 12, CY + H / 2 + 20, CY + H / 2 + 28, CY - H / 2 - 8, CY - H / 2 - 16]) {
            const band = prim('box', cyan, { castShadows: false });
            band.setLocalScale(82, 0.35, 0.3); band.setLocalPosition(0, yy, 0.2);
            root.addChild(band);
        }
        S.hangarBeacons = [];
        for (const sx of [-1, 1]) {
            for (const yy of [CY + H / 2 + 30, CY - H / 2 - 18]) {
                const m = glowMat('#ff3030', 4);
                const b = prim('sphere', m, { castShadows: false });
                b.setLocalScale(1.4, 1.4, 1.4); b.setLocalPosition(sx * 42, yy, 0.8);
                root.addChild(b);
                S.hangarBeacons.push(m);
            }
        }
        root.enabled = false;
        S.app.root.addChild(root);
        S.hangar = root;
    }

    function updateHangar(dock) {
        if (!dock || !dock.active) { S.hangar.enabled = false; return; }
        S.hangar.enabled = true;
        S.hangar.setPosition(0, 0, dock.z);
        const open = dock.open, W = HANGAR.W;
        for (const d of S.hangarDoors) d.e.setLocalPosition(d.sg * (W / 4 + open * (W / 2 + 0.6)), HANGAR.CY - HANGAR.H / 2, -0.8);
        const t = S.time;
        S.hangarChase.forEach((m, i) => { m.emissiveIntensity = 0.4 + 3.4 * Math.max(0, Math.sin(t * 6 - i * 0.9)); });
        S.hangarRings.forEach((m, i) => { m.emissiveIntensity = 0.3 + 3.2 * Math.max(0, Math.sin(t * 5 - i * 1.1)); });
        S.hangarBeacons.forEach((m, i) => { m.emissiveIntensity = ((t * 1.5 + i * 0.3) % 1) < 0.5 ? 5 : 0.3; });
    }

    /* ---------- init ---------- */
    async function init(canvas) {
        const device = await pc.createGraphicsDevice(canvas, { deviceTypes: ['webgl2'], antialias: false, powerPreference: 'high-performance' });
        S.device = device;
        const opts = new pc.AppOptions();
        opts.graphicsDevice = device;
        opts.componentSystems = [pc.RenderComponentSystem, pc.CameraComponentSystem, pc.LightComponentSystem];
        opts.resourceHandlers = [pc.TextureHandler, pc.ContainerHandler];
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

        // the jet model (Draco meshes and Basis textures need their decoders); fall back to built in craft if it fails
        pc.WasmModule.setConfig('DracoDecoderModule', { glueUrl: 'assets/wasm/draco/draco.wasm.js', wasmUrl: 'assets/wasm/draco/draco.wasm.wasm' });
        pc.basisInitialize({ glueUrl: 'assets/wasm/basis/basis.wasm.js', wasmUrl: 'assets/wasm/basis/basis.wasm.wasm' });
        try {
            const asset = new pc.Asset('jet', 'container', { url: 'assets/models/jet-fighter.glb' });
            await new Promise((resolve, reject) => {
                asset.once('error', reject);
                new pc.AssetListLoader([asset], app.assets).load((err) => (err ? reject(err) : resolve()));
            });
            if (!asset.resource) throw new Error('empty model');
            S.jet = asset;
        } catch (e) {
            console.warn('Jet model unavailable, using the built in craft.', e);
            S.jet = null;
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
        buildHazards();
        buildHangar();

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
                S.haz.meteors.forEach((m) => { m.root.enabled = true; m.root.setPosition(0, 0, -20); });
                S.haz.tower.pivot.enabled = true; S.hangar.enabled = true;
                if (++n >= 4) {
                    app.off('update', warm);
                    S.wing.forEach((w) => { w.root.enabled = false; });
                    S.gates.forEach((g) => { g.root.enabled = false; g.val = null; });
                    S.parts.forEach((p) => { p.e.enabled = false; });
                    S.haz.meteors.forEach((m) => { m.root.enabled = false; });
                    S.haz.tower.pivot.enabled = false; S.hangar.enabled = false;
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
        const dk = clamp(view.dockCam || 0, 0, 1);
        S.cam.setPosition(lerp(S.camX + sx, ship.x + 3.4, dk), lerp(3.3 + S.camY + sy, ship.y + 2.6, dk), lerp(11.5, 16, dk));
        S.cam.lookAt(lerp(ship.x * 0.3 + S.camX * 0.3, ship.x, dk), lerp(ship.y * 0.4 + 0.6 + S.camY * 0.2, ship.y + 0.4, dk), lerp(-26, -4, dk));
        S.cam.rotateLocal(0, 0, -clamp(ship.vx * 0.09, -3.2, 3.2) * (1 - dk) - sh * (Math.random() - 0.5) * 2);
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
        S.craft.setFlame(flick * boost);
        S.engineGlow.light.intensity = 1.3 * flick * boost;

        // terrain, liquid and a soft contact shadow under the ship
        updateTerrain(S.camX, view.dist);
        if (S.T.terrain) {
            const gy = terrainY(ship.x, view.dist);
            const h = Math.max(0, ship.y - gy);
            const sc = 1.6 + h * 0.07;
            S.shadowBlob.setPosition(ship.x, gy + 0.06, C.SHIP_Z + 0.5);
            S.shadowBlob.setLocalScale(sc, 1, sc * 1.4);
            S.blobMat.opacity = clamp(0.5 - h * 0.03, 0.05, 0.5) * (ship.alive === false ? 0 : 1) * (S.quality >= 2 ? 0.6 : 1);
            S.blobMat.update();
        }

        updateScenery(dt);
        updateStreaks(dz, view.speed);
        updateParticles(dt, dz);
        updateGates(view);
        updateHazards(view);
        updateHangar(view.dock);
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
        groundAt(x, u) { return terrainY(x, u); },
        landAt(x, u) { return !!(S.T && S.T.terrain) && (!S.T.fluid || S.tf.h(x, u) > S.T.fluid.level + 1.5); },
        get hasTerrain() { return !!(S.T && S.T.terrain); },
        onUpdate(fn) { S.app.on('update', fn); },
        get app() { return S.app; },
        get ready() { return S.ready; },
        get themeName() { return S.T ? S.T.name : ''; },
        _state: S,
        _dev: { terrainFns, genTile, THEMES, NX, NZ }
    };
})(window);
