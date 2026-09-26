(() => {
  const S = App.state;
  const prefs = S.worksheetPrefs || (S.worksheetPrefs = {});
  const params = new URLSearchParams(location.search);
  let current = null; // { title, courseId, sections: [{ name, instr, items: [{ q, a, level }] }] }

  $('#wsCourse').innerHTML = '<option value="">All topics</option>' + S.courses.filter(c => GENERATORS.some(g => g.courses.includes(c.id)))
    .map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $('#wsCourse').value = params.get('course') ?? prefs.courseId ?? 'myp8';
  if (!$('#wsCourse').value) $('#wsCourse').value = '';

  function renderTopics() {
    const cid = $('#wsCourse').value;
    const gens = GENERATORS.filter(g => !cid || g.courses.includes(cid));
    const chosen = prefs.topics || {};
    $('#topicPicker').innerHTML = gens.map(g => `<div class="topic-row">
      <label><input type="checkbox" value="${g.id}" ${chosen[g.id] ? 'checked' : ''}> ${esc(g.name)}</label>
      <input type="number" min="1" max="40" value="${chosen[g.id] || 6}" data-count="${g.id}" aria-label="Number of ${esc(g.name)} questions"></div>`).join('');
  }

  function levelFor(i, n) {
    const v = $('#wsLevel').value;
    if (v === 'mixed') return RNG.int(1, 3);
    if (v === 'progressive') return Math.min(3, 1 + Math.floor(i * 3 / Math.max(n, 1)));
    return Number(v);
  }

  function build() {
    const picks = $$('#topicPicker input[type=checkbox]:checked').map(cb => ({
      gen: GENERATORS.find(g => g.id === cb.value),
      n: Math.max(1, Math.min(40, Number($(`[data-count="${cb.value}"]`).value) || 6)),
    }));
    const custom = $('#wsCustom').value.split('\n').map(s => s.trim()).filter(Boolean).map(line => {
      const [q, a] = line.split('||');
      return { q: esc(q.trim()), a: esc((a || '').trim()) || '—', level: 0 };
    });
    if (!picks.length && !custom.length) { toast('Choose at least one topic', 'error'); return null; }
    const sections = picks.map(({ gen, n }) => {
      const seen = new Set(), items = [];
      for (let i = 0; i < n; i++) {
        const level = levelFor(i, n);
        let item, tries = 0;
        do { item = gen.gen(level); tries++; } while (seen.has(item.q) && tries < 15);
        seen.add(item.q);
        items.push({ ...item, level });
      }
      return { name: gen.name, instr: gen.instr, items };
    });
    if (custom.length) sections.push({ name: 'Additional questions', instr: '', items: custom });
    const courseId = $('#wsCourse').value;
    let title = $('#wsTitle').value.trim();
    if (!title) title = sections.length === 1 ? `${sections[0].name} practice` : 'Mixed practice';
    if ($('#wsShuffle').checked && sections.length > 1) {
      return { title, courseId, sections: [{ name: '', instr: 'Answer all questions. Show your working.', items: RNG.shuffle(sections.flatMap(s => s.items)) }] };
    }
    return { title, courseId, sections };
  }

  function sheetHTML(ws) {
    const course = App.course(ws.courseId);
    const cls = [$('#wsCols').value, $('#wsSpace').value].filter(Boolean).join(' ');
    const mark = $('#wsLvlMark').value === '1';
    let n = 1;
    const qs = ws.sections.map(s => {
      const start = n; n += s.items.length;
      return `${s.name ? `<h3>${esc(s.name)}</h3>` : ''}${s.instr ? `<p class="sheet-instr">${s.instr}</p>` : ''}
        <ol class="qlist ${cls}" start="${start}">${s.items.map(it => `<li>${it.q}${mark && it.level ? `<span class="lvl">L${it.level}</span>` : ''}</li>`).join('')}</ol>`;
    }).join('');
    n = 1;
    const ans = ws.sections.map(s => {
      const start = n; n += s.items.length;
      return `${s.name ? `<h3>${esc(s.name)}</h3>` : ''}<ol class="qlist answer-list cols-2" start="${start}">${s.items.map(it => `<li>${it.a}</li>`).join('')}</ol>`;
    }).join('');
    const head = (sub) => `<div class="sheet-head"><div><div class="sheet-course">${esc(course?.name || 'Mathematics')}</div><h2>${esc(ws.title)}${sub}</h2></div>
      <div class="sheet-fields">Name: ______________________<br>Class: __________ &nbsp; Date: __________</div></div>`;
    return `<div class="sheet question-sheet" contenteditable="true" spellcheck="false">${head('')}${qs}
        <div class="sheet-foot">${esc(S.profile.name || '')}${S.profile.school ? ` · ${esc(S.profile.school)}` : ''}</div></div>
      <div class="sheet answer-sheet" contenteditable="true" spellcheck="false" style="margin-top:1rem">
        <div class="sheet-head"><div><div class="sheet-course">${esc(course?.name || 'Mathematics')}</div><h2>${esc(ws.title)} — Answer key</h2></div></div>${ans}</div>`;
  }

  function show(html) {
    $('#sheets').innerHTML = html;
    Tex.typeset($('#sheets'));
    $('#wsActions').hidden = false;
  }

  // Click a typeset formula to edit its LaTeX, with a live preview.
  $('#sheets').addEventListener('click', e => {
    const f = e.target.closest('.kx');
    if (!f) return;
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
      actions: [{ label: 'Cancel', cls: 'btn-ghost' }, { label: 'Apply', cls: 'btn-primary', onClick: dlg => { Tex.setFormula(f, $('[data-tex]', dlg).value.trim()); } }],
    });
  });

  function savePrefs() {
    prefs.courseId = $('#wsCourse').value;
    prefs.topics = {};
    $$('#topicPicker input[type=checkbox]:checked').forEach(cb => { prefs.topics[cb.value] = Number($(`[data-count="${cb.value}"]`).value) || 6; });
    App.save(true);
  }

  function generate() {
    const ws = build();
    if (!ws) return;
    current = ws;
    savePrefs();
    show(sheetHTML(ws));
  }

  function renderRecent() {
    const list = S.worksheets || [];
    $('#recent').innerHTML = list.length ? `<ul class="review-list">${list.map(w => `<li>${courseTag(App.course(w.courseId))}
        <div class="grow"><button class="link" data-open="${w.id}" style="color:var(--text);font-weight:600;text-align:left">${esc(w.title)}</button><div class="muted small">${esc(fmtDate(w.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }))}</div></div>
        <button class="icon-btn sm" data-del="${w.id}" aria-label="Delete">×</button></li>`).join('')}</ul>` : '<p class="muted small">Worksheets you save appear here so you can reprint them.</p>';
  }
  $('#recent').addEventListener('click', e => {
    const o = e.target.closest('[data-open]'), d = e.target.closest('[data-del]');
    if (o) { const w = S.worksheets.find(x => x.id === o.dataset.open); current = null; show(w.html); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (d) { S.worksheets = S.worksheets.filter(x => x.id !== d.dataset.del); App.save(); renderRecent(); }
  });

  function doPrint(mode) {
    document.body.dataset.print = mode;
    window.print();
  }
  window.addEventListener('afterprint', () => { delete document.body.dataset.print; });

  $('#wsCourse').addEventListener('change', () => { renderTopics(); });
  $('#selAll').onclick = () => $$('#topicPicker input[type=checkbox]').forEach(cb => { cb.checked = true; });
  $('#selNone').onclick = () => $$('#topicPicker input[type=checkbox]').forEach(cb => { cb.checked = false; });
  $('#generate').onclick = generate;
  $('#regen').onclick = generate;
  $('#printWs').onclick = () => doPrint('ws');
  $('#printBoth').onclick = () => doPrint('both');
  $('#printKey').onclick = () => doPrint('key');
  const sheetTitle = () => $('.question-sheet h2')?.textContent.trim() || current?.title || 'Worksheet';
  $('#texWs').onclick = () => { downloadFile(`${slug(sheetTitle())}.tex`, Tex.fromSheets($('#sheets')), 'application/x-tex'); toast('LaTeX file downloaded', 'success'); };
  $('#copyTex').onclick = () => copyText(Tex.fromSheets($('#sheets')));
  $('#saveWs').onclick = () => {
    const title = sheetTitle();
    S.worksheets = S.worksheets || [];
    S.worksheets.unshift({ id: uid('ws'), title, courseId: current?.courseId || $('#wsCourse').value, createdAt: isoDate(), html: Tex.compact($('#sheets')) });
    S.worksheets = S.worksheets.slice(0, 25);
    if (App.save()) { toast('Worksheet saved', 'success'); renderRecent(); }
  };

  renderTopics();
  renderRecent();
})();
