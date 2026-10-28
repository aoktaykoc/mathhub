(() => {
  const S = App.state;
  ensureCurricula();
  const today = isoDate();
  let statusFilter = '';

  const teacherName = id => App.teacher(id)?.name || '—';
  // Curriculum levels a teacher teaches (keys like "myp9|Extended"), as small tags
  const curriculumTags = t => (t.curricula || []).map(k => levelLabel(k)).filter(Boolean).map(l => `<span class="badge tone-neutral curric-tag">${esc(l)}</span>`).join(' ');
  // Does the teacher teach this course, directly or through a curriculum linked to it?
  const teaches = (t, courseId) => (t.courses || []).includes(courseId) || (t.curricula || []).some(k => { const p = parseLevel(k); return courseForCurriculum(p.cid, p.track) === courseId; });
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
      && (!q || `${a.title} ${a.group || ''} ${a.toddle || ''} ${a.unit} ${a.code} ${teacherName(a.teacherId)}`.toLowerCase().includes(q)))
      .sort((a, b) => {
        const rank = { submitted: 0, 'in-review': 1, revision: 2, requested: 3, approved: 4 };
        const byDate = (a.date || '9999').localeCompare(b.date || '9999') || (a.deadline || '9999').localeCompare(b.deadline || '9999');
        const sort = $('#sortBy').value;
        if (sort === 'group') return groupOf(a).localeCompare(groupOf(b), undefined, { numeric: true }) || byDate;
        if (sort === 'teacher') return (a.teacherId ? teacherName(a.teacherId) : '~').localeCompare(b.teacherId ? teacherName(b.teacherId) : '~') || byDate;
        if (sort === 'status') return (rank[a.status] - rank[b.status]) || (a.deadline || '9999').localeCompare(b.deadline || '9999');
        return byDate;
      });
  }
  // "Grade 12 · AI SL" for calendar items; the course name for the others
  const groupOf = a => a.group || App.course(a.courseId)?.short || 'No course';

  function renderStatusBar() {
    const counts = { '': S.assessments.length, overdue: S.assessments.filter(isOverdue).length };
    Object.keys(A_STATUS).forEach(k => { counts[k] = S.assessments.filter(a => a.status === k).length; });
    const pills = [['', 'All'], ...Object.entries(A_STATUS).map(([k, v]) => [k, v.label]), ['overdue', 'Overdue']];
    $('#statusBar').innerHTML = pills.map(([k, label]) => `<button class="status-pill ${statusFilter === k ? 'active' : ''}" data-s="${k}">
      <strong ${k === 'overdue' && counts[k] ? 'class="overdue-text"' : ''}>${counts[k]}</strong><span>${label}</span></button>`).join('');
    $$('#statusBar .status-pill').forEach(b => b.onclick = () => { statusFilter = b.dataset.s; render(); });
  }

  function renderRows() {
    const list = filtered(), sort = $('#sortBy').value;
    // sorted by group or teacher: a heading row starts each block
    const blockOf = a => sort === 'group' ? groupOf(a) : sort === 'teacher' ? (a.teacherId ? teacherName(a.teacherId) : 'Unassigned') : '';
    const day = iso => esc(fmtDate(iso, { weekday: 'short', day: 'numeric', month: 'short' }));
    let block = null;
    $('#rows').innerHTML = list.map(a => {
      const b = blockOf(a), head = b && b !== block ? `<tr class="block-row"><th colspan="8">${esc(b)} <span class="muted small">· ${list.filter(x => blockOf(x) === b).length}</span></th></tr>` : '';
      block = b;
      return `${head}<tr class="clickable" data-id="${a.id}" tabindex="0">
      <td class="nowrap"><strong>${esc(groupOf(a))}</strong>${a.group ? `<div>${courseTag(App.course(a.courseId))}</div>` : ''}</td>
      <td><strong>${esc(a.title)}</strong><div class="muted small">${esc(a.code)}${a.unit ? ` · ${esc(a.unit)}` : ''}${a.criteria?.length ? ` · Crit ${esc(a.criteria.join(', '))}` : ''}</div></td>
      <td class="nowrap">${a.teacherId ? esc(teacherName(a.teacherId)) : '<span class="muted">Unassigned</span>'}</td>
      <td>${a.type === 'summative' ? badge('Summative', 'warning') : badge('Formative', 'info')}</td>
      <td class="nowrap ${isOverdue(a) ? 'overdue-text' : ''}">${a.deadline ? day(a.deadline) : '—'}${isOverdue(a) ? '<div class="small">overdue</div>' : ''}</td>
      <td class="nowrap">${a.date ? day(a.date) : '<span class="muted">no date</span>'}${a.dateNote ? `<div class="small muted">${esc(a.dateNote)}</div>` : ''}</td>
      <td>${statusBadge(A_STATUS, a.status)}</td>
      <td>${a.toddle ? `<button class="toddle-copy" data-copy="${esc(a.toddle)}" title="Copy the Toddle name">${esc(a.toddle).replace(/_/g, "_<wbr>")}</button>` : '<span class="muted">—</span>'}</td></tr>`;
    }).join('') ||
      `<tr><td colspan="8" class="empty">${S.assessments.length ? 'No assessments match these filters.' : 'No assessments yet. Add your teachers, then click “Request assessment”.'}</td></tr>`;
  }

  function renderOverview() {
    if (!S.teachers.length) { $('#overview').innerHTML = '<p class="empty">No teachers yet. <button class="link" id="addT">Add your department</button></p>'; $('#addT').onclick = manageTeachers; return; }
    $('#overview').innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>Teacher</th><th class="num">Open</th><th class="num">To review</th><th class="num">Approved</th><th></th></tr></thead><tbody>
      ${S.teachers.map(t => {
        const mine = S.assessments.filter(a => a.teacherId === t.id);
        const open = mine.filter(a => a.status === 'requested' || a.status === 'revision');
        const overdue = mine.filter(isOverdue).length;
        return `<tr><td><strong>${esc(t.name)}</strong><div>${(t.courses || []).map(c => courseTag(App.course(c))).join(' ')}</div>${t.curricula?.length ? `<div class="curric-tags">${curriculumTags(t)}</div>` : ''}</td>
          <td class="num">${open.length}${overdue ? ` <span class="overdue-text small">(${overdue} late)</span>` : ''}</td>
          <td class="num">${mine.filter(a => a.status === 'submitted' || a.status === 'in-review').length}</td>
          <td class="num">${mine.filter(a => a.status === 'approved').length}</td>
          <td class="nowrap"><button class="btn btn-sm btn-ghost" data-remind="${t.id}" ${open.length ? '' : 'disabled'}>Copy reminder</button></td></tr>`;
      }).join('')}</tbody></table></div>`;
  }

  // Week by week: when students sit each assessment, and when its draft is due. Range: next 8 weeks / this term / all.
  function renderCalendar() {
    const range = $('#calRange').value;
    const start = range === 'all' ? weekStart([...S.assessments.flatMap(a => [a.date, a.deadline]).filter(Boolean), today].sort()[0]) : weekStart(today);
    const last = [...S.assessments.flatMap(a => [a.date, a.deadline]).filter(Boolean)].sort().pop() || today;
    const termEnd = (() => { const [y, m] = today.split('-').map(Number); return m >= 8 ? `${y}-12-31` : m <= 3 ? `${y}-03-31` : `${y}-07-31`; })();
    const end = range === '8' ? addDays(start, 55) : range === 'term' ? termEnd : last;
    const events = S.assessments.flatMap(a => [a.date && { a, day: a.date, kind: 'sit' }, a.deadline && a.status !== 'approved' && { a, day: a.deadline, kind: 'due' }].filter(Boolean))
      .filter(e => e.day >= start && e.day <= end).sort((x, y) => x.day.localeCompare(y.day) || (x.kind === 'due' ? -1 : 1));
    const weeks = [...new Set(events.map(e => weekStart(e.day)))];
    const html = weeks.map(w => {
      const items = events.filter(e => weekStart(e.day) === w);
      const sits = items.filter(e => e.kind === 'sit');
      // two summatives for the same group (or course, when there is no group) in one week
      const keyOf = a => a.group || App.course(a.courseId)?.short || '';
      const clashes = [...new Set(sits.map(e => keyOf(e.a)).filter(k => k && sits.filter(e => keyOf(e.a) === k && e.a.type === 'summative').length > 1))];
      return `<div class="week-block ${w === weekStart(today) ? 'this-week' : ''}"><h4>Week of ${esc(fmtDate(w, { day: 'numeric', month: 'short' }))}${w === weekStart(today) ? ' <span class="badge tone-info">this week</span>' : ''} ${clashes.length ? `<span class="clash">· clash: ${esc(clashes.join(', '))}</span>` : ''}</h4>
        ${items.map(({ a, day, kind }) => `<div class="agenda-item cal-${kind} ${kind === 'due' && isOverdue(a) ? 'late' : ''}" data-open-a="${a.id}"><span class="agenda-kind">${esc(fmtDate(day, { weekday: 'short', day: 'numeric' }))}</span>
          <span class="cal-kind">${kind === 'sit' ? 'Sit' : 'Draft due'}</span>${courseTag(App.course(a.courseId))}
          <span style="flex:1">${esc(a.group ? `${a.group} — ${a.title}` : a.title)}${a.teacherId ? ` <span class="muted small">· ${esc(teacherName(a.teacherId))}</span>` : ''}</span>${statusBadge(A_STATUS, a.status)}</div>`).join('')}</div>`;
    }).join('');
    $('#calendar').innerHTML = html || `<p class="empty">No assessment dates ${range === '8' ? 'in the next 8 weeks' : range === 'term' ? 'left this term' : 'yet'}.</p>`;
  }
  $('#calendar').addEventListener('click', e => { const it = e.target.closest('[data-open-a]'); if (it) openDetail(S.assessments.find(a => a.id === it.dataset.openA)); });

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
        <label>Group / class<input data-f="group" value="${esc(a.group || '')}" placeholder="e.g. Grade 12 · AI SL"></label>
        <label>Toddle name<span class="form-row" style="gap:.3rem"><input data-f="toddle" value="${esc(a.toddle || '')}" placeholder="Math_AI_SL_Summative_High_G12"><button type="button" class="btn btn-sm btn-ghost" data-copy-toddle style="flex:0">Copy</button></span></label>
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
        $('[data-copy-toddle]', dlg).onclick = () => copyText($('[data-f=toddle]', dlg).value);
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
          $$('[data-teachers] input', dlg).forEach(i => { const t = App.teacher(i.value); i.checked = !!(t && c && teaches(t, c.id)); });
        };
        $('[data-f=courseId]', dlg).addEventListener('change', sync);
        sync();
        $('[data-f=title]', dlg).focus();
      },
    });
  }

  function manageTeachers() {
    // curriculum levels from the Curriculum library, grouped by curriculum: "MYP 9: Standard · Extended"
    const levels = curriculumLevels();
    const curricPicker = t => {
      const byCurr = new Map();
      levels.forEach(l => { if (!byCurr.has(l.cid)) byCurr.set(l.cid, []); byCurr.get(l.cid).push(l); });
      return [...byCurr.values()].map(ls => `<span class="curric-group"><span class="curric-name">${esc(ls[0].c.short)}</span>${ls.map(l =>
        `<label class="chip-check"><input type="checkbox" data-cur="${esc(l.key)}" ${(t.curricula || []).includes(l.key) ? 'checked' : ''}> ${esc(l.track || 'All')}</label>`).join('')}</span>`).join('');
    };
    const draw = dlg => {
      $('[data-list]', dlg).innerHTML = S.teachers.map(t => `<div class="row-item" data-tid="${t.id}">
        <input data-k="name" value="${esc(t.name)}" aria-label="Name"><input data-k="email" value="${esc(t.email || '')}" placeholder="email" aria-label="Email">
        <div class="teacher-field"><span class="small muted">Courses</span><div class="chip-group">${S.courses.map(c => `<label class="chip-check"><input type="checkbox" data-c="${c.id}" ${(t.courses || []).includes(c.id) ? 'checked' : ''}> ${esc(c.short)}</label>`).join('')}</div></div>
        <div class="teacher-field"><span class="small muted">Curricula</span><div class="chip-group">${curricPicker(t) || '<span class="small muted">No curricula yet — add them in the <a href="curriculum.html">Curriculum library</a>.</span>'}</div></div>
        <div style="flex-basis:100%;text-align:right"><button class="btn btn-sm btn-danger-ghost" data-rm="${t.id}">Remove</button></div></div><div class="divider" style="margin:.4rem 0"></div>`).join('') || '<p class="muted">No teachers yet.</p>';
    };
    const sync = dlg => $$('[data-tid]', dlg).forEach(row => {
      const t = App.teacher(row.dataset.tid);
      t.name = $('[data-k=name]', row).value.trim() || t.name;
      t.email = $('[data-k=email]', row).value.trim();
      t.courses = $$('[data-c]:checked', row).map(i => i.dataset.c);
      t.curricula = $$('[data-cur]:checked', row).map(i => i.dataset.cur);
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
          S.teachers.push({ id: uid('tch'), name, email: e.target.email.value.trim(), courses: [], curricula: [] });
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

  /* ---------- import an assessment calendar (.xlsx from the school, e.g. Assessment_Calendar.xlsx) ----------
     Each table has a header row with "Assessment Date" and "Submission Deadline". MYP rows: Course
     ("Grade 9 Extended") + Assessment ("Criteria C & D"); DP rows: Grade ("Grade 12") + Course ("AI SL"). */
  const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load the spreadsheet reader (check the internet connection)')); document.head.appendChild(s); });
  async function readXlsx(file) {
    if (typeof JSZip === 'undefined') await loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.2/dist/jszip.min.js');
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const xml = async p => new DOMParser().parseFromString(await zip.file(p).async('string'), 'application/xml');
    const text = el => [...el.getElementsByTagName('t')].map(t => t.textContent).join('');
    const strings = zip.file('xl/sharedStrings.xml') ? [...(await xml('xl/sharedStrings.xml')).getElementsByTagName('si')].map(text) : [];
    const first = Object.keys(zip.files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
    const colIdx = ref => ref.replace(/\d+/g, '').split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
    // rows by their real number: Excel leaves empty rows out of the file, and an empty row ends a table
    const rows = [];
    [...(await xml(first)).getElementsByTagName('row')].forEach(row => {
      const cells = [];
      [...row.getElementsByTagName('c')].forEach(c => {
        const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0]?.textContent ?? '';
        cells[colIdx(c.getAttribute('r'))] = t === 's' ? strings[Number(v)] ?? '' : t === 'inlineStr' ? text(c) : t === 'str' || t === 'b' ? v : v === '' ? '' : Number(v);
      });
      rows[Number(row.getAttribute('r')) - 1] = cells;
    });
    return Array.from(rows, r => r || []);
  }
  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  // Excel serial number or text ("27–28 September", "7 Oct 2026") → { iso, note }
  function cellDate(v, nearYear) {
    if (typeof v === 'number' && v > 20000) return { iso: new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10), note: '' };
    const s = String(v ?? '').trim();
    if (!s || /^[—–-]+$/.test(s)) return { iso: '', note: '' };
    const m = s.match(/(\d{1,2})\s*(?:[–-]\s*\d{1,2}\s*)?([A-Za-z]{3,})\.?\s*(\d{4})?/);
    const mi = m ? MONTHS.findIndex(x => x.startsWith(m[2].toLowerCase().slice(0, 3))) : -1;
    if (mi < 0) return { iso: '', note: s };
    const y = Number(m[3]) || nearYear || new Date().getFullYear();
    return { iso: `${y}-${String(mi + 1).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`, note: s };
  }
  function parseCalendar(rows) {
    const items = [];
    const cellText = v => String(v ?? '').trim();
    rows.forEach((row, r) => {
      const heads = (row || []).map(v => cellText(v).toLowerCase());
      const dateCol = heads.findIndex(h => /assessment date|exam date|test date/.test(h));
      if (dateCol < 0) return;
      const col = re => heads.findIndex(h => re.test(h));
      const deadlineCol = col(/deadline|submission|due/), courseCol = col(/^course/), gradeCol = col(/^grade/), whatCol = col(/^(assessment|task|title)$/), teacherCol = col(/^teachers?$/);
      const section = cellText((rows[r - 1] || []).find(v => cellText(v)));
      for (let i = r + 1; i < rows.length; i++) {
        const cells = rows[i] || [];
        const course = cellText(cells[courseCol]), gradeText = gradeCol >= 0 ? cellText(cells[gradeCol]) : '';
        if (!course && !gradeText) break; // end of this table
        const deadline = cellDate(cells[deadlineCol]);
        const date = cellDate(cells[dateCol], deadline.iso ? Number(deadline.iso.slice(0, 4)) : undefined);
        const grade = Number(((gradeText || course).match(/grade\s*(\d{1,2})/i) || [])[1]) || null;
        if (!grade && !date.iso && !deadline.iso) break; // a note under the table, not an assessment
        const dp = course.match(/\b(AA|AI)\b\s*(SL|HL)\b/i);
        const level = dp ? dp[2].toUpperCase() : ((course.match(/\b(standard|extended)\b/i) || [])[1] || '').replace(/^./, ch => ch.toUpperCase());
        const what = whatCol >= 0 ? cellText(cells[whatCol]) : '';
        items.push({ row: i + 1, section, grade, level, dp: dp ? dp[1].toUpperCase() : '', course, what, teacher: teacherCol >= 0 ? cellText(cells[teacherCol]) : '', criteria: /criteri/i.test(what) ? [...new Set(what.replace(/criteri(a|on)/gi, '').match(/\b[A-D]\b/g) || [])] : [],
          date: date.iso, dateNote: date.note, deadline: deadline.iso });
      }
    });
    return items;
  }
  // a calendar row → the assessment it becomes (course, title, group, Toddle name, suggested teacher)
  function calendarAssessment(it) {
    const courseId = it.dp ? courseForCurriculum(it.dp === 'AA' ? 'dp-aa' : 'dp-ai', it.level) : (it.grade && (courseForCurriculum(`myp${it.grade}`, it.level) || (App.course(`myp${it.grade}`) ? `myp${it.grade}` : '')));
    const group = it.dp ? `Grade ${it.grade} · ${it.dp} ${it.level}` : `Grade ${it.grade}${it.level ? ` ${it.level}` : ''}`;
    const title = it.what || (it.dp ? `${it.dp} ${it.level} summative` : 'Summative assessment');
    const toddle = it.dp ? `Math_${it.dp}_${it.level}_Summative_High_G${it.grade}` : `Math${it.level || ''}_Summative_High_G${it.grade}`;
    const candidates = S.teachers.filter(t => courseId && teaches(t, courseId));
    // prefer a teacher whose curricula name this exact level (e.g. MYP 9 Extended)
    const exact = candidates.filter(t => (t.curricula || []).some(k => { const p = parseLevel(k); return p.track === it.level && courseForCurriculum(p.cid, p.track) === courseId; }));
    const teacherId = (exact.length === 1 ? exact[0] : candidates.length === 1 ? candidates[0] : null)?.id || '';
    return { courseId, group, title, toddle, teacherId, criteria: it.criteria, date: it.date, dateNote: it.dateNote, deadline: it.deadline, type: 'summative', source: 'calendar' };
  }
  // Teacher names in a calendar are informal ("Corey", "nigar michael"): match them to the department list.
  // Names chosen once are kept as aliases on the teacher, so the next import matches them directly.
  const nameWords = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ı/g, 'i').replace(/[^a-z]+/g, ' ').trim().split(' ').filter(Boolean);
  const nameKey = s => nameWords(s).join(' ');
  const titleCase = s => nameWords(s).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  function matchTeacher(name, extra = {}) {
    const w = nameWords(name);
    if (!w.length) return null;
    const names = t => [t.name, ...(t.aliases || []), ...(extra[t.id] || [])].map(nameWords);
    const exact = S.teachers.filter(t => names(t).some(n => n.join(' ') === w.join(' ')));
    if (exact.length) return exact.length === 1 ? exact[0] : null;
    // one word = first name ("Corey" → Corey Andreasen); several = same surname and initial ("nigar michael" → Nikki Michael)
    const fits = S.teachers.filter(t => names(t).some(n => w.length === 1 ? n[0] === w[0] : n.length > 1 && n.at(-1) === w.at(-1) && n[0][0] === w[0][0]));
    return fits.length === 1 ? fits[0] : null;
  }
  // A group can sit several assessments with the same title (e.g. three AI SL summatives): they are numbered by date,
  // and calKey ("Grade 12 · AI SL|AI SL summative|2") matches them again when the calendar is imported a second time.
  const sameCalendarItem = (a, x) => a.source === 'calendar' && (a.calKey ? a.calKey === x.calKey : a.group === x.group && a.title === x.title);
  function numberRepeats(list) {
    const byKey = {};
    list.forEach(x => { (byKey[`${x.group}|${x.title}`] ||= []).push(x); });
    Object.values(byKey).forEach(g => {
      g.sort((p, q) => (p.date || '9999').localeCompare(q.date || '9999'));
      g.forEach((x, i) => { x.calKey = `${x.group}|${x.title}|${i + 1}`; if (g.length > 1) x.title = `${x.title} ${i + 1}`; });
    });
    return list;
  }
  async function importCalendar(file) {
    let items;
    try { items = parseCalendar(await readXlsx(file)); } catch (e) { toast(`Could not read the spreadsheet: ${e.message}`, 'error'); return; }
    if (!items.length) { toast('No assessment table found — it needs a header row with “Assessment Date”.', 'error'); return; }
    const mapped = items.map(it => ({ it, x: calendarAssessment(it) }));
    numberRepeats(mapped.map(r => r.x));
    // teachers named in the file: key → { name, rows, choice } where choice is a teacher id, 'new' (add them) or '' (unassigned).
    // Longer names go first, so "nigar" can match through "nigar michael" once that one is matched.
    const people = new Map();
    items.forEach(it => { const k = nameKey(it.teacher); if (k) { if (!people.has(k)) people.set(k, { name: it.teacher.trim(), rows: 0, choice: 'new' }); people.get(k).rows++; } });
    const seen = {};
    [...people.values()].sort((p, q) => nameWords(q.name).length - nameWords(p.name).length).forEach(p => {
      const t = matchTeacher(p.name, seen);
      if (t) { p.choice = t.id; (seen[t.id] ||= []).push(p.name); }
    });
    const personValue = k => { const c = people.get(k)?.choice; return c === 'new' ? `new:${k}` : c || ''; };
    mapped.forEach(({ it, x }) => { const k = nameKey(it.teacher); if (k) { x.teacherKey = k; x.teacherId = personValue(k); } });
    const rows = mapped.map(({ it, x }) => ({ it, x, old: S.assessments.find(a => sameCalendarItem(a, x)) }));
    const opt = (v, label, sel) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(label)}</option>`;
    const newOpts = sel => [...people].filter(([, p]) => p.choice === 'new').map(([k, p]) => opt(`new:${k}`, `+ ${titleCase(p.name)} (new)`, sel)).join('');
    const teacherOpts = sel => `${opt('', 'Unassigned', sel)}${S.teachers.map(t => opt(t.id, t.name, sel)).join('')}${newOpts(sel)}`;
    const peopleHtml = people.size ? `<div class="cal-people"><strong class="small">Teachers in this file</strong>
      ${[...people].map(([k, p]) => `<label class="small"><span>“${esc(p.name)}” <span class="muted">· ${p.rows} row${p.rows === 1 ? '' : 's'}</span></span>
        <select data-person="${esc(k)}">${S.teachers.map(t => opt(t.id, t.name, p.choice)).join('')}${opt('new', `+ Add “${titleCase(p.name)}” as a new teacher`, p.choice)}${opt('', 'Leave unassigned', p.choice)}</select></label>`).join('')}</div>` : '';
    const d = iso => (iso ? esc(fmtDate(iso, { weekday: 'short', day: 'numeric', month: 'short' })) : '<span class="overdue-text">no date</span>');
    openModal({
      title: `Import assessment calendar — ${file.name}`, wide: true,
      body: `<p class="small muted" style="margin:0 0 .6rem">${rows.length} assessments found. Check the course and teacher for each row; untick rows you do not want. Rows already imported are updated (dates, course, teacher) — their status and review stay.</p>
        ${peopleHtml}<div class="table-wrap cal-import"><table class="table"><thead><tr><th></th><th>Group</th><th>Assessment</th><th>Draft due</th><th>Sat on</th><th>Course</th><th>Teacher</th><th>Toddle name</th></tr></thead><tbody>
        ${rows.map((r, i) => `<tr data-i="${i}"><td><input type="checkbox" data-inc ${r.x.courseId ? 'checked' : ''} aria-label="Import this row"></td>
          <td class="nowrap"><strong>${esc(r.x.group)}</strong><div class="small muted">${esc(r.it.section)} · row ${r.it.row}${r.old ? ' · <span class="badge tone-info">update</span>' : ''}</div></td>
          <td>${esc(r.x.title)}${r.x.criteria.length ? `<div class="small muted">Crit ${esc(r.x.criteria.join(', '))}</div>` : ''}</td>
          <td class="nowrap ${r.x.deadline && r.x.deadline < today ? 'overdue-text' : ''}">${r.x.deadline ? d(r.x.deadline) : '—'}</td>
          <td class="nowrap">${d(r.x.date)}${r.x.dateNote ? `<div class="small muted">“${esc(r.x.dateNote)}”</div>` : ''}</td>
          <td><select data-course>${opt('', '—', r.x.courseId)}${S.courses.map(c => opt(c.id, c.short, r.x.courseId)).join('')}</select></td>
          <td><select data-teacher>${teacherOpts(r.x.teacherId)}</select>${r.it.teacher ? `<div class="small muted">“${esc(r.it.teacher)}”</div>` : ''}</td>
          <td class="small"><code>${esc(r.x.toddle)}</code></td></tr>`).join('')}</tbody></table></div>`,
      actions: [{ label: 'Cancel', cls: 'btn-ghost' }, {
        label: 'Import', cls: 'btn-primary', onClick: dlg => {
          let added = 0, updated = 0, hired = 0;
          // "new:<name>" → a teacher created once, teaching the courses of their rows
          const created = {};
          const resolveTeacher = (v, courseId) => {
            if (!v.startsWith('new:')) return v;
            const k = v.slice(4);
            if (!created[k]) { created[k] = { id: uid('tch'), name: titleCase(people.get(k).name), email: '', courses: [], curricula: [], aliases: [] }; S.teachers.push(created[k]); hired++; }
            if (courseId && !created[k].courses.includes(courseId)) created[k].courses.push(courseId);
            return created[k].id;
          };
          // remember how the file writes each existing teacher's name ("nigar michael" for Nikki Michael)
          people.forEach((p, k) => {
            const t = App.teacher(p.choice);
            if (t && nameKey(t.name) !== k && nameWords(t.name)[0] !== k && !(t.aliases || []).some(a => nameKey(a) === k)) (t.aliases ||= []).push(p.name);
          });
          $$('tr[data-i]', dlg).forEach(tr => {
            if (!$('[data-inc]', tr).checked) return;
            const { x } = rows[tr.dataset.i];
            x.courseId = $('[data-course]', tr).value; x.teacherId = resolveTeacher($('[data-teacher]', tr).value, x.courseId);
            delete x.teacherKey;
            const a = S.assessments.find(y => sameCalendarItem(y, x));
            if (a) {
              const changed = [a.date !== x.date && 'date', a.deadline !== x.deadline && 'deadline'].filter(Boolean);
              Object.assign(a, { calKey: x.calKey, title: a.calKey ? a.title : x.title, courseId: x.courseId, teacherId: x.teacherId || a.teacherId, date: x.date, dateNote: x.dateNote, deadline: x.deadline, criteria: x.criteria.length ? x.criteria : a.criteria, toddle: a.toddle || x.toddle });
              if (changed.length) log(a, `Calendar update: ${changed.join(' and ')} changed (${file.name})`);
              updated++;
            } else {
              S.assessments.push({ id: uid('A'), code: newReqCode(), ...x, unit: '', duration: '', marks: '', link: '', markschemeLink: '', notes: '',
                status: 'requested', checklist: {}, feedback: '', log: [{ at: today, text: `Imported from ${file.name}` }], createdAt: today });
              added++;
            }
          });
          App.save(); render();
          toast(`${added} assessment${added === 1 ? '' : 's'} added${updated ? `, ${updated} updated` : ''}${hired ? `, ${hired} teacher${hired === 1 ? '' : 's'} added` : ''}`, 'success');
        },
      }],
      onOpen: dlg => dlg.addEventListener('change', e => {
        const sel = e.target.closest('[data-person]');
        if (!sel) return;
        people.get(sel.dataset.person).choice = sel.value;
        // rows of this person follow the new choice; the others keep theirs (the list of "new" options changes for all)
        $$('tr[data-i]', dlg).forEach(tr => {
          const { x } = rows[tr.dataset.i], s = $('[data-teacher]', tr);
          const v = x.teacherKey === sel.dataset.person ? personValue(x.teacherKey) : s.value;
          s.innerHTML = teacherOpts(v); s.value = v;
          if (s.value !== v) s.value = '';
        });
      }),
    });
  }

  /* ---------- events ---------- */
  $('#rows').addEventListener('click', e => {
    const c = e.target.closest('[data-copy]');
    if (c) { e.stopImmediatePropagation(); copyText(c.dataset.copy); }
  });
  $('#rows').addEventListener('click', e => { if (e.target.closest('[data-copy]')) return; const tr = e.target.closest('tr[data-id]'); if (tr) openDetail(S.assessments.find(a => a.id === tr.dataset.id)); });
  $('#rows').addEventListener('keydown', e => { const tr = e.target.closest('tr[data-id]'); if (tr && e.key === 'Enter') openDetail(S.assessments.find(a => a.id === tr.dataset.id)); });
  $('#overview').addEventListener('click', e => { const b = e.target.closest('[data-remind]'); if (b) copyText(reminderText(App.teacher(b.dataset.remind))); });
  try { $('#sortBy').value = localStorage.getItem('mathhub.assessSort') || 'date'; } catch (e) { /* storage blocked: default sort */ }
  $('#sortBy').addEventListener('change', () => { try { localStorage.setItem('mathhub.assessSort', $('#sortBy').value); } catch (e) { /* not remembered */ } });
  ['#q', '#fTeacher', '#fCourse', '#fType', '#sortBy'].forEach(s => $(s).addEventListener('input', renderRows));
  $('#newReq').onclick = newRequest;
  $('#teachersBtn').onclick = manageTeachers;
  $('#importBtn').onclick = () => $('#importFile').click();
  $('#importFile').addEventListener('change', e => { if (e.target.files.length) importFiles([...e.target.files]); e.target.value = ''; });
  $('#calendarBtn').onclick = () => $('#calendarFile').click();
  $('#calendarFile').addEventListener('change', e => { if (e.target.files[0]) importCalendar(e.target.files[0]); e.target.value = ''; });
  $('#calRange').addEventListener('change', renderCalendar);

  render();
  const openId = new URLSearchParams(location.search).get('open');
  if (openId) { const a = S.assessments.find(x => x.id === openId); if (a) openDetail(a); }
})();
