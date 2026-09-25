'use strict';
/* ============================================================
   Worksheet question generators.
   Each generator: gen(level 1|2|3) → { q: html, a: html }.
   Level 1 = foundation, 2 = core, 3 = extension.
   ============================================================ */

const RNG = {
  int: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
  nz: (a, b) => { let x; do { x = RNG.int(a, b); } while (x === 0); return x; },
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
  chance: p => Math.random() < p,
  sign: () => (Math.random() < 0.5 ? -1 : 1),
  shuffle: arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
};
const MINUS = '−';
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };

/* ---------- formatting ---------- */
function fmtN(x) { return Number.isInteger(x) ? String(x) : String(+x.toFixed(6)); }
function num(x) { return x < 0 ? MINUS + fmtN(-x) : fmtN(x); }
function par(x) { return x < 0 ? `(${num(x)})` : num(x); }
function roundTo(x, d) { const f = 10 ** d; return Math.round((x + Math.sign(x) * 1e-9) * f) / f; }
function fixed(x, d) { const r = roundTo(x, d); return (r < 0 ? MINUS : '') + Math.abs(r).toFixed(d); }
function sf3(x) { const v = Number(x.toPrecision(3)); return num(v); }
function money(x) { return Number(roundTo(x, 2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function sup(v, p) { return p === 1 ? v : `${v}<sup>${num(p)}</sup>`; }
function fr(n, d) {
  if (d === 0) return 'undefined';
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d); n /= g; d /= g;
  if (d === 1) return num(n);
  return `${n < 0 ? MINUS : ''}<span class="frac"><span>${Math.abs(n)}</span><span>${d}</span></span>`;
}
/* polynomial from [[coef, power], ...] */
function poly(terms, v = 'x') {
  let out = '';
  terms.filter(([c]) => c !== 0).forEach(([c, p], i) => {
    const abs = Math.abs(c);
    const coef = abs === 1 && p !== 0 ? '' : fmtN(abs);
    const body = p === 0 ? coef : p === 1 ? `${coef}${v}` : `${coef}${v}<sup>${p}</sup>`;
    out += i === 0 ? (c < 0 ? MINUS : '') + body : (c < 0 ? ` ${MINUS} ` : ' + ') + body;
  });
  return out || '0';
}
const lin = (a, b, v = 'x') => poly([[a, 1], [b, 0]], v);
function coefPrefix(k) { return k === 1 ? '' : k === -1 ? MINUS : num(k); }
function lin2(a, b, c) { // ax + by = c
  const x = poly([[a, 1]], 'x');
  const y = b === 0 ? '' : `${b < 0 ? ` ${MINUS} ` : ' + '}${Math.abs(b) === 1 ? '' : Math.abs(b)}y`;
  return `${x}${y} = ${num(c)}`;
}
function lineEq(n, d, c) { // y = (n/d)x + c
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d); n /= g; d /= g;
  const mx = d === 1 ? poly([[n, 1]]) : `${n < 0 ? MINUS : ''}${fr(Math.abs(n), d)}x`;
  const cs = c === 0 ? '' : (c < 0 ? ` ${MINUS} ${-c}` : ` + ${c}`);
  return `y = ${n === 0 ? num(c) : mx + cs}`;
}
function mono(k, vars) { // k x^a y^b
  const body = vars.filter(([, p]) => p !== 0).map(([v, p]) => sup(v, p)).join('');
  if (!body) return num(k);
  return (k === 1 ? '' : k === -1 ? MINUS : num(k)) + body;
}
function scaled(n, k) { // integer n divided by 10^k, as a string (k may be negative)
  if (k <= 0) return String(n) + '0'.repeat(-k);
  const neg = n < 0; const s = String(Math.abs(n)).padStart(k + 1, '0');
  return (neg ? MINUS : '') + s.slice(0, -k) + '.' + s.slice(-k);
}
function sfNorm(N, pow) { // value = N × 10^pow → standard form
  let s = String(N);
  while (s.length > 1 && s.endsWith('0')) { s = s.slice(0, -1); pow++; }
  const e = pow + s.length - 1;
  return { mant: s.length > 1 ? `${s[0]}.${s.slice(1)}` : s, e, s, pow };
}
const sfHTML = ({ mant, e }) => `${mant} × 10<sup>${num(e)}</sup>`;
function ordinary(s, pow) {
  const group = t => t.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (pow >= 0) return group(s + '0'.repeat(pow));
  const pos = s.length + pow;
  return pos > 0 ? group(s.slice(0, pos)) + '.' + s.slice(pos) : '0.' + '0'.repeat(-pos) + s;
}
const list = arr => arr.map(num).join(', ');
const NAMES = ['Ayla', 'Kerem', 'Maya', 'Noah', 'Zeynep', 'Omar', 'Lena', 'Deniz', 'Arda', 'Sofia'];

/* ---------- generators ---------- */
const GENERATORS = [
  {
    id: 'integers', name: 'Integer operations', courses: ['myp8', 'nondp'], instr: 'Work out without a calculator.',
    gen(l) {
      if (l === 1) {
        const a = RNG.int(-20, 20), b = RNG.nz(-20, 20), op = RNG.pick(['+', MINUS]);
        return { q: `${num(a)} ${op} ${par(b)}`, a: num(op === '+' ? a + b : a - b) };
      }
      if (l === 2) {
        if (RNG.chance(0.5)) { const a = RNG.nz(-12, 12), b = RNG.nz(-12, 12); return { q: `${par(a)} × ${par(b)}`, a: num(a * b) }; }
        const b = RNG.nz(-12, 12), ans = RNG.nz(-12, 12);
        return { q: `${num(ans * b)} ÷ ${par(b)}`, a: num(ans) };
      }
      const a = RNG.int(-10, 10), b = RNG.nz(-9, 9), c = RNG.nz(-9, 9), d = RNG.int(-10, 10);
      if (RNG.chance(0.5)) return { q: `${num(a)} + ${par(b)} × ${par(c)} ${MINUS} ${par(d)}`, a: num(a + b * c - d) };
      return { q: `(${num(a)} ${MINUS} ${par(b)}) × ${par(c)}`, a: num((a - b) * c) };
    },
  },
  {
    id: 'fractions', name: 'Fraction arithmetic', courses: ['myp8', 'nondp'], instr: 'Give answers as fractions in their simplest form.',
    gen(l) {
      const f = () => { const d = RNG.int(2, l === 1 ? 9 : 12); return [RNG.int(1, d - 1), d]; };
      let [a, b] = f(); const [c, d] = f();
      const op = RNG.pick(l === 1 ? ['+', MINUS] : l === 2 ? ['+', MINUS, '×'] : ['×', '÷', MINUS, '+']);
      let left = fr(a, b);
      if (l === 3 && RNG.chance(0.5)) { const w = RNG.int(1, 3); left = `${w}${fr(a, b)}`; a = w * b + a; }
      let n, m;
      if (op === '+') { n = a * d + c * b; m = b * d; } else if (op === MINUS) { n = a * d - c * b; m = b * d; } else if (op === '×') { n = a * c; m = b * d; } else { n = a * d; m = b * c; }
      return { q: `${left} ${op} ${fr(c, d)}`, a: fr(n, m) };
    },
  },
  {
    id: 'percentages', name: 'Percentages (of, increase, reverse)', courses: ['myp8', 'nondp'], instr: 'Show your working.',
    gen(l) {
      if (l === 1) {
        const p = RNG.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75]), base = RNG.int(2, 40) * 20;
        return { q: `Find ${p}% of ${base}.`, a: num(base * p / 100) };
      }
      if (l === 2) {
        const p = RNG.int(1, 12) * 5, base = RNG.int(2, 50) * 20, up = RNG.chance(0.5);
        return { q: `${up ? 'Increase' : 'Decrease'} ${base} by ${p}%.`, a: num(base * (100 + (up ? p : -p)) / 100) };
      }
      const orig = RNG.int(3, 60) * 20, p = RNG.int(1, 8) * 5, up = RNG.chance(0.5);
      const now = orig * (100 + (up ? p : -p)) / 100;
      return { q: `After a ${p}% ${up ? 'increase' : 'discount'}, an item costs $${num(now)}. Find the original price.`, a: `$${num(orig)}` };
    },
  },
  {
    id: 'percent-change', name: 'Percentage change', courses: ['myp8', 'nondp'], instr: 'Give answers to 1 decimal place.',
    gen(l) {
      const a = RNG.int(20, 500);
      let b;
      do { b = l === 1 ? a + RNG.nz(-5, 5) * Math.ceil(a / 20) : RNG.int(Math.round(a * 0.4), Math.round(a * 1.8)); } while (b === a || b <= 0);
      const pc = (b - a) / a * 100;
      const ans = `${fixed(Math.abs(pc), 1)}% ${pc > 0 ? 'increase' : 'decrease'}`;
      if (l === 3) {
        const ctx = RNG.pick([['The population of a village', a * 10, b * 10, ''], ['A phone’s price', a, b, '$'], ['Monthly electricity use', a, b, ' kWh']]);
        const u = v => ctx[3] === '$' ? `$${v}` : `${v}${ctx[3]}`;
        return { q: `${ctx[0]} changed from ${u(ctx[1])} to ${u(ctx[2])}. Calculate the percentage change.`, a: ans };
      }
      return { q: `Find the percentage change from ${a} to ${b}.`, a: ans };
    },
  },
  {
    id: 'ratio', name: 'Ratio & sharing', courses: ['myp8', 'nondp'], instr: 'Show your working.',
    gen(l) {
      const k = l === 3 ? 3 : 2;
      const parts = Array.from({ length: k }, () => RNG.int(1, l === 1 ? 5 : 9));
      const u = RNG.int(2, l === 1 ? 10 : 25);
      const total = u * parts.reduce((s, x) => s + x, 0);
      const names = RNG.shuffle(NAMES).slice(0, k);
      if (l === 1) return { q: `Share ${total} in the ratio ${parts.join(' : ')}.`, a: parts.map(p => p * u).join(' and ') };
      if (l === 2 && RNG.chance(0.5)) {
        return { q: `${names[0]} and ${names[1]} share sweets in the ratio ${parts.join(' : ')}. ${names[0]} gets ${parts[0] * u}. How many does ${names[1]} get?`, a: num(parts[1] * u) };
      }
      return { q: `${names.join(', ').replace(/, ([^,]*)$/, ' and $1')} share $${total} in the ratio ${parts.join(' : ')}. How much does each person receive?`, a: names.map((n, i) => `${n}: $${parts[i] * u}`).join(', ') };
    },
  },
  {
    id: 'substitution', name: 'Substitution', courses: ['myp8', 'nondp'], instr: 'Substitute the values and evaluate.',
    gen(l) {
      const x = RNG.nz(-6, 6), y = RNG.nz(-6, 6);
      if (l === 1) { const a = RNG.int(2, 9), b = RNG.nz(-10, 10); return { q: `Find the value of ${lin(a, b)} when x = ${num(x)}.`, a: num(a * x + b) }; }
      if (l === 2) { const a = RNG.int(2, 5), b = RNG.int(2, 6); return { q: `Find the value of ${a}x<sup>2</sup> ${MINUS} ${b}y when x = ${num(x)} and y = ${num(y)}.`, a: num(a * x * x - b * y) }; }
      const a = RNG.int(2, 4);
      return { q: `Find the value of x<sup>2</sup> + ${a}xy ${MINUS} y<sup>2</sup> when x = ${num(x)} and y = ${num(y)}.`, a: num(x * x + a * x * y - y * y) };
    },
  },
  {
    id: 'expand-single', name: 'Expanding single brackets', courses: ['myp8', 'myp9', 'nondp'], instr: 'Expand and simplify.',
    gen(l) {
      if (l === 1) { const a = RNG.int(2, 9) * RNG.sign(), b = RNG.nz(-9, 9); return { q: `${num(a)}(${lin(1, b)})`, a: lin(a, a * b) }; }
      if (l === 2) {
        const a = RNG.int(2, 6) * RNG.sign(), b = RNG.int(1, 6), c = RNG.nz(-9, 9);
        return { q: `${num(a)}x(${lin(b, c)})`, a: poly([[a * b, 2], [a * c, 1]]) };
      }
      const a = RNG.int(2, 6), c = RNG.int(2, 6) * RNG.sign(), b = RNG.nz(-9, 9), d = RNG.nz(-9, 9);
      return { q: `${a}(${lin(1, b)}) ${c < 0 ? MINUS : '+'} ${Math.abs(c)}(${lin(1, d)})`, a: lin(a + c, a * b + c * d) };
    },
  },
  {
    id: 'expand-double', name: 'Expanding double brackets', courses: ['myp9', 'dpaisl'], instr: 'Expand and simplify.',
    gen(l) {
      if (l === 1) { const a = RNG.nz(-9, 9), b = RNG.nz(-9, 9); return { q: `(${lin(1, a)})(${lin(1, b)})`, a: poly([[1, 2], [a + b, 1], [a * b, 0]]) }; }
      if (l === 2) {
        let p, r; do { p = RNG.int(1, 4); r = RNG.int(1, 4); } while (p === 1 && r === 1);
        const q = RNG.nz(-7, 7), s = RNG.nz(-7, 7);
        return { q: `(${lin(p, q)})(${lin(r, s)})`, a: poly([[p * r, 2], [p * s + q * r, 1], [q * s, 0]]) };
      }
      const p = RNG.int(1, 5), q = RNG.nz(-9, 9);
      if (RNG.chance(0.5)) return { q: `(${lin(p, q)})<sup>2</sup>`, a: poly([[p * p, 2], [2 * p * q, 1], [q * q, 0]]) };
      return { q: `(${lin(p, q)})(${lin(p, -q)})`, a: poly([[p * p, 2], [-q * q, 0]]) };
    },
  },
  {
    id: 'factorise', name: 'Factorising', courses: ['myp9', 'nondp'], instr: 'Factorise fully.',
    gen(l) {
      if (l === 1) {
        const k = RNG.int(2, 9); let a, b; do { a = RNG.int(1, 9); b = RNG.nz(-9, 9); } while (gcd(a, b) !== 1);
        if (RNG.chance(0.5)) return { q: poly([[k * a, 1], [k * b, 0]]), a: `${k}(${lin(a, b)})` };
        return { q: poly([[k * a, 2], [k * b, 1]]), a: `${k}x(${lin(a, b)})` };
      }
      if (l === 2) {
        const p = RNG.nz(-9, 9), q = RNG.nz(-9, 9);
        return { q: poly([[1, 2], [p + q, 1], [p * q, 0]]), a: p === q ? `(${lin(1, p)})<sup>2</sup>` : `(${lin(1, p)})(${lin(1, q)})` };
      }
      if (RNG.chance(0.4)) {
        let p, q; do { p = RNG.int(1, 5); q = RNG.int(1, 9); } while (gcd(p, q) !== 1);
        return { q: poly([[p * p, 2], [-q * q, 0]]), a: `(${lin(p, q)})(${lin(p, -q)})` };
      }
      let a, b; do { a = RNG.int(2, 3); b = RNG.nz(-7, 7); } while (gcd(a, b) !== 1);
      const c = RNG.nz(-6, 6);
      return { q: poly([[a, 2], [a * c + b, 1], [b * c, 0]]), a: `(${lin(a, b)})(${lin(1, c)})` };
    },
  },
  {
    id: 'linear-eq', name: 'Linear equations', courses: ['myp8', 'myp9', 'nondp'], instr: 'Solve each equation.',
    gen(l) {
      if (l === 1) {
        const x = RNG.int(-10, 10), a = RNG.int(2, 9) * RNG.pick([1, 1, -1]), b = RNG.nz(-15, 15);
        return { q: `${lin(a, b)} = ${num(a * x + b)}`, a: `x = ${num(x)}` };
      }
      if (l === 2) {
        const a = RNG.int(2, 7), b = RNG.nz(-9, 9);
        if (RNG.chance(0.5)) { const x = RNG.int(-8, 10); return { q: `${a}(${lin(1, b)}) = ${num(a * (x + b))}`, a: `x = ${num(x)}` }; }
        const c = RNG.nz(-6, 6), x = a * c - b;
        return { q: `<span class="frac"><span>${lin(1, b)}</span><span>${a}</span></span> = ${num(c)}`, a: `x = ${num(x)}` };
      }
      let a, c; do { a = RNG.nz(-9, 9); c = RNG.nz(-9, 9); } while (a === c);
      const x = RNG.int(-8, 8), b = RNG.nz(-12, 12), d = a * x + b - c * x;
      return { q: `${lin(a, b)} = ${lin(c, d)}`, a: `x = ${num(x)}` };
    },
  },
  {
    id: 'inequalities', name: 'Linear inequalities', courses: ['myp8', 'myp9'], instr: 'Solve each inequality.',
    gen(l) {
      const flip = { '<': '>', '>': '<', '≤': '≥', '≥': '≤' };
      const sym = RNG.pick(['<', '>', '≤', '≥']), x0 = RNG.int(-8, 8);
      if (l < 3) {
        const a = l === 1 ? RNG.int(2, 6) : RNG.nz(-6, 6), b = RNG.int(-12, 12);
        return { q: `${lin(a, b)} ${sym} ${num(a * x0 + b)}`, a: `x ${a < 0 ? flip[sym] : sym} ${num(x0)}` };
      }
      let a, c; do { a = RNG.nz(-7, 7); c = RNG.nz(-7, 7); } while (a === c);
      const b = RNG.nz(-10, 10), d = a * x0 + b - c * x0;
      return { q: `${lin(a, b)} ${sym} ${lin(c, d)}`, a: `x ${a - c < 0 ? flip[sym] : sym} ${num(x0)}` };
    },
  },
  {
    id: 'gradient', name: 'Gradient & equation of a line', courses: ['myp8', 'myp9', 'dpaisl', 'nondp'], instr: 'Show your working.',
    gen(l) {
      const pt = (x, y) => `(${num(x)}, ${num(y)})`;
      if (l === 1) {
        let x1, x2; do { x1 = RNG.int(-8, 8); x2 = RNG.int(-8, 8); } while (x1 === x2);
        const y1 = RNG.int(-8, 8), y2 = RNG.int(-8, 8);
        return { q: `Find the gradient of the line through ${pt(x1, y1)} and ${pt(x2, y2)}.`, a: `m = ${fr(y2 - y1, x2 - x1)}` };
      }
      if (l === 2) {
        const m = RNG.nz(-5, 5), c = RNG.int(-9, 9);
        let x1, x2; do { x1 = RNG.int(-5, 5); x2 = RNG.int(-5, 5); } while (x1 === x2);
        return { q: `Find the equation of the line through A${pt(x1, m * x1 + c)} and B${pt(x2, m * x2 + c)}, in the form y = mx + c.`, a: lineEq(m, 1, c) };
      }
      const m = RNG.pick([1, -1, 2, -2, 3, -3, 4]), k = RNG.int(-6, 6), y1 = RNG.int(-6, 6);
      if (RNG.chance(0.5)) {
        const x1 = RNG.int(-5, 5);
        return { q: `Find the equation of the line parallel to ${lineEq(m, 1, k)} that passes through ${pt(x1, y1)}.`, a: lineEq(m, 1, y1 - m * x1) };
      }
      const x1 = m * RNG.int(-3, 3);
      return { q: `Find the equation of the line perpendicular to ${lineEq(m, 1, k)} that passes through ${pt(x1, y1)}.`, a: lineEq(-1, m, y1 + x1 / m) };
    },
  },
  {
    id: 'simultaneous', name: 'Simultaneous equations', courses: ['myp9', 'dpaisl'], instr: 'Solve each pair of equations simultaneously.',
    gen(l) {
      const x = RNG.int(-6, 8), y = RNG.int(-6, 8);
      let a1, b1, a2, b2;
      if (l === 1) { a1 = 1; b1 = 1; a2 = 1; b2 = -1; if (RNG.chance(0.5)) { b1 = RNG.int(2, 4); } }
      else if (l === 2) { do { a1 = RNG.int(1, 6); a2 = RNG.int(1, 6); } while (a1 === a2); b1 = RNG.nz(-5, 5); b2 = RNG.pick([b1, -b1]); }
      else { do { a1 = RNG.nz(-7, 7); b1 = RNG.nz(-7, 7); a2 = RNG.nz(-7, 7); b2 = RNG.nz(-7, 7); } while (a1 * b2 - a2 * b1 === 0); }
      return { q: `<span class="eqs">${lin2(a1, b1, a1 * x + b1 * y)}<br>${lin2(a2, b2, a2 * x + b2 * y)}</span>`, a: `x = ${num(x)}, y = ${num(y)}` };
    },
  },
  {
    id: 'indices', name: 'Laws of indices', courses: ['myp9', 'dpaisl'], instr: 'Simplify, or evaluate without a calculator.',
    gen(l) {
      if (l === 1) {
        const a = RNG.int(3, 9), b = RNG.int(2, 8);
        if (RNG.chance(0.5)) return { q: `x<sup>${a}</sup> × x<sup>${b}</sup>`, a: sup('x', a + b) };
        const hi = Math.max(a, b) + 1, lo = Math.min(a, b);
        return { q: `x<sup>${hi}</sup> ÷ x<sup>${lo}</sup>`, a: sup('x', hi - lo) };
      }
      if (l === 2) {
        const t = RNG.int(1, 4);
        if (t === 1) { const a = RNG.int(2, 6), b = RNG.int(2, 4); return { q: `(x<sup>${a}</sup>)<sup>${b}</sup>`, a: sup('x', a * b) }; }
        if (t === 2) { const k = RNG.int(2, 3), a = RNG.int(2, 5), b = RNG.int(2, 3); return { q: `(${k}x<sup>${a}</sup>)<sup>${b}</sup>`, a: mono(k ** b, [['x', a * b]]) }; }
        if (t === 3) {
          const p = RNG.int(2, 5), q = RNG.int(2, 5), m = RNG.int(1, 5), n = RNG.int(1, 4), r = RNG.int(1, 5), s = RNG.int(1, 4);
          return { q: `${mono(p, [['x', m], ['y', n]])} × ${mono(q, [['x', r], ['y', s]])}`, a: mono(p * q, [['x', m + r], ['y', n + s]]) };
        }
        const k = RNG.int(2, 6), ans = RNG.int(2, 5), a = RNG.int(5, 9), b = RNG.int(1, 4);
        return { q: `${mono(k * ans, [['x', a]])} ÷ ${mono(k, [['x', b]])}`, a: mono(ans, [['x', a - b]]) };
      }
      if (RNG.chance(0.5)) {
        const [base, pw, [n, d]] = RNG.pick([[8, '2/3', [4, 1]], [27, '2/3', [9, 1]], [16, '3/4', [8, 1]], [32, '2/5', [4, 1]], [81, '3/4', [27, 1]], [125, '2/3', [25, 1]], [4, `${MINUS}1/2`, [1, 2]], [9, `${MINUS}3/2`, [1, 27]], [16, `${MINUS}1/4`, [1, 2]], [100, `${MINUS}1/2`, [1, 10]], [2, `${MINUS}3`, [1, 8]], [5, '0', [1, 1]]]);
        return { q: `Evaluate ${base}<sup>${pw}</sup>`, a: fr(n, d) };
      }
      const a = RNG.int(1, 4), b = RNG.int(a + 1, 8);
      return { q: `Simplify x<sup>${a}</sup> ÷ x<sup>${b}</sup>, giving your answer with a negative index.`, a: `${sup('x', a - b)} = <span class="frac"><span>1</span><span>${sup('x', b - a)}</span></span>` };
    },
  },
  {
    id: 'standard-form', name: 'Standard form', courses: ['myp9', 'dpaisl'], instr: 'Write numbers in the form a × 10<sup>k</sup>, where 1 ≤ a < 10 and k ∈ ℤ.',
    gen(l) {
      if (l < 3) {
        let N; do { N = RNG.int(11, 999); } while (N % 10 === 0);
        const e = RNG.pick([-6, -5, -4, -3, -2, 3, 4, 5, 6, 7, 8]);
        const s = String(N), pow = e - (s.length - 1);
        const sf = sfNorm(N, pow);
        return l === 1 ? { q: `Write ${ordinary(s, pow)} in standard form.`, a: sfHTML(sf) } : { q: `Write ${sfHTML(sf)} as an ordinary number.`, a: ordinary(s, pow) };
      }
      const A = RNG.int(11, 99), B = RNG.int(11, 99), eA = RNG.int(-5, 8), eB = RNG.int(-5, 8);
      if (RNG.chance(0.5)) {
        return { q: `Calculate (${sfHTML(sfNorm(A, eA - 1))}) × (${sfHTML(sfNorm(B, eB - 1))}). Give your answer in standard form.`, a: sfHTML(sfNorm(A * B, eA + eB - 2)) };
      }
      return { q: `Calculate (${sfHTML(sfNorm(A * B, eA + eB - 2))}) ÷ (${sfHTML(sfNorm(B, eB - 1))}). Give your answer in standard form.`, a: sfHTML(sfNorm(A, eA - 1)) };
    },
  },
  {
    id: 'rounding', name: 'Rounding: d.p. & significant figures', courses: ['myp8', 'dpaisl', 'nondp'], instr: 'Round as instructed.',
    gen(l) {
      if (l === 1) {
        const s = RNG.int(3, 4), N = RNG.int(10 ** (s + 1), 10 ** (s + 3)), k = RNG.int(1, 2);
        return { q: `Round ${scaled(N, s)} to ${k} decimal place${k > 1 ? 's' : ''}.`, a: scaled(Math.round(N / 10 ** (s - k)), k) };
      }
      const big = l === 2 || RNG.chance(0.5);
      const N = RNG.int(10000, 999999), k = RNG.int(2, 3);
      const s = big ? RNG.int(0, 2) : RNG.int(7, 9);
      const L = String(N).length, m = L - k;
      const r = Math.round(N / 10 ** m);
      return { q: `Round ${scaled(N, s)} to ${k} significant figures.`, a: scaled(r, s - m) };
    },
  },
  {
    id: 'pythagoras', name: "Pythagoras' theorem", courses: ['myp8', 'nondp'], instr: 'Give non-exact answers to 1 decimal place.',
    gen(l) {
      if (l === 1) {
        const [a, b, c] = RNG.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [20, 21, 29]]), k = RNG.int(1, 3);
        return { q: `A right-angled triangle has shorter sides ${a * k} cm and ${b * k} cm. Find the length of the hypotenuse.`, a: `${c * k} cm` };
      }
      if (l === 2) {
        const a = RNG.int(3, 20), b = RNG.int(3, 20);
        if (RNG.chance(0.5)) return { q: `The two shorter sides of a right-angled triangle are ${a} cm and ${b} cm. Find the hypotenuse.`, a: `${fixed(Math.hypot(a, b), 1)} cm` };
        const c = Math.max(a, b) + RNG.int(2, 9), s = Math.min(a, b);
        return { q: `A right-angled triangle has hypotenuse ${c} cm and one other side ${s} cm. Find the third side.`, a: `${fixed(Math.sqrt(c * c - s * s), 1)} cm` };
      }
      const c = RNG.int(40, 90) / 10, a = RNG.int(10, Math.floor(c * 10 * 0.45)) / 10;
      if (RNG.chance(0.5)) return { q: `A ${fmtN(c)} m ladder leans against a vertical wall. Its foot is ${fmtN(a)} m from the wall. How high up the wall does it reach?`, a: `${fixed(Math.sqrt(c * c - a * a), 2)} m` };
      const w = RNG.int(20, 80), h = RNG.int(15, 60);
      return { q: `A rectangular field is ${w} m by ${h} m. How much shorter is it to walk diagonally across than along two edges?`, a: `${fixed(w + h - Math.hypot(w, h), 1)} m` };
    },
  },
  {
    id: 'circles', name: 'Circles: circumference & area', courses: ['myp8', 'nondp'], instr: 'Use the π button. Give answers to 1 decimal place.',
    gen(l) {
      const r = RNG.int(2, 15);
      if (l === 1) {
        if (RNG.chance(0.5)) return { q: `Find the circumference of a circle with radius ${r} cm.`, a: `${fixed(2 * Math.PI * r, 1)} cm` };
        return { q: `Find the area of a circle with radius ${r} cm.`, a: `${fixed(Math.PI * r * r, 1)} cm²` };
      }
      if (l === 2) {
        const d = 2 * r;
        if (RNG.chance(0.5)) return { q: `Find the area of a circle with diameter ${d} cm.`, a: `${fixed(Math.PI * r * r, 1)} cm²` };
        return { q: `Find the perimeter of a semicircle with diameter ${d} cm.`, a: `${fixed(Math.PI * r + d, 1)} cm` };
      }
      if (RNG.chance(0.5)) { const A = RNG.int(50, 600); return { q: `A circle has area ${A} cm². Find its radius.`, a: `${fixed(Math.sqrt(A / Math.PI), 1)} cm` }; }
      const s = 2 * r;
      return { q: `A circle of radius ${r} cm is cut from a square of side ${s} cm. Find the area of the material left over.`, a: `${fixed(s * s - Math.PI * r * r, 1)} cm²` };
    },
  },
  {
    id: 'volume', name: 'Volume & surface area', courses: ['myp8', 'dpaisl', 'nondp'], instr: 'Give non-exact answers to 1 decimal place (3 s.f. for DP).',
    gen(l) {
      if (l === 1) {
        const a = RNG.int(2, 15), b = RNG.int(2, 12), c = RNG.int(2, 10);
        if (RNG.chance(0.5)) return { q: `Find the volume of a cuboid measuring ${a} cm × ${b} cm × ${c} cm.`, a: `${a * b * c} cm³` };
        return { q: `Find the surface area of a cuboid measuring ${a} cm × ${b} cm × ${c} cm.`, a: `${2 * (a * b + a * c + b * c)} cm²` };
      }
      if (l === 2) {
        if (RNG.chance(0.5)) {
          const b = RNG.int(3, 12), h = RNG.int(3, 12), L = RNG.int(5, 20);
          return { q: `A triangular prism has a triangular cross-section with base ${b} cm and height ${h} cm. The prism is ${L} cm long. Find its volume.`, a: `${fmtN(b * h * L / 2)} cm³` };
        }
        const r = RNG.int(2, 10), h = RNG.int(3, 20);
        return { q: `Find the volume of a cylinder with radius ${r} cm and height ${h} cm.`, a: `${fixed(Math.PI * r * r * h, 1)} cm³` };
      }
      const r = RNG.int(2, 12), h = RNG.int(4, 20), t = RNG.int(1, 3);
      if (t === 1) return { q: `Find the total surface area of a closed cylinder with radius ${r} cm and height ${h} cm.`, a: `${fixed(2 * Math.PI * r * r + 2 * Math.PI * r * h, 1)} cm²` };
      if (t === 2) return { q: `Find the volume of a sphere with radius ${r} cm.`, a: `${fixed(4 / 3 * Math.PI * r ** 3, 1)} cm³` };
      return { q: `Find the volume of a cone with base radius ${r} cm and height ${h} cm.`, a: `${fixed(Math.PI * r * r * h / 3, 1)} cm³` };
    },
  },
  {
    id: 'trig', name: 'Right-angled trigonometry', courses: ['myp9', 'dpaisl', 'nondp'], instr: 'Triangle ABC has a right angle at C. Give answers to 1 decimal place.',
    gen(l) {
      const rad = t => t * Math.PI / 180, deg = x => x * 180 / Math.PI;
      const th = RNG.int(15, 75);
      if (l === 1) {
        const h = RNG.int(5, 30);
        if (RNG.chance(0.5)) return { q: `AB = ${h} cm and angle A = ${th}°. Find BC.`, a: `BC = ${fixed(h * Math.sin(rad(th)), 1)} cm` };
        return { q: `AB = ${h} cm and angle A = ${th}°. Find AC.`, a: `AC = ${fixed(h * Math.cos(rad(th)), 1)} cm` };
      }
      if (l === 2) {
        const s = RNG.int(4, 25), t = RNG.int(1, 3);
        if (t === 1) return { q: `AC = ${s} cm and angle A = ${th}°. Find BC.`, a: `BC = ${fixed(s * Math.tan(rad(th)), 1)} cm` };
        if (t === 2) return { q: `BC = ${s} cm and angle A = ${th}°. Find AB.`, a: `AB = ${fixed(s / Math.sin(rad(th)), 1)} cm` };
        return { q: `AC = ${s} cm and angle A = ${th}°. Find AB.`, a: `AB = ${fixed(s / Math.cos(rad(th)), 1)} cm` };
      }
      const t = RNG.int(1, 3);
      if (t === 1) { const o = RNG.int(3, 20), a = RNG.int(3, 20); return { q: `BC = ${o} cm and AC = ${a} cm. Find angle A.`, a: `A = ${fixed(deg(Math.atan(o / a)), 1)}°` }; }
      if (t === 2) { const hyp = RNG.int(8, 30), o = RNG.int(2, hyp - 1); return { q: `AB = ${hyp} cm and BC = ${o} cm. Find angle A.`, a: `A = ${fixed(deg(Math.asin(o / hyp)), 1)}°` }; }
      const d = RNG.int(20, 150), e = RNG.int(12, 60);
      return { q: `From a point ${d} m from the base of a vertical tower, the angle of elevation to the top is ${e}°. Find the height of the tower.`, a: `${fixed(d * Math.tan(rad(e)), 1)} m` };
    },
  },
  {
    id: 'quadratic-eq', name: 'Solving quadratics by factorising', courses: ['myp9', 'nondp'], instr: 'Solve by factorising.',
    gen(l) {
      const roots = (r1, r2) => r1 === r2 ? `x = ${r1}` : `x = ${[r1, r2].sort((a, b) => parseFloat(a.replace(MINUS, '-')) - parseFloat(b.replace(MINUS, '-'))).join(' or x = ')}`;
      if (l < 3) {
        const r1 = RNG.int(-9, 9), r2 = RNG.int(-9, 9);
        if (l === 1) return { q: `${poly([[1, 2], [-(r1 + r2), 1], [r1 * r2, 0]])} = 0`, a: roots(num(r1), num(r2)) };
        return { q: `${poly([[1, 2], [-(r1 + r2), 1]])} = ${num(-r1 * r2)}`, a: roots(num(r1), num(r2)) };
      }
      let a, p; do { a = RNG.int(2, 3); p = RNG.nz(-7, 7); } while (gcd(a, p) !== 1);
      const r = RNG.int(-6, 6);
      return { q: `${poly([[a, 2], [-(a * r + p), 1], [p * r, 0]])} = 0`, a: `x = ${fr(p, a)} or x = ${num(r)}` };
    },
  },
  {
    id: 'arithmetic-seq', name: 'Arithmetic sequences', courses: ['myp9', 'dpaisl'], instr: 'Show your working.',
    gen(l) {
      const u1 = RNG.int(-10, 20), d = RNG.nz(-7, 9);
      const terms = [0, 1, 2, 3].map(i => num(u1 + i * d)).join(', ') + ', …';
      if (l === 1) return { q: `Find an expression for the n<sup>th</sup> term of ${terms}`, a: `u<sub>n</sub> = ${lin(d, u1 - d, 'n')}` };
      if (l === 2) {
        const n = RNG.int(15, 60);
        if (RNG.chance(0.5)) return { q: `An arithmetic sequence has u<sub>1</sub> = ${num(u1)} and d = ${num(d)}. Find u<sub>${n}</sub>.`, a: num(u1 + (n - 1) * d) };
        return { q: `Which term of ${terms} is equal to ${num(u1 + (n - 1) * d)}?`, a: `the ${n}<sup>th</sup> term` };
      }
      const n = RNG.int(10, 40);
      if (RNG.chance(0.5)) return { q: `Find the sum of the first ${n} terms of ${terms}`, a: `S<sub>${n}</sub> = ${num(n * (2 * u1 + (n - 1) * d) / 2)}` };
      const p = RNG.int(2, 5), q = RNG.int(p + 3, 12);
      return { q: `In an arithmetic sequence, u<sub>${p}</sub> = ${num(u1 + (p - 1) * d)} and u<sub>${q}</sub> = ${num(u1 + (q - 1) * d)}. Find u<sub>1</sub> and d.`, a: `u<sub>1</sub> = ${num(u1)}, d = ${num(d)}` };
    },
  },
  {
    id: 'geometric-seq', name: 'Geometric sequences', courses: ['dpaisl'], instr: 'Show your working.',
    gen(l) {
      const u1 = RNG.int(1, 9) * RNG.pick([1, 1, -1]), r = RNG.pick([2, 3, -2, -3]);
      const terms = [0, 1, 2, 3].map(i => num(u1 * r ** i)).join(', ') + ', …';
      if (l === 1) { const n = RNG.int(6, 10); return { q: `For the sequence ${terms} find the common ratio and u<sub>${n}</sub>.`, a: `r = ${num(r)}, u<sub>${n}</sub> = ${num(u1 * r ** (n - 1))}` }; }
      if (l === 2) { const n = RNG.int(5, 9); return { q: `Find the sum of the first ${n} terms of ${terms}`, a: `S<sub>${n}</sub> = ${num(u1 * (r ** n - 1) / (r - 1))}` }; }
      const P = RNG.int(20, 90) * 1000, g = RNG.pick([1.5, 2, 2.5, 3, 3.5, 4]), n = RNG.int(5, 15);
      return { q: `A town has a population of ${P.toLocaleString('en-US')}, growing by ${g}% per year. Find the population after ${n} years, to the nearest whole number.`, a: Math.round(P * (1 + g / 100) ** n).toLocaleString('en-US') };
    },
  },
  {
    id: 'finance', name: 'Simple & compound interest', courses: ['dpaisl', 'nondp'], instr: 'Give answers to 2 decimal places.',
    gen(l) {
      const P = RNG.int(5, 100) * 100, r = RNG.pick([1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6]), t = RNG.int(2, 10);
      if (l === 1) return { q: `Find the simple interest earned on $${P.toLocaleString('en-US')} invested at ${r}% per year for ${t} years.`, a: `$${money(P * r * t / 100)}` };
      if (l === 2) {
        const fv = P * (1 + r / 100) ** t;
        if (RNG.chance(0.5)) return { q: `$${P.toLocaleString('en-US')} is invested at ${r}% per year, compounded annually. Find the value after ${t} years.`, a: `$${money(fv)}` };
        return { q: `$${P.toLocaleString('en-US')} is invested at ${r}% per year, compounded annually. How much interest is earned in ${t} years?`, a: `$${money(fv - P)}` };
      }
      if (RNG.chance(0.5)) {
        const [k, name] = RNG.pick([[4, 'quarterly'], [12, 'monthly']]);
        return { q: `$${P.toLocaleString('en-US')} is invested at ${r}% per year, compounded ${name}. Find the value after ${t} years.`, a: `$${money(P * (1 + r / (100 * k)) ** (k * t))}` };
      }
      const V = RNG.int(10, 60) * 1000, dep = RNG.int(8, 25);
      return { q: `A car bought for $${V.toLocaleString('en-US')} depreciates by ${dep}% per year. Find its value after ${t} years.`, a: `$${money(V * (1 - dep / 100) ** t)}` };
    },
  },
  {
    id: 'percent-error', name: 'Approximation & percentage error', courses: ['dpaisl'], instr: 'Give answers to 3 significant figures.',
    gen(l) {
      if (l === 3) {
        const [label, exact, approx] = RNG.pick([['π', Math.PI, 3.14], ['π', Math.PI, 22 / 7], ['√2', Math.SQRT2, 1.4], ['√10', Math.sqrt(10), 3.2], ['e', Math.E, 2.7]]);
        const ap = approx === 22 / 7 ? fr(22, 7) : fmtN(approx);
        return { q: `The value of ${label} is approximated as ${ap}. Find the percentage error.`, a: `${sf3(Math.abs(approx - exact) / exact * 100)}%` };
      }
      const ve = RNG.int(100, 999) / (l === 1 ? 1 : 10);
      let va = l === 1 ? Math.round(ve / 10) * 10 : Math.round(ve);
      if (va === ve) va += l === 1 ? 5 : 1;
      const ctx = RNG.pick([['the length of a room', 'cm'], ['the mass of a parcel', 'g'], ['the time of a race', 's']]);
      return { q: `The exact value of ${ctx[0]} is ${fmtN(ve)} ${ctx[1]}. It is estimated as ${fmtN(va)} ${ctx[1]}. Find the percentage error.`, a: `${sf3(Math.abs(va - ve) / ve * 100)}%` };
    },
  },
  {
    id: 'statistics', name: 'Averages & spread', courses: ['myp8', 'dpaisl', 'nondp'], instr: 'Give non-integer answers to 2 decimal places.',
    gen(l) {
      const mean = arr => arr.reduce((s, x) => s + x, 0) / arr.length;
      const show = x => Number.isInteger(x) ? num(x) : fixed(x, 2);
      if (l === 1) {
        const n = RNG.int(5, 8), data = Array.from({ length: n }, () => RNG.int(1, 20));
        const s = [...data].sort((a, b) => a - b);
        const med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
        return { q: `For the data ${list(data)}, find the mean, median and range.`, a: `mean = ${show(mean(data))}, median = ${show(med)}, range = ${s[n - 1] - s[0]}` };
      }
      if (l === 2) {
        const vals = [0, 1, 2, 3, 4, 5], f = vals.map(() => RNG.int(1, 12));
        const total = f.reduce((s, x) => s + x, 0), fx = vals.reduce((s, v, i) => s + v * f[i], 0);
        const maxF = Math.max(...f), modes = vals.filter((v, i) => f[i] === maxF);
        return {
          q: `The table shows the number of siblings of students in a class. Find the mean and the mode.<br><table class="mini-table"><tr><th>Siblings</th>${vals.map(v => `<td>${v}</td>`).join('')}</tr><tr><th>Frequency</th>${f.map(v => `<td>${v}</td>`).join('')}</tr></table>`,
          a: `mean = ${show(fx / total)}, mode = ${modes.join(' and ')}`,
        };
      }
      const n = RNG.int(5, 7);
      let others, m, x;
      do { others = Array.from({ length: n - 1 }, () => RNG.int(2, 30)); m = RNG.int(8, 22); x = m * n - others.reduce((s, v) => s + v, 0); } while (x < 1 || x > 40);
      const shown = RNG.shuffle([...others.map(num), '<em>x</em>']).join(', ');
      return { q: `The mean of the ${n} numbers ${shown} is ${m}. Find the value of <em>x</em>.`, a: `x = ${x}` };
    },
  },
  {
    id: 'probability', name: 'Probability', courses: ['myp8', 'dpaisl', 'nondp'], instr: 'Give answers as fractions in their simplest form.',
    gen(l) {
      const r = RNG.int(2, 8), b = RNG.int(2, 8), g = RNG.int(1, 6), t = r + b + g;
      const bag = `A bag contains ${r} red, ${b} blue and ${g} green counters.`;
      if (l === 1) {
        if (RNG.chance(0.5)) return { q: `${bag} One counter is taken at random. Find P(blue).`, a: fr(b, t) };
        return { q: `${bag} One counter is taken at random. Find P(not red).`, a: fr(t - r, t) };
      }
      if (l === 2) {
        if (RNG.chance(0.5)) return { q: `${bag} A counter is taken, replaced, and a second counter is taken. Find P(red then blue).`, a: fr(r * b, t * t) };
        const k = RNG.int(4, 10), ways = [1, 2, 3, 4, 5, 6].filter(x => k - x >= 1 && k - x <= 6).length;
        return { q: `Two fair six-sided dice are rolled. Find the probability that the total is ${k}.`, a: fr(ways, 36) };
      }
      if (RNG.chance(0.5)) return { q: `${bag} Two counters are taken without replacement. Find P(both red).`, a: fr(r * (r - 1), t * (t - 1)) };
      return { q: `${bag} Two counters are taken without replacement. Find the probability that they are different colours.`, a: fr(t * (t - 1) - r * (r - 1) - b * (b - 1) - g * (g - 1), t * (t - 1)) };
    },
  },
  {
    id: 'differentiation', name: 'Differentiation', courses: ['dpaisl'], instr: 'Show your working.',
    gen(l) {
      if (l === 1) {
        const n = RNG.int(3, 5), a = RNG.nz(-6, 6), b = RNG.nz(-8, 8), c = RNG.nz(-9, 9), d = RNG.int(-10, 10);
        return { q: `Find f′(x) given f(x) = ${poly([[a, n], [b, 2], [c, 1], [d, 0]])}`, a: `f′(x) = ${poly([[a * n, n - 1], [2 * b, 1], [c, 0]])}` };
      }
      if (l === 2) {
        const a = RNG.nz(-3, 3), b = RNG.nz(-5, 5), c = RNG.int(-8, 8), d = RNG.int(-9, 9), k = RNG.nz(-3, 3);
        const f = x => a * x ** 3 + b * x ** 2 + c * x + d, m = 3 * a * k * k + 2 * b * k + c;
        const curve = poly([[a, 3], [b, 2], [c, 1], [d, 0]]);
        if (RNG.chance(0.5)) return { q: `Find the gradient of the curve y = ${curve} at the point where x = ${num(k)}.`, a: num(m) };
        return { q: `Find the equation of the tangent to y = ${curve} at x = ${num(k)}.`, a: lineEq(m, 1, f(k) - m * k) };
      }
      const a = RNG.nz(-4, 4), x0 = RNG.int(-5, 5), c = RNG.int(-10, 10), b = -2 * a * x0;
      return { q: `Find the coordinates of the stationary point of y = ${poly([[a, 2], [b, 1], [c, 0]])} and state whether it is a maximum or a minimum.`, a: `(${num(x0)}, ${num(a * x0 * x0 + b * x0 + c)}), ${a > 0 ? 'minimum' : 'maximum'}` };
    },
  },
];
