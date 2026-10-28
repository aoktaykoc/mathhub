'use strict';
/* ============================================================
   Worksheet → LaTeX. Converts the rendered sheet (including edits made on the page and
   saved worksheets) into one compilable .tex file: worksheet, then the answer key.
   Generators mark maths with <span class="m">; an item with no prose words is typeset
   wholly in maths mode; everything else is text with symbols converted.
   Teachers can type raw LaTeX as \( … \) or \[ … \]; it is copied unchanged.
   Tex.typeset() renders the same maths on the page with KaTeX, so printing looks like LaTeX.
   ============================================================ */
const Tex = (() => {
  const FUNCS = new Set(['sin', 'cos', 'tan', 'log', 'ln']);
  const SHORT_WORDS = new Set(['or', 'of', 'is', 'to', 'if', 'at', 'by', 'in', 'on', 'an', 'as', 'be', 'cm', 'mm', 'km', 'kg']);
  const MATH_WORDS = new Set(['or', 'and', 'cm', 'mm', 'km', 'kg']); // may appear in an item typeset wholly as maths
  const UNITS = new Set(['m', 'g', 's', 'l', 'h']); // single letters read as units only straight after a number
  const isWord = w => !FUNCS.has(w) && (w.length >= 3 || SHORT_WORDS.has(w));

  const TEXT_SYM = {
    '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', $: '\\$', '%': '\\%', '&': '\\&', '#': '\\#', _: '\\_', '^': '\\^{}', '~': '\\~{}',
    '−': '$-$', '×': '$\\times$', '÷': '$\\div$', '≤': '$\\le$', '≥': '$\\ge$', '<': '$<$', '>': '$>$', π: '$\\pi$', '°': '$^\\circ$',
    '²': '$^2$', '³': '$^3$', '′': "$'$", '…': '\\ldots{}', ℤ: '$\\mathbb{Z}$', '∈': '$\\in$', '’': "'", '‘': '`', '“': '``', '”': "''",
    '\u00a0': '~', '√': '$\\surd$',
  };
  const MATH_SYM = {
    $: '\\$', '%': '\\%', '&': '\\&', '#': '\\#', _: '\\_', '{': '\\{', '}': '\\}', '\\': '\\backslash ', '~': '\\sim ',
    '−': '-', '×': '\\times ', '÷': '\\div ', '≤': '\\le ', '≥': '\\ge ', π: '\\pi ', '°': '^{\\circ}', '²': '^{2}', '³': '^{3}',
    '′': "'", '…': '\\ldots ', ℤ: '\\mathbb{Z}', '∈': '\\in ', '’': "'", '√': '\\surd ',
  };
  const TEXT_RE = /[\\{}$%&#_^~−×÷≤≥<>π°²³′…ℤ∈’‘“”\u00a0√]/g;
  const ROOT_RE = /√(\d+(?:\.\d+)?|[A-Za-z])/g;

  function text(s) {
    return s.split(/(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/).map((part, i) => i % 2 ? part
      : part.replace(ROOT_RE, (m, a) => `\u0001${a}\u0002`).replace(TEXT_RE, c => TEXT_SYM[c]).replace(/\u0001(.*?)\u0002/g, (m, a) => `$\\sqrt{${a}}$`)).join('');
  }
  function math(s) {
    const toks = s.match(/√(?:\d+(?:\.\d+)?|[A-Za-z])|\d{1,3}(?:,\d{3})+(?!\d)|[A-Za-z]+|\s+|[\s\S]/g) || [];
    return toks.map((t, i) => {
      if (t[0] === '√') return `\\sqrt{${t.slice(1)}}`;
      if (/^\d{1,3}(,\d{3})+$/.test(t)) return t.replace(/,/g, '{,}');
      if (/^[A-Za-z]+$/.test(t)) {
        if (FUNCS.has(t)) return `\\${t} `;
        const before = /\s$/.test(toks[i - 1] || '') ? ' ' : '', after = /^\s/.test(toks[i + 1] || '') ? ' ' : '';
        const unit = UNITS.has(t) && before && /\d$/.test(toks[i - 2] || ''); // "4.2 m", "30 g"
        if (!isWord(t) && !unit) return t;
        return `\\text{${before}${t}${after}}`;
      }
      if (/^\s+$/.test(t)) return ' ';
      return MATH_SYM[t] ?? t;
    }).join('');
  }

  const kids = (node, mode) => [...node.childNodes].map(n => conv(n, mode)).join('');
  const frac = n => { const [a, b] = n.children; return `\\frac{${a ? kids(a, 'math') : ''}}{${b ? kids(b, 'math') : ''}}`; };
  const eqs = n => `\\begin{array}{l}${kids(n, 'math')}\\end{array}`;
  function conv(n, mode) {
    if (n.nodeType === 3) return mode === 'math' ? math(n.nodeValue) : text(n.nodeValue);
    if (n.nodeType !== 1) return '';
    const tag = n.tagName.toLowerCase(), cls = n.classList;
    if (cls.contains('kx')) return mode === 'math' ? n.dataset.tex : `$${n.dataset.display ? '\\displaystyle ' : ''}${n.dataset.tex}$`;
    if (cls.contains('fig')) return mode === 'math' ? '' : `\\begin{center}\n${n.dataset.tikz}\n\\end{center}`;
    if (cls.contains('lvl')) return mode === 'math' ? '' : `\\hfill{\\scriptsize ${text(n.textContent)}}`;
    if (tag === 'table') return mode === 'math' ? '' : table(n);
    if (mode === 'math') {
      if (tag === 'sup') return `^{${kids(n, 'math')}}`;
      if (tag === 'sub') return `_{${kids(n, 'math')}}`;
      if (cls.contains('frac')) return frac(n);
      if (cls.contains('eqs')) return eqs(n);
      if (tag === 'br') return ' \\\\ ';
      return kids(n, 'math');
    }
    if (cls.contains('m')) return `$${kids(n, 'math')}$`;
    if (cls.contains('frac')) return `$${frac(n)}$`;
    if (cls.contains('eqs')) return `$${eqs(n)}$`;
    if (tag === 'sup') return /^[A-Za-z]+$/.test(n.textContent) ? `\\textsuperscript{${n.textContent}}` : `$^{${kids(n, 'math')}}$`;
    if (tag === 'sub') return `$_{${kids(n, 'math')}}$`;
    if (tag === 'em' || tag === 'i') return /^[A-Za-z]$/.test(n.textContent.trim()) ? `$${n.textContent.trim()}$` : `\\emph{${kids(n, 'text')}}`;
    if (tag === 'strong' || tag === 'b') return `\\textbf{${kids(n, 'text')}}`;
    if (tag === 'br') return n.nextElementSibling?.tagName === 'TABLE' ? '' : '\\newline ';
    if (tag === 'div' || tag === 'p') return `\\par ${kids(n, 'text')}`;
    return kids(n, 'text');
  }
  function table(t) {
    const rows = [...t.rows].map(r => [...r.cells].map(c => kids(c, 'text').trim()));
    const cols = Math.max(1, ...rows.map(r => r.length));
    return `\\par\\smallskip\\begin{tabular}{|l|${'c|'.repeat(cols - 1)}}\\hline\n${rows.map(r => `${r.join(' & ')} \\\\ \\hline`).join('\n')}\n\\end{tabular}`;
  }

  // An item is typeset wholly as maths when it has no prose words (super/subscripts and the level marker don't count).
  function mathOnly(li) {
    if (li.querySelector('table, .fig') || /\\[([]/.test(li.textContent)) return false;
    const c = li.cloneNode(true);
    c.querySelectorAll('sup, sub, .lvl, .kx').forEach(x => x.replaceWith(' '));
    return !(c.textContent.match(/[A-Za-z]+/g) || []).some(w => isWord(w) && !MATH_WORDS.has(w));
  }
  function item(li) {
    if (!li.textContent.trim()) return '~';
    if (!mathOnly(li)) return kids(li, 'text').trim();
    const lvl = li.querySelector('.lvl');
    return `$\\displaystyle ${kids(li, 'math').trim()}$${lvl ? conv(lvl, 'text') : ''}`;
  }
  function list(ol) {
    const sep = ol.classList.contains('space-lg') ? '3.5cm' : ol.classList.contains('space-md') ? '2cm' : '6pt';
    const items = [...ol.children].filter(li => li.tagName === 'LI').map(li => `  \\item ${item(li)}`).join('\n');
    const env = `\\begin{enumerate}[label=\\arabic*.,start=${ol.start || 1},itemsep=${sep}]\n${items}\n\\end{enumerate}`;
    return ol.classList.contains('cols-2') ? `\\begin{multicols}{2}\n\\raggedcolumns\n${env}\n\\end{multicols}` : env;
  }
  function head(sheet, fields) {
    const course = text(sheet.querySelector('.sheet-course')?.textContent.trim() || '');
    const h2 = sheet.querySelector('.sheet-head h2');
    const title = h2 ? kids(h2, 'text').trim() : '';
    return `\\noindent\\begin{minipage}[b]{0.56\\textwidth}{\\small\\scshape ${course}}\\\\[2pt]{\\Large\\bfseries ${title}}\\end{minipage}\\hfill` +
      (fields ? '\n\\begin{minipage}[b]{0.42\\textwidth}\\raggedleft Name: \\rule{5cm}{0.4pt}\\\\[8pt]Class: \\rule{2cm}{0.4pt}\\quad Date: \\rule{2cm}{0.4pt}\\end{minipage}' : '') +
      '\n\\par\\smallskip\\hrule\\medskip';
  }
  function body(sheet) {
    const out = [];
    for (const el of sheet.children) {
      if (el.matches('.sheet-head, .sheet-foot, .ai-pending')) continue;
      const tag = el.tagName.toLowerCase();
      if (tag === 'h3') out.push(`\\subsection*{${kids(el, 'text').trim()}}`);
      else if (el.classList.contains('sheet-instr')) out.push(`\\textit{${kids(el, 'text').trim()}}\\par\\smallskip`);
      else if (tag === 'ol') out.push(list(el));
      else if (el.textContent.trim()) out.push(`${kids(el, 'text').trim()}\\par`);
    }
    return out.join('\n\n');
  }

  // root: the element holding .question-sheet and (optionally) .answer-sheet
  function fromSheets(root) {
    const q = root.querySelector('.question-sheet'), a = root.querySelector('.answer-sheet');
    if (!q) return '';
    const foot = text(q.querySelector('.sheet-foot')?.textContent.trim() || '');
    return [
      '% Generated by MathHub. Compile with pdflatex (or paste into Overleaf).',
      '\\documentclass[11pt,a4paper]{article}',
      '\\usepackage[utf8]{inputenc}',
      '\\usepackage[T1]{fontenc}',
      '\\usepackage[margin=2cm]{geometry}',
      '\\usepackage{amsmath,amssymb}',
      '\\usepackage{enumitem}',
      '\\usepackage{multicol}',
      '\\usepackage{fancyhdr}',
      ...(root.querySelector('.fig') ? ['\\usepackage{tikz}', '\\usetikzlibrary{arrows.meta,calc,angles,quotes}'] : []),
      '\\pagestyle{fancy}\\fancyhf{}\\renewcommand{\\headrulewidth}{0pt}',
      `\\lfoot{\\small ${foot}}\\rfoot{\\small\\thepage}`,
      '\\setlength{\\parindent}{0pt}',
      '',
      '\\begin{document}',
      '',
      '% ---------- Worksheet ----------',
      head(q, true),
      body(q),
      ...(a ? ['', '% ---------- Answer key ----------', '\\newpage', head(a, false), body(a)] : []),
      '',
      '\\end{document}',
      '',
    ].join('\n');
  }

  /* ---------- typesetting on the page (KaTeX), so printing gives LaTeX-quality maths ----------
     Each formula becomes <span class="kx" data-tex="…">; the .tex export reads data-tex back. */
  const canTypeset = () => typeof katex !== 'undefined';
  // display: a whole-item formula, drawn in \displaystyle (full-size fractions) — the .tex export adds the same
  function formula(tex, display = false) {
    const s = document.createElement('span');
    s.className = 'kx';
    s.contentEditable = 'false';
    s.title = 'Click to edit this formula';
    if (display) s.dataset.display = '1';
    setFormula(s, tex);
    return s;
  }
  const render = (tex, display) => katex.renderToString((display ? '\\displaystyle ' : '') + tex, { throwOnError: false, output: 'html' });
  function setFormula(s, tex) {
    s.dataset.tex = tex;
    s.innerHTML = render(tex, !!s.dataset.display);
  }
  const isMathEl = n => n.nodeType === 1 && (n.matches('.m, .frac, .eqs, sub') || (n.matches('sup') && !/^[A-Za-z]+$/.test(n.textContent))
    || (n.matches('em, i') && /^[A-Za-z]$/.test(n.textContent.trim())));
  function typesetInline(el) {
    [...el.childNodes].forEach(n => {
      if (n.nodeType !== 1 || n.matches('.kx, .lvl, .fig')) return;
      if (isMathEl(n)) n.replaceWith(formula(conv(n, 'math').trim()));
      else typesetInline(n);
    });
  }
  function typesetItem(li) {
    if (!li.textContent.trim()) return;
    if (!mathOnly(li)) { typesetInline(li); return; }
    const nodes = [...li.childNodes].filter(n => !(n.nodeType === 1 && n.matches('.lvl')));
    const solid = nodes.filter(n => n.nodeType === 1 || n.nodeValue.trim());
    if (solid.length === 1 && solid[0].matches?.('.kx')) return; // already typeset
    const f = formula(nodes.map(n => conv(n, 'math')).join('').trim(), true);
    li.insertBefore(f, nodes[0]);
    nodes.forEach(n => n.remove());
  }
  // HTML for storage: formulas keep only their data-tex (KaTeX markup is large); typeset() redraws them.
  function compact(root) {
    const c = root.cloneNode(true);
    c.querySelectorAll('.kx, .fig').forEach(s => { s.innerHTML = ''; });
    return c.innerHTML;
  }
  // A TikZ figure: <span class="fig" data-tikz="\begin{tikzpicture}…">, drawn as SVG by Tikz.render.
  function setFigure(el, tikz) {
    el.dataset.tikz = tikz;
    let r;
    try { r = Tikz.render(tikz); } catch (err) { r = { svg: '', warnings: [err.message], empty: true }; }
    el.innerHTML = r.empty ? '<span class="fig-missing">Figure could not be drawn on screen — its TikZ is in the LaTeX code.</span>' : r.svg;
    el.title = r.warnings.length ? `Click to edit this figure. Not drawn on screen: ${r.warnings.join(', ')} (the .tex keeps the full TikZ).` : 'Click to edit this figure';
    el.classList.toggle('fig-warn', r.warnings.length > 0);
  }
  function typeset(root) {
    if (!canTypeset()) return false;
    root.querySelectorAll('.kx:empty').forEach(s => setFormula(s, s.dataset.tex));
    if (typeof Tikz !== 'undefined') root.querySelectorAll('.fig:empty').forEach(el => setFigure(el, el.dataset.tikz));
    root.querySelectorAll('.question-sheet, .answer-sheet').forEach(sheet => {
      sheet.classList.add('tex');
      sheet.querySelectorAll('li').forEach(typesetItem);
      sheet.querySelectorAll('h2, h3, .sheet-instr').forEach(typesetInline);
    });
    return true;
  }

  /* ---------- LaTeX → sheet: reads back the .tex written above (after hand edits) ----------
     Understands the structure fromSheets() writes: header, \subsection*, \textit{…} instructions,
     enumerate (in multicols or not), \item, maths in $…$ / \(…\) / \[…\], tabular, and common text commands.
     Anything else is kept as written. */
  function group(s, i) { // s[i] === '{' → [content, index after the closing brace]
    let depth = 0;
    for (let j = i; j < s.length; j++) {
      if (s[j] === '\\') { j++; continue; }
      if (s[j] === '{') depth++;
      else if (s[j] === '}' && --depth === 0) return [s.slice(i + 1, j), j + 1];
    }
    throw new Error('a { has no matching }');
  }
  const formulaHtml = (tex, display = false) => {
    const m = tex.match(/^\s*\\displaystyle\s*/);
    if (m) { tex = tex.slice(m[0].length); display = true; }
    return `<span class="kx" contenteditable="false" title="Click to edit this formula" data-tex="${esc(tex.trim())}"${display ? ' data-display="1"' : ''}></span>`;
  };
  const figureHtml = tikz => `<span class="fig" contenteditable="false" data-tikz="${esc(tikz)}"></span>`;
  const TEXT_CMD = { textsuperscript: 'sup', textsubscript: 'sub', textbf: 'b', textit: 'em', emph: 'em', underline: 'u' };
  const SYMBOL_CMD = { ldots: '…', dots: '…', textbackslash: '\\', newline: '<br>', par: '<br>', linebreak: '<br>', quad: ' ', qquad: '  ', textendash: '–', textemdash: '—', textperiodcentered: '·' };
  const SKIP_CMD = new Set(['smallskip', 'medskip', 'bigskip', 'noindent', 'hfill', 'vfill', 'centering', 'raggedright', 'raggedleft', 'raggedcolumns', 'hline',
    'tiny', 'small', 'scriptsize', 'footnotesize', 'normalsize', 'large', 'Large', 'LARGE', 'huge', 'Huge', 'bfseries', 'itshape', 'mdseries', 'upshape',
    'normalfont', 'rmfamily', 'sffamily', 'ttfamily', 'maketitle', 'clearpage', 'pagebreak', 'newpage', 'filbreak', 'hrule', 'relax']);
  const ARG_DROP = { vspace: 1, hspace: 1, label: 1, thispagestyle: 1, pagestyle: 1, setlength: 2, addtolength: 2 }; // layout commands: drop with their arguments
  function htmlFromTex(s) {
    let out = '', i = 0;
    const eatSpaces = () => { while (s[i] === ' ' || s[i] === '\n') i++; };
    while (i < s.length) {
      const ch = s[i];
      if (ch === '$') {
        let j = i + 1;
        while (j < s.length && !(s[j] === '$' && s[j - 1] !== '\\')) j++;
        if (j >= s.length) throw new Error('a $ has no closing $');
        out += formulaHtml(s.slice(i + 1, j)); i = j + 1; continue;
      }
      if (ch === '\\') {
        const nx = s[i + 1] || '';
        if (nx === '(' || nx === '[') {
          const j = s.indexOf(nx === '(' ? '\\)' : '\\]', i + 2);
          if (j < 0) throw new Error(`\\${nx} has no closing \\${nx === '(' ? ')' : ']'}`);
          out += formulaHtml(s.slice(i + 2, j), nx === '['); i = j + 2; continue;
        }
        if (nx === '\\') { out += '<br>'; i += 2; if (s[i] === '[') i = s.indexOf(']', i) + 1; continue; }
        if (/[%$&#_{}]/.test(nx)) { out += esc(nx); i += 2; continue; }
        const name = (s.slice(i + 1).match(/^[A-Za-z]+/) || [''])[0];
        if (!name) { out += nx === ' ' || nx === ',' ? ' ' : esc(nx); i += 2; continue; }
        i += 1 + name.length;
        if (s.startsWith('{}', i)) i += 2;
        if (name === 'hfill' && s[i] === '{') { // level marker: \hfill{\scriptsize L2}
          const [c, k] = group(s, i), lm = c.match(/^\s*\\scriptsize\s+(.*)$/);
          if (lm) { out += `<span class="lvl">${esc(lm[1].trim())}</span>`; i = k; continue; }
        }
        if (name in ARG_DROP) {
          if (s[i] === '*') i++;
          for (let n = 0; n < ARG_DROP[name]; n++) { while (s[i] === ' ') i++; if (s[i] === '{') i = group(s, i)[1]; }
          eatSpaces(); continue;
        }
        if (name === 'rule' && (s[i] === '{' || s[i] === '[')) { // \rule{6cm}{0.4pt} → a blank line to write on
          if (s[i] === '[') i = s.indexOf(']', i) + 1;
          const [w, k] = group(s, i); i = k;
          if (s[i] === '{') i = group(s, i)[1];
          let cm = 3; try { cm = parseFloat(w) * ({ cm: 1, mm: 0.1, in: 2.54, pt: 0.0352 }[(w.match(/[a-z]+/) || ['cm'])[0]] || 1) || 3; } catch (e) { /* default */ }
          out += `<span class="blank-line" style="display:inline-block;width:${Math.min(cm, 16)}cm;border-bottom:1px solid currentColor"></span>`;
          continue;
        }
        if (TEXT_CMD[name] && s[i] === '{') { const [c, k] = group(s, i), t = TEXT_CMD[name]; out += `<${t}>${htmlFromTex(c)}</${t}>`; i = k; continue; }
        if (name === 'begin' && (s.startsWith('{center}', i) || s.startsWith('{tikzpicture}', i))) { // a figure (centred or not)
          const env = s.startsWith('{center}', i) ? 'center' : 'tikzpicture', close = `\\end{${env}}`, end = s.indexOf(close, i);
          if (end < 0) throw new Error(`\\begin{${env}} has no ${close}`);
          const inner = env === 'center' ? s.slice(i + 8, end) : `\\begin{tikzpicture}${s.slice(i + 13, end)}\\end{tikzpicture}`;
          out += /\\begin\{tikzpicture\}/.test(inner) ? figureHtml(inner.trim()) : htmlFromTex(inner);
          i = end + close.length; continue;
        }
        if (name === 'begin' && s.startsWith('{tabular}', i)) {
          const end = s.indexOf('\\end{tabular}', i);
          if (end < 0) throw new Error('\\begin{tabular} has no \\end{tabular}');
          out += tableFromTex(s.slice(i + '{tabular}'.length, end)); i = end + '\\end{tabular}'.length; continue;
        }
        if (name in SYMBOL_CMD) { out += SYMBOL_CMD[name]; eatSpaces(); continue; }
        if (SKIP_CMD.has(name)) { eatSpaces(); continue; }
        out += esc(`\\${name}`); continue; // unknown command: keep it visible
      }
      if (ch === '{') { const [c, k] = group(s, i); out += htmlFromTex(c); i = k; continue; }
      if (ch === '~') { out += '&nbsp;'; i++; continue; }
      if (s.startsWith('``', i)) { out += '“'; i += 2; continue; }
      if (s.startsWith("''", i)) { out += '”'; i += 2; continue; }
      if (ch === '\n') { out += ' '; i++; continue; }
      out += esc(ch); i++;
    }
    return out;
  }
  function tableFromTex(body) {
    body = body.trim();
    if (body[0] === '{') body = body.slice(group(body, 0)[1]); // column spec
    const rows = body.split(/\\\\/).map(r => r.replace(/\\hline/g, '').trim()).filter(Boolean);
    return `<table class="mini-table">${rows.map(r => `<tr>${r.split(/(?<!\\)&/).map((c, i) => `<${i ? 'td' : 'th'}>${htmlFromTex(c.trim())}</${i ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</table>`;
  }
  function listFromTex(opts, body, cols, answer) {
    const start = Number(opts.match(/start\s*=\s*(\d+)/)?.[1]) || 1;
    const sep = parseFloat(opts.match(/itemsep\s*=\s*([\d.]+)\s*cm/)?.[1]) || 0;
    const cls = ['qlist', answer ? 'answer-list' : '', cols ? 'cols-2' : '', sep >= 3 ? 'space-lg' : sep >= 1.5 ? 'space-md' : ''].filter(Boolean).join(' ');
    const items = body.split(/\\item\b/).slice(1).map(t => t.trim());
    return `<ol class="${cls}" start="${start}">${items.map(t => `<li>${t === '~' ? '' : htmlFromTex(t)}</li>`).join('')}</ol>`;
  }
  function bodyFromTex(s, answer) {
    let out = '', i = 0, cols = false;
    const BLOCK = /\\(sub)?section\*?\s*\{|\\textit\s*\{|\\begin\{multicols\}|\\end\{multicols\}|\\begin\{enumerate\}|\n\s*\n/g;
    const skip = re => { const m = s.slice(i).match(re); if (m) i += m[0].length; };
    while (i < s.length) {
      skip(/^\s+/);
      if (i >= s.length) break;
      const rest = s.slice(i);
      if (/^\\(sub)?section\*?\s*\{/.test(rest)) {
        skip(/^\\(sub)?section\*?\s*/);
        const [c, k] = group(s, i); out += `<h3>${htmlFromTex(c)}</h3>`; i = k;
      } else if (/^\\textit\s*\{/.test(rest)) {
        skip(/^\\textit\s*/);
        const [c, k] = group(s, i); out += `<p class="sheet-instr">${htmlFromTex(c)}</p>`; i = k;
        skip(/^(\s*\\(par|smallskip|medskip)\b)+/);
      } else if (rest.startsWith('\\begin{multicols}')) {
        cols = true; skip(/^\\begin\{multicols\}\s*(\{\d+\})?(\s*\\raggedcolumns)?/);
      } else if (rest.startsWith('\\end{multicols}')) {
        cols = false; i += 15;
      } else if (rest.startsWith('\\begin{enumerate}')) {
        i += 17;
        let opts = '';
        if (s[i] === '[') { const j = s.indexOf(']', i); opts = s.slice(i + 1, j); i = j + 1; }
        const end = s.indexOf('\\end{enumerate}', i);
        if (end < 0) throw new Error('\\begin{enumerate} has no \\end{enumerate}');
        out += listFromTex(opts, s.slice(i, end), cols, answer); i = end + 15;
      } else { // a paragraph of text, up to the next block or blank line
        BLOCK.lastIndex = i + 1;
        const m = BLOCK.exec(s), end = m ? m.index : s.length;
        const html = htmlFromTex(s.slice(i, end).replace(/\\par\s*$/, '').trim());
        if (html.replace(/<br>/g, '').trim()) out += `<p>${html}</p>`;
        i = end;
      }
    }
    return out;
  }
  function headFromTex(part) {
    const cm = part.match(/\\scshape\s*/), tm = part.match(/\{\s*\\Large\s*\\bfseries\s*/);
    let course = '', title = '';
    if (cm) { const k = part.indexOf('}', cm.index); course = htmlFromTex(part.slice(cm.index + cm[0].length, k).trim()); }
    if (tm) { const [c] = group(part, tm.index); title = htmlFromTex(c.replace(/^\s*\\Large\s*\\bfseries\s*/, '').trim()); }
    const hr = part.indexOf('\\hrule');
    const bodyStart = hr >= 0 ? hr + 6 + ((part.slice(hr + 6).match(/^\s*\\medskip/) || [''])[0].length) : 0;
    return { course, title, fields: /Name:/.test(part.slice(0, bodyStart)), body: part.slice(bodyStart) };
  }
  // .tex source → the HTML of the question sheet and answer key (drawn with typeset()).
  function toSheets(src) {
    src = src.replace(/(^|[^\\])%.*$/gm, '$1'); // comments
    const b = src.indexOf('\\begin{document}'), e = src.lastIndexOf('\\end{document}');
    if (b < 0) throw new Error('\\begin{document} is missing, so this is not the full LaTeX of a sheet');
    const doc = src.slice(b + 16, e > b ? e : undefined);
    const fm = src.slice(0, b).match(/\\lfoot\s*\{/);
    const foot = fm ? htmlFromTex(group(src, fm.index + fm[0].length - 1)[0].replace(/^\s*\\small\s*/, '').trim()) : '';
    const np = doc.indexOf('\\newpage');
    const q = headFromTex(np >= 0 ? doc.slice(0, np) : doc), a = np >= 0 ? headFromTex(doc.slice(np + 8)) : null;
    const head = (h, fields) => `<div class="sheet-head"><div><div class="sheet-course">${h.course}</div><h2>${h.title}</h2></div>${fields
      ? '<div class="sheet-fields">Name: ______________________<br>Class: __________ &nbsp; Date: __________</div>' : ''}</div>`;
    return `<div class="sheet question-sheet" contenteditable="true" spellcheck="false">${head(q, q.fields)}${bodyFromTex(q.body, false)}<div class="sheet-foot">${foot}</div></div>` +
      (a ? `<div class="sheet answer-sheet" contenteditable="true" spellcheck="false" style="margin-top:1rem">${head(a, false)}${bodyFromTex(a.body, true)}</div>` : '');
  }

  return { fromSheets, toSheets, typeset, compact, setFormula, setFigure, figureHtml, render, canTypeset };
})();
