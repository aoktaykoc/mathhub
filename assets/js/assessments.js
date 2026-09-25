(() => {
  const S = App.state;
  const today = isoDate();
  let statusFilter = '';

  const teacherName = id => App.teacher(id)?.name || '—';
  const isOverdue = a => a.status === 'requested' && a.deadline && a.deadline < today;
  const log = (a, text) => { a.log = a.log || []; a.log.push({ at: today, text }); };

  function fillFilters() {
    const t = $('#fTeacher').value, c = $('#fCourse').value;
    $('#fTeacher').innerHTML = '<option value="">All teachers</option>' + S.teachers.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
    $('#fCourse').innerHTML = courseOptions('', 'All courses');
    $('#fTeacher').value = t; $('#fCourse').value = c;
  }

  function filtered() {
    const q = $('#q').value.trim().toLowerCase(), t = $('#fTeacher').value, c = $('#fCourse').value, ty = $('#fType').value;
    return S.assessments.filter(a => (!statusFilter || (statusFilter === 'overdue' ? isOverdue(a) : a.status === statusFilter))
      && (!t || a.teacherId === t) && (!c || a.courseId === c) && (!ty || a.type === ty)
      && (!q || `${a.title} ${a.unit} ${a.code} ${teacherName(a.teacherId)}`.toLowerCase().includes(q)))
      .sort((a, b) => {
        const rank = { submitted: 0, 'in-review': 1, revision: 2, requested: 3, approved: 4 };
        return (rank[a.status] - rank[b.status]) || (a.deadline || '9999').localeCompare(b.deadline || '9999');
      });
  }

  function renderStatusBar() {
    const counts = { '': S.assessments.length, overdue: S.assessments.filter(isOverdue).length };
    Object.keys(A_STATUS).forEach(k => { counts[k] = S.assessments.filter(a => a.status === k).length; });
    const pills = [['', 'All'], ...Object.entries(A_STATUS).map(([k, v]) => [k, v.label]), ['overdue', 'Overdue']];
    $('#statusBar').innerHTML = pills.map(([k, label]) => `<button class="status-pill ${statusFilter === k ? 'active' : ''}" data-s="${k}">
      <strong ${k === 'overdue' && counts[k] ? 'class="overdue-text"' : ''}>${counts[k]}</strong><span>${label}</span></button>`).join('');
    $$('#statusBar .status-pill').forEach(b => b.onclick = () => { statusFilter = b.dataset.s; render(); });
  }

  function renderRows() {
    const list = filtered();
    $('#rows').innerHTML = list.map(a => `<tr class="clickable" data-id="${a.id}" tabindex="0">
      <td><strong>${esc(a.title)}</strong><div class="muted small">${esc(a.code)}${a.unit ? ` · ${esc(a.unit)}` : ''}${a.criteria?.length ? ` · Crit ${esc(a.criteria.join(', '))}` : ''}</div></td>
      <td>${esc(teacherName(a.teacherId))}</td>
      <td>${courseTag(App.course(a.courseId))}</td>
      <td>${a.type === 'summative' ? badge('Summative', 'warning') : badge('Formative', 'info')}</td>
      <td class="nowrap ${isOverdue(a) ? 'overdue-text' : ''}">${a.deadline ? esc(fmtDate(a.deadline, { day: 'numeric', month: 'short' })) : '—'}${isOverdue(a) ? '<div class="small">overdue</div>' : ''}</td>
      <td class="nowrap">${a.date ? esc(fmtDate(a.date, { day: 'numeric', month: 'short' })) : '—'}</td>
      <td>${statusBadge(A_STATUS, a.status)}</td></tr>`).join('') ||
      `<tr><td colspan="7" class="empty">${S.assessments.length ? 'No assessments match these filters.' : 'No assessments yet. Add your teachers, then click “Request assessment”.'}</td></tr>`;
  }

  function renderOverview() {
    if (!S.teachers.length) { $('#overview').innerHTML = '<p class="empty">No teachers yet. <button class="link" id="addT">Add your department</button></p>'; $('#addT').onclick = manageTeachers; return; }
    $('#overview').innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Teacher</th><th class="num">Open</th><th class="num">To review</th><th class="num">Approved</th><th></th></tr></thead><tbody>
      ${S.teachers.map(t => {
        const mine = S.assessments.filter(a => a.teacherId === t.id);
        const open = mine.filter(a => a.status === 'requested' || a.status === 'revision');
        const overdue = mine.filter(isOverdue).length;
        return `<tr><td><strong>${esc(t.name)}</strong><div>${(t.courses || []).map(c => courseTag(App.course(c))).join(' ')}</div></td>
          <td class="num">${open.length}${overdue ? ` <span class="overdue-text small">(${overdue} late)</span>` : ''}</td>
          <td class="num">${mine.filter(a => a.status === 'submitted' || a.status === 'in-review').length}</td>
          <td class="num">${mine.filter(a => a.status === 'approved').length}</td>
          <td class="nowrap"><button class="btn btn-sm btn-ghost" data-remind="${t.id}" ${open.length ? '' : 'disabled'}>Copy reminder</button></td></tr>`;
      }).join('')}</tbody></table></div>`;
  }

  function renderCalendar() {
    const start = weekStart(today);
    const weeks = Array.from({ length: 8 }, (_, i) => addDays(start, i * 7));
    const html = weeks.map(w => {
      const end = addDays(w, 6);
      const items = S.assessments.filter(a => a.date && a.date >= w && a.date <= end).sort((a, b) => a.date.localeCompare(b.date));
      if (!items.length) return '';
      const clashes = S.courses.filter(c => items.filter(a => a.courseId === c.id && a.type === 'summative').length > 1);
      return `<div class="week-block"><h4>Week of ${esc(fmtDate(w, { day: 'numeric', month: 'short' }))} ${clashes.length ? `<span class="clash">· clash: ${esc(clashes.map(c => c.short).join(', '))}</span>` : ''}</h4>
        ${items.map(a => `<div class="agenda-item"><span class="agenda-kind">${esc(fmtDate(a.date, { weekday: 'short', day: 'numeric' }))}</span>${courseTag(App.course(a.courseId))}
          <span style="flex:1">${esc(a.title)} <span class="muted small">· ${a.type}</span></span>${statusBadge(A_STATUS, a.status)}</div>`).join('')}</div>`;
    }).join('');
    $('#calendar').innerHTML = html || '<p class="empty">No assessment dates in the next 8 weeks.</p>';
  }

  function render() { fillFilters(); renderStatusBar(); renderRows(); renderOverview(); renderCalendar(); renderSidebar(); }

  /* ---------- links & messages ---------- */
  function submissionLink(a) {
    const t = App.teacher(a.teacherId);
    const p = new URLSearchParams({ req: a.code, title: a.title, course: a.courseId, type: a.type });
    if (t) { p.set('teacher', t.name); if (t.email) p.set('email', t.email); }
    if (a.deadline) p.set('due', a.deadline);
    if (a.unit) p.set('unit', a.unit);
    if (a.criteria?.length) p.set('criteria', a.criteria.join(''));
    return new URL(`submit.html?${p}`, location.href).href;
  }
  function reminderText(t) {
    const open = S.assessments.filter(a => a.teacherId === t.id && (a.status === 'requested' || a.status === 'revision'));
    const first = t.name.split(' ')[0];
    return `Hi ${first},\n\nA quick reminder about the assessment drafts I still need from you:\n\n` +
      open.map(a => `• ${a.title} (${App.course(a.courseId)?.short || ''}, ${a.type})${a.deadline ? ` — due ${fmtDate(a.deadline, { day: 'numeric', month: 'long' })}${isOverdue(a) ? ' (overdue)' : ''}` : ''}` +
        `${a.status === 'revision' ? '\n  Revision requested: ' + (a.feedback || 'see my comments') : ''}\n  Submit here: ${submissionLink(a)}`).join('\n\n') +
      `\n\nThank you!\n${S.profile.name || ''}`;
  }
  function feedbackText(a) {
    const t = App.teacher(a.teacherId);
    const verdict = a.status === 'approved' ? 'is approved — thank you!' : a.status === 'revision' ? 'needs a few changes before it can be approved:' : 'has been reviewed. My comments:';
    return `Hi ${(t?.name || '').split(' ')[0]},\n\nYour ${a.type} assessment “${a.title}” (${App.course(a.courseId)?.short || ''}) ${verdict}\n\n${a.feedback || ''}` +
      `${a.status === 'revision' ? `\n\nPlease resubmit using this link: ${submissionLink(a)}` : ''}\n\n${S.profile.name || ''}`;
  }

  /* ---------- detail / review ---------- */
  function openDetail(orig) {
    const a = JSON.parse(JSON.stringify(orig));
    let status = a.status;
    const opt = (v, label, sel) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(label)}</option>`;
    const checks = checksFor(App.course(a.courseId));
    const body = `<div class="review-grid">
      <div class="form-grid">
        <label class="span-2">Title<input data-f="title" value="${esc(a.title)}"></label>
        <label>Teacher<select data-f="teacherId">${opt('', '—', a.teacherId)}${S.teachers.map(t => opt(t.id, t.name, a.teacherId)).join('')}</select></label>
        <label>Course<select data-f="courseId">${courseOptions(a.courseId)}</select></label>
        <label>Type<select data-f="type">${opt('formative', 'Formative', a.type)}${opt('summative', 'Summative', a.type)}</select></label>
        <label>Unit<input data-f="unit" value="${esc(a.unit)}"></label>
        <div class="span-2" data-crit-wrap></div>
        <label>Draft due to me<input type="date" data-f="deadline" value="${esc(a.deadline)}"></label>
        <label>Students sit it on<input type="date" data-f="date" value="${esc(a.date)}"></label>
        <label>Duration<input data-f="duration" value="${esc(a.duration)}" placeholder="e.g. 45 min"></label>
        <label>Total marks<input data-f="marks" value="${esc(a.marks)}"></label>
        <label class="span-2">Assessment document link<input data-f="link" value="${esc(a.link)}" placeholder="https://…"></label>
        <label class="span-2">Mark scheme / rubric link<input data-f="markschemeLink" value="${esc(a.markschemeLink)}" placeholder="https://…"></label>
        <label class="span-2">Notes<textarea data-f="notes" rows="2">${esc(a.notes)}</textarea></label>
        <div class="span-2 small">${[a.link, a.markschemeLink].filter(Boolean).map(l => /^https?:\/\//.test(l) ? `<a href="${esc(l)}" target="_blank" rel="noopener">Open ${l === a.link ? 'assessment' : 'mark scheme'} ↗</a>` : '').join(' · ')}</div>
      </div>
      <div class="stack" style="gap:.9rem">
        <div><label style="margin-bottom:.35rem">Status</label><div class="status-buttons">${Object.entries(A_STATUS).map(([k, v]) => `<button type="button" class="btn btn-sm ${k === status ? 'active' : ''}" data-status="${k}">${v.label}</button>`).join('')}</div></div>
        <div><label style="margin-bottom:.35rem">Review checklist</label><ul class="checklist">${checks.map((c, i) => `<li><label><input type="checkbox" data-check="${i}" ${a.checklist?.[c] ? 'checked' : ''}> ${esc(c)}</label></li>`).join('')}</ul></div>
        ${a.selfCheck?.length ? `<div class="small"><label>Teacher’s self-check</label><div class="muted">${a.selfCheck.map(esc).join(' · ')}</div></div>` : ''}
        <label>Feedback to teacher<textarea data-feedback rows="4" placeholder="Strengths, required changes, suggestions…">${esc(a.feedback)}</textarea></label>
        <div><label>History</label><ul class="log">${(a.log || []).slice().reverse().map(l => `<li>${esc(fmtDate(l.at, { day: 'numeric', month: 'short' }))} — ${esc(l.text)}</li>`).join('') || '<li>—</li>'}</ul></div>
        <p class="muted small" style="margin:0">Request code: <strong>${esc(a.code)}</strong></p>
      </div></div>`;

    const collect = dlg => {
      $$('[data-f]', dlg).forEach(el => { a[el.dataset.f] = el.value.trim(); });
      a.criteria = $$('[data-crit-wrap] input:checked', dlg).map(i => i.value);
      a.feedback = $('[data-feedback]', dlg).value.trim();
      a.checklist = {};
      $$('[data-check]', dlg).forEach(cb => { if (cb.checked) a.checklist[checks[cb.dataset.check]] = true; });
      if (status !== a.status) { log(a, `Status → ${A_STATUS[status].label}`); a.status = status; }
    };
    const commit = () => { S.assessments = S.assessments.map(x => x.id === a.id ? a : x); App.save(); render(); };

    openModal({
      title: 'Review assessment', wide: true, body,
      actions: [
        { label: 'Delete', cls: 'btn-danger-ghost', onClick: () => { confirmModal(`Delete “${a.title}”?`, () => { S.assessments = S.assessments.filter(x => x.id !== a.id); App.save(); render(); }); } },
        { label: 'Copy request link', cls: 'btn-ghost', onClick: dlg => { collect(dlg); copyText(submissionLink(a)); return false; } },
        { label: 'Copy feedback message', cls: 'btn-ghost', onClick: dlg => { collect(dlg); copyText(feedbackText(a)); return false; } },
        'spacer',
        { label: 'Cancel', cls: 'btn-ghost' },
        { label: 'Save', cls: 'btn-primary', onClick: dlg => { collect(dlg); if (!a.title) { toast('Title is required', 'error'); return false; } commit(); toast('Saved', 'success'); } },
      ],
      onOpen: dlg => {
        const drawCrit = () => {
          const c = App.course($('[data-f=courseId]', dlg).value);
          $('[data-crit-wrap]', dlg).innerHTML = c?.framework === 'MYP' ? `<label style="margin-bottom:.3rem">Criteria assessed</label><div class="chip-group">${Object.entries(MYP.criteria).map(([k, v]) =>
            `<label class="chip-check"><input type="checkbox" value="${k}" ${a.criteria?.includes(k) ? 'checked' : ''}> ${k} · ${esc(v)}</label>`).join('')}</div>` : '';
        };
        drawCrit();
        $('[data-f=courseId]', dlg).addEventListener('change', drawCrit);
        $$('[data-status]', dlg).forEach(b => b.onclick = () => {
          status = b.dataset.status;
          $$('[data-status]', dlg).forEach(x => x.classList.toggle('active', x === b));
        });
      },
    });
  }

  function newRequest() {
    if (!S.teachers.length) { toast('Add your teachers first', 'error'); manageTeachers(); return; }
    const opt = (v, label) => `<option value="${esc(v)}">${esc(label)}</option>`;
    openModal({
      title: 'Request an assessment', wide: true,
      body: `<div class="form-grid">
        <label class="span-2">Title<input data-f="title" placeholder="e.g. Unit 2 summative — Algebraic thinking"></label>
        <label>Course<select data-f="courseId">${courseOptions(S.courses[0]?.id)}</select></label>
        <label>Type<select data-f="type">${opt('summative', 'Summative')}${opt('formative', 'Formative')}</select></label>
        <label class="span-2">Unit<select data-f="unit"></select></label>
        <div class="span-2" data-crit-wrap></div>
        <label>Draft due to me<input type="date" data-f="deadline" value="${addDays(today, 7)}"></label>
        <label>Students sit it on<input type="date" data-f="date"></label>
        <div class="span-2"><label style="margin-bottom:.35rem">Request from</label><div class="chip-group" data-teachers>${S.teachers.map(t => `<label class="chip-check"><input type="checkbox" value="${t.id}"> ${esc(t.name)}</label>`).join('')}</div>
          <p class="muted small" style="margin:.35rem 0 0">One request is created for each teacher you tick.</p></div>
        <label class="span-2">Notes / expectations<textarea data-f="notes" rows="2" placeholder="Format, length, which criteria, template to use…"></textarea></label>
      </div>`,
      actions: [{ label: 'Cancel', cls: 'btn-ghost' }, {
        label: 'Create request(s)', cls: 'btn-primary', onClick: dlg => {
          const f = {}; $$('[data-f]', dlg).forEach(el => { f[el.dataset.f] = el.value.trim(); });
          const teachers = $$('[data-teachers] input:checked', dlg).map(i => i.value);
          if (!f.title) { toast('Title is required', 'error'); return false; }
          if (!teachers.length) { toast('Choose at least one teacher', 'error'); return false; }
          const criteria = $$('[data-crit-wrap] input:checked', dlg).map(i => i.value);
          teachers.forEach(tid => S.assessments.push({
            id: uid('A'), code: newReqCode(), ...f, criteria, teacherId: tid, duration: '', marks: '', link: '', markschemeLink: '',
            status: 'requested', checklist: {}, feedback: '', log: [{ at: today, text: 'Request created' }], createdAt: today,
          }));
          App.save(); render();
          toast(`${teachers.length} request(s) created — use “Copy reminder” to send the links`, 'success');
        },
      }],
      onOpen: dlg => {
        const sync = () => {
          const c = App.course($('[data-f=courseId]', dlg).value);
          $('[data-f=unit]', dlg).innerHTML = '<option value="">—</option>' + (c?.units || []).map(u => `<option>${esc(u.title)}</option>`).join('');
          $('[data-crit-wrap]', dlg).innerHTML = c?.framework === 'MYP' ? `<label style="margin-bottom:.3rem">Criteria to assess</label><div class="chip-group">${Object.entries(MYP.criteria).map(([k, v]) => `<label class="chip-check"><input type="checkbox" value="${k}"> ${k} · ${esc(v)}</label>`).join('')}</div>` : '';
          $$('[data-teachers] input', dlg).forEach(i => { i.checked = (App.teacher(i.value)?.courses || []).includes(c?.id); });
        };
        $('[data-f=courseId]', dlg).addEventListener('change', sync);
        sync();
        $('[data-f=title]', dlg).focus();
      },
    });
  }

  function manageTeachers() {
    const draw = dlg => {
      $('[data-list]', dlg).innerHTML = S.teachers.map(t => `<div class="row-item" data-tid="${t.id}">
        <input data-k="name" value="${esc(t.name)}" aria-label="Name"><input data-k="email" value="${esc(t.email || '')}" placeholder="email" aria-label="Email">
        <div class="chip-group" style="flex-basis:100%">${S.courses.map(c => `<label class="chip-check"><input type="checkbox" data-c="${c.id}" ${(t.courses || []).includes(c.id) ? 'checked' : ''}> ${esc(c.short)}</label>`).join('')}
        <button class="btn btn-sm btn-danger-ghost" data-rm="${t.id}">Remove</button></div></div><div class="divider" style="margin:.4rem 0"></div>`).join('') || '<p class="muted">No teachers yet.</p>';
    };
    const sync = dlg => $$('[data-tid]', dlg).forEach(row => {
      const t = App.teacher(row.dataset.tid);
      t.name = $('[data-k=name]', row).value.trim() || t.name;
      t.email = $('[data-k=email]', row).value.trim();
      t.courses = $$('[data-c]:checked', row).map(i => i.dataset.c);
    });
    openModal({
      title: 'Department teachers', wide: true,
      body: `<div data-list class="row-list"></div>
        <form class="form-row" data-add style="margin-top:.8rem"><input name="name" placeholder="Full name"><input name="email" placeholder="Email (optional)"><button class="btn btn-soft" type="submit" style="flex:0">Add teacher</button></form>`,
      actions: [{ label: 'Done', cls: 'btn-primary', onClick: dlg => { sync(dlg); App.save(); render(); } }],
      onOpen: dlg => {
        draw(dlg);
        $('[data-add]', dlg).addEventListener('submit', e => {
          e.preventDefault(); sync(dlg);
          const name = e.target.name.value.trim();
          if (!name) return;
          S.teachers.push({ id: uid('tch'), name, email: e.target.email.value.trim(), courses: [] });
          App.save(); e.target.reset(); draw(dlg); e.target.name.focus();
        });
        $('[data-list]', dlg).addEventListener('click', e => {
          const rm = e.target.closest('[data-rm]');
          if (!rm) return;
          const n = S.assessments.filter(a => a.teacherId === rm.dataset.rm).length;
          if (n && !rm.dataset.sure) { rm.dataset.sure = '1'; rm.textContent = `Remove (has ${n} assessments)?`; return; }
          sync(dlg);
          S.teachers = S.teachers.filter(t => t.id !== rm.dataset.rm);
          App.save(); draw(dlg);
        });
      },
    });
  }

  /* ---------- import submission files ---------- */
  async function importFiles(files) {
    let ok = 0, created = 0, bad = 0;
    for (const file of files) {
      let d;
      try { d = JSON.parse(await readFileText(file)); } catch (e) { bad++; continue; }
      if (!d || d.kind !== 'mathhub-submission' || !d.assessment) { bad++; continue; }
      const name = (d.teacher?.name || '').trim(), email = (d.teacher?.email || '').trim().toLowerCase();
      let t = S.teachers.find(x => (email && x.email?.toLowerCase() === email) || x.name.toLowerCase() === name.toLowerCase());
      if (!t && name) { t = { id: uid('tch'), name, email: d.teacher.email || '', courses: d.assessment.courseId ? [d.assessment.courseId] : [] }; S.teachers.push(t); }
      const src = d.assessment;
      let a = d.requestCode && S.assessments.find(x => x.code === d.requestCode.trim().toUpperCase());
      if (!a) a = S.assessments.find(x => t && x.teacherId === t.id && x.title.toLowerCase() === (src.title || '').toLowerCase());
      if (!a) {
        a = { id: uid('A'), code: newReqCode(), status: 'requested', checklist: {}, feedback: '', log: [], createdAt: today, deadline: '' };
        S.assessments.push(a); created++;
      }
      const resubmit = a.status === 'revision' || a.status === 'approved';
      Object.assign(a, {
        title: src.title || a.title, type: src.type || a.type || 'formative', courseId: src.courseId || a.courseId, unit: src.unit ?? a.unit,
        criteria: src.criteria || a.criteria || [], date: src.date || a.date || '', duration: src.duration || '', marks: src.marks || '',
        link: src.link || '', markschemeLink: src.markschemeLink || '', notes: src.notes || '', selfCheck: d.selfCheck || [],
        teacherId: t ? t.id : a.teacherId, status: 'submitted',
      });
      log(a, `${resubmit ? 'Resubmitted' : 'Submitted'} by ${name || 'teacher'} (${fmtDate(String(d.submittedAt || today).slice(0, 10), { day: 'numeric', month: 'short' })})`);
      ok++;
    }
    App.save(); render();
    toast(`${ok} submission(s) imported${created ? `, ${created} new` : ''}${bad ? ` · ${bad} file(s) not recognised` : ''}`, bad && !ok ? 'error' : 'success');
  }

  /* ---------- events ---------- */
  $('#rows').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (tr) openDetail(S.assessments.find(a => a.id === tr.dataset.id)); });
  $('#rows').addEventListener('keydown', e => { const tr = e.target.closest('tr[data-id]'); if (tr && e.key === 'Enter') openDetail(S.assessments.find(a => a.id === tr.dataset.id)); });
  $('#overview').addEventListener('click', e => { const b = e.target.closest('[data-remind]'); if (b) copyText(reminderText(App.teacher(b.dataset.remind))); });
  ['#q', '#fTeacher', '#fCourse', '#fType'].forEach(s => $(s).addEventListener('input', renderRows));
  $('#newReq').onclick = newRequest;
  $('#teachersBtn').onclick = manageTeachers;
  $('#importBtn').onclick = () => $('#importFile').click();
  $('#importFile').addEventListener('change', e => { if (e.target.files.length) importFiles([...e.target.files]); e.target.value = ''; });

  render();
  const openId = new URLSearchParams(location.search).get('open');
  if (openId) { const a = S.assessments.find(x => x.id === openId); if (a) openDetail(a); }
})();
