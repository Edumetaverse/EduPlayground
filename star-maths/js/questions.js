/* Star Maths: question generation. Pure logic, no DOM and no rendering. */
(function (root) {
    'use strict';

    const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const pick = (arr) => arr[ri(0, arr.length - 1)];
    const shuffle = (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = ri(0, i);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };

    /* Each generator takes a level index (0 to 4) and returns
       { text, ans, eq, near } where near is a list of plausible wrong answers. */

    function genAdd(L) {
        let a, b;
        switch (L) {
            case 0: a = ri(1, 9); b = ri(1, 9); break;
            case 1: a = ri(10, 30); b = ri(2, 9); break;
            case 2: a = ri(10, 49); b = ri(10, 49); break;
            case 3: a = ri(50, 199); b = ri(30, 99); break;
            default: a = ri(100, 899); b = ri(100, 899);
        }
        const s = a + b;
        const near = [s + 10, s - 10, s + 1, s - 1];
        if (L >= 3) near.push(s + 100, s - 100);
        return { text: `${a} + ${b} = ?`, ans: s, eq: `${a} + ${b} = ${s}`, near };
    }

    function genSub(L) {
        let a, b;
        switch (L) {
            case 0: a = ri(5, 20); b = ri(1, a - 1); break;
            case 1: a = ri(20, 60); b = ri(2, 9); break;
            case 2: a = ri(30, 99); b = ri(11, a - 1); break;
            case 3: a = ri(100, 500); b = ri(20, 99); break;
            default: a = ri(300, 999); b = ri(100, a - 50);
        }
        const s = a - b;
        return { text: `${a} - ${b} = ?`, ans: s, eq: `${a} - ${b} = ${s}`, near: [a + b, s + 10, s - 10, s + 1, s - 1] };
    }

    function genMul(L) {
        let a, b;
        switch (L) {
            case 0: a = pick([2, 5, 10]); b = ri(1, 10); break;
            case 1: a = ri(2, 5); b = ri(2, 10); break;
            case 2: a = ri(2, 12); b = ri(2, 12); break;
            case 3: a = ri(11, 29); b = ri(3, 9); break;
            default: a = ri(12, 25); b = ri(11, 16);
        }
        if (Math.random() < 0.5) [a, b] = [b, a];
        const p = a * b;
        return {
            text: `${a} × ${b} = ?`, ans: p, eq: `${a} × ${b} = ${p}`,
            near: [(a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1), a + b]
        };
    }

    function genDiv(L) {
        let d, q;
        switch (L) {
            case 0: d = pick([2, 5, 10]); q = ri(1, 10); break;
            case 1: d = ri(2, 5); q = ri(2, 10); break;
            case 2: d = ri(2, 12); q = ri(2, 12); break;
            case 3: d = ri(3, 9); q = ri(11, 30); break;
            default: d = ri(6, 15); q = ri(12, 40);
        }
        const n = d * q;
        return { text: `${n} ÷ ${d} = ?`, ans: q, eq: `${n} ÷ ${d} = ${q}`, near: [q + 1, q - 1, q + 2, q - 2, d] };
    }

    function genOrder(L) {
        if (L <= 3) {
            const a = ri(2, 9), b = ri(2, 9), c = ri(2, 9);
            const ans = a + b * c;
            return { text: `${a} + ${b} × ${c} = ?`, ans, eq: `${a} + ${b} × ${c} = ${ans}`, near: [(a + b) * c, a * b + c] };
        }
        if (Math.random() < 0.5) {
            const a = ri(2, 12), b = ri(2, 12), c = ri(2, 9);
            const ans = (a + b) * c;
            return { text: `(${a} + ${b}) × ${c} = ?`, ans, eq: `(${a} + ${b}) × ${c} = ${ans}`, near: [a + b * c, a * c + b] };
        }
        const a = ri(3, 12), b = ri(3, 12), c = ri(2, a * b - 1);
        const ans = a * b - c;
        return { text: `${a} × ${b} - ${c} = ?`, ans, eq: `${a} × ${b} - ${c} = ${ans}`, near: [a * (b - c), a * b + c] };
    }

    function genMix(L) {
        if (L >= 3 && Math.random() < 0.5) return genOrder(L);
        return pick([genAdd, genSub, genMul, genDiv])(L);
    }

    function missing(text, ans, near) {
        return { text, ans, eq: text.replace('?', ans), near };
    }

    function genMis(L) {
        let a, x, c;
        switch (L) {
            case 0:
                a = ri(1, 9); x = ri(1, 9);
                return Math.random() < 0.5
                    ? missing(`? + ${a} = ${a + x}`, x, [a, x + 1, x - 1, a + x])
                    : missing(`${a + x} - ? = ${a}`, x, [a, x + 1, x - 1, a + x]);
            case 1:
                if (Math.random() < 0.5) {
                    a = ri(2, 5); x = ri(2, 10);
                    return missing(`? × ${a} = ${a * x}`, x, [x + 1, x - 1, a * x - a, a]);
                }
                a = ri(10, 30); x = ri(5, 25);
                return missing(`${a + x} - ? = ${a}`, x, [a, x + 1, x - 1, a + x]);
            case 2:
                if (Math.random() < 0.5) {
                    a = ri(2, 12); x = ri(2, 12);
                    return missing(`? × ${a} = ${a * x}`, x, [x + 1, x - 1, a, x + 2]);
                }
                a = ri(2, 9); x = ri(2, 12);
                return missing(`? ÷ ${a} = ${x}`, a * x, [a + x, a * x + a, a * x - a, x]);
            case 3: {
                a = ri(2, 9); x = ri(2, 12); const b = ri(1, 20); c = a * x + b;
                return missing(`${a} × ? + ${b} = ${c}`, x, [x + 1, x - 1, c - b, c - a]);
            }
            default:
                if (Math.random() < 0.5) {
                    a = ri(3, 12); x = ri(3, 15); const b = ri(2, 30); c = a * x - b;
                    return missing(`${a} × ? - ${b} = ${c}`, x, [x + 1, x - 1, c + b, x + 2]);
                } else {
                    a = ri(2, 9); x = ri(3, 15); const b = ri(2, 30); c = x + b;
                    return missing(`? ÷ ${a} + ${b} = ${c}`, a * x, [x, a * x + a, a * x - a, c]);
                }
        }
    }

    const SUBJECTS = [
        { id: 'add', name: 'ADDITION', icon: '+', theme: 0, gen: genAdd },
        { id: 'sub', name: 'SUBTRACTION', icon: '-', theme: 1, gen: genSub },
        { id: 'mul', name: 'MULTIPLY', icon: '×', theme: 2, gen: genMul },
        { id: 'div', name: 'DIVISION', icon: '÷', theme: 3, gen: genDiv },
        { id: 'mix', name: 'MIXED OPS', icon: '±', theme: 4, gen: genMix },
        { id: 'mis', name: 'MISSING NO.', icon: '?', theme: 5, gen: genMis }
    ];

    const LEVELS = [
        { name: 'CADET', speed: 19, gain: 6 },
        { name: 'PILOT', speed: 24, gain: 5 },
        { name: 'ACE', speed: 29, gain: 5 },
        { name: 'CAPTAIN', speed: 35, gain: 4 },
        { name: 'LEGEND', speed: 42, gain: 4 }
    ];

    /* Returns three distinct, non negative answers (one correct) in random order. */
    function makeChoices(q) {
        const used = new Set([q.ans]);
        const wrong = [];
        const tryAdd = (v) => {
            if (!Number.isInteger(v) || v < 0 || used.has(v)) return false;
            used.add(v);
            wrong.push(v);
            return true;
        };
        for (const v of shuffle((q.near || []).slice())) {
            if (wrong.length >= 2) break;
            tryAdd(v);
        }
        const spread = Math.max(1, Math.round(q.ans * 0.12));
        for (let i = 0; wrong.length < 2 && i < 60; i++) {
            tryAdd(q.ans + pick([1, 2, 3, -1, -2, -3, 10, -10, spread, -spread]));
        }
        for (let k = 1; wrong.length < 2; k++) tryAdd(q.ans + k);
        return shuffle([q.ans, wrong[0], wrong[1]]);
    }

    function nextQuestion(subjectIdx, level, lastText) {
        const gen = SUBJECTS[subjectIdx].gen;
        let q = gen(level);
        for (let i = 0; i < 6 && q.text === lastText; i++) q = gen(level);
        return q;
    }


    /* Short, kind advice a wingman can give after a question, worked out from the equation. */
    function hintFor(q) {
        const eq = q.eq;
        let m;
        const tensOf = (n) => (n >= 100 ? Math.floor(n / 100) * 100 : Math.floor(n / 10) * 10);
        if ((m = /^(\d+) \+ (\d+) = (\d+)$/.exec(eq))) {
            const a = +m[1], b = +m[2];
            if (b < 10) {
                const toTen = 10 - (a % 10);
                if (a % 10 && b > toTen) return `Make a ten first. ${a} needs ${toTen} more to reach ${a + toTen}, then add the other ${b - toTen}.`;
                return `Add the ones first: ${a % 10} + ${b} = ${a % 10 + b}. Keep the tens as they are.`;
            }
            const t = tensOf(b), u = b - t;
            return `Add the ${b >= 100 ? 'hundreds' : 'tens'} first: ${a} + ${t} = ${a + t}. Then add ${u}.`;
        }
        if ((m = /^(\d+) - (\d+) = (\d+)$/.exec(eq))) {
            const a = +m[1], b = +m[2];
            if (b < 10) {
                if (a % 10 && b > a % 10) return `Count back to ${a - a % 10} first, then take away ${b - a % 10} more.`;
                return `Count back ${b} from ${a}. Only the ones digit changes.`;
            }
            const t = tensOf(b), u = b - t;
            return `Take away the ${b >= 100 ? 'hundreds' : 'tens'} first: ${a} - ${t} = ${a - t}. Then take away ${u}.`;
        }
        if ((m = /^(\d+) \u00d7 (\d+) = (\d+)$/.exec(eq))) {
            const a = +m[1], b = +m[2];
            const big = Math.max(a, b), small = Math.min(a, b);
            if (small === 10 || big === 10) return `Times by 10 just slides the digits along. ${small === 10 ? big : small} \u00d7 10 = ${(small === 10 ? big : small) * 10}.`;
            if (big >= 11) {
                const t = Math.floor(big / 10) * 10, o = big - t;
                return `Split ${big} into ${t} and ${o}. ${t} \u00d7 ${small} = ${t * small} and ${o} \u00d7 ${small} = ${o * small}. Add them together.`;
            }
            if (small === 2) return `Times 2 means double it. Double ${big} is ${big * 2}.`;
            if (small === 5) return `Times 5 is half of times 10. ${big} \u00d7 10 = ${big * 10}, and half of that is ${big * 5}.`;
            if (small === 9) return `Times 9 is times 10 take away one lot. ${big} \u00d7 10 = ${big * 10}, then take away ${big}.`;
            return `Use a fact you know. ${big} \u00d7 ${small - 1} = ${big * (small - 1)}, then add one more ${big}.`;
        }
        if ((m = /^(\d+) \u00f7 (\d+) = (\d+)$/.exec(eq))) {
            return `Think backwards. What times ${m[2]} makes ${m[1]}? ${m[2]} \u00d7 ${m[3]} = ${m[1]}, so the answer is ${m[3]}.`;
        }
        if (/[()]/.test(q.text) || /[\u00d7\u00f7].*[+-]|[+-].*[\u00d7\u00f7]/.test(q.text)) {
            return 'Order matters. Brackets first, then multiply or divide, then add or subtract.';
        }
        return 'Work backwards. Use the opposite operation to undo each step, one at a time.';
    }

    const TIPS = [
        'Read the whole question before you steer. The answer gates are always three, and only one is right.',
        'Estimate first. Round the numbers to get close, then pick the gate nearest your estimate.',
        'Check the ones digit. It can rule out a gate straight away.',
        'Stay calm. Fuel only drops when you pick the wrong gate, so there is no need to rush.'
    ];

    root.SM = root.SM || {};
    root.SM.Q = { SUBJECTS, LEVELS, makeChoices, nextQuestion, hintFor, TIPS, ri, pick, shuffle };
    if (typeof module !== 'undefined') module.exports = root.SM.Q;
})(typeof window !== 'undefined' ? window : globalThis);
