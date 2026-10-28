'use strict';
/* ============================================================
   Worksheet questions written by Claude.
   The worksheet page builds a prompt from the chosen topics and their learning outcomes; the
   teacher runs it in Claude and pastes the reply back. The reply uses a simple line format
   (below) with maths in \( … \) and figures in TikZ, so it can be read reliably, typeset on
   the page (KaTeX + Tikz.render) and exported to .tex unchanged.
   ============================================================ */
const WsAI = (() => {
  const enabledFor = c => !!c; // every curriculum

  const DIFFICULTY = {
    1: 'All questions at foundation level (L1): one or two steps, familiar contexts.',
    2: 'Mostly core level (L2), starting with one or two L1 questions.',
    3: 'All questions at extension level (L3): multi-step, unfamiliar contexts, exam style.',
    progressive: 'Easy to hard within each topic: roughly the first third L1, the middle third L2, the last third L3.',
    mixed: 'A mix of L1, L2 and L3 questions in each topic.',
  };
  const FIGURES = {
    auto: 'Include a figure whenever it helps understanding: geometry, trigonometry, coordinate geometry, graphs of functions, vectors, transformations, and statistics or probability diagrams (bar charts, histograms, box plots, scatter plots, tree and Venn diagrams). In such topics roughly a third to a half of the questions should have a figure. Do not add figures where they add nothing.',
    many: 'Include a figure in as many questions as sensible — aim for more than half of the questions in visual topics, and use figures (graphs, diagrams, tables drawn in TikZ) in other topics too wherever they fit.',
    none: '',
  };

  // topics: [{ key, topic, unit, n }]; c, track: curriculum (or course) and level; difficulty: key of DIFFICULTY; figures: key of FIGURES
  function prompt({ c, track, topics, difficulty, figures = 'auto' }) {
    const level = `${c.name}${track ? ` ${track}` : ''}`;
    const tech = c.programme === 'DP'
      ? 'Students have a GDC (graphic display calculator). Give non-exact answers to 3 significant figures unless the question says otherwise.'
      : 'Students may use a scientific calculator unless a question says “without a calculator”.';
    const list = topics.map(({ key, topic, unit, n }) => {
      const outs = (topic.outcomes || []).filter(o => inTrack(o, track)).map(o => `  - ${o.text}`).join('\n') || '  - (no outcomes listed: use the usual content of this topic at this level)';
      return `[${key}] ${topic.title}${unit ? ` (${unit.title})` : ''} — exactly ${n} question${n > 1 ? 's' : ''}\n  Learning outcomes:\n${outs}`;
    }).join('\n\n');
    const figs = FIGURES[figures] ?? FIGURES.auto;
    const figureRules = figs ? `
FIGURES
- ${figs}
- Draw each figure in TikZ, on its own lines inside the question (or answer), right after the sentence that introduces it:
  \\begin{tikzpicture}[scale=…] … \\end{tikzpicture}
- At most 8 cm wide and 6 cm tall after scaling. Label points, lengths and angles with maths in $…$ (inside TikZ only). Write “not to scale” in the question when it is not.
- Use only: \\draw, \\fill, \\filldraw, \\node, \\coordinate, \\foreach, and \\begin{scope}[shift={(x,y)}, scale=…]. Path operations: --, rectangle, circle (r), arc (start:end:radius), grid, cycle, node[above/below/left/right/midway/pos=…] {…}, plot[smooth] coordinates {…}, plot[domain=a:b, samples=n] (\\x, {expression}). Options: colours (black, gray, blue, red, green, orange, e.g. blue!20), thick, dashed, dotted, ->, <->, fill=…, line width=…, opacity. Trig in expressions is in degrees.
- Do not use TikZ libraries, calc coordinates ($(A)!0.5!(B)$), pics, \\tkz… commands, \\pgfmathsetmacro, \\tikzset or external images.
- Draw right angles as small squares and angles as arcs; draw axes with arrows, label them, and mark a scale; draw data tables with \\draw grid and \\node.` : `
FIGURES
- Do not draw figures; if a diagram is needed, describe it fully in words.`;
    return `You are an experienced IB mathematics teacher and examiner writing practice questions for a printed worksheet.

IMPORTANT: Reply in plain text using exactly the OUTPUT FORMAT at the end of this message. Do NOT write a LaTeX document, file or artifact — no \\documentclass, no \\begin{document}, no preamble, title, header, Name/Date lines or answer-key section. A worksheet app reads your reply and builds the document itself.

Course and level: ${level}
Difficulty: ${DIFFICULTY[difficulty] || DIFFICULTY[2]}
${tech}

TOPICS
${list}

QUALITY
- Solve every question fully yourself before you write it, and check each final answer twice. Choose numbers that lead to clean answers unless the topic is about rounding or GDC work.
- Cover every learning outcome of a topic. Vary the question types — routine practice, reasoning (“show that”, “explain why”, “justify”), real-life problems, spotting and correcting a mistake — so that no two questions are the same exercise with new numbers.
- Build difficulty as asked above. L3 questions may have parts (a), (b), (c) that build on each other; write each part on its own line.
- Use IB command terms (find, calculate, show that, hence, justify, sketch, …), IB notation, British English, and realistic contexts and data.
- Every question must be unambiguous and answerable from the information given: state units, the accuracy required and, where it matters, whether a calculator may be used.
- Answers: short final answers with units, not worked solutions; for parts write “(a) … (b) …”; for “show that” give the key result to reach.
${figureRules}

OUTPUT FORMAT — follow it exactly, because a program reads your reply:
- Plain text only: no Markdown, no bold, no numbering, no code blocks, no commentary before or after. Not a LaTeX document: the only LaTeX is maths in \\( … \\) and figures in tikzpicture.
- Start each topic with the line: === TOPIC <code in square brackets above, without the brackets> ===
- Then one line: INSTR: <one-sentence instruction for the whole topic>
- Then, for each question:
  Q[L1]: <question>      (L1 = foundation, L2 = core, L3 = extension)
  A: <final answer>
- Outside figures, write ALL mathematics in LaTeX inside \\( … \\). Never use $ … $ outside TikZ. Use \\[ … \\] only for a longer display, e.g. a system of equations.
- Outside \\( … \\) write plain text. Money is written in plain text, e.g. $25 or €25.
- A question or answer may continue on the following lines (parts, figures). Tables: draw them as a TikZ figure or give the data as a list.

EXAMPLE
=== TOPIC 3.4 ===
INSTR: Give answers to 3 significant figures.
Q[L1]: The right-angled triangle below has sides \\(AB = 6\\text{ cm}\\) and \\(BC = 8\\text{ cm}\\). Find \\(AC\\).
\\begin{tikzpicture}[scale=0.5]
  \\draw[thick] (0,0) -- (8,0) -- (8,6) -- cycle;
  \\draw (7.5,0) -- (7.5,0.5) -- (8,0.5);
  \\node[below left] at (0,0) {$A$}; \\node[below right] at (8,0) {$B$}; \\node[above] at (8,6) {$C$};
  \\node[below] at (4,0) {$8$ cm}; \\node[right] at (8,3) {$6$ cm};
\\end{tikzpicture}
A: \\(10\\text{ cm}\\)
Q[L3]: A ladder of length \\(5\\text{ m}\\) leans against a vertical wall with its foot \\(1.4\\text{ m}\\) from the wall.
(a) Find how high up the wall the ladder reaches.
(b) Find the angle the ladder makes with the ground.
A: (a) \\(4.80\\text{ m}\\) (b) \\(73.7^\\circ\\)`;
  }

  // Reply → { [key]: { instr, items: [{ q, a, level }] } } with q/a as HTML (maths and figures as empty placeholders, drawn by Tex.typeset).
  function parse(text, keys) {
    const find = k => keys.find(x => x.toLowerCase() === k.trim().replace(/^\[|\]$/g, '').toLowerCase());
    const out = {};
    let block = null, item = null, field = null, inFig = false;
    for (const raw of String(text).replace(/\r/g, '').split('\n')) {
      const line = raw.trim();
      if (/^```/.test(line)) continue;
      // inside a figure every line belongs to it
      if (inFig) { if (item && field) item[field] += `\n${raw.replace(/\s+$/, '')}`; if (/\\end\{tikzpicture\}/.test(line)) inFig = false; continue; }
      let m;
      if ((m = line.match(/^=+\s*TOPIC\s*:?\s*(.+?)\s*=*$/i))) {
        const key = find(m[1]);
        block = key ? (out[key] = out[key] || { instr: '', items: [] }) : null;
        item = null; field = null;
        continue;
      }
      if (!block) continue;
      if ((m = line.match(/^INSTR(?:UCTION)?\s*:\s*(.*)$/i))) { block.instr = m[1]; field = 'instr'; item = null; continue; }
      if ((m = line.match(/^Q\s*\d*\s*(?:\[\s*L?\s*([123])\s*\])?\s*[:.)]\s*(.*)$/i))) {
        item = { q: m[2], a: '', level: Number(m[1]) || 0 };
        block.items.push(item); field = 'q';
        if (/\\begin\{tikzpicture\}/.test(m[2]) && !/\\end\{tikzpicture\}/.test(m[2])) inFig = true;
        continue;
      }
      if (item && (m = line.match(/^A(?:ns(?:wer)?)?\s*[:.)]\s*(.*)$/i))) { item.a = m[1]; field = 'a'; if (/\\begin\{tikzpicture\}/.test(m[1]) && !/\\end\{tikzpicture\}/.test(m[1])) inFig = true; continue; }
      if (!line) continue;
      if (field === 'instr') block.instr += ` ${line}`;
      else if (item && field) {
        item[field] += `\n${line}`;
        if (/\\begin\{tikzpicture\}/.test(line) && !/\\end\{tikzpicture\}/.test(line)) inFig = true;
      }
    }
    Object.values(out).forEach(b => {
      b.instr = toHtml(b.instr);
      b.items = b.items.filter(it => it.q.trim()).map(it => ({ q: toHtml(it.q), a: toHtml(it.a) || '—', level: it.level }));
    });
    return out;
  }

  // "text \( maths \) text \begin{tikzpicture}…" → HTML: formula and figure placeholders keep their LaTeX in data attributes.
  function toHtml(s) {
    return String(s).trim().split(/(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/).map((part, i) => {
      if (i % 2) {
        if (part.startsWith('\\begin{tikzpicture}')) return Tex.figureHtml(part.trim());
        const display = part.startsWith('\\[');
        return `<span class="kx" contenteditable="false" title="Click to edit this formula" data-tex="${esc(part.slice(2, -2).trim())}"${display ? ' data-display="1"' : ''}></span>`;
      }
      const text = part.replace(/\\(begin|end)\{center\}/g, '').replace(/\\([%$&#_])/g, '$1');
      return esc(text).replace(/^\s*\n|\n\s*$/g, '').replace(/\n/g, '<br>');
    }).join('');
  }

  // Claude sometimes answers with its own complete LaTeX document instead of the line format.
  const isLatexDocument = text => /\\documentclass|\\begin\{document\}/.test(text) && !/^\s*=+\s*TOPIC\b/im.test(text);
  const FIX_MESSAGE = 'Please send the questions again in plain text, using exactly the OUTPUT FORMAT from my first message (=== TOPIC …, INSTR:, Q[L1]:, A:). Do not write a LaTeX document: no \\documentclass, \\begin{document}, title, header or answer-key section — only maths in \\( … \\) and figures in tikzpicture.';

  return { enabledFor, prompt, parse, isLatexDocument, FIX_MESSAGE, FIGURES };
})();
