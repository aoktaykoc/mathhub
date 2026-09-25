(() => {
  const S = App.state;
  let current = (location.hash || '').slice(1);
  if (!App.course(current)) current = S.courses[0]?.id;
  const openUnits = new Set();

  function renderTabs() {
    $('#tabs').innerHTML = S.courses.map(c =>
      `<button class="tab ${c.id === current ? 'active' : ''}" role="tab" aria-selected="${c.id === current}" style="--c:${esc(c.color)}" data-id="${c.id}" title="${esc(c.name)}"><i class="dot" style="background:${esc(c.color)}"></i>${esc(c.short)}</button>`).join('');
    $$('#tabs .tab').forEach(t => t.onclick = () => { current = t.dataset.id; history.replaceState(null, '', `#${current}`); render(); });
  }

  function unitCard(c, u, i) {
    const done = u.topics.filter(t => t.done).length;
    const pct = u.topics.length ? Math.round(done / u.topics.length * 100) : 0;
    const lessons = S.lessons.filter(l => l.unitId === u.id);
    const isMYP = c.framework === 'MYP';
    const sub = [
      u.weeks ? `${esc(u.weeks)} weeks` : '', u.hours ? `${esc(u.hours)} h` : '', u.syllabusRef ? esc(u.syllabusRef) : '',
      isMYP && u.criteria.length ? `Criteria ${esc(u.criteria.join(', '))}` : '', isMYP && u.keyConcept ? esc(u.keyConcept) : '',
      `${done}/${u.topics.length} topics`, lessons.length ? `${lessons.length} lessons` : '',
    ].filter(Boolean).join(' · ');
    const mypBlock = isMYP ? `
      ${u.soi ? `<div class="soi">${esc(u.soi)}</div>` : '<p class="muted small">No statement of inquiry yet.</p>'}
      <dl class="kv">
        <dt>Key concept</dt><dd>${esc(u.keyConcept || '—')}</dd>
        <dt>Related concepts</dt><dd>${u.relatedConcepts.length ? u.relatedConcepts.map(r => `<span class="chip">${esc(r)}</span>`).join(' ') : '—'}</dd>
        <dt>Global context</dt><dd>${esc(u.globalContext || '—')}</dd>
        <dt>Criteria</dt><dd>${u.criteria.length ? u.criteria.map(k => `<span class="chip" title="${esc(MYP.criteria[k])}">${k} · ${esc(MYP.criteria[k])}</span>`).join(' ') : '—'}</dd>
      </dl>` : `<dl class="kv">${u.syllabusRef ? `<dt>Syllabus</dt><dd>${esc(u.syllabusRef)}</dd>` : ''}${u.hours ? `<dt>Teaching hours</dt><dd>${esc(u.hours)}</dd>` : ''}${u.weeks ? `<dt>Weeks</dt><dd>${esc(u.weeks)}</dd>` : ''}</dl>`;
    return `<details class="unit-card" style="--c:${esc(c.color)}" data-unit="${u.id}" ${openUnits.has(u.id) ? 'open' : ''}>
      <summary>
        <span class="unit-num">${i + 1}</span>
        <div class="unit-head"><h3>${esc(u.title)}</h3><div class="unit-sub">${sub}</div>
          <div class="progress" style="--c:${esc(c.color)}"><span style="width:${pct}%"></span></div></div>
        <select class="status-select" data-status="${u.id}" aria-label="Unit status">${Object.entries(UNIT_STATUS).map(([k, v]) => `<option value="${k}" ${k === u.status ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
      </summary>
      <div class="unit-body">
        <div>${mypBlock}
          ${u.notes ? `<p class="small" style="margin-top:.7rem;white-space:pre-line">${linkify(u.notes)}</p>` : ''}
          <div class="form-row" style="margin-top:.8rem">
            <button class="btn btn-sm btn-ghost" data-act="edit" data-id="${u.id}">Edit unit</button>
            <button class="btn btn-sm btn-ghost" data-act="lesson" data-id="${u.id}">+ Lesson</button>
            <a class="btn btn-sm btn-ghost" href="worksheets.html?course=${c.id}">Worksheet</a>
            <button class="btn btn-sm btn-ghost" data-act="up" data-id="${u.id}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
            <button class="btn btn-sm btn-ghost" data-act="down" data-id="${u.id}" ${i === c.units.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
            <button class="btn btn-sm btn-danger-ghost" data-act="del" data-id="${u.id}">Delete</button>
          </div>
        </div>
        <div>
          <h3 style="margin-bottom:.4rem">Topics & coverage</h3>
          <ul class="topic-list">${u.topics.map(t => `<li class="${t.done ? 'done' : ''}"><input type="checkbox" data-topic="${t.id}" data-unit-id="${u.id}" ${t.done ? 'checked' : ''} aria-label="Covered"><span>${esc(t.text)}</span><button class="icon-btn sm" data-rm-topic="${t.id}" data-unit-id="${u.id}" aria-label="Remove topic">×</button></li>`).join('') || '<li class="muted small">No topics yet.</li>'}</ul>
          <form class="form-row" data-add-topic="${u.id}"><input placeholder="Add a topic…" aria-label="New topic"><button class="btn btn-sm btn-soft" type="submit" style="flex:0">Add</button></form>
          ${lessons.length ? `<h3 style="margin:1rem 0 .3rem">Lessons in this unit</h3><ul class="topic-list">${lessons.sort((a, b) => a.date.localeCompare(b.date)).slice(-6).map(l => `<li><span class="muted small nowrap">${esc(fmtDate(l.date, { day: 'numeric', month: 'short' }))}</span><span>${esc(l.title)}</span></li>`).join('')}</ul>` : ''}
        </div>
      </div>
    </details>`;
  }

  function render() {
    renderTabs();
    const c = App.course(current);
    if (!c) { $('#coursePanel').innerHTML = '<p class="empty">No courses yet.</p>'; return; }
    const p = App.courseProgress(c);
    const totalWeeks = c.units.reduce((s, u) => s + (Number(u.weeks) || 0), 0);
    const totalHours = c.units.reduce((s, u) => s + (Number(u.hours) || 0), 0);
    const lessons = S.lessons.filter(l => l.courseId === c.id);
    const note = c.framework === 'Custom' ? '<div class="empty-hint">This is your own curriculum: add, reorder and edit units freely. Any unit can use MYP-style fields if you wish (switch the course framework under “Edit course”).</div>' : '';
    $('#coursePanel').innerHTML = `${note}
      <div class="card-head"><div><h2>${esc(c.name)}</h2><p class="muted small">${esc(c.framework === 'DP' ? 'IB Diploma Programme' : c.framework === 'MYP' ? 'IB Middle Years Programme' : 'School-designed course')}</p></div>
        <button class="btn btn-sm btn-ghost" id="editCourse">Edit course</button></div>
      <div class="course-summary">
        <div class="card"><div class="stat-label">Coverage</div><div class="stat-value">${p.pct}%</div><div class="stat-sub">${p.done} of ${p.total} topics</div></div>
        <div class="card"><div class="stat-label">Units</div><div class="stat-value">${c.units.length}</div><div class="stat-sub">${c.units.filter(u => u.status === 'complete').length} complete</div></div>
        <div class="card"><div class="stat-label">${totalHours ? 'Teaching hours' : 'Planned weeks'}</div><div class="stat-value">${totalHours || totalWeeks || '—'}</div><div class="stat-sub">${totalHours ? 'syllabus + toolkit' : 'across all units'}</div></div>
        <div class="card"><div class="stat-label">Lesson plans</div><div class="stat-value">${lessons.length}</div><div class="stat-sub">${lessons.filter(l => l.status === 'taught').length} taught</div></div>
      </div>
      <div id="units">${c.units.map((u, i) => unitCard(c, u, i)).join('') || '<p class="empty">No units yet — add one.</p>'}</div>`;
    $('#editCourse').onclick = () => editCourse(c);
  }

  function editUnit(c, u) {
    const isNew = !u;
    u = u ? JSON.parse(JSON.stringify(u)) : makeUnit('');
    const isMYP = c.framework === 'MYP';
    const opt = (v, sel) => `<option ${v === sel ? 'selected' : ''}>${esc(v)}</option>`;
    const body = `<div class="form-grid">
      <label class="span-2">Unit title<input data-f="title" value="${esc(u.title)}"></label>
      <label>Weeks<input type="number" min="0" step="0.5" data-f="weeks" value="${esc(u.weeks)}"></label>
      <label>Teaching hours<input type="number" min="0" data-f="hours" value="${esc(u.hours)}"></label>
      ${!isMYP ? `<label class="span-2">Syllabus reference<input data-f="syllabusRef" value="${esc(u.syllabusRef)}" placeholder="e.g. SL 4.1–4.4"></label>` : ''}
      ${isMYP ? `
      <label>Key concept<select data-f="keyConcept"><option value="">—</option>${MYP.keyConcepts.map(k => opt(k, u.keyConcept)).join('')}</select></label>
      <label>Global context<select data-f="globalContext"><option value="">—</option>${MYP.globalContexts.map(k => opt(k, u.globalContext)).join('')}</select></label>
      <div class="span-2"><label style="margin-bottom:.3rem">Related concepts</label><div class="chip-group" data-rel>${MYP.relatedConcepts.map(r => `<label class="chip-check"><input type="checkbox" value="${esc(r)}" ${u.relatedConcepts.includes(r) ? 'checked' : ''}> ${esc(r)}</label>`).join('')}</div></div>
      <div class="span-2"><label style="margin-bottom:.3rem">Criteria assessed</label><div class="chip-group" data-crit>${Object.entries(MYP.criteria).map(([k, v]) => `<label class="chip-check"><input type="checkbox" value="${k}" ${u.criteria.includes(k) ? 'checked' : ''}> ${k} · ${esc(v)}</label>`).join('')}</div></div>
      <label class="span-2">Statement of inquiry<textarea data-f="soi" rows="2">${esc(u.soi)}</textarea></label>` : ''}
      <label class="span-2">Topics (one per line)<textarea data-topics rows="5">${esc(u.topics.map(t => t.text).join('\n'))}</textarea></label>
      <label class="span-2">Notes, resources & links<textarea data-f="notes" rows="3">${esc(u.notes)}</textarea></label>
    </div>`;
    openModal({
      title: isNew ? 'New unit' : 'Edit unit', body, wide: true,
      actions: [{ label: 'Cancel', cls: 'btn-ghost' }, {
        label: 'Save unit', cls: 'btn-primary', onClick: dlg => {
          $$('[data-f]', dlg).forEach(el => { u[el.dataset.f] = el.value.trim(); });
          if (!u.title) { toast('Unit title is required', 'error'); return false; }
          if (isMYP) {
            u.relatedConcepts = $$('[data-rel] input:checked', dlg).map(i => i.value);
            u.criteria = $$('[data-crit] input:checked', dlg).map(i => i.value);
          }
          const lines = $('[data-topics]', dlg).value.split('\n').map(s => s.trim()).filter(Boolean);
          u.topics = lines.map(text => u.topics.find(t => t.text === text) || { id: uid('t'), text, done: false });
          if (isNew) c.units.push(u); else c.units = c.units.map(x => x.id === u.id ? u : x);
          openUnits.add(u.id);
          App.save(); render(); toast('Unit saved', 'success');
        },
      }],
    });
  }

  function editCourse(c) {
    const isNew = !c;
    c = c || { id: uid('course'), name: '', short: '', framework: 'Custom', color: '#e0457b', units: [] };
    openModal({
      title: isNew ? 'New course' : 'Edit course',
      body: `<div class="form-grid">
        <label class="span-2">Course name<input data-f="name" value="${esc(c.name)}" placeholder="e.g. MYP Mathematics — Grade 10"></label>
        <label>Short label<input data-f="short" value="${esc(c.short)}" maxlength="12" placeholder="e.g. MYP 10"></label>
        <label>Framework<select data-f="framework">${['MYP', 'DP', 'Custom'].map(f => `<option ${f === c.framework ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
        <label>Colour<input type="color" data-f="color" value="${esc(c.color)}"></label>
      </div>`,
      actions: [
        ...(isNew || S.courses.length < 2 ? [] : [{ label: 'Delete course', cls: 'btn-danger-ghost', onClick: () => {
          confirmModal(`Delete “${c.name}” and all of its units? Lesson plans stay but lose their course link.`, () => {
            S.courses = S.courses.filter(x => x.id !== c.id); current = S.courses[0].id; App.save(); render();
          });
        } }, 'spacer']),
        { label: 'Cancel', cls: 'btn-ghost' },
        { label: 'Save', cls: 'btn-primary', onClick: dlg => {
          $$('[data-f]', dlg).forEach(el => { c[el.dataset.f] = el.value.trim(); });
          if (!c.name) { toast('Course name is required', 'error'); return false; }
          if (!c.short) c.short = c.name.slice(0, 10);
          if (isNew) { S.courses.push(c); S.classes.push({ id: uid('cls'), name: c.short, courseId: c.id, scheduleId: S.schedules[0]?.id || '', color: nextClassColor(S.classes) }); current = c.id; }
          App.save(); render(); toast('Course saved', 'success');
        } },
      ],
    });
  }

  const panel = $('#coursePanel');
  panel.addEventListener('toggle', e => {
    const d = e.target.closest?.('details[data-unit]');
    if (d) { if (d.open) openUnits.add(d.dataset.unit); else openUnits.delete(d.dataset.unit); }
  }, true);
  panel.addEventListener('click', e => {
    if (e.target.closest('select')) { e.stopPropagation(); if (e.target.closest('summary')) e.preventDefault(); return; }
    const b = e.target.closest('[data-act]');
    const c = App.course(current);
    if (b) {
      const idx = c.units.findIndex(u => u.id === b.dataset.id);
      const u = c.units[idx];
      if (b.dataset.act === 'edit') editUnit(c, u);
      if (b.dataset.act === 'lesson') openLessonEditor({ courseId: c.id, unitId: u.id }, render);
      if (b.dataset.act === 'up' && idx > 0) { [c.units[idx - 1], c.units[idx]] = [c.units[idx], c.units[idx - 1]]; App.save(); render(); }
      if (b.dataset.act === 'down' && idx < c.units.length - 1) { [c.units[idx + 1], c.units[idx]] = [c.units[idx], c.units[idx + 1]]; App.save(); render(); }
      if (b.dataset.act === 'del') confirmModal(`Delete the unit “${u.title}”?`, () => { c.units.splice(idx, 1); App.save(); render(); });
      return;
    }
    const rm = e.target.closest('[data-rm-topic]');
    if (rm) {
      const u = App.unit(current, rm.dataset.unitId);
      u.topics = u.topics.filter(t => t.id !== rm.dataset.rmTopic); App.save(); render();
    }
  });
  panel.addEventListener('change', e => {
    if (e.target.dataset.status) {
      const u = App.unit(current, e.target.dataset.status); u.status = e.target.value; App.save(); render();
    } else if (e.target.dataset.topic) {
      const u = App.unit(current, e.target.dataset.unitId);
      const t = u.topics.find(x => x.id === e.target.dataset.topic);
      t.done = e.target.checked;
      if (u.topics.every(x => x.done) && u.status !== 'complete') u.status = 'complete';
      else if (u.topics.some(x => x.done) && u.status === 'not-started') u.status = 'in-progress';
      App.save(); render();
    }
  });
  panel.addEventListener('submit', e => {
    const form = e.target.closest('[data-add-topic]');
    if (!form) return;
    e.preventDefault();
    const text = $('input', form).value.trim();
    if (!text) return;
    App.unit(current, form.dataset.addTopic).topics.push({ id: uid('t'), text, done: false });
    App.save(); render();
    $(`[data-add-topic="${form.dataset.addTopic}"] input`)?.focus();
  });

  $('#addUnit').onclick = () => editUnit(App.course(current), null);
  $('#addCourse').onclick = () => editCourse(null);
  $('#printCourse').onclick = () => {
    const c = App.course(current);
    printHTML(c.name, `<h1>${esc(c.name)}</h1><div class="meta">Curriculum overview · printed ${esc(fmtDate(isoDate(), { day: 'numeric', month: 'long', year: 'numeric' }))}</div>
      <table><thead><tr><th>#</th><th>Unit</th>${c.framework === 'MYP' ? '<th>Key / related concepts</th><th>Global context & SOI</th><th>Criteria</th>' : '<th>Syllabus / hours</th>'}<th>Topics</th></tr></thead><tbody>
      ${c.units.map((u, i) => `<tr><td>${i + 1}</td><td><strong>${esc(u.title)}</strong><br>${u.weeks ? `${esc(u.weeks)} weeks` : ''}</td>
        ${c.framework === 'MYP' ? `<td>${esc(u.keyConcept)}<br><small>${esc(u.relatedConcepts.join(', '))}</small></td><td>${esc(u.globalContext)}<br><em>${esc(u.soi)}</em></td><td>${esc(u.criteria.join(', '))}</td>` : `<td>${esc(u.syllabusRef)}${u.hours ? `<br>${esc(u.hours)} h` : ''}</td>`}
        <td>${u.topics.map(t => `${t.done ? '☑' : '☐'} ${esc(t.text)}`).join('<br>')}</td></tr>`).join('')}</tbody></table>`);
  };
  window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (App.course(id)) { current = id; render(); } });

  render();
})();
