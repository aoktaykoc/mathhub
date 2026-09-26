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
    if (cls.contains('kx')) return mode === 'math' ? n.dataset.tex : `$${n.dataset.tex}$`;
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
    if (li.querySelector('table') || /\\[([]/.test(li.textContent)) return false;
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
      if (el.classList.contains('sheet-head') || el.classList.contains('sheet-foot')) continue;
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
      if (n.nodeType !== 1 || n.matches('.kx, .lvl')) return;
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
    c.querySelectorAll('.kx').forEach(s => { s.innerHTML = ''; });
    return c.innerHTML;
  }
  function typeset(root) {
    if (!canTypeset()) return false;
    root.querySelectorAll('.kx:empty').forEach(s => setFormula(s, s.dataset.tex));
    root.querySelectorAll('.question-sheet, .answer-sheet').forEach(sheet => {
      sheet.classList.add('tex');
      sheet.querySelectorAll('li').forEach(typesetItem);
      sheet.querySelectorAll('h2, h3, .sheet-instr').forEach(typesetInline);
    });
    return true;
  }

  return { fromSheets, typeset, compact, setFormula, render, canTypeset };
})();
