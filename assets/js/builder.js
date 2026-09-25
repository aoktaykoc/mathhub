(() => {
  const S = App.state;
  ensureCurricula();
  const params = new URLSearchParams(location.search);
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const levelKeys = () => new Set(curriculumLevels().map(l => l.key));

  // The lesson being built.
  const blank = () => ({
    lessonId: null, classId: '', level: '', unitId: '', topicId: '', title: '', titleAuto: true,
    outcomeIds: new Set(), custom: '', date: isoDate(), periodId: '', duration: '', outline: '',
  });
  let F = blank();

  // Level for a class: last one used with it, otherwise a guess from its course.
  function levelForClass(cls) {
    if (!cls) return '';
    const saved = S.classLevels[cls.id];
    if (saved && levelKeys().has(saved)) return saved;
    const guess = { myp8: 'myp8', myp9: 'myp9|Standard', dpaisl: 'dp-ai|SL' }[cls.courseId] || '';
    return levelKeys().has(guess) ? guess : '';
  }

  /* ---------- selects ---------- */
  function fillClasses() {
    $('#fClass').innerHTML = '<option value="">— no class —</option>' + S.classes.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    $('#fClass').value = F.classId;
  }
  function fillLevels() {
    const groups = {};
    curriculumLevels().forEach(l => (groups[l.c.programme] = groups[l.c.programme] || []).push(l));
    $('#fLevel').innerHTML = '<option value="">— choose a level —</option>' + Object.entries(groups).map(([g, ls]) =>
      `<optgroup label="${esc(g)}">${ls.map(l => `<option value="${esc(l.key)}">${esc(l.label)}${l.c.units.length ? '' : ' (no topics yet)'}</option>`).join('')}</optgroup>`).join('');
    $('#fLevel').value = F.level;
  }
  function fillUnits() {
    const { c, track } = parseLevel(F.level);
    const units = c ? c.units.filter(u => u.topics.some(t => inTrack(t, track))) : [];
    $('#fUnit').innerHTML = `<option value="">${units.length ? 'All units' : '—'}</option>` + units.map(u => `<option value="${u.id}">${esc(u.title)}</option>`).join('');
    $('#fUnit').value = units.some(u => u.id === F.unitId) ? F.unitId : '';
    $('#fUnit').disabled = !units.length;
  }
  function fillPeriods() {
    const sel = $('#fPeriod');
    const date = F.date;
    const ps = date ? periodsOn(date) : [];
    if (F.periodId && !ps.some(p => p.id === F.periodId)) F.periodId = '';
    sel.innerHTML = '<option value="">— no fixed period —</option>' + S.schedules.map(s => {
      const mine = ps.filter(p => p.schedId === s.id);
      return mine.length ? `<optgroup label="${esc(s.name)}">${mine.map(p => {
        const cls = App.cls(classAt(date, p.id));
        return `<option value="${p.id}">${esc(p.label)} · ${p.start}–${p.end}${cls ? ` · ${esc(cls.name)}` : ''}</option>`;
      }).join('')}</optgroup>` : '';
    }).join('');
    sel.value = F.periodId;
  }

  /* ---------- next free timetabled lesson for the chosen class ---------- */
  function renderNextSlot() {
    const box = $('#nextSlot');
    const cls = App.cls(F.classId);
    if (!cls) { box.innerHTML = ''; return; }
    const from = isoDate(); // search forward from today
    for (let i = 0; i < 35; i++) {
      const d = addDays(from, i);
      if (!isWorkDay(d)) continue;
      const slot = slotsOn(d).find(p => p.classId === cls.id && !S.lessons.some(l => l.date === d && l.periodId === p.id && l.id !== F.lessonId));
      if (slot) {
        const here = d === F.date && slot.id === F.periodId;
        box.innerHTML = here ? `<p class="small muted" style="margin:0">✓ This is the next free ${esc(cls.name)} lesson.</p>`
          : `<button class="btn btn-sm btn-soft" id="useNext">Use next free ${esc(cls.name)} lesson: ${esc(fmtDate(d))} · ${esc(slot.name)} (${slot.start}–${slot.end})</button>`;
        $('#useNext')?.addEventListener('click', () => {
          F.date = d; F.periodId = slot.id; F.duration = String(toMin(slot.end) - toMin(slot.start));
          $('#fDate').value = d; $('#fDuration').value = F.duration;
          fillPeriods(); renderNextSlot(); renderPreview();
        });
        return;
      }
    }
    box.innerHTML = Object.keys(S.timetable).length ? `<p class="small muted" style="margin:0">No free ${esc(cls.name)} period found in the next five weeks.</p>` : '';
  }

  /* ---------- topics ---------- */
  function renderTopics() {
    const box = $('#topicPick');
    if (!F.level) { box.innerHTML = '<p class="empty">Choose a curriculum level first.</p>'; return; }
    const { c, track } = parseLevel(F.level);
    if (!c.units.length) {
      box.innerHTML = `<div class="empty-hint">${esc(c.name)} has no topics yet. <a href="curriculum.html#${c.id}">Add or import them in the Curriculum library</a>. You can still type a lesson topic and your own outcomes below.</div>`;
      return;
    }
    const q = $('#fSearch').value.trim().toLowerCase();
    let items = levelTopics(F.level);
    if (F.unitId) items = items.filter(i => i.unit.id === F.unitId);
    if (q) items = items.filter(i => `${i.topic.code} ${i.topic.title} ${i.topic.outcomes.map(o => o.text).join(' ')}`.toLowerCase().includes(q));
    if (!items.length) { box.innerHTML = '<p class="empty">No topics match.</p>'; return; }
    const cov = outcomeCoverage();
    let html = '', lastUnit = '';
    items.forEach(({ unit, topic }) => {
      if (!F.unitId && unit.id !== lastUnit) { html += `<div class="tp-unit">${esc(unit.title)}</div>`; lastUnit = unit.id; }
      const outs = topic.outcomes.filter(o => inTrack(o, track));
      const done = outs.filter(o => cov[o.id]).length;
      html += `<button type="button" class="tp ${topic.id === F.topicId ? 'active' : ''}" data-topic="${topic.id}">
        ${topic.code ? `<span class="tp-code">${esc(topic.code)}</span>` : ''}<span class="tp-title">${esc(topic.title)}</span>
        ${trackBadge(topic, c)}<span class="tp-cov ${outs.length && done === outs.length ? 'full' : ''}" title="Outcomes already in lesson plans">${done}/${outs.length}</span></button>`;
    });
    box.innerHTML = html;
    $('.tp.active', box)?.scrollIntoView({ block: 'nearest' });
  }

  function selectTopic(id) {
    const hit = findTopic(id);
    if (!hit) return;
    const changed = F.topicId !== id;
    F.topicId = id;
    if (changed) F.outcomeIds = new Set();
    if (F.titleAuto || !F.title.trim()) { F.title = hit.topic.title; F.titleAuto = true; $('#fTitle').value = F.title; }
    renderTopics(); renderOutcomes(); renderPreview();
  }

  /* ---------- outcomes ---------- */
  function renderOutcomes() {
    const box = $('#outcomes');
    const hit = F.topicId ? findTopic(F.topicId) : null;
    if (!hit) { box.innerHTML = '<p class="muted small" style="margin:0">Choose a topic to see its learning outcomes, or write your own below.</p>'; return; }
    const { track } = parseLevel(F.level);
    const cov = outcomeCoverage();
    const outs = hit.topic.outcomes.filter(o => inTrack(o, track));
    box.innerHTML = `<p class="small muted" style="margin:0 0 .4rem">${esc(hit.topic.code ? hit.topic.code + ' · ' : '')}${esc(hit.topic.title)}</p>` +
      (outs.map(o => `<label class="out-row"><input type="checkbox" data-out="${o.id}" ${F.outcomeIds.has(o.id) ? 'checked' : ''}>
        <span class="out-text">${esc(o.text)} ${trackBadge(o, hit.c)}</span>${coverageMark(cov[o.id])}</label>`).join('') || '<p class="muted small">This topic has no outcomes yet.</p>') +
      '<p class="small faint" style="margin:.4rem 0 0">✓ taught · ◐ planned · ○ not yet</p>';
  }

  /* ---------- side panels ---------- */
  function selectedOutcomeTexts() {
    const hit = F.topicId ? findTopic(F.topicId) : null;
    const outs = hit ? hit.topic.outcomes.filter(o => F.outcomeIds.has(o.id)).map(o => o.text) : [];
    return [...outs, ...F.custom.split('\n').map(s => s.trim()).filter(Boolean)];
  }
  function renderPreview() {
    const cls = App.cls(F.classId);
    const p = App.periodOn(F.periodId, F.date);
    const outs = selectedOutcomeTexts();
    const color = colorFor(F.classId, courseForCurriculum(parseLevel(F.level).cid));
    $('#preview').innerHTML = `<div class="bl-preview" style="--c:${esc(color)}">
      <div class="small muted">${esc([cls?.name, levelLabel(F.level)].filter(Boolean).join(' · ') || 'No class or level yet')}</div>
      <h3>${esc(F.title || 'Untitled lesson')}</h3>
      <div class="small">${F.date ? esc(fmtDate(F.date, { weekday: 'long', day: 'numeric', month: 'long' })) : ''}${p ? ` · ${esc(p.name)} ${p.start}–${p.end}` : ''}${F.duration ? ` · <strong>${esc(F.duration)} min</strong>` : ''}</div>
      ${outs.length ? `<div class="small" style="margin-top:.5rem"><strong>Students will be able to:</strong><ul>${outs.map(o => `<li>${esc(o)}</li>`).join('')}</ul></div>` : '<p class="small faint" style="margin:.5rem 0 0">No outcomes selected yet.</p>'}
      ${F.outline.trim() ? `<div class="small muted" style="white-space:pre-line;margin-top:.4rem">${esc(F.outline.trim().slice(0, 240))}${F.outline.length > 240 ? '…' : ''}</div>` : ''}
    </div>
    ${F.lessonId ? '<p class="small muted" style="margin:.5rem 0 0">Editing a saved lesson.</p>' : ''}`;
  }

  function renderCoverage() {
    const box = $('#coverage');
    if (!F.level) { box.innerHTML = '<p class="muted small" style="margin:0">Choose a level to see how many of its outcomes you have planned and taught.</p>'; return; }
    const { c, track } = parseLevel(F.level);
    $('#covLink').href = `curriculum.html#${c.id}`;
    const cov = outcomeCoverage();
    const rows = c.units.map(u => {
      const outs = u.topics.filter(t => inTrack(t, track)).flatMap(t => t.outcomes.filter(o => inTrack(o, track)));
      return { u, total: outs.length, planned: outs.filter(o => cov[o.id]).length, taught: outs.filter(o => cov[o.id]?.taught).length };
    }).filter(r => r.total);
    if (!rows.length) { box.innerHTML = `<p class="muted small" style="margin:0">${esc(levelLabel(F.level))} has no outcomes yet.</p>`; return; }
    const tot = rows.reduce((a, r) => ({ total: a.total + r.total, planned: a.planned + r.planned, taught: a.taught + r.taught }), { total: 0, planned: 0, taught: 0 });
    const bar = (r) => `<div class="cov-bar"><span class="cov-taught-bar" style="width:${r.total ? r.taught / r.total * 100 : 0}%"></span><span class="cov-planned-bar" style="width:${r.total ? (r.planned - r.taught) / r.total * 100 : 0}%"></span></div>`;
    box.innerHTML = `<div class="cp-top"><strong>${esc(levelLabel(F.level))}</strong><span class="small">${tot.taught} taught · ${tot.planned} planned · ${tot.total} outcomes</span></div>${bar(tot)}
      <div class="cov-units">${rows.map(r => `<div><div class="cp-top small"><span>${esc(r.u.title)}</span><span class="muted">${r.planned}/${r.total}</span></div>${bar(r)}</div>`).join('')}</div>
      <p class="small faint" style="margin:.5rem 0 0"><span class="legend taught"></span> taught <span class="legend planned"></span> planned</p>`;
  }

  function renderRecent() {
    const list = S.lessons.filter(l => l.curriculum).sort((a, b) => b.date.localeCompare(a.date) || (b.id > a.id ? 1 : -1)).slice(0, 8);
    $('#recent').innerHTML = list.length ? `<ul class="review-list">${list.map(l => `<li>
        <div class="grow"><button class="link" data-load="${l.id}" style="color:var(--text);font-weight:600;text-align:left">${esc(l.title)}</button>
        <div class="muted small">${esc(fmtDate(l.date, { day: 'numeric', month: 'short' }))} · ${esc([App.cls(l.classId)?.name, levelLabel(l.curriculum.level)].filter(Boolean).join(' · '))}${l.duration ? ` · ${esc(l.duration)} min` : ''}</div></div>
        ${statusBadge(LESSON_STATUS, l.status)}</li>`).join('')}</ul>` : '<p class="muted small" style="margin:0">Lessons you build here appear in this list.</p>';
  }

  function renderAll() {
    fillClasses(); fillLevels(); fillUnits(); fillPeriods();
    $('#fTitle').value = F.title; $('#fDate').value = F.date; $('#fDuration').value = F.duration;
    $('#fCustom').value = F.custom; $('#fOutline').value = F.outline;
    $('#pageTitle').textContent = F.lessonId ? 'Lesson builder · editing' : 'Lesson builder';
    renderTopics(); renderOutcomes(); renderNextSlot(); renderPreview(); renderCoverage(); renderRecent();
  }

  /* ---------- load / save ---------- */
  function load(id) {
    const l = S.lessons.find(x => x.id === id);
    if (!l) { toast('That lesson no longer exists', 'error'); return; }
    const cur = l.curriculum || {};
    const hit = cur.topicId ? findTopic(cur.topicId) : null;
    F = {
      lessonId: l.id, classId: l.classId || '', level: levelKeys().has(cur.level) ? cur.level : levelForClass(App.cls(l.classId)),
      unitId: hit?.unit.id || '', topicId: hit ? cur.topicId : '', title: l.title, titleAuto: false,
      outcomeIds: new Set(cur.outcomeIds || []), custom: (cur.custom || []).join('\n'),
      date: l.date, periodId: l.periodId || '', duration: l.duration || '', outline: l.main || '',
    };
    if (!l.curriculum && l.objectives) F.custom = l.objectives.split('\n').map(s => s.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean).join('\n');
    history.replaceState(null, '', `?lesson=${l.id}`);
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset(keepContext = true) {
    const keep = keepContext ? { classId: F.classId, level: F.level, unitId: F.unitId, date: F.date, duration: '' } : {};
    F = Object.assign(blank(), keep);
    history.replaceState(null, '', location.pathname);
    renderAll();
  }

  function save(openAfter) {
    F.title = $('#fTitle').value.trim();
    if (!F.title) { toast('Give the lesson a topic', 'error'); $('#fTitle').focus(); return; }
    if (!F.date) { toast('Choose a date', 'error'); return; }
    const other = F.periodId && S.lessons.find(l => l.date === F.date && l.periodId === F.periodId && l.id !== F.lessonId);
    if (other) {
      openModal({
        title: 'That period already has a lesson',
        body: `<p>“${esc(other.title)}” is already planned for ${esc(fmtDate(F.date))} · ${esc(App.periodOn(F.periodId, F.date)?.name || '')}. The planner shows one lesson per period.</p><p class="muted small">Choose another period, or open that lesson to change it.</p>`,
        actions: [{ label: 'Cancel', cls: 'btn-ghost' }, { label: 'Open that lesson here', cls: 'btn-primary', onClick: () => { load(other.id); } }],
      });
      return;
    }
    const hit = F.topicId ? findTopic(F.topicId) : null;
    const outs = hit ? hit.topic.outcomes.filter(o => F.outcomeIds.has(o.id)) : [];
    const custom = F.custom.split('\n').map(s => s.trim()).filter(Boolean);
    const cls = App.cls(F.classId);
    const { cid } = parseLevel(F.level);
    const data = {
      date: F.date, periodId: F.periodId, classId: F.classId,
      courseId: cls?.courseId || courseForCurriculum(cid) || '',
      title: F.title,
      objectives: [...outs.map(o => o.text), ...custom].map(t => `• ${t}`).join('\n'),
      duration: F.duration ? String(F.duration) : '',
      main: F.outline.trim(),
      curriculum: F.level ? { level: F.level, topicId: F.topicId, outcomeIds: outs.map(o => o.id), custom } : null,
    };
    let lesson = F.lessonId && S.lessons.find(l => l.id === F.lessonId);
    if (lesson) Object.assign(lesson, data);
    else { lesson = lessonDefaults({ ...data, id: uid('L') }); S.lessons.push(lesson); }
    if (F.classId && F.level) S.classLevels[F.classId] = F.level;
    App.save();
    const when = `${fmtDate(lesson.date)}${App.periodOn(lesson.periodId, lesson.date) ? ` · ${App.periodOn(lesson.periodId, lesson.date).name}` : ''}`;
    toast(`${F.lessonId ? 'Lesson updated' : 'Lesson saved'} — ${when}`, 'success');
    if (openAfter === 'ai') { location.href = `ai.html?lesson=${encodeURIComponent(lesson.id)}`; return; }
    if (openAfter) {
      F.lessonId = lesson.id;
      renderAll();
      openLessonEditor(lesson, saved => { if (saved) load(saved.id); else reset(); });
    } else {
      reset(true); // ready for the next lesson with the same class and level
    }
  }

  /* ---------- events ---------- */
  $('#fClass').addEventListener('change', e => {
    F.classId = e.target.value;
    const lv = levelForClass(App.cls(F.classId));
    if (lv && lv !== F.level) { F.level = lv; F.unitId = ''; F.topicId = ''; F.outcomeIds = new Set(); }
    renderAll();
  });
  $('#fLevel').addEventListener('change', e => {
    F.level = e.target.value; F.unitId = ''; F.topicId = ''; F.outcomeIds = new Set();
    renderAll();
  });
  $('#fUnit').addEventListener('change', e => { F.unitId = e.target.value; renderTopics(); });
  $('#fSearch').addEventListener('input', renderTopics);
  $('#topicPick').addEventListener('click', e => { const b = e.target.closest('[data-topic]'); if (b) selectTopic(b.dataset.topic); });
  $('#fTitle').addEventListener('input', e => { F.title = e.target.value; F.titleAuto = !e.target.value.trim(); renderPreview(); });
  $('#fDate').addEventListener('change', e => { F.date = e.target.value; fillPeriods(); renderNextSlot(); renderPreview(); });
  $('#fPeriod').addEventListener('change', e => {
    F.periodId = e.target.value;
    const p = App.periodOn(F.periodId, F.date);
    if (p) { F.duration = String(toMin(p.end) - toMin(p.start)); $('#fDuration').value = F.duration; }
    const cls = App.cls(classAt(F.date, F.periodId));
    if (cls && !F.classId) {
      F.classId = cls.id;
      const lv = levelForClass(cls);
      if (lv && !F.level) F.level = lv;
      renderAll(); return;
    }
    renderNextSlot(); renderPreview();
  });
  $('#fDuration').addEventListener('input', e => { F.duration = e.target.value; renderPreview(); });
  $('#durChips').innerHTML = [30, 40, 45, 50, 60, 80, 90].map(m => `<button type="button" class="btn btn-sm btn-ghost" data-min="${m}">${m}</button>`).join('');
  $('#durChips').addEventListener('click', e => { const b = e.target.closest('[data-min]'); if (!b) return; F.duration = b.dataset.min; $('#fDuration').value = F.duration; renderPreview(); });
  $('#outcomes').addEventListener('change', e => {
    const id = e.target.dataset.out; if (!id) return;
    if (e.target.checked) F.outcomeIds.add(id); else F.outcomeIds.delete(id);
    renderPreview();
  });
  $('#selAllOut').onclick = () => {
    const hit = F.topicId && findTopic(F.topicId); if (!hit) return;
    const { track } = parseLevel(F.level);
    hit.topic.outcomes.filter(o => inTrack(o, track)).forEach(o => F.outcomeIds.add(o.id));
    renderOutcomes(); renderPreview();
  };
  $('#selNoneOut').onclick = () => { F.outcomeIds = new Set(); renderOutcomes(); renderPreview(); };
  $('#fCustom').addEventListener('input', e => { F.custom = e.target.value; renderPreview(); });
  $('#fOutline').addEventListener('input', e => { F.outline = e.target.value; renderPreview(); });
  $('#recent').addEventListener('click', e => { const b = e.target.closest('[data-load]'); if (b) load(b.dataset.load); });
  $('#saveBtn').onclick = () => save(false);
  $('#saveOpen').onclick = () => save(true);
  $('#saveAi').onclick = () => save('ai');
  $('#newBtn').onclick = () => reset(false);

  // start: edit an existing lesson, or prefill from ?class= / ?level=
  if (params.get('lesson')) load(params.get('lesson'));
  else {
    if (params.get('class') && App.cls(params.get('class'))) { F.classId = params.get('class'); F.level = levelForClass(App.cls(F.classId)); }
    if (params.get('level') && levelKeys().has(params.get('level'))) F.level = params.get('level');
    if (params.get('date')) F.date = params.get('date');
    // "Build lesson" from the Curriculum library: ?topic=<id>&track=<SL|HL|…>
    const hit = params.get('topic') && findTopic(params.get('topic'));
    if (hit) {
      const tr = params.get('track') && hit.c.tracks.includes(params.get('track')) ? params.get('track')
        : (hit.topic.tracks[0] || hit.c.tracks[0] || '');
      F.level = tr ? `${hit.c.id}|${tr}` : hit.c.id;
      F.unitId = hit.unit.id;
      renderAll();
      selectTopic(hit.topic.id);
    } else renderAll();
  }
})();
