(() => {
  const S = App.state;
  const today = isoDate();

  // On days off, show the next school day so the page is useful for planning.
  function schoolDay() {
    const d = nextWorkDay(today);
    return { d, label: d === today ? 'Today’s schedule' : `${DAY_NAMES[weekdayKey(d)]}’s schedule` };
  }

  function renderHeader() {
    const h = new Date().getHours();
    const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    $('#greeting').textContent = S.profile.name ? `${g}, ${S.profile.name}` : g;
    $('#todayLabel').textContent = fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function renderOnboarding() {
    const box = $('#onboarding');
    if (S.onboarded) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="banner">
      <div><h2>Welcome to MathHub</h2>
      <p class="muted small" style="margin:0">Start with three things: add your name and timetable in Settings, check your units under Courses, and add your department’s teachers in the Assessment hub. You can also load sample data first to see how it all works.</p></div>
      <button class="btn btn-soft" id="obSample">Load sample data</button>
      <a class="btn btn-primary" href="settings.html">Set up my timetable</a>
      <button class="icon-btn" id="obClose" aria-label="Dismiss">×</button></div>`;
    $('#obSample').onclick = () => { loadSampleData(); toast('Sample data loaded', 'success'); renderAll(); renderSidebar(); };
    $('#obClose').onclick = () => { S.onboarded = true; App.save(); renderOnboarding(); };
  }

  function renderStats() {
    const { d } = schoolDay();
    const slots = slotsOn(d).filter(p => p.classId);
    const planned = slots.filter(p => S.lessons.some(l => l.date === d && l.periodId === p.id)).length;
    const openTasks = S.tasks.filter(t => !t.done);
    const dueToday = openTasks.filter(t => t.due && t.due <= today).length;
    const review = S.assessments.filter(a => a.status === 'submitted' || a.status === 'in-review').length;
    const overdue = S.assessments.filter(a => a.status === 'requested' && a.deadline && a.deadline < today).length;
    const stat = (href, label, value, sub, alert = false) =>
      `<a class="stat ${alert ? 'alert' : ''}" href="${href}"><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-sub">${sub}</div></a>`;
    $('#stats').innerHTML =
      stat('planner.html', 'Classes', slots.length, slots.length ? `${planned} of ${slots.length} planned` : 'No classes timetabled') +
      stat('#taskList', 'Open tasks', openTasks.length, dueToday ? `${dueToday} due today or overdue` : 'Nothing overdue', dueToday > 0) +
      stat('assessments.html', 'To review', review, 'Assessments from teachers') +
      stat('assessments.html', 'Overdue drafts', overdue, 'Past the requested deadline', overdue > 0);
  }

  function renderSchedule() {
    const { d, label } = schoolDay();
    const variant = S.variantNames?.[variantOf(weekdayKey(d))] || '';
    $('#schedTitle').textContent = label;
    $('#schedSub').textContent = `${fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}${cycleOn() ? ` · ${cycleLabel(d)}` : ''}${variant ? ` · ${variant.split(' (')[0]} bell times` : ''}`;
    const hasTimetable = Object.keys(S.timetable).length > 0;
    // Show only periods I teach (both divisions) plus any lesson planned in a period.
    const busy = slotsOn(d).filter(p => p.classId || S.lessons.some(l => l.date === d && l.periodId === p.id));
    const rows = busy.map(p => {
      const cls = App.cls(p.classId);
      const lesson = S.lessons.find(l => l.date === d && l.periodId === p.id);
      const course = App.course(lesson?.courseId || cls?.courseId);
      const clash = busy.some(o => o !== p && o.classId && p.classId && timesOverlap(o, p));
      const st = lesson ? LESSON_STATUS[lesson.status] || LESSON_STATUS.planned : null;
      return `<li class="sched-row"><span class="sched-time">${esc(p.start)}<small>${esc(p.end)}</small></span>
        <div class="sched-body" style="--c:${esc(colorFor(lesson?.classId || cls?.id, course?.id))}">
          <span class="sched-class">${esc(cls?.name || course?.short || '')}<small class="muted" style="display:block;font-weight:500">${esc(p.name)}${cls && p.room ? ` · ${esc(p.room)}` : ''}${clash ? ' · <span class="overdue-text">clash</span>' : ''}</small></span>
          ${lesson
            ? `<button class="sched-lesson" data-lesson="${lesson.id}"><i class="dot tone-${st.tone}"></i><span>${esc(lesson.title)}</span></button>${badge(st.label, st.tone)}`
            : `<span class="faint small" style="flex:1">No plan yet</span><button class="btn btn-sm btn-soft" data-plan="${p.id}" data-class="${cls?.id || ''}">+ Plan lesson</button>`}
        </div></li>`;
    }).map((html, i) => ({ t: busy[i].start, html }));
    // events (meetings, duties…) slot in by time
    const evRows = eventsOn(d).map(ev => ({ t: ev.start, html: `<li class="sched-row event"><span class="sched-time">${esc(ev.start)}<small>${esc(ev.end)}</small></span>
        <div class="sched-body" style="--c:${esc(ev.color)}">
          <span class="sched-class">${ev.repeat !== 'none' ? '↻' : '◆'} Event</span>
          <button class="sched-lesson" data-event="${ev.id}"><span>${esc(ev.title)}</span></button>
          ${ev.location ? `<span class="muted small">📍 ${esc(ev.location)}</span>` : ''}
        </div></li>` }));
    const allRows = [...rows, ...evRows].sort((a, b) => a.t.localeCompare(b.t)).map(r => r.html).join('')
      || (hasTimetable ? '<li class="empty">No classes on this day.</li>' : '');
    const loose = S.lessons.filter(l => l.date === d && !App.periodOn(l.periodId, d));
    const looseHtml = loose.length ? `<p class="muted small" style="margin:.8rem 0 .3rem">Other lessons on this day</p><ul class="sched">${loose.map(l => {
      const c = App.course(l.courseId);
      return `<li class="sched-row"><span class="sched-time">—</span><div class="sched-body" style="--c:${esc(colorFor(l.classId, l.courseId))}"><span class="sched-class">${esc(App.cls(l.classId)?.name || c?.short || '')}</span><button class="sched-lesson" data-lesson="${l.id}"><span>${esc(l.title)}</span></button></div></li>`;
    }).join('')}</ul>` : '';
    $('#schedule').innerHTML = (hasTimetable ? '' : `<div class="empty-hint">Your timetable is empty. <a href="settings.html#timetable">Add it in Settings</a> and each day’s classes will show here.</div>`) +
      `<ul class="sched">${allRows}</ul>${looseHtml}`;
    $$('#schedule [data-lesson]').forEach(b => b.onclick = () => openLessonEditor(S.lessons.find(l => l.id === b.dataset.lesson), renderAll));
    $$('#schedule [data-event]').forEach(b => b.onclick = () => openEventEditor(S.events.find(ev => ev.id === b.dataset.event), renderAll, d));
    $$('#schedule [data-plan]').forEach(b => b.onclick = () => openLessonEditor({ date: d, periodId: b.dataset.plan, classId: b.dataset.class }, renderAll));
  }

  function renderTasks() {
    const pr = { high: 0, normal: 1, low: 2 };
    const list = [...S.tasks].sort((a, b) => (a.done - b.done) || (pr[a.priority] - pr[b.priority]) || (a.due || '9999').localeCompare(b.due || '9999'));
    $('#taskList').innerHTML = list.map(t => `<li class="task ${t.done ? 'done' : ''} pri-${t.priority}">
        <input type="checkbox" data-id="${t.id}" ${t.done ? 'checked' : ''} aria-label="Mark as done">
        <span class="task-text">${esc(t.text)}</span>
        ${t.due ? `<span class="task-due ${!t.done && t.due < today ? 'overdue' : ''}">${t.due === today ? 'Today' : esc(fmtDate(t.due, { day: 'numeric', month: 'short' }))}</span>` : ''}
        <button class="icon-btn sm" data-del="${t.id}" aria-label="Delete task">×</button></li>`).join('') || '<li class="empty">Your list is empty.</li>';
    $$('#taskList input[type=checkbox]').forEach(cb => cb.onchange = () => {
      const t = S.tasks.find(x => x.id === cb.dataset.id); t.done = cb.checked; App.save(); renderTasks(); renderStats();
    });
    $$('#taskList [data-del]').forEach(b => b.onclick = () => {
      S.tasks = S.tasks.filter(x => x.id !== b.dataset.del); App.save(); renderTasks(); renderStats();
    });
  }

  function renderAgenda() {
    const end = addDays(today, 14);
    const items = [];
    const inRange = d => d && d > today && d <= end;
    S.lessons.filter(l => inRange(l.date)).forEach(l => items.push({ date: l.date, kind: 'Lesson', text: l.title, course: App.course(l.courseId) }));
    S.tasks.filter(t => !t.done && inRange(t.due)).forEach(t => items.push({ date: t.due, kind: 'Task', text: t.text }));
    S.assessments.forEach(a => {
      const teacher = App.teacher(a.teacherId)?.name || 'teacher';
      if (inRange(a.deadline) && a.status === 'requested') items.push({ date: a.deadline, kind: 'Draft due', text: `${a.title} (${teacher})`, course: App.course(a.courseId) });
      if (inRange(a.date)) items.push({ date: a.date, kind: a.type === 'summative' ? 'Summative' : 'Formative', text: a.title, course: App.course(a.courseId) });
    });
    // events in the next two weeks (daily repeats are left out to keep the list readable)
    for (let d = addDays(today, 1); d <= end; d = addDays(d, 1)) {
      eventsOn(d).filter(ev => ev.repeat !== 'daily').forEach(ev => items.push({ date: d, kind: 'Event', text: `${ev.start} ${ev.title}${ev.location ? ` · ${ev.location}` : ''}` }));
    }
    S.iaMilestones.filter(m => !m.done && inRange(m.date)).forEach(m => items.push({ date: m.date, kind: 'IA', text: m.label, course: App.course('dpaisl') }));
    items.sort((a, b) => a.date.localeCompare(b.date));
    if (!items.length) { $('#agenda').innerHTML = '<p class="empty">Nothing scheduled for the next two weeks.</p>'; return; }
    let html = '', last = '';
    items.slice(0, 16).forEach(i => {
      if (i.date !== last) { html += `<div class="agenda-day">${esc(fmtDate(i.date))} · ${relDay(i.date)}</div>`; last = i.date; }
      html += `<div class="agenda-item"><span class="agenda-kind">${esc(i.kind)}</span>${i.course ? courseTag(i.course) : ''}<span>${esc(i.text)}</span></div>`;
    });
    if (items.length > 16) html += `<p class="muted small">+ ${items.length - 16} more</p>`;
    $('#agenda').innerHTML = html;
  }

  function renderProgress() {
    $('#progress').innerHTML = S.courses.map(c => {
      const p = App.courseProgress(c);
      const unitsDone = c.units.filter(u => u.status === 'complete').length;
      return `<a href="courses.html#${c.id}"><div class="cp-top"><span>${courseTag(c)} <span class="small">${unitsDone}/${c.units.length} units complete</span></span><strong class="small">${p.pct}%</strong></div>
        <div class="progress" style="--c:${esc(c.color)}"><span style="width:${p.pct}%"></span></div></a>`;
    }).join('');
  }

  function renderReview() {
    const queue = S.assessments.filter(a => ['submitted', 'in-review', 'revision'].includes(a.status))
      .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    const overdue = S.assessments.filter(a => a.status === 'requested' && a.deadline && a.deadline < today);
    let html = '';
    if (!queue.length && !overdue.length) html = `<p class="empty">No drafts waiting. <a href="assessments.html">Request one →</a></p>`;
    if (queue.length) {
      html += `<ul class="review-list">${queue.slice(0, 5).map(a => `<li>${courseTag(App.course(a.courseId))}
        <div class="grow"><a href="assessments.html?open=${a.id}">${esc(a.title)}</a><div class="muted small">${esc(App.teacher(a.teacherId)?.name || '—')}${a.date ? ` · sits ${esc(fmtDate(a.date, { day: 'numeric', month: 'short' }))}` : ''}</div></div>
        ${statusBadge(A_STATUS, a.status)}</li>`).join('')}</ul>`;
    }
    if (overdue.length) html += `<p class="small" style="margin:.6rem 0 0"><span class="overdue-text">${overdue.length} overdue</span> <span class="muted">— ${esc([...new Set(overdue.map(a => App.teacher(a.teacherId)?.name).filter(Boolean))].join(', '))}</span></p>`;
    $('#review').innerHTML = html;
  }

  function initNote() {
    const ta = $('#dayNote');
    ta.value = S.notes[today] || '';
    const save = debounce(() => {
      if (ta.value.trim()) S.notes[today] = ta.value; else delete S.notes[today];
      App.save(); $('#noteState').textContent = 'Saved';
    }, 500);
    ta.addEventListener('input', () => { $('#noteState').textContent = 'Saving…'; save(); });
  }

  function initTasks() {
    $('#taskForm').addEventListener('submit', e => {
      e.preventDefault();
      const text = $('#taskText').value.trim();
      if (!text) return;
      S.tasks.push({ id: uid('task'), text, done: false, due: $('#taskDue').value, priority: $('#taskPri').value });
      App.save();
      $('#taskText').value = ''; $('#taskDue').value = ''; $('#taskPri').value = 'normal';
      renderTasks(); renderStats(); renderAgenda();
    });
    $('#clearDone').onclick = () => { S.tasks = S.tasks.filter(t => !t.done); App.save(); renderTasks(); };
    $('#qaTask').onclick = () => { $('#taskText').focus(); $('#taskText').scrollIntoView({ block: 'center', behavior: 'smooth' }); };
    $('#qaLesson').onclick = () => openLessonEditor({ date: schoolDay().d }, renderAll);
    $('#qaEvent').onclick = () => openEventEditor({ date: schoolDay().d }, renderAll);
  }

  function renderAll() {
    renderHeader(); renderOnboarding(); renderStats(); renderSchedule(); renderTasks(); renderAgenda(); renderProgress(); renderReview();
  }

  initTasks();
  initNote();
  renderAll();
})();
