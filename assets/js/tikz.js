'use strict';
/* ============================================================
   TikZ → SVG for worksheet figures. Claude draws figures in TikZ, so the .tex keeps real TikZ;
   this draws the common subset on the page (and in print / PDF) at true size (1 cm = 1 cm).
   Supported: \draw \fill \filldraw \path \node \coordinate \foreach, scope (shift, xshift,
   yshift, scale); paths with -- |- -| to .. controls .., rectangle, circle, ellipse, arc, grid,
   cycle, node (above/below/left/right, midway, pos), coordinate, plot coordinates and
   plot (\x, {f(\x)}); colours (blue!20, red!50!black), line widths, dashed/dotted, arrows,
   fill, opacity. Anything else is skipped and listed in `warnings`.
   ============================================================ */
const Tikz = (() => {
  const CM = 37.8; // px per cm
  const UNIT = { cm: 1, mm: 0.1, pt: 1 / 28.4527, bp: 1 / 28.3465, in: 2.54, em: 0.3515, ex: 0.1519 };
  const COLORS = {
    black: [0, 0, 0], white: [255, 255, 255], red: [220, 38, 38], green: [22, 150, 70], blue: [37, 99, 235], cyan: [6, 182, 212],
    magenta: [192, 38, 211], yellow: [234, 179, 8], gray: [128, 128, 128], grey: [128, 128, 128], darkgray: [64, 64, 64],
    lightgray: [191, 191, 191], orange: [234, 88, 12], purple: [126, 34, 206], brown: [146, 64, 14], olive: [128, 128, 0],
    teal: [13, 148, 136], violet: [124, 58, 237], pink: [236, 72, 153], lime: [132, 204, 22],
  };
  const WIDTH = { 'ultra thin': 0.1, 'very thin': 0.2, thin: 0.4, semithick: 0.6, thick: 0.8, 'very thick': 1.2, 'ultra thick': 1.6 };

  function color(spec) { // "blue!30" = 30% blue + white; "red!50!black"
    const parts = String(spec).trim().split('!');
    let c = COLORS[parts[0]];
    if (!c) return null;
    for (let i = 1; i < parts.length; i += 2) {
      const p = Math.max(0, Math.min(100, parseFloat(parts[i]) || 0)) / 100, other = COLORS[parts[i + 1]] || COLORS.white;
      c = c.map((v, k) => v * p + other[k] * (1 - p));
    }
    return `rgb(${c.map(Math.round).join(',')})`;
  }

  /* ---------- numbers and expressions (TikZ trig works in degrees) ---------- */
  const F = {
    sin: d => Math.sin(d * Math.PI / 180), cos: d => Math.cos(d * Math.PI / 180), tan: d => Math.tan(d * Math.PI / 180),
    asin: x => Math.asin(x) * 180 / Math.PI, acos: x => Math.acos(x) * 180 / Math.PI, atan: x => Math.atan(x) * 180 / Math.PI,
    sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp, ln: Math.log, log10: Math.log10, min: Math.min, max: Math.max,
    round: Math.round, floor: Math.floor, ceil: Math.ceil, deg: r => r * 180 / Math.PI, rad: d => d * Math.PI / 180, pi: Math.PI, e: Math.E,
  };
  function num(expr) { // → centimetres (or a plain number)
    let s = String(expr).trim().replace(/^\{|\}$/g, '');
    const m = s.match(/^(-?[\d.]+)\s*(cm|mm|pt|bp|in|em|ex)?$/);
    if (m) return parseFloat(m[1]) * (m[2] ? UNIT[m[2]] : 1);
    s = s.replace(/(\d)\s*(cm|mm|pt|bp|in|em|ex)\b/g, (x, d, u) => `${d}*${UNIT[u]}`);
    if (!/^[\d.+\-*/()^,\sA-Za-z]*$/.test(s)) throw new Error(`cannot read “${expr}”`);
    let js = s.replace(/\bpi\b/g, 'F.pi').replace(/\b([a-z]+[0-9]*)\s*\(/g, (x, f) => { if (!(f in F)) throw new Error(`unknown function ${f}`); return `F.${f}(`; });
    if (/[A-Za-z]/.test(js.replace(/F\.[a-z]+[0-9]*/g, '').replace(/\be\b/g, ''))) throw new Error(`cannot read “${expr}”`);
    js = js.replace(/\be\b/g, 'F.e').replace(/(^|[^\w).])-(\d+(?:\.\d+)?)\s*\^/g, '$1(-$2)^').replace(/\^/g, '**');
    const v = Function('F', `return (${js});`)(F);
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`cannot read “${expr}”`);
    return v;
  }

  /* ---------- small parsing helpers ---------- */
  function balanced(s, i, open, close) { // s[i] === open → [inner, index after close]
    let depth = 0;
    for (let j = i; j < s.length; j++) {
      if (s[j] === '\\') { j++; continue; }
      if (s[j] === open) depth++;
      else if (s[j] === close && --depth === 0) return [s.slice(i + 1, j), j + 1];
    }
    throw new Error(`unclosed ${open}`);
  }
  function splitTop(s, sep = ',') { // split at top-level separators
    const out = []; let depth = 0, cur = '';
    for (const ch of s) {
      if ('{([' .includes(ch)) depth++;
      else if ('})]'.includes(ch)) depth--;
      if (ch === sep && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur);
    return out.map(x => x.trim()).filter(x => x !== '');
  }
  function options(str) { // "thick, fill=blue!20, ->" → { thick: true, fill: 'blue!20', '->': true }
    const o = {};
    splitTop(str || '').forEach(p => {
      const k = p.indexOf('=');
      if (k > 0 && !/^[<>-]/.test(p)) o[p.slice(0, k).trim()] = p.slice(k + 1).trim().replace(/^\{|\}$/g, '');
      else o[p] = true;
    });
    return o;
  }

  /* ---------- drawing state ---------- */
  function style(o, base = {}) { // options → stroke/fill/arrow style, on top of inherited defaults
    const s = { ...base };
    for (const [k, v] of Object.entries(o)) {
      if (v === true) {
        const col = color(k);
        if (col) { s.color = col; continue; }
        if (k in WIDTH) s.width = WIDTH[k];
        else if (k === 'dashed' || k === 'densely dashed' || k === 'loosely dashed') s.dash = k;
        else if (k === 'dotted' || k === 'densely dotted' || k === 'loosely dotted') s.dash = k;
        else if (k === 'solid') s.dash = '';
        else if (k.includes('-') && /[<>]|stealth|latex|triangle/i.test(k)) { // arrow tips: -> <- <-> -stealth -{Stealth[length=2mm]}
          const [left, ...right] = k.split('-'), tip = t => /^(<|>|\{?\s*(stealth|latex|to|triangle)\b.*)$/i.test(t.trim());
          s.arrowStart = tip(left); s.arrowEnd = tip(right.join('-'));
        }
        else if (k === 'draw') s.draw = s.draw || s.color || 'black';
        else if (k === 'fill') s.fillOn = true;
      } else {
        if (k === 'color') s.color = color(v) || s.color;
        else if (k === 'draw') s.draw = v === 'none' ? 'none' : color(v) || 'black';
        else if (k === 'fill') s.fill = v === 'none' ? 'none' : color(v) || s.fill;
        else if (k === 'text') s.text = color(v) || s.text;
        else if (k === 'line width') s.width = num(v) / UNIT.pt;
        else if (k === 'opacity') s.opacity = parseFloat(v);
        else if (k === 'fill opacity') s.fillOpacity = parseFloat(v);
        else if (k === 'draw opacity') s.drawOpacity = parseFloat(v);
      }
    }
    return s;
  }

  function render(src) {
    const warnings = new Set();
    const shapes = []; // { d | circle, style, kind }
    const labels = [];
    const named = {};
    const bbox = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const grow = (x, y) => { bbox.x0 = Math.min(bbox.x0, x); bbox.x1 = Math.max(bbox.x1, x); bbox.y0 = Math.min(bbox.y0, y); bbox.y1 = Math.max(bbox.y1, y); };

    // transform stack: picture scale/unit vectors, then scopes (shift + scale)
    const m = src.match(/\\begin\{tikzpicture\}\s*(\[)?/);
    let body = src, pic = {};
    if (m) {
      let i = m.index + m[0].length;
      if (m[1]) { const [o, k] = balanced(src, i - 1, '[', ']'); pic = options(o); i = k; }
      const end = src.lastIndexOf('\\end{tikzpicture}');
      body = src.slice(i, end > i ? end : undefined);
    }
    const sc = pic.scale ? num(pic.scale) : 1;
    const top = { sx: (pic.x ? num(pic.x) : 1) * (pic.xscale ? num(pic.xscale) : sc), sy: (pic.y ? num(pic.y) : 1) * (pic.yscale ? num(pic.yscale) : sc), dx: 0, dy: 0, style: style(pic) };
    const stack = [top];
    const T = () => stack[stack.length - 1];
    const toPx = (x, y) => [x * T().sx + T().dx, y * T().sy + T().dy]; // → picture cm
    const fromPx = (X, Y) => [(X - T().dx) / T().sx, (Y - T().dy) / T().sy];

    function coord(str, cur) { // "(1,2)" "(30:2)" "(A)" "(A.north)" → picture cm
      const s = str.trim();
      if (/^[A-Za-z][\w ]*(\.[\w ]+)?$/.test(s) && !s.includes(',') && !s.includes(':')) {
        const n = named[s.split('.')[0].trim()];
        if (!n) throw new Error(`unknown point (${s})`);
        return n;
      }
      const parts = splitTop(s);
      if (parts.length >= 2) return toPx(num(parts[0]), num(parts[1]));
      const pol = s.split(':');
      if (pol.length === 2) { const a = num(pol[0]), r = num(pol[1]); return toPx(r * Math.cos(a * Math.PI / 180), r * Math.sin(a * Math.PI / 180)); }
      throw new Error(`cannot read point (${s})`);
    }
    function relative(str, cur) { const [x, y] = coord(str); const [ox, oy] = toPx(0, 0); return [cur[0] + x - ox, cur[1] + y - oy]; }

    function label(text, at, o, st, along) {
      const dirs = { above: [0, 1], below: [0, -1], left: [-1, 0], right: [1, 0], 'above left': [-1, 1], 'above right': [1, 1], 'below left': [-1, -1], 'below right': [1, -1] };
      const anchors = { north: [0, -1], south: [0, 1], east: [-1, 0], west: [1, 0], 'north east': [-1, -1], 'north west': [1, -1], 'south east': [-1, 1], 'south west': [1, 1], center: [0, 0] };
      let dir = [0, 0], gap = 0.1;
      for (const [k, v] of Object.entries(o)) {
        if (k in dirs) { dir = dirs[k]; if (v !== true) { try { gap += num(v); } catch (e) { /* ignore */ } } }
        if (k === 'anchor' && v in anchors) dir = anchors[v];
      }
      const ls = style(o, st);
      const empty = !String(text).trim();
      if (empty && (o.circle || o.fill) && (o.fill || ls.fillOn)) { // a dot drawn as a node
        const r = o['inner sep'] ? num(o['inner sep']) : 1.5 * UNIT.pt;
        shapes.push({ circle: [at[0], at[1], r, r], style: { ...ls, fill: ls.fill || ls.color || 'black', draw: 'none' } });
        grow(at[0] - r, at[1] - r); grow(at[0] + r, at[1] + r);
        return;
      }
      if (empty) return;
      labels.push({ text: String(text), at, dir, gap, color: ls.text || ls.color, box: o.fill && o.fill !== true ? color(o.fill) : null, border: o.draw ? (color(o.draw) || '#000') : null });
      const w = Math.max(0.3, String(text).replace(/\\[a-zA-Z]+|[{}$^_]/g, '').length * 0.2), h = 0.45;
      const cx = at[0] + dir[0] * (w / 2 + gap), cy = at[1] + dir[1] * (h / 2 + gap);
      grow(cx - w / 2, cy - h / 2); grow(cx + w / 2, cy + h / 2);
    }

    /* ---------- one path statement ---------- */
    function path(spec, kind, o) {
      const st = style(o, T().style);
      // awaiting: an operation (-- rectangle …) was read and its target point has not come yet
      let d = '', cur = null, start = null, i = 0, op = 'move', last = null, pendingNodes = [], awaiting = false;
      const s = spec;
      const pt = p => { grow(p[0], p[1]); return `${(p[0] * CM).toFixed(2)} ${(-p[1] * CM).toFixed(2)}`; };
      const lineTo = p => {
        if (!cur || !awaiting) { d += ` M ${pt(p)}`; start = p; }
        else if (op === '|-') { const c = [cur[0], p[1]]; d += ` L ${pt(c)} L ${pt(p)}`; last = [c, p]; }
        else if (op === '-|') { const c = [p[0], cur[1]]; d += ` L ${pt(c)} L ${pt(p)}`; last = [c, p]; }
        else if (op === 'rect') { d += ` M ${pt(cur)} L ${pt([p[0], cur[1]])} L ${pt(p)} L ${pt([cur[0], p[1]])} Z M ${pt(p)}`; last = [cur, p]; }
        else if (op === 'grid') {
          const step = o.step ? num(o.step) : 1, [x0, x1] = [Math.min(cur[0], p[0]), Math.max(cur[0], p[0])], [y0, y1] = [Math.min(cur[1], p[1]), Math.max(cur[1], p[1])];
          const sx = step * T().sx, sy = step * T().sy, ox = T().dx, oy = T().dy;
          for (let x = Math.ceil((x0 - ox) / sx - 1e-9) * sx + ox; x <= x1 + 1e-9; x += sx) d += ` M ${pt([x, y0])} L ${pt([x, y1])}`;
          for (let y = Math.ceil((y0 - oy) / sy - 1e-9) * sy + oy; y <= y1 + 1e-9; y += sy) d += ` M ${pt([x0, y])} L ${pt([x1, y])}`;
          d += ` M ${pt(p)}`;
        } else { d += ` L ${pt(p)}`; last = [cur, p]; }
        if (cur) pendingNodes.forEach(n => label(n.text, [cur[0] + (p[0] - cur[0]) * n.pos, cur[1] + (p[1] - cur[1]) * n.pos], n.o, st));
        pendingNodes = [];
        cur = p; op = 'line'; awaiting = false;
      };
      const setOp = o2 => { op = o2; awaiting = true; };
      while (i < s.length) {
        const rest = s.slice(i);
        let mm;
        if ((mm = rest.match(/^\s+/))) { i += mm[0].length; continue; }
        if (rest[0] === '(') { const [c, k] = balanced(s, i, '(', ')'); lineTo(coord(c)); i = k; continue; }
        if ((mm = rest.match(/^\+\+\s*\(/))) { const [c, k] = balanced(s, i + mm[0].length - 1, '(', ')'); lineTo(relative(c, cur)); i = k; continue; }
        if ((mm = rest.match(/^\+\s*\(/))) { const keep = cur; const [c, k] = balanced(s, i + mm[0].length - 1, '(', ')'); const p = relative(c, cur); lineTo(p); cur = keep; i = k; continue; }
        if (rest.startsWith('--')) { setOp('line'); i += 2; continue; }
        if (rest.startsWith('|-')) { setOp('|-'); i += 2; continue; }
        if (rest.startsWith('-|')) { setOp('-|'); i += 2; continue; }
        if ((mm = rest.match(/^to\b\s*(\[[^\]]*\])?/))) { setOp('line'); i += mm[0].length; continue; }
        if ((mm = rest.match(/^\.\.\s*controls\s*/))) {
          i += mm[0].length;
          const [c1, k1] = balanced(s, i, '(', ')'); i = k1;
          let c2 = c1; const and = s.slice(i).match(/^\s*and\s*/);
          if (and) { i += and[0].length; const [cc, k2] = balanced(s, i, '(', ')'); c2 = cc; i = k2; }
          const dots = s.slice(i).match(/^\s*\.\.\s*/); if (dots) i += dots[0].length;
          const [ce, k3] = balanced(s, i, '(', ')'); i = k3;
          const p1 = coord(c1), p2 = coord(c2), pe = coord(ce);
          d += ` C ${pt(p1)} ${pt(p2)} ${pt(pe)}`; last = [cur, pe]; cur = pe; op = 'line';
          continue;
        }
        if ((mm = rest.match(/^rectangle\b/))) { setOp('rect'); i += mm[0].length; continue; }
        if ((mm = rest.match(/^grid\b/))) { setOp('grid'); i += mm[0].length; continue; }
        if ((mm = rest.match(/^cycle\b/))) { if (start) { d += ' Z'; last = [cur, start]; cur = start; } i += mm[0].length; continue; }
        if ((mm = rest.match(/^(circle|ellipse)\b\s*/))) {
          i += mm[0].length;
          let rx, ry;
          if (s[i] === '[') { const [oo, k] = balanced(s, i, '[', ']'); const q = options(oo); rx = num(q.radius || q['x radius'] || 1); ry = num(q.radius || q['y radius'] || q['x radius'] || 1); i = k; }
          else { const [c, k] = balanced(s, i, '(', ')'); const pr = c.split(/\s+and\s+/); rx = num(pr[0]); ry = pr[1] ? num(pr[1]) : rx; i = k; }
          rx *= Math.abs(T().sx); ry *= Math.abs(T().sy);
          shapes.push({ circle: [cur[0], cur[1], rx, ry], style: st, kind });
          grow(cur[0] - rx, cur[1] - ry); grow(cur[0] + rx, cur[1] + ry);
          continue;
        }
        if ((mm = rest.match(/^arc\b\s*/))) {
          i += mm[0].length;
          let a0, a1, r, ry;
          if (s[i] === '[') { const [oo, k] = balanced(s, i, '[', ']'); const q = options(oo); a0 = num(q['start angle'] || 0); a1 = q['end angle'] !== undefined ? num(q['end angle']) : a0 + num(q['delta angle'] || 90); r = num(q.radius || q['x radius'] || 1); ry = num(q.radius || q['y radius'] || r); i = k; }
          else { const [c, k] = balanced(s, i, '(', ')'); const pr = c.split(':'); a0 = num(pr[0]); a1 = num(pr[1]); const rr = pr[2].split(/\s+and\s+/); r = num(rr[0]); ry = rr[1] ? num(rr[1]) : r; i = k; }
          r *= Math.abs(T().sx); ry *= Math.abs(T().sy);
          const rad = a => a * Math.PI / 180;
          const c = [cur[0] - r * Math.cos(rad(a0)), cur[1] - ry * Math.sin(rad(a0))];
          const e = [c[0] + r * Math.cos(rad(a1)), c[1] + ry * Math.sin(rad(a1))];
          const sweep = a1 > a0 ? 0 : 1, large = Math.abs(a1 - a0) % 360 > 180 ? 1 : 0;
          for (let a = Math.min(a0, a1); a <= Math.max(a0, a1); a += 15) grow(c[0] + r * Math.cos(rad(a)), c[1] + ry * Math.sin(rad(a)));
          if (!cur) throw new Error('arc needs a starting point');
          if (!d) d += ` M ${pt(cur)}`;
          if (Math.abs(a1 - a0) >= 360) { const mid = [c[0] - (cur[0] - c[0]), c[1] - (cur[1] - c[1])]; d += ` A ${(r * CM).toFixed(2)} ${(ry * CM).toFixed(2)} 0 1 ${sweep} ${pt(mid)} A ${(r * CM).toFixed(2)} ${(ry * CM).toFixed(2)} 0 1 ${sweep} ${pt(cur)}`; }
          else d += ` A ${(r * CM).toFixed(2)} ${(ry * CM).toFixed(2)} 0 ${large} ${sweep} ${pt(e)}`;
          last = [cur, e]; cur = e; op = 'line';
          continue;
        }
        if ((mm = rest.match(/^node\b\s*/))) {
          i += mm[0].length;
          let no = {}, text = '';
          while (i < s.length) {
            const r2 = s.slice(i), ws = r2.match(/^\s+/); if (ws) { i += ws[0].length; continue; }
            if (s[i] === '[') { const [oo, k] = balanced(s, i, '[', ']'); Object.assign(no, options(oo)); i = k; continue; }
            if (s[i] === '(') { const [nm, k] = balanced(s, i, '(', ')'); if (cur) named[nm.trim()] = cur; i = k; continue; }
            if (s[i] === '{') { const [t, k] = balanced(s, i, '{', '}'); text = t; i = k; }
            break;
          }
          // "-- node{…} (B)" labels the middle of the segment; "(B) node{…}" labels B; midway/pos place it along the segment
          const pos = no.midway ? 0.5 : no['near start'] ? 0.25 : no['near end'] ? 0.75 : no.pos !== undefined ? num(no.pos) : null;
          if (awaiting) pendingNodes.push({ text, o: no, pos: pos ?? 0.5 });
          else if (pos !== null && last) label(text, [last[0][0] + (last[1][0] - last[0][0]) * pos, last[0][1] + (last[1][1] - last[0][1]) * pos], no, st);
          else if (cur) label(text, cur, no, st);
          continue;
        }
        if ((mm = rest.match(/^coordinate\b\s*(\[[^\]]*\])?\s*\(([^)]*)\)/))) { if (cur) named[mm[2].trim()] = cur; i += mm[0].length; continue; }
        if ((mm = rest.match(/^plot\b\s*/))) {
          i += mm[0].length;
          let po = { ...o };
          if (s[i] === '[') { const [oo, k] = balanced(s, i, '[', ']'); Object.assign(po, options(oo)); i = k; }
          const ws = s.slice(i).match(/^\s*/); i += ws[0].length;
          let pts = [];
          if (s.slice(i).startsWith('coordinates')) {
            i += 11; const ws2 = s.slice(i).match(/^\s*/); i += ws2[0].length;
            const [list, k] = balanced(s, i, '{', '}'); i = k;
            pts = (list.match(/\([^()]*\)/g) || []).map(c => coord(c.slice(1, -1)));
          } else if (s[i] === '(') {
            const [expr, k] = balanced(s, i, '(', ')'); i = k;
            const v = (po.variable || '\\x').trim(), dom = String(po.domain || '-5:5').split(':').map(num), n = Math.max(2, Math.min(400, parseInt(po.samples || 60, 10)));
            const [ex, ey] = splitTop(expr);
            for (let j = 0; j < n; j++) {
              const t = dom[0] + (dom[1] - dom[0]) * j / (n - 1), sub = e => e.split(v).join(`(${t})`);
              try { const y = num(sub(ey)); if (Math.abs(y) < 1e4) pts.push(toPx(num(sub(ex)), y)); else pts.push(null); } catch (err) { pts.push(null); }
            }
          } else { warnings.add('plot form'); break; }
          const smooth = po.smooth || po['smooth cycle'];
          let first = true, prev = null;
          const seg = [];
          const joins = awaiting && cur; // "(a) -- plot …" continues the path; otherwise the plot starts a new piece
          const flush = () => {
            if (seg.length < 2) { seg.length = 0; return; }
            d += `${first && joins ? ' L ' : ' M '}${pt(seg[0])}`;
            if (!smooth) seg.slice(1).forEach(p => { d += ` L ${pt(p)}`; });
            else {
              for (let j = 0; j < seg.length - 1; j++) {
                const p0 = seg[j - 1] || seg[j], p1 = seg[j], p2 = seg[j + 1], p3 = seg[j + 2] || p2, tt = 1 / 6;
                d += ` C ${pt([p1[0] + (p2[0] - p0[0]) * tt, p1[1] + (p2[1] - p0[1]) * tt])} ${pt([p2[0] - (p3[0] - p1[0]) * tt, p2[1] - (p3[1] - p1[1]) * tt])} ${pt(p2)}`;
              }
            }
            prev = seg[seg.length - 1]; first = false; seg.length = 0;
          };
          pts.forEach(p => { if (p) seg.push(p); else flush(); });
          flush();
          if (prev) { cur = prev; op = 'line'; awaiting = false; }
          continue;
        }
        warnings.add(rest.slice(0, 20).trim());
        break;
      }
      if (d.trim()) shapes.push({ d, style: st, kind });
    }

    /* ---------- statements ---------- */
    function statement(stmt) {
      const s = stmt.trim();
      if (!s) return;
      let mm;
      if ((mm = s.match(/^\\(draw|fill|filldraw|path|shade|shadedraw|clip)\b\s*/))) {
        let i = mm[0].length, o = {};
        while (s[i] === '[') { const [oo, k] = balanced(s, i, '[', ']'); Object.assign(o, options(oo)); i = k; while (s[i] === ' ') i++; }
        const kind = { shade: 'fill', shadedraw: 'filldraw' }[mm[1]] || mm[1];
        if (kind === 'clip') { warnings.add('clip'); return; }
        path(s.slice(i), kind, o);
        return;
      }
      if ((mm = s.match(/^\\node\b\s*/))) {
        let i = mm[0].length, o = {}, name = '', at = null, text = '';
        while (i < s.length) {
          const r = s.slice(i), ws = r.match(/^\s+/); if (ws) { i += ws[0].length; continue; }
          if (s[i] === '[') { const [oo, k] = balanced(s, i, '[', ']'); Object.assign(o, options(oo)); i = k; continue; }
          if (s[i] === '(') { const [nm, k] = balanced(s, i, '(', ')'); name = nm.trim(); i = k; continue; }
          if (r.startsWith('at')) { i += 2; const ws2 = s.slice(i).match(/^\s*/); i += ws2[0].length; const [c, k] = balanced(s, i, '(', ')'); at = coord(c); i = k; continue; }
          if (s[i] === '{') { const [t, k] = balanced(s, i, '{', '}'); text = t; i = k; continue; }
          break;
        }
        at = at || toPx(0, 0);
        if (name) named[name] = at;
        label(text, at, o, T().style);
        return;
      }
      if ((mm = s.match(/^\\coordinate\b\s*(\[[^\]]*\])?\s*\(([^)]*)\)\s*at\s*/))) {
        const [c] = balanced(s, mm[0].length, '(', ')');
        named[mm[2].trim()] = coord(c);
        return;
      }
      if (/^\\(tikzset|usetikzlibrary|pgfmathsetmacro|def)\b/.test(s)) { warnings.add(s.split(/[\s{[]/)[0]); return; }
      warnings.add(s.split(/[\s{[(]/)[0] || s.slice(0, 12));
    }

    function run(code) {
      let i = 0;
      const s = code.replace(/(^|[^\\])%.*$/gm, '$1');
      while (i < s.length) {
        const rest = s.slice(i);
        let mm;
        if ((mm = rest.match(/^\s+/))) { i += mm[0].length; continue; }
        if ((mm = rest.match(/^\\foreach\s*((?:\\[A-Za-z]+\s*\/?\s*)+)\s*in\s*/))) {
          const vars = mm[1].split('/').map(v => v.trim());
          i += mm[0].length;
          const [list, k] = balanced(s, i, '{', '}'); i = k;
          const ws = s.slice(i).match(/^\s*/); i += ws[0].length;
          let bodyCode;
          if (s[i] === '{') { const [b, k2] = balanced(s, i, '{', '}'); bodyCode = b; i = k2; }
          else { const end = findEnd(s, i); bodyCode = s.slice(i, end + 1); i = end + 1; }
          for (const item of expand(list)) {
            const vals = vars.length > 1 ? splitTop(item, '/') : [item];
            let b = bodyCode;
            vars.forEach((v, j) => { b = b.replace(new RegExp(v.replace(/\\/g, '\\\\') + '(?![A-Za-z])', 'g'), (vals[j] ?? '').replace(/^\{|\}$/g, '')); });
            run(b);
          }
          continue;
        }
        if ((mm = rest.match(/^\\begin\{scope\}\s*/))) {
          i += mm[0].length;
          let o = {};
          if (s[i] === '[') { const [oo, k] = balanced(s, i, '[', ']'); o = options(oo); i = k; }
          const end = findScopeEnd(s, i);
          const t = T(), sc2 = o.scale ? num(o.scale) : 1;
          let dx = t.dx, dy = t.dy;
          if (o.shift) { const [x, y] = coord(o.shift.replace(/^\(|\)$/g, '')); dx = x; dy = y; }
          if (o.xshift) dx += num(o.xshift);
          if (o.yshift) dy += num(o.yshift);
          stack.push({ sx: t.sx * sc2, sy: t.sy * sc2, dx, dy, style: style(o, t.style) });
          run(s.slice(i, end));
          stack.pop();
          i = end + '\\end{scope}'.length;
          continue;
        }
        const end = findEnd(s, i);
        try { statement(s.slice(i, end)); } catch (e) { warnings.add(e.message); }
        i = end + 1;
      }
    }
    function findEnd(s, i) { // next top-level ';'
      let depth = 0;
      for (let j = i; j < s.length; j++) {
        const ch = s[j];
        if (ch === '\\') { j++; continue; }
        if ('{(['.includes(ch)) depth++;
        else if ('})]'.includes(ch)) depth--;
        else if (ch === ';' && depth <= 0) return j;
      }
      return s.length;
    }
    function findScopeEnd(s, i) {
      let depth = 1, re = /\\(begin|end)\{scope\}/g, m2;
      re.lastIndex = i;
      while ((m2 = re.exec(s))) { depth += m2[1] === 'begin' ? 1 : -1; if (!depth) return m2.index; }
      throw new Error('scope has no \\end{scope}');
    }
    function expand(list) { // "0,1,...,5" "0,0.5,...,2" "A,B,C"
      const parts = splitTop(list);
      const out = [];
      for (let j = 0; j < parts.length; j++) {
        if (parts[j] === '...' && j > 0 && j < parts.length - 1) {
          const a = parseFloat(parts[j - 2] !== undefined && j >= 2 ? parts[j - 2] : parts[j - 1]), b = parseFloat(parts[j - 1]), c = parseFloat(parts[j + 1]);
          const step = j >= 2 && !isNaN(parseFloat(parts[j - 2])) ? b - a : (c >= b ? 1 : -1);
          if (!step || isNaN(b) || isNaN(c)) continue;
          for (let v = b + step; step > 0 ? v < c - 1e-9 : v > c + 1e-9; v += step) out.push(String(+v.toFixed(6)));
        } else out.push(parts[j]);
      }
      return out.slice(0, 500);
    }

    try { run(body); } catch (e) { warnings.add(e.message); }

    if (!shapes.length && !labels.length) return { svg: '', warnings: [...warnings], empty: true };

    /* ---------- SVG ---------- */
    const pad = 0.15;
    const x0 = bbox.x0 - pad, x1 = bbox.x1 + pad, y0 = bbox.y0 - pad, y1 = bbox.y1 + pad;
    const W = (x1 - x0) * CM, H = (y1 - y0) * CM;
    const markers = new Map();
    const marker = col => {
      if (!markers.has(col)) markers.set(col, `ah${markers.size}-${Math.random().toString(36).slice(2, 7)}`);
      return markers.get(col);
    };
    const dash = { dashed: '4 3', 'densely dashed': '3 2', 'loosely dashed': '4 6', dotted: '0.8 2.6', 'densely dotted': '0.8 1.6', 'loosely dotted': '0.8 5' };
    const els = shapes.map(sh => {
      const s = sh.style, kind = sh.kind || 'draw';
      const strokeCol = s.draw && s.draw !== 'none' ? s.draw : s.color || '#000';
      const stroke = kind === 'fill' ? (s.draw && s.draw !== 'none' ? s.draw : 'none') : (s.draw === 'none' ? 'none' : strokeCol);
      let fill = 'none';
      if (kind === 'fill' || kind === 'filldraw') fill = s.fill && s.fill !== 'none' ? s.fill : s.color || '#000';
      else if (s.fill && s.fill !== 'none') fill = s.fill;
      else if (s.fillOn) fill = s.color || '#000';
      const w = Math.max(0.9, (s.width ?? 0.4) * 1.333);
      const attrs = [`fill="${fill}"`, `stroke="${stroke}"`, `stroke-width="${w.toFixed(2)}"`, 'stroke-linejoin="round"', `stroke-linecap="${s.dash?.includes('dotted') ? 'round' : 'butt'}"`];
      if (s.dash && dash[s.dash]) attrs.push(`stroke-dasharray="${dash[s.dash]}"`);
      if (s.opacity !== undefined) attrs.push(`opacity="${s.opacity}"`);
      if (s.fillOpacity !== undefined) attrs.push(`fill-opacity="${s.fillOpacity}"`);
      if (s.drawOpacity !== undefined) attrs.push(`stroke-opacity="${s.drawOpacity}"`);
      if (sh.circle) {
        const [cx, cy, rx, ry] = sh.circle;
        return `<ellipse cx="${(cx * CM).toFixed(2)}" cy="${(-cy * CM).toFixed(2)}" rx="${(rx * CM).toFixed(2)}" ry="${(ry * CM).toFixed(2)}" ${attrs.join(' ')}/>`;
      }
      if (stroke !== 'none' && s.arrowEnd) attrs.push(`marker-end="url(#${marker(stroke)})"`);
      if (stroke !== 'none' && s.arrowStart) attrs.push(`marker-start="url(#${marker(stroke)})"`);
      return `<path d="${sh.d.trim()}" ${attrs.join(' ')}/>`;
    });
    const defs = [...markers].map(([col, id]) => `<marker id="${id}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 0 L10 5 L0 10 L3 5 Z" fill="${col}"/></marker>`).join('');
    const FO_W = 240, FO_H = 70;
    const lbls = labels.map(l => {
      const X = l.at[0] * CM, Y = -l.at[1] * CM, g = l.gap * CM;
      const fx = l.dir[0] === 0 ? X - FO_W / 2 : l.dir[0] < 0 ? X - FO_W - g : X + g;
      const fy = l.dir[1] === 0 ? Y - FO_H / 2 : l.dir[1] > 0 ? Y - FO_H - g : Y + g;
      const jc = l.dir[0] === 0 ? 'center' : l.dir[0] < 0 ? 'flex-end' : 'flex-start';
      const ai = l.dir[1] === 0 ? 'center' : l.dir[1] > 0 ? 'flex-end' : 'flex-start';
      const box = `${l.box ? `background:${l.box};` : ''}${l.border ? `border:1px solid ${l.border};padding:0 3px;` : ''}${l.color ? `color:${l.color};` : ''}`;
      return `<foreignObject x="${fx.toFixed(1)}" y="${fy.toFixed(1)}" width="${FO_W}" height="${FO_H}" style="overflow:visible"><div xmlns="http://www.w3.org/1999/xhtml" class="tikz-label" style="display:flex;width:${FO_W}px;height:${FO_H}px;justify-content:${jc};align-items:${ai};font-size:15px;line-height:1.15;white-space:nowrap;text-align:center"><span style="${box}">${labelHtml(l.text)}</span></div></foreignObject>`;
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(x0 * CM).toFixed(1)} ${(-y1 * CM).toFixed(1)} ${W.toFixed(1)} ${H.toFixed(1)}" style="width:${(x1 - x0).toFixed(2)}cm;height:${(y1 - y0).toFixed(2)}cm;overflow:visible" role="img">${defs ? `<defs>${defs}</defs>` : ''}${els.join('')}${lbls.join('')}</svg>`;
    return { svg, warnings: [...warnings] };
  }

  const SIZES = { tiny: 0.55, scriptsize: 0.7, footnotesize: 0.8, small: 0.9, normalsize: 1, large: 1.2, Large: 1.44 };
  function labelHtml(text) { // node text: $maths$ via KaTeX; font-size commands scale the label
    const size = (text.match(/\\(tiny|scriptsize|footnotesize|small|normalsize|large|Large)\b/) || [])[1];
    const t = text.replace(/\\(tiny|scriptsize|footnotesize|small|normalsize|large|Large|bfseries|itshape|rmfamily|sffamily)\b\s*/g, '').replace(/\\\\/g, '<br>').trim();
    const html = t.split(/(\$[^$]*\$)/).map((p, i) => {
      if (i % 2) return typeof katex !== 'undefined' ? katex.renderToString(p.slice(1, -1), { throwOnError: false, output: 'html' }) : esc(p.slice(1, -1));
      return esc(p.replace(/[{}]/g, '').replace(/\\%/g, '%').replace(/\\,/g, ' ').replace(/~/g, ' ')).replace(/&lt;br&gt;/g, '<br>');
    }).join('');
    return size && size !== 'normalsize' ? `<span style="font-size:${SIZES[size]}em">${html}</span>` : html;
  }

  return { render };
})();
