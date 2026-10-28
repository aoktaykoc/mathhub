(() => {
  const S = App.state;
  const prefs = S.worksheetPrefs || (S.worksheetPrefs = {});
  const params = new URLSearchParams(location.search);
  let current = null; // { title, courseId, courseName?, sections: [{ name, instr, items: [{ q, a, level }] }] }
  ensureCurricula();

  // Topics come either from a course's question bank or from a curriculum in the library.
  let source = params.has('topic') || params.has('level') ? 'library' : params.has('course') ? 'course' : prefs.source || 'course';

  $('#wsCourse').innerHTML = '<option value="">All topics</option>' + S.courses.filter(c => GENERATORS.some(g => g.courses.includes(c.id)))
    .map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $('#wsCourse').value = params.get('course') ?? prefs.courseId ?? 'myp8';
  if (!$('#wsCourse').value) $('#wsCourse').value = '';

  const levels = curriculumLevels().filter(l => l.c.units.length);
  $('#wsLevelKey').innerHTML = levels.map(l => `<option value="${esc(l.key)}">${esc(l.label)} — ${esc(l.c.name)}</option>`).join('');
  $('#wsLevelKey').value = params.get('level') ?? prefs.levelKey ?? '';
  if (params.has('topic')) { // ?topic=<id> preselects that topic (and its curriculum)
    const t = params.get('topic'), found = findTopic(t);
    prefs.libTopics = { [t]: prefs.libTopics?.[t] || 8 };
    const lv = found && levels.find(l => l.cid === found.c.id && inTrack(found.topic, l.track));
    if (lv && !params.has('level')) $('#wsLevelKey').value = lv.key;
  }
  if (!$('#wsLevelKey').value && levels[0]) $('#wsLevelKey').value = levels[0].key;

  function setSource(s) {
    source = s;
    $$('#wsSourceTabs .tab').forEach(b => b.classList.toggle('active', b.dataset.source === s));
    $$('[data-for]').forEach(el => { el.hidden = el.dataset.for !== s; });
    renderTopics();
  }
  $('#wsSourceTabs').addEventListener('click', e => { const b = e.target.closest('[data-source]'); if (b) setSource(b.dataset.source); });

  const countInput = (id, n, label) => `<input type="number" min="1" max="40" value="${n || 6}" data-count="${esc(id)}" aria-label="Number of ${esc(label)} questions">`;
  function renderTopics() {
    if (source === 'library') { renderLibrary(); return; }
    const cid = $('#wsCourse').value;
    const gens = GENERATORS.filter(g => !cid || g.courses.includes(cid));
    const chosen = prefs.topics || {};
    $('#topicPicker').innerHTML = gens.map(g => `<div class="topic-row">
      <label><input type="checkbox" value="${g.id}" ${chosen[g.id] ? 'checked' : ''}> ${esc(g.name)}</label>${countInput(g.id, chosen[g.id], g.name)}</div>`).join('');
  }
  function renderLibrary() {
    const { c, track } = parseLevel($('#wsLevelKey').value);
    if (!c) { $('#topicPicker').innerHTML = '<p class="muted small" style="padding:.6rem">No curriculum with topics yet — add one in the <a href="curriculum.html">Curriculum library</a>.</p>'; return; }
    const chosen = prefs.libTopics || {};
    if (useAI()) { // Claude writes every topic: all rows are plain choices
      let n = 0;
      const rows = c.units.map(u => {
        const topics = u.topics.filter(t => inTrack(t, track));
        if (!topics.length) return '';
        return `<div class="topic-unit">${esc(u.title)}</div>` + topics.map(t => { n++; return `<div class="topic-row">
          <label><input type="checkbox" value="${esc(t.id)}" ${chosen[t.id] ? 'checked' : ''}> <span>${t.code ? `<b>${esc(t.code)}</b> ` : ''}${esc(t.title)}</span></label>${countInput(t.id, chosen[t.id], t.title)}</div>`; }).join('');
      }).join('');
      $('#topicPicker').innerHTML = `<p class="topic-note">${n} topics. Claude writes the questions for the topics you choose, from their learning outcomes.</p>${rows}`;
      return;
    }
    const aiOK = WsAI.enabledFor(c);
    let total = 0, linked = 0;
    const units = c.units.map(u => {
      const topics = u.topics.filter(t => inTrack(t, track));
      if (!topics.length) return '';
      return `<div class="topic-unit">${esc(u.title)}</div>` + topics.map(t => {
        total++;
        const gens = topicGenerators(t), label = `<span>${t.code ? `<b>${esc(t.code)}</b> ` : ''}${esc(t.title)}</span>`;
        if (!gens.length && !aiOK) return `<div class="topic-row off" title="No question generator for this topic yet"><label><input type="checkbox" disabled> ${label}</label></div>`;
        if (gens.length) linked++;
        const tip = gens.length ? `Questions: ${gens.map(g => g.name).join(', ')}` : 'Questions written by Claude from the learning outcomes (copy the prompt, paste the reply back)';
        return `<div class="topic-row" title="${esc(tip)}">
          <label><input type="checkbox" value="${esc(t.id)}" ${chosen[t.id] ? 'checked' : ''}> ${label}${gens.length ? '' : ' <span class="ai-badge">AI</span>'}</label>${countInput(t.id, chosen[t.id], t.title)}</div>`;
      }).join('');
    }).join('');
    $('#topicPicker').innerHTML = `<p class="topic-note">${linked} of ${total} topics have question generators; ${aiOK
      ? `for the other ${total - linked} (marked <span class="ai-badge">AI</span>) Claude writes the questions.` : 'the others are greyed out.'}</p>${units}`;
  }

  function levelFor(i, n) {
    const v = $('#wsLevel').value;
    if (v === 'mixed') return RNG.int(1, 3);
    if (v === 'progressive') return Math.min(3, 1 + Math.floor(i * 3 / Math.max(n, 1)));
    return Number(v);
  }
  function questions(gen, n) {
    const seen = new Set(), items = [];
    for (let i = 0; i < n; i++) {
      const level = levelFor(i, n);
      let item, tries = 0;
      do { item = gen.gen(level); tries++; } while (seen.has(item.q) && tries < 15);
      seen.add(item.q);
      items.push({ ...item, level });
    }
    return items;
  }
  // Questions come from Claude (default) or, when chosen, from the built-in generators ("instant").
  const useAI = () => $('#wsEngine').value !== 'instant';
  // Checked topics as { name, short, parts: [{ gen, n }] } (generator questions) or { name, short, ai: { topic, unit, n } } (Claude).
  // With instant questions, a library topic splits its questions over its generators, and only topics without one go to Claude.
  function picks() {
    const count = id => Math.max(1, Math.min(40, Number($(`[data-count="${CSS.escape(id)}"]`).value) || 6));
    return $$('#topicPicker input[type=checkbox]:checked').map(cb => {
      const n = count(cb.value);
      if (source === 'course') {
        const gen = GENERATORS.find(g => g.id === cb.value);
        return useAI() ? { name: gen.name, short: gen.name, parts: [], ai: { topic: { id: `gen-${gen.id}`, code: '', title: gen.name, outcomes: [] }, unit: null, n } }
          : { name: gen.name, short: gen.name, parts: [{ gen, n }] };
      }
      const found = findTopic(cb.value);
      if (!found) return null;
      const t = found.topic, gens = useAI() ? [] : topicGenerators(t);
      const p = { name: `${t.code ? `${t.code} ` : ''}${t.title}`, short: t.title, parts: gens.map((gen, i) => ({ gen, n: Math.floor(n / gens.length) + (i < n % gens.length ? 1 : 0) })).filter(x => x.n) };
      if (!gens.length && WsAI.enabledFor(found.c)) p.ai = { topic: t, unit: found.unit, n };
      return p;
    }).filter(p => p && (p.parts.length || p.ai));
  }
  // Level and programme for the prompt: the curriculum level, or the course in the "By course" tab.
  function promptLevel() {
    if (source === 'library') return parseLevel($('#wsLevelKey').value);
    const course = App.course($('#wsCourse').value);
    return { c: { name: course?.name || 'Secondary mathematics (mixed levels)', programme: course?.framework === 'DP' ? 'DP' : 'MYP' }, track: '' };
  }
  // Questions pasted from Claude, by topic id (kept, so "New questions" does not lose them).
  const aiDone = prefs.aiDone || (prefs.aiDone = {});
  let aiPicks = [];

  // fresh: ignore questions pasted earlier for these topics ("New questions")
  function build(fresh = false) {
    const chosen = picks();
    const custom = $('#wsCustom').value.split('\n').map(s => s.trim()).filter(Boolean).map(line => {
      const [q, a] = line.split('||');
      return { q: esc(q.trim()), a: esc((a || '').trim()) || '—', level: 0 };
    });
    if (!chosen.length && !custom.length) { toast('Choose at least one topic', 'error'); return null; }
    // one section per generator; only the first section of a topic carries its heading.
    // AI topics use pasted questions when there are enough, otherwise a placeholder section (pending).
    aiPicks = chosen.filter(p => p.ai);
    const aiSection = p => {
      const id = p.ai.topic.id, done = fresh ? null : aiDone[id];
      return done?.items.length ? { name: p.name, instr: done.instr, items: done.items.slice(0, p.ai.n), aiTopic: id } : { name: p.name, instr: '', items: [], pending: id, aiTopic: id };
    };
    let sections = chosen.flatMap(p => p.ai ? [aiSection(p)] : p.parts.map((part, i) => ({ name: i ? '' : p.name, instr: part.gen.instr, items: questions(part.gen, part.n) })));
    if (custom.length) sections.push({ name: 'Additional questions', instr: '', items: custom });
    const pending = sections.filter(s => s.pending);
    sections = sections.filter(s => !s.pending);
    let courseId = $('#wsCourse').value, courseName = '';
    if (source === 'library') {
      const { c, track } = parseLevel($('#wsLevelKey').value);
      courseId = App.course(c?.id) ? c.id : '';
      courseName = levelName(c, track);
    }
    let title = $('#wsTitle').value.trim();
    if (!title) title = chosen.length === 1 && !custom.length ? `${chosen[0].short} practice` : 'Mixed practice';
    if ($('#wsShuffle').checked && sections.length > 1) {
      sections = [{ name: '', instr: 'Answer all questions. Show your working.', items: RNG.shuffle(sections.flatMap(s => s.items)) }];
    }
    return { title, courseId, courseName, sections: [...sections, ...pending] };
  }

  function sheetHTML(ws) {
    const courseName = ws.courseName || App.course(ws.courseId)?.name || 'Mathematics';
    const cls = [$('#wsCols').value, $('#wsSpace').value].filter(Boolean).join(' ');
    const mark = $('#wsLvlMark').value === '1';
    let n = 1;
    const pendingNote = s => s.pending ? '<p class="ai-pending">These questions appear after you paste Claude’s reply in the panel above.</p>' : '';
    const qs = ws.sections.map(s => {
      const start = n; n += s.items.length;
      return `${s.name ? `<h3>${esc(s.name)}</h3>` : ''}${s.instr ? `<p class="sheet-instr">${s.instr}</p>` : ''}${pendingNote(s)}
        <ol class="qlist ${cls}" start="${start}">${s.items.map(it => `<li>${it.q}${mark && it.level ? `<span class="lvl">L${it.level}</span>` : ''}</li>`).join('')}</ol>`;
    }).join('');
    n = 1;
    const ans = ws.sections.map(s => {
      const start = n; n += s.items.length;
      return `${s.name ? `<h3>${esc(s.name)}</h3>` : ''}${pendingNote(s)}<ol class="qlist answer-list cols-2" start="${start}">${s.items.map(it => `<li>${it.a}</li>`).join('')}</ol>`;
    }).join('');
    const head = (sub) => `<div class="sheet-head"><div><div class="sheet-course">${esc(courseName)}</div><h2>${esc(ws.title)}${sub}</h2></div>
      <div class="sheet-fields">Name: ______________________<br>Class: __________ &nbsp; Date: __________</div></div>`;
    return `<div class="sheet question-sheet" contenteditable="true" spellcheck="false">${head('')}${qs}
        <div class="sheet-foot">${esc(S.profile.name || '')}${S.profile.school ? ` · ${esc(S.profile.school)}` : ''}</div></div>
      <div class="sheet answer-sheet" contenteditable="true" spellcheck="false" style="margin-top:1rem">
        <div class="sheet-head"><div><div class="sheet-course">${esc(courseName)}</div><h2>${esc(ws.title)} — Answer key</h2></div></div>${ans}</div>`;
  }

  function show(html) {
    $('#sheets').innerHTML = html;
    Tex.typeset($('#sheets'));
    $('#wsActions').hidden = false;
    syncTex(true);
  }

  /* ---------- LaTeX code panel: the sheet as .tex, editable, applied back with Tex.toSheets ---------- */
  let texDirty = false; // the code has edits that are not on the sheet yet
  const texStatus = s => { $('#texStatus').textContent = s; };
  function openTex() {
    $('#texSrc').value = Tex.fromSheets($('#sheets'));
    texDirty = false; texStatus('');
    $('#texPanel').hidden = false;
    $('#editTex').textContent = 'Hide LaTeX';
  }
  // Keep the code in step with the sheet while it is open (a rebuilt sheet always wins).
  function syncTex(rebuilt = false) {
    if ($('#texPanel').hidden || (texDirty && !rebuilt)) return;
    $('#texSrc').value = Tex.fromSheets($('#sheets'));
    if (rebuilt && texDirty) texStatus('The sheet was rebuilt — the code shows the new sheet');
    texDirty = false;
  }
  const closeTex = () => { $('#texPanel').hidden = true; $('#editTex').textContent = 'Edit LaTeX'; };
  $('#editTex').onclick = () => { if ($('#texPanel').hidden) openTex(); else closeTex(); };
  $('#texClose').onclick = closeTex;
  $('#texReload').onclick = openTex;
  $('#texSrc').addEventListener('input', () => { texDirty = true; texStatus('Not applied yet'); });
  $('#texApply').onclick = () => {
    const src = $('#texSrc').value;
    // Claude's reply pasted here by mistake: add it the way the "Questions from Claude" panel does
    if (/^\s*=+\s*TOPIC\b/im.test(src) && !/\\begin\{document\}/.test(src)) {
      if (!current || !aiPicks.length) { toast('This looks like Claude’s reply. Generate the worksheet with its topics first, then paste the reply in “Questions from Claude”.', 'error'); return; }
      $('#aiReply').value = src;
      $('#aiAdd').click();
      return;
    }
    // a LaTeX document that this page did not write (e.g. Claude's own worksheet) is not read as the sheet
    if (/\\documentclass|\\begin\{document\}/.test(src) && !/Generated by MathHub/.test(src) && !/\\hrule\s*\\medskip/.test(src)) {
      if (current && aiPicks.length) showFix();
      toast('This is not the LaTeX of this sheet — it looks like Claude’s own LaTeX document. The sheet was not changed. “Reload from sheet” brings the sheet’s code back.', 'error');
      return;
    }
    let html;
    try { html = Tex.toSheets(src); } catch (err) {
      const hint = /begin\{document\}/.test(err.message) ? ' This box holds the whole LaTeX of the sheet (from \\documentclass to \\end{document}); Claude’s reply goes in step 2 of “Questions from Claude”.' : '';
      toast(`Could not read the LaTeX: ${err.message}.${hint} The sheet was not changed.`, 'error');
      return;
    }
    texDirty = false;
    show(html);
    const bad = $$('#sheets .katex-error').length;
    texStatus(bad ? `Applied — ${bad} formula${bad > 1 ? 's have' : ' has'} an error (shown in red)` : 'Applied ✓');
    toast('LaTeX applied to the sheet', 'success');
  };
  let texTimer;
  $('#sheets').addEventListener('input', () => { clearTimeout(texTimer); texTimer = setTimeout(syncTex, 400); });
  // what the download / copy buttons use: the code being edited, if there is some
  const texOut = () => (!$('#texPanel').hidden && texDirty ? $('#texSrc').value : Tex.fromSheets($('#sheets')));

  // Click a figure to edit its TikZ, with a live preview.
  $('#sheets').addEventListener('click', e => {
    const fig = e.target.closest('.fig');
    if (!fig) return;
    openModal({
      title: 'Edit figure (TikZ)',
      wide: true,
      body: `<label>TikZ<textarea rows="14" data-tikz spellcheck="false" wrap="off" style="font-family:monospace;font-size:.8rem;white-space:pre">${esc(fig.dataset.tikz)}</textarea></label>
        <div class="sheet tex" data-preview style="padding:1rem;margin-top:.8rem;box-shadow:none;border:1px solid var(--border);text-align:center;overflow:auto"></div>
        <p class="small muted" data-warn style="margin:.4rem 0 0"></p>`,
      onOpen: dlg => {
        const ta = $('[data-tikz]', dlg), pv = $('[data-preview]', dlg), warn = $('[data-warn]', dlg);
        const draw = () => {
          let r; try { r = Tikz.render(ta.value); } catch (err) { r = { svg: '', warnings: [err.message] }; }
          pv.innerHTML = r.svg || '<span class="muted small">Nothing to draw yet.</span>';
          warn.textContent = r.warnings.length ? `Not drawn on screen (kept in the .tex): ${r.warnings.join(', ')}` : '';
        };
        ta.addEventListener('input', draw);
        draw();
      },
      actions: [{ label: 'Cancel', cls: 'btn-ghost' }, { label: 'Apply', cls: 'btn-primary', onClick: dlg => { Tex.setFigure(fig, $('[data-tikz]', dlg).value.trim()); syncTex(); } }],
    });
  });

  // Click a typeset formula to edit its LaTeX, with a live preview.
  $('#sheets').addEventListener('click', e => {
    const f = e.target.closest('.kx');
    if (!f || f.closest('.fig')) return;
    openModal({
      title: 'Edit formula',
      body: `<label>LaTeX<textarea rows="3" data-tex spellcheck="false" style="font-family:monospace">${esc(f.dataset.tex)}</textarea></label>
        <div class="sheet tex" data-preview style="padding:1rem;margin-top:.8rem;box-shadow:none;border:1px solid var(--border)"></div>`,
      onOpen: dlg => {
        const ta = $('[data-tex]', dlg), pv = $('[data-preview]', dlg);
        const draw = () => { pv.innerHTML = Tex.render(ta.value, !!f.dataset.display); };
        ta.addEventListener('input', draw);
        draw();
        ta.focus();
      },
      actions: [{ label: 'Cancel', cls: 'btn-ghost' }, { label: 'Apply', cls: 'btn-primary', onClick: dlg => { Tex.setFormula(f, $('[data-tex]', dlg).value.trim()); syncTex(); } }],
    });
  });

  function savePrefs() {
    prefs.source = source;
    prefs.engine = $('#wsEngine').value;
    const chosen = {};
    $$('#topicPicker input[type=checkbox]:checked').forEach(cb => { chosen[cb.value] = Number($(`[data-count="${CSS.escape(cb.value)}"]`).value) || 6; });
    if (source === 'library') { prefs.levelKey = $('#wsLevelKey').value; prefs.libTopics = chosen; }
    else { prefs.courseId = $('#wsCourse').value; prefs.topics = chosen; }
    App.save(true);
  }

  function generate(fresh = false) {
    const ws = build(fresh);
    if (!ws) return;
    current = ws;
    savePrefs();
    show(sheetHTML(ws));
    renderAiPanel();
  }

  /* ---------- AI topics: prompt out, reply in ---------- */
  const aiKeyed = () => aiPicks.map((p, i) => ({ key: p.ai.topic.code || `T${i + 1}`, ...p.ai }));
  function renderAiPanel() {
    $('#aiPanel').hidden = !aiPicks.length || !current;
    if ($('#aiPanel').hidden) return;
    const waiting = new Set(current.sections.filter(s => s.pending).map(s => s.pending));
    const { c, track } = promptLevel();
    // the prompt asks for the topics still waiting; once all are in, it asks for all of them again (fresh questions)
    const topics = aiKeyed().filter(k => !waiting.size || waiting.has(k.topic.id));
    $('#aiPrompt').value = WsAI.prompt({ c, track, topics, difficulty: $('#wsLevel').value, figures: $('#aiFigs').value });
    addMaterials(topics);
    $('#aiStatus').textContent = waiting.size ? `${waiting.size} topic${waiting.size > 1 ? 's' : ''} waiting` : 'All added ✓ — run the prompt again for fresh questions';
    $('#aiTopics').innerHTML = aiPicks.map(p => `<span class="ai-chip${waiting.has(p.ai.topic.id) ? '' : ' done'}">${waiting.has(p.ai.topic.id) ? '' : '✓ '}${esc(p.name)} · ${p.ai.n}</span>`).join('');
  }
  // Excerpts from the Material library (matindex.js) for these topics, placed before the output format.
  let matRun = 0;
  async function addMaterials(topics) {
    const run = ++matRun;
    $('#aiMatInfo').textContent = '';
    $('#aiCopy').disabled = false;
    if (!$('#aiMat').checked || !topics.length) return;
    $('#aiCopy').disabled = true;
    $('#aiMatInfo').textContent = 'Finding matching passages…';
    try {
      const queries = topics.map(k => [k.topic.title, ...(k.topic.outcomes || []).slice(0, 4).map(o => o.text)].join('. '));
      const { text, count } = await MatIndex.context(queries, { perQuery: 2, maxChars: 6000 });
      if (run !== matRun) return;
      if (!count) { $('#aiMatInfo').textContent = 'No matching passages — add or update sources in the Material library.'; return; }
      const section = `YOUR OWN MATERIALS
Excerpts from the teacher's existing lessons and worksheets on these topics (from the teacher's material library). Use them to match the teacher's level, notation, style and contexts. Do not copy their questions word for word, and do not repeat questions the students have already done.

${text}`;
      const p = $('#aiPrompt').value;
      $('#aiPrompt').value = p.includes('\nOUTPUT FORMAT') ? p.replace('\nOUTPUT FORMAT', `\n${section}\n\nOUTPUT FORMAT`) : `${p}\n\n${section}`;
      $('#aiMatInfo').textContent = `${count} passage${count > 1 ? 's' : ''} added`;
    } catch (e) {
      if (run === matRun) $('#aiMatInfo').textContent = `Could not add materials: ${e.message}`;
    } finally { if (run === matRun) $('#aiCopy').disabled = false; }
  }
  $('#aiMat').addEventListener('change', () => { prefs.aiMat = $('#aiMat').checked; App.save(true); renderAiPanel(); });
  $('#aiCopy').onclick = () => copyText($('#aiPrompt').value);
  $('#aiShow').onclick = () => { const ta = $('#aiPrompt'); ta.hidden = !ta.hidden; $('#aiShow').textContent = ta.hidden ? 'Show prompt' : 'Hide prompt'; };
  // Claude replied with a full LaTeX document: explain, and offer a ready follow-up message
  function showFix() {
    $('#aiFixMsg').textContent = WsAI.FIX_MESSAGE;
    $('#aiFix').hidden = false;
    $('#aiPanel').hidden = false;
    $('#aiFix').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  $('#aiFixCopy').onclick = () => copyText(WsAI.FIX_MESSAGE);
  $('#aiAdd').onclick = () => {
    if (!current) return;
    if (WsAI.isLatexDocument($('#aiReply').value)) { showFix(); toast('Claude wrote a whole LaTeX document instead of the requested format — see the message to send it.', 'error'); return; }
    $('#aiFix').hidden = true;
    const keyed = aiKeyed(), blocks = WsAI.parse($('#aiReply').value, keyed.map(k => k.key));
    const added = keyed.filter(k => blocks[k.key]?.items.length);
    if (!added.length) { toast('No questions found. Paste Claude’s whole reply — it starts with “=== TOPIC”.', 'error'); return; }
    added.forEach(k => { aiDone[k.topic.id] = blocks[k.key]; });
    // keep the store small: the 40 most recently added topics
    Object.keys(aiDone).slice(0, Math.max(0, Object.keys(aiDone).length - 40)).forEach(id => { if (!added.some(k => k.topic.id === id)) delete aiDone[id]; });
    current.sections = current.sections.map(s => {
      const k = added.find(x => x.topic.id === s.aiTopic);
      return k ? { name: s.name, instr: blocks[k.key].instr, items: blocks[k.key].items.slice(0, k.n), aiTopic: s.aiTopic } : s;
    });
    App.save(true);
    show(sheetHTML(current));
    renderAiPanel();
    $('#aiReply').value = '';
    openTex(); // the new sheet as LaTeX, ready to adjust
    const short = added.filter(k => blocks[k.key].items.length < k.n).map(k => `${k.key} (${blocks[k.key].items.length}/${k.n})`);
    const missing = keyed.filter(k => !blocks[k.key]?.items.length && current.sections.some(s => s.pending === k.topic.id)).map(k => k.key);
    toast([`Added questions for ${added.length} topic${added.length > 1 ? 's' : ''}.`, short.length ? `Fewer than asked: ${short.join(', ')}.` : '', missing.length ? `Still missing: ${missing.join(', ')}.` : ''].filter(Boolean).join(' '), short.length || missing.length ? 'error' : 'success');
  };

  function renderRecent() {
    const list = S.worksheets || [];
    $('#recent').innerHTML = list.length ? `<ul class="review-list">${list.map(w => `<li>${courseTag(App.course(w.courseId))}
        <div class="grow"><button class="link" data-open="${w.id}" style="color:var(--text);font-weight:600;text-align:left">${esc(w.title)}</button><div class="muted small">${esc(fmtDate(w.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }))}</div></div>
        <button class="icon-btn sm" data-del="${w.id}" aria-label="Delete">×</button></li>`).join('')}</ul>` : '<p class="muted small">Worksheets you save appear here so you can reprint them.</p>';
  }
  $('#recent').addEventListener('click', e => {
    const o = e.target.closest('[data-open]'), d = e.target.closest('[data-del]');
    if (o) { const w = S.worksheets.find(x => x.id === o.dataset.open); current = null; show(w.html); renderAiPanel(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (d) { S.worksheets = S.worksheets.filter(x => x.id !== d.dataset.del); App.save(); renderRecent(); }
  });

  function doPrint(mode) {
    document.body.dataset.print = mode;
    window.print();
  }
  window.addEventListener('afterprint', () => { delete document.body.dataset.print; });

  $('#wsCourse').addEventListener('change', renderTopics);
  $('#wsLevelKey').addEventListener('change', renderTopics);
  $('#wsEngine').addEventListener('change', () => { prefs.engine = $('#wsEngine').value; App.save(true); renderTopics(); });
  $('#aiFigs').addEventListener('change', () => { prefs.aiFigs = $('#aiFigs').value; App.save(true); renderAiPanel(); });
  $('#selAll').onclick = () => $$('#topicPicker input[type=checkbox]:not(:disabled)').forEach(cb => { cb.checked = true; });
  $('#selNone').onclick = () => $$('#topicPicker input[type=checkbox]').forEach(cb => { cb.checked = false; });
  $('#generate').onclick = () => generate();
  $('#regen').onclick = () => generate(true); // Claude topics wait for a fresh reply
  $('#printWs').onclick = () => doPrint('ws');
  $('#printBoth').onclick = () => doPrint('both');
  $('#printKey').onclick = () => doPrint('key');
  const sheetTitle = () => $('.question-sheet h2')?.textContent.trim() || current?.title || 'Worksheet';
  $('#texWs').onclick = () => { downloadFile(`${slug(sheetTitle())}.tex`, texOut(), 'application/x-tex'); toast('LaTeX file downloaded', 'success'); };
  $('#copyTex').onclick = () => copyText(texOut());
  $('#saveWs').onclick = () => {
    const title = sheetTitle();
    S.worksheets = S.worksheets || [];
    S.worksheets.unshift({ id: uid('ws'), title, courseId: current?.courseId || $('#wsCourse').value, createdAt: isoDate(), html: Tex.compact($('#sheets')) });
    S.worksheets = S.worksheets.slice(0, 25);
    if (App.save()) { toast('Worksheet saved', 'success'); renderRecent(); }
  };

  $('#wsEngine').value = prefs.engine === 'instant' ? 'instant' : 'ai';
  $('#aiFigs').value = prefs.aiFigs || 'auto';
  $('#aiMat').checked = !!prefs.aiMat;
  setSource(source);
  renderRecent();
})();
