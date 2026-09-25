(() => {
  const S = App.state;
  ensureCurricula();
  let current = location.hash.slice(1);
  if (!curriculum(current)) current = S.curricula[0]?.id;
  let track = '';
  const open = new Set();

  const cur = () => curriculum(current);
  const tagFor = (item, c) => item.tracks?.length && item.tracks.length < c.tracks.length ? `[${item.tracks.join(',')}] ` : '';

  function renderTabs() {
    $('#tabs').innerHTML = S.curricula.map(c => {
      const n = c.units.reduce((s, u) => s + u.topics.length, 0);
      return `<button class="tab ${c.id === current ? 'active' : ''}" role="tab" data-id="${c.id}">${esc(c.short)} <span class="chip">${n}</span></button>`;
    }).join('') + '<button class="tab" id="addCur" title="Add another curriculum">+</button>';
  }
  function renderTracks() {
    const c = cur();
    $('#trackSeg').hidden = !c.tracks.length;
    $('#trackSeg').innerHTML = ['', ...c.tracks].map(t => `<button type="button" data-track="${esc(t)}" class="${t === track ? 'active' : ''}">${t ? esc(t) : 'All'}</button>`).join('');
  }

  function render() {
    const c = cur();
    if (track && !c.tracks.includes(track)) track = '';
    renderTabs(); renderTracks();
    const q = $('#q').value.trim().toLowerCase();
    const cov = outcomeCoverage();
    const topics = c.units.flatMap(u => u.topics);
    const outs = topics.filter(t => inTrack(t, track)).flatMap(t => t.outcomes.filter(o => inTrack(o, track)));
    const planned = outs.filter(o => cov[o.id]).length, taught = outs.filter(o => cov[o.id]?.taught).length;
    const hoursTotal = track && c.units.every(u => u.hours?.[track]) ? c.units.reduce((s, u) => s + u.hours[track], 0) : 0;

    const header = `<div class="card-head"><div><h2>${esc(c.name)}</h2>
        <p class="muted small">${esc(c.programme)}${c.tracks.length ? ` · levels: ${esc(c.tracks.join(', '))}` : ''}${c.source ? ` · ${esc(c.source)}` : ''}</p></div>
        <div class="form-row" style="flex:0 0 auto">
          ${c.builtin ? '<button class="btn btn-sm btn-ghost" id="restore" style="flex:0">Restore official content</button>' : ''}
          <button class="btn btn-sm btn-ghost" id="editCur" style="flex:0">Edit details</button>
        </div></div>
      <div class="course-summary">
        <div class="card"><div class="stat-label">Units</div><div class="stat-value">${c.units.length}</div><div class="stat-sub">${hoursTotal ? `${hoursTotal} teaching hours (${esc(track)})` : 'strands / topics'}</div></div>
        <div class="card"><div class="stat-label">Topics</div><div class="stat-value">${topics.filter(t => inTrack(t, track)).length}</div><div class="stat-sub">${track ? `in ${esc(track)}` : 'all levels'}</div></div>
        <div class="card"><div class="stat-label">Learning outcomes</div><div class="stat-value">${outs.length}</div><div class="stat-sub">${planned} planned · ${taught} taught</div></div>
        <div class="card"><div class="stat-label">Coverage</div><div class="stat-value">${outs.length ? Math.round(planned / outs.length * 100) : 0}%</div><div class="stat-sub">of outcomes in a lesson plan</div></div>
      </div>`;

    if (!c.units.length) {
      $('#panel').innerHTML = header + `<div class="card"><h3 style="margin-bottom:.4rem">No topics yet</h3>
        <p class="muted">Click <strong>Import topics…</strong> to paste your list (from Word, Excel or plain text), or add units and topics one by one with <strong>+ Unit</strong>.</p>
        <button class="btn btn-primary" id="importEmpty">Import topics…</button></div>`;
      $('#importEmpty').onclick = importDialog;
      bindHeader();
      return;
    }

    const match = (t) => !q || `${t.code} ${t.title} ${t.outcomes.map(o => o.text).join(' ')}`.toLowerCase().includes(q);
    const unitsHtml = c.units.map((u, ui) => {
      const ts = u.topics.filter(t => inTrack(t, track) && match(t));
      if (q && !ts.length) return '';
      const uOuts = ts.flatMap(t => t.outcomes.filter(o => inTrack(o, track)));
      const uDone = uOuts.filter(o => cov[o.id]).length;
      const isOpen = q || open.has(u.id);
      return `<details class="unit-card lib-unit" data-unit="${u.id}" ${isOpen ? 'open' : ''}>
        <summary><span class="unit-num" style="--c:var(--primary)">${ui + 1}</span>
          <div class="unit-head"><h3>${esc(u.title)}</h3>
            <div class="unit-sub">${ts.length} topics · ${uOuts.length} outcomes · ${uDone} planned${u.hours ? ` · ${Object.entries(u.hours).filter(([k, v]) => v && (!track || k === track)).map(([k, v]) => `${esc(k)} ${v} h`).join(' / ')}` : ''}</div>
            <div class="progress"><span style="width:${uOuts.length ? uDone / uOuts.length * 100 : 0}%"></span></div></div>
        </summary>
        <div class="lib-body">
          ${ts.map(t => {
            const tOuts = t.outcomes.filter(o => inTrack(o, track));
            return `<div class="lib-topic">
              <div class="lib-topic-head">
                ${t.code ? `<span class="tp-code">${esc(t.code)}</span>` : ''}<strong>${esc(t.title)}</strong> ${trackBadge(t, c)}
                <span class="grow"></span>
                <a class="btn btn-sm btn-soft" href="builder.html?topic=${encodeURIComponent(t.id)}${track ? `&track=${encodeURIComponent(track)}` : ''}">Build lesson</a>
                <button class="btn btn-sm btn-ghost" data-edit-topic="${t.id}">Edit</button>
              </div>
              <ul class="lib-outcomes">${tOuts.map(o => `<li>${coverageMark(cov[o.id])}<span>${esc(o.text)}</span> ${trackBadge(o, c)}</li>`).join('') || '<li class="muted small">No outcomes yet.</li>'}</ul>
            </div>`;
          }).join('')}
          <div class="form-row" style="margin-top:.6rem">
            <button class="btn btn-sm btn-ghost" data-add-topic="${u.id}" style="flex:0">+ Topic</button>
            <button class="btn btn-sm btn-ghost" data-edit-unit="${u.id}" style="flex:0">Edit unit</button>
            <button class="btn btn-sm btn-ghost" data-up="${u.id}" style="flex:0" ${ui === 0 ? 'disabled' : ''} aria-label="Move unit up">↑</button>
            <button class="btn btn-sm btn-ghost" data-down="${u.id}" style="flex:0" ${ui === c.units.length - 1 ? 'disabled' : ''} aria-label="Move unit down">↓</button>
            <button class="btn btn-sm btn-danger-ghost" data-del-unit="${u.id}" style="flex:0">Delete unit</button>
          </div>
        </div>
      </details>`;
    }).join('');
    $('#panel').innerHTML = header + (unitsHtml || '<p class="empty">Nothing matches your search.</p>') +
      '<p class="small faint">✓ taught · ◐ planned in a lesson · ○ not yet</p>';
    bindHeader();
  }

  function bindHeader() {
    $('#editCur').onclick = () => editCurriculum(cur());
    $('#restore')?.addEventListener('click', () => {
      const c = cur();
      confirmModal(`Replace ${c.short} with the official topic list? Your own edits to ${c.short} will be lost; lesson links to official outcomes are kept.`, () => {
        const fresh = builtinCurricula().find(x => x.id === c.id);
        c.units = fresh.units; App.save(); render(); toast('Official content restored', 'success');
      }, 'Restore');
    });
  }

  /* ---------- editing ---------- */
  function editCurriculum(c) {
    const isNew = !c;
    c = c || { id: uid('cur'), name: '', short: '', programme: 'MYP', tracks: [], units: [] };
    openModal({
      title: isNew ? 'New curriculum' : 'Curriculum details',
      body: `<div class="form-grid">
        <label class="span-2">Name<input data-f="name" value="${esc(c.name)}" placeholder="e.g. MYP Mathematics — Grade 7"></label>
        <label>Short name<input data-f="short" value="${esc(c.short)}" maxlength="14" placeholder="e.g. MYP 7"></label>
        <label>Programme<select data-f="programme">${['MYP', 'DP', 'Other'].map(p => `<option ${p === c.programme ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
        <label class="span-2">Levels inside it (comma-separated, leave empty for none)<input data-f="tracks" value="${esc(c.tracks.join(', '))}" placeholder="e.g. Standard, Extended"></label>
      </div>`,
      actions: [
        ...(!isNew && !c.builtin ? [{ label: 'Delete', cls: 'btn-danger-ghost', onClick: () => {
          confirmModal(`Delete ${c.short || c.name} and all its topics?`, () => {
            S.curricula = S.curricula.filter(x => x.id !== c.id); current = S.curricula[0]?.id; App.save(); render();
          });
        } }, 'spacer'] : []),
        { label: 'Cancel', cls: 'btn-ghost' },
        { label: 'Save', cls: 'btn-primary', onClick: dlg => {
          const f = {}; $$('[data-f]', dlg).forEach(el => { f[el.dataset.f] = el.value.trim(); });
          if (!f.name) { toast('Name is required', 'error'); return false; }
          c.name = f.name; c.short = f.short || f.name.slice(0, 14); c.programme = f.programme;
          c.tracks = f.tracks.split(',').map(s => s.trim()).filter(Boolean);
          if (isNew) { S.curricula.push(c); current = c.id; }
          App.save(); render();
        } },
      ],
    });
  }

  function editUnit(u) {
    const c = cur(), isNew = !u;
    u = u || { id: uid('u'), title: '', hours: null, topics: [] };
    openModal({
      title: isNew ? 'New unit' : 'Edit unit',
      body: `<div class="form-grid"><label class="span-2">Unit / strand title<input data-f="title" value="${esc(u.title)}" placeholder="e.g. Number, Algebra, Topic 2 — Functions"></label>
        ${c.tracks.map(t => `<label>Teaching hours (${esc(t)})<input type="number" min="0" data-h="${esc(t)}" value="${esc(u.hours?.[t] ?? '')}"></label>`).join('')}</div>`,
      actions: [{ label: 'Cancel', cls: 'btn-ghost' }, { label: 'Save', cls: 'btn-primary', onClick: dlg => {
        const title = $('[data-f=title]', dlg).value.trim();
        if (!title) { toast('Title is required', 'error'); return false; }
        u.title = title;
        const h = {}; $$('[data-h]', dlg).forEach(i => { if (i.value) h[i.dataset.h] = Number(i.value); });
        u.hours = Object.keys(h).length ? h : null;
        if (isNew) c.units.push(u);
        open.add(u.id); App.save(); render();
      } }],
    });
  }

  function editTopic(unit, t) {
    const c = cur(), isNew = !t;
    t = t || { id: uid('t'), code: '', title: '', tracks: [], outcomes: [] };
    const help = c.tracks.length ? `Put <code>[${esc(c.tracks[c.tracks.length - 1])}]</code> at the start of a line for an outcome that belongs only to that level.` : '';
    openModal({
      title: isNew ? 'New topic' : 'Edit topic', wide: true,
      body: `<div class="form-grid">
        <label>Code (optional)<input data-f="code" value="${esc(t.code)}" placeholder="e.g. 2.6"></label>
        <label>Topic title<input data-f="title" value="${esc(t.title)}"></label>
        ${c.tracks.length ? `<div class="span-2"><label style="margin-bottom:.3rem">Taught in (leave all unticked for every level)</label><div class="chip-group" data-tracks>${c.tracks.map(tr =>
          `<label class="chip-check"><input type="checkbox" value="${esc(tr)}" ${t.tracks.includes(tr) ? 'checked' : ''}> ${esc(tr)}</label>`).join('')}</div></div>` : ''}
        <label class="span-2">Learning outcomes (one per line)<textarea data-f="outcomes" rows="8">${esc(t.outcomes.map(o => tagFor(o, c) + o.text).join('\n'))}</textarea></label>
        <p class="span-2 muted small" style="margin:0">${help} Outcomes that stay the same keep their links to lesson plans.</p>
      </div>`,
      actions: [
        ...(!isNew ? [{ label: 'Delete topic', cls: 'btn-danger-ghost', onClick: () => {
          confirmModal(`Delete the topic “${t.title}”?`, () => { unit.topics = unit.topics.filter(x => x.id !== t.id); App.save(); render(); });
        } }, 'spacer'] : []),
        { label: 'Cancel', cls: 'btn-ghost' },
        { label: 'Save topic', cls: 'btn-primary', onClick: dlg => {
          const title = $('[data-f=title]', dlg).value.trim();
          if (!title) { toast('Topic title is required', 'error'); return false; }
          t.code = $('[data-f=code]', dlg).value.trim();
          t.title = title;
          t.tracks = $$('[data-tracks] input:checked', dlg).map(i => i.value);
          if (t.tracks.length === c.tracks.length) t.tracks = [];
          const parsed = parseCurriculumText(`### x\n${$('[data-f=outcomes]', dlg).value.split('\n').map(l => l.trim() ? `- ${l.replace(/^[-*•]\s*/, '')}` : '').join('\n')}`, c.tracks)[0]?.topics[0]?.outcomes || [];
          // keep ids of unchanged outcomes so lesson links survive
          t.outcomes = parsed.map(p => { const old = t.outcomes.find(o => o.text === p.text); return old ? { ...old, tracks: p.tracks } : p; });
          if (isNew) unit.topics.push(t);
          open.add(unit.id); App.save(); render(); toast('Topic saved', 'success');
        } },
      ],
    });
  }

  function findUnit(id) { return cur().units.find(u => u.id === id); }

  /* ---------- import / export ---------- */
  function importDialog() {
    const c = cur();
    const ex = c.tracks.length ? `[${c.tracks[c.tracks.length - 1]}] ` : '';
    openModal({
      title: `Import topics into ${c.short}`, wide: true,
      body: `<p class="small muted" style="margin-top:0">Paste your list below. Two formats work:</p>
        <div class="grid-2" style="margin-bottom:.8rem">
          <pre class="fmt">## Number
### Integers and rational numbers
- Order and compare integers
- Apply the four operations
- ${esc(ex)}Prove results about rational numbers

## Algebra
### Linear equations
- Solve equations with unknowns on both sides</pre>
          <div class="small muted"><strong>Text:</strong> <code>##</code> starts a unit/strand, <code>###</code> a topic (you can start it with a code, e.g. <code>### 2.6 Quadratics</code>), and <code>-</code> an outcome.
            ${c.tracks.length ? `<br><br><strong>Levels:</strong> start a line with <code>[${esc(c.tracks.join(']</code> or <code>['))}]</code> for content that belongs to one level only.` : ''}
            <br><br><strong>Excel:</strong> copy columns <em>Unit · Topic · Outcome${c.tracks.length ? ' · Level' : ''}</em> and paste them here.</div>
        </div>
        <textarea data-text rows="12" placeholder="Paste here…"></textarea>
        <div class="form-row" style="margin-top:.6rem;align-items:center">
          <label class="inline"><input type="radio" name="mode" value="append" checked> Add to existing topics</label>
          <label class="inline"><input type="radio" name="mode" value="replace"> Replace everything in ${esc(c.short)}</label>
          <span class="grow small muted" data-count style="text-align:right"></span>
        </div>`,
      actions: [{ label: 'Cancel', cls: 'btn-ghost' }, { label: 'Import', cls: 'btn-primary', onClick: dlg => {
        const units = parseCurriculumText($('[data-text]', dlg).value, c.tracks);
        if (!units.length) { toast('Nothing to import — check the format', 'error'); return false; }
        const replace = $('input[name=mode]:checked', dlg).value === 'replace';
        if (replace) c.units = units;
        else units.forEach(nu => {
          const ex = c.units.find(u => u.title.toLowerCase() === nu.title.toLowerCase());
          if (!ex) { c.units.push(nu); return; }
          nu.topics.forEach(nt => {
            const et = ex.topics.find(t => t.title.toLowerCase() === nt.title.toLowerCase());
            if (!et) ex.topics.push(nt);
            else nt.outcomes.forEach(o => { if (!et.outcomes.some(x => x.text === o.text)) et.outcomes.push(o); });
          });
        });
        App.save(); render();
        const nT = units.reduce((s, u) => s + u.topics.length, 0), nO = units.reduce((s, u) => s + u.topics.reduce((a, t) => a + t.outcomes.length, 0), 0);
        toast(`Imported ${units.length} unit(s), ${nT} topic(s), ${nO} outcome(s)`, 'success');
      } }],
      onOpen: dlg => {
        const ta = $('[data-text]', dlg);
        ta.addEventListener('input', debounce(() => {
          const units = parseCurriculumText(ta.value, c.tracks);
          const nT = units.reduce((s, u) => s + u.topics.length, 0), nO = units.reduce((s, u) => s + u.topics.reduce((a, t) => a + t.outcomes.length, 0), 0);
          $('[data-count]', dlg).textContent = ta.value.trim() ? `Found ${units.length} unit(s), ${nT} topic(s), ${nO} outcome(s)` : '';
        }, 250));
        ta.focus();
      },
    });
  }

  function exportDialog() {
    const c = cur();
    const text = curriculumToText(c);
    openModal({
      title: `Export ${c.short}`, wide: true,
      body: `<p class="small muted" style="margin-top:0">The same format as Import. Keep it as a backup or share it with colleagues.</p><textarea rows="16" readonly data-out>${esc(text)}</textarea>`,
      actions: [
        { label: 'Download .txt', cls: 'btn-ghost', onClick: () => { downloadFile(`${slug(c.short)}-curriculum.txt`, text, 'text/plain'); return false; } },
        { label: 'Copy', cls: 'btn-ghost', onClick: () => { copyText(text); return false; } },
        { label: 'Close', cls: 'btn-primary' },
      ],
    });
  }

  /* ---------- events ---------- */
  $('#tabs').addEventListener('click', e => {
    if (e.target.closest('#addCur')) { editCurriculum(null); return; }
    const t = e.target.closest('[data-id]'); if (!t) return;
    current = t.dataset.id; track = ''; history.replaceState(null, '', `#${current}`); render();
  });
  $('#trackSeg').addEventListener('click', e => { const b = e.target.closest('[data-track]'); if (!b) return; track = b.dataset.track; render(); });
  $('#q').addEventListener('input', debounce(render, 200));
  $('#panel').addEventListener('toggle', e => {
    const d = e.target.closest?.('details[data-unit]');
    if (d) { if (d.open) open.add(d.dataset.unit); else open.delete(d.dataset.unit); }
  }, true);
  $('#panel').addEventListener('click', e => {
    const c = cur();
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.editTopic) { const u = c.units.find(x => x.topics.some(t => t.id === d.editTopic)); editTopic(u, u.topics.find(t => t.id === d.editTopic)); }
    else if (d.addTopic) editTopic(findUnit(d.addTopic), null);
    else if (d.editUnit) editUnit(findUnit(d.editUnit));
    else if (d.delUnit) { const u = findUnit(d.delUnit); confirmModal(`Delete the unit “${u.title}” and its ${u.topics.length} topic(s)?`, () => { c.units = c.units.filter(x => x.id !== u.id); App.save(); render(); }); }
    else if (d.up || d.down) {
      const i = c.units.findIndex(u => u.id === (d.up || d.down)), j = d.up ? i - 1 : i + 1;
      if (j >= 0 && j < c.units.length) { [c.units[i], c.units[j]] = [c.units[j], c.units[i]]; App.save(); render(); }
    }
  });
  $('#addUnit').onclick = () => editUnit(null);
  $('#importBtn').onclick = importDialog;
  $('#exportBtn').onclick = exportDialog;
  $('#expandAll').onclick = () => { cur().units.forEach(u => open.add(u.id)); render(); };
  $('#collapseAll').onclick = () => { open.clear(); render(); };
  window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (curriculum(id)) { current = id; render(); } });

  render();
})();
