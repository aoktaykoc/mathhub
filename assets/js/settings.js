(() => {
  const S = App.state;
  const VARIANTS = ['std', 'alt'];
  const byLabel = (a, b) => a.localeCompare(b, undefined, { numeric: true });
  const save = () => App.save();
  S.rooms = S.rooms || {};
  // Timetable and per-period rooms share keys; keep them in step.
  function moveKey(from, to) {
    [S.timetable, S.rooms].forEach(map => { if (map[from] !== undefined) { map[to] = map[from]; delete map[from]; } });
  }
  function dropKey(k) { delete S.timetable[k]; delete S.rooms[k]; }

  /* ---------- profile ---------- */
  $('#pName').value = S.profile.name || '';
  $('#pSchool').value = S.profile.school || '';
  $('#pRole').value = S.profile.role || '';
  const saveProfile = debounce(() => {
    S.profile.name = $('#pName').value.trim();
    S.profile.school = $('#pSchool').value.trim();
    S.profile.role = $('#pRole').value.trim();
    if (S.profile.name) S.onboarded = true;
    save(); renderSidebar();
  }, 400);
  ['#pName', '#pSchool', '#pRole'].forEach(s => $(s).addEventListener('input', saveProfile));

  /* ---------- school week & day types ---------- */
  $('#workWeek').value = S.workWeek || 'sun-thu';
  $('#vnStd').value = S.variantNames.std;
  $('#vnAlt').value = S.variantNames.alt;
  function renderDayTypes() {
    $('#dayTypes').innerHTML = `<thead><tr>${workDays().map(d => `<th>${DAY_NAMES[d]}</th>`).join('')}</tr></thead>
      <tbody><tr>${workDays().map(d => `<td><select data-day="${d}" aria-label="${DAY_NAMES[d]} bell schedule">${VARIANTS.map(v => `<option value="${v}" ${variantOf(d) === v ? 'selected' : ''}>${esc(S.variantNames[v].split(' (')[0])}</option>`).join('')}</select></td>`).join('')}</tr></tbody>`;
  }
  $('#workWeek').addEventListener('change', e => { S.workWeek = e.target.value; save(); renderAll(); toast('School week updated', 'success'); });
  $('#dayTypes').addEventListener('change', e => { S.dayVariant[e.target.dataset.day] = e.target.value; save(); renderTT(); toast(`${DAY_NAMES[e.target.dataset.day]} now uses “${S.variantNames[e.target.value]}” bells`, 'success'); });
  const saveNames = debounce(() => {
    S.variantNames.std = $('#vnStd').value.trim() || 'Regular';
    S.variantNames.alt = $('#vnAlt').value.trim() || 'Alternative';
    save(); renderDayTypes(); renderBells();
  }, 400);
  ['#vnStd', '#vnAlt'].forEach(s => $(s).addEventListener('input', saveNames));

  /* ---------- two-week cycle ---------- */
  let ttWeek = 1; // which cycle week the timetable editor shows
  S.cycle = S.cycle || { enabled: false, anchor: '' };
  function renderCycle() {
    $('#cycleOn').checked = !!S.cycle.enabled;
    $('#cycleAnchor').value = S.cycle.anchor || '';
    $('#cycleAnchor').disabled = !S.cycle.enabled;
    $('#cycleTools').hidden = !cycleOn();
    $('#ttWeekTabs').hidden = !cycleOn();
    if (!cycleOn()) ttWeek = 1;
    $$('#ttWeekTabs .tab').forEach(t => t.classList.toggle('active', Number(t.dataset.ttweek) === ttWeek));
    if (!cycleOn()) { $('#cycleInfo').innerHTML = '<span class="muted">Off: the same timetable repeats every week.</span>'; return; }
    const now = weekStart(isoDate());
    $('#cycleInfo').innerHTML = `The week of <strong>${esc(fmtDate(now, { day: 'numeric', month: 'short' }))}</strong> is ${badge(cycleLabel(now), cycleWeekOf(now) === 1 ? 'info' : 'warning')} · the week of ${esc(fmtDate(addDays(now, 7), { day: 'numeric', month: 'short' }))} is ${badge(cycleLabel(addDays(now, 7)), cycleWeekOf(addDays(now, 7)) === 1 ? 'info' : 'warning')}`;
  }
  $('#cycleOn').addEventListener('change', e => {
    S.cycle.enabled = e.target.checked;
    if (S.cycle.enabled && !S.cycle.anchor) S.cycle.anchor = weekStart(isoDate());
    save(); renderCycle(); renderTT();
    toast(S.cycle.enabled ? 'Two-week cycle on. Fill in the Week 2 timetable below.' : 'Two-week cycle off: Week 1 timetable is used every week', 'success');
  });
  $('#cycleAnchor').addEventListener('change', e => { if (e.target.value) { S.cycle.anchor = e.target.value; save(); renderCycle(); } });
  $('#swapWeeks').onclick = () => { S.cycle.anchor = addDays(weekStart(S.cycle.anchor), 7); save(); renderCycle(); toast(`This week is now ${cycleLabel(isoDate())}`, 'success'); };
  $('#copyW1').onclick = () => confirmModal('Replace the Week 2 timetable with a copy of Week 1?', () => {
    [S.timetable, S.rooms].forEach(map => {
      Object.keys(map).forEach(k => { if (k.startsWith('w2:')) delete map[k]; });
      Object.keys(map).forEach(k => { if (!k.startsWith('w2:')) map[`w2:${k}`] = map[k]; });
    });
    save(); ttWeek = 2; renderCycle(); renderTT(); toast('Week 1 copied to Week 2. Now change what differs.', 'success');
  }, 'Copy');
  $('#ttWeekTabs').addEventListener('click', e => {
    const t = e.target.closest('[data-ttweek]'); if (!t) return;
    ttWeek = Number(t.dataset.ttweek); renderCycle(); renderTT();
  });

  /* ---------- divisions & bell times ---------- */
  // Move timetable entries (both cycle weeks) and lesson links when a period is renamed on one day type.
  function renamePeriod(sched, variant, oldLabel, newLabel) {
    const days = ALL_DAYS.filter(d => variantOf(d) === variant);
    ['', 'w2:'].forEach(pre => days.forEach(d => {
      moveKey(`${pre}${d}|${sched.id}:${oldLabel}`, `${pre}${d}|${sched.id}:${newLabel}`);
    }));
    S.lessons.forEach(l => {
      if (l.periodId === `${sched.id}:${oldLabel}` && days.includes(weekdayKey(l.date))) l.periodId = `${sched.id}:${newLabel}`;
    });
  }
  function dropPeriod(sched, variant, label) {
    ALL_DAYS.filter(d => variantOf(d) === variant).forEach(d => ['', 'w2:'].forEach(pre => dropKey(`${pre}${d}|${sched.id}:${label}`)));
  }

  function renderBells() {
    $('#bellList').innerHTML = S.schedules.map(s => `<div class="bell-div" data-sched="${s.id}">
      <div class="form-row" style="align-items:center;margin-bottom:.6rem">
        <input data-sk="name" value="${esc(s.name)}" aria-label="Division name" style="font-weight:700;max-width:260px">
        <input data-sk="short" value="${esc(s.short)}" aria-label="Short name" maxlength="4" style="max-width:80px" title="Short name shown on cards, e.g. MS">
        <span class="grow"></span>
        <button class="btn btn-sm btn-danger-ghost" data-rm-sched style="flex:0">Remove division</button>
      </div>
      <div class="grid-2">${VARIANTS.map(v => `<div class="bell-col">
        <h3 style="margin-bottom:.4rem">${esc(S.variantNames[v])} <span class="muted small">· ${esc(workDays().filter(d => variantOf(d) === v).map(d => DAY_NAMES[d].slice(0, 3)).join(', ') || 'no days')}</span></h3>
        <div class="row-list">${(s.variants[v] || []).map((p, i) => `<div class="row-item bell-row" data-v="${v}" data-i="${i}">
          <input data-k="label" value="${esc(p.label)}" aria-label="Period name" style="flex:0 0 70px;min-width:0">
          <input type="time" data-k="start" value="${esc(p.start)}" aria-label="Start">
          <input type="time" data-k="end" value="${esc(p.end)}" aria-label="End">
          <button class="icon-btn sm" data-rm-period aria-label="Remove period">×</button></div>`).join('') || '<p class="muted small">No periods.</p>'}</div>
        <button class="btn btn-sm btn-ghost" data-add-period="${v}" style="margin-top:.4rem">+ Period</button></div>`).join('')}</div>
    </div>`).join('<div class="divider"></div>');
  }
  const bellList = $('#bellList');
  bellList.addEventListener('change', e => {
    const box = e.target.closest('[data-sched]'); if (!box) return;
    const sched = App.schedule(box.dataset.sched);
    if (e.target.dataset.sk) {
      sched[e.target.dataset.sk] = e.target.value.trim() || sched[e.target.dataset.sk];
      save(); renderAll(); return;
    }
    const row = e.target.closest('.bell-row'); if (!row) return;
    const list = sched.variants[row.dataset.v];
    const p = list[row.dataset.i];
    const k = e.target.dataset.k;
    if (k === 'label') {
      const nl = e.target.value.trim().replace(/[|:]/g, '');
      if (!nl || list.some((x, j) => j !== Number(row.dataset.i) && x.label === nl)) { toast('Each period needs a unique name', 'error'); e.target.value = p.label; return; }
      renamePeriod(sched, row.dataset.v, p.label, nl);
      p.label = nl;
    } else {
      p[k] = e.target.value;
      list.sort((a, b) => a.start.localeCompare(b.start));
    }
    save(); renderBells(); renderTT();
  });
  bellList.addEventListener('click', e => {
    const box = e.target.closest('[data-sched]'); if (!box) return;
    const sched = App.schedule(box.dataset.sched);
    if (e.target.closest('[data-rm-period]')) {
      const row = e.target.closest('.bell-row');
      const list = sched.variants[row.dataset.v];
      const p = list[row.dataset.i];
      dropPeriod(sched, row.dataset.v, p.label);
      list.splice(Number(row.dataset.i), 1);
      save(); renderBells(); renderTT();
    } else if (e.target.closest('[data-add-period]')) {
      const v = e.target.closest('[data-add-period]').dataset.addPeriod;
      const list = sched.variants[v] = sched.variants[v] || [];
      const last = list[list.length - 1];
      const addMin = (t, n) => { const [h, m] = t.split(':').map(Number); const x = h * 60 + m + n; return `${String(Math.floor(x / 60) % 24).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
      let n = list.length + 1; while (list.some(p => p.label === `P${n}`)) n++;
      const start = last ? addMin(last.end, 5) : '07:35';
      list.push({ label: `P${n}`, start, end: addMin(start, 40) });
      save(); renderBells(); renderTT();
    } else if (e.target.closest('[data-rm-sched]')) {
      if (S.schedules.length < 2) { toast('You need at least one division', 'error'); return; }
      confirmModal(`Remove the division “${sched.name}” and its timetable entries?`, () => {
        S.schedules = S.schedules.filter(s => s.id !== sched.id);
        [...Object.keys(S.timetable), ...Object.keys(S.rooms)].forEach(k => { if (k.includes(`|${sched.id}:`)) dropKey(k); });
        S.classes.forEach(c => { if (c.scheduleId === sched.id) c.scheduleId = S.schedules[0].id; });
        save(); renderAll();
      }, 'Remove');
    }
  });
  $('#addDivision').onclick = () => {
    S.schedules.push({ id: uid('div'), name: 'New division', short: 'ND', variants: { std: [], alt: [] } });
    save(); renderAll();
  };

  /* ---------- classes ---------- */
  function renderClasses() {
    $('#classList').innerHTML = S.classes.map(c => `<div class="row-item" data-id="${c.id}">
      <input type="color" data-k="color" value="${esc(colorFor(c.id))}" aria-label="Colour for ${esc(c.name)}" title="Class colour" class="class-color">
      <input data-k="name" value="${esc(c.name)}" aria-label="Class name">
      <input data-k="room" value="${esc(c.room || '')}" placeholder="Usual room, e.g. B204" aria-label="Usual room" style="flex:0 1 150px">
      <select data-k="courseId" aria-label="Course">${courseOptions(c.courseId)}</select>
      <select data-k="scheduleId" aria-label="Division">${S.schedules.map(s => `<option value="${s.id}" ${s.id === c.scheduleId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      <button class="icon-btn sm" data-rm aria-label="Remove class">×</button></div>`).join('') || '<p class="muted small">No classes yet.</p>';
  }
  $('#classList').addEventListener('change', e => {
    const row = e.target.closest('[data-id]'); if (!row) return;
    const c = App.cls(row.dataset.id);
    const k = e.target.dataset.k, v = e.target.value.trim();
    if (k === 'room') c.room = v; // may be cleared
    else c[k] = v || c[k];
    save(); renderTT();
    if (k === 'room') toast(v ? `${c.name}: room ${v}` : `${c.name}: room cleared`, 'success');
  });
  $('#classList').addEventListener('click', e => {
    if (!e.target.closest('[data-rm]')) return;
    const id = e.target.closest('[data-id]').dataset.id;
    confirmModal('Remove this class? It will also be removed from your timetable.', () => {
      S.classes = S.classes.filter(c => c.id !== id);
      Object.keys(S.timetable).forEach(k => { if (S.timetable[k] === id) dropKey(k); });
      save(); renderClasses(); renderTT();
    }, 'Remove');
  });
  $('#addClass').onclick = () => {
    S.classes.push({ id: uid('cls'), name: `Class ${S.classes.length + 1}`, courseId: S.courses[0]?.id || '', scheduleId: S.schedules[0]?.id || '', color: nextClassColor(S.classes) });
    save(); renderClasses(); renderTT();
    $('#classList .row-item:last-child [data-k=name]').select();
  };

  /* ---------- timetable (one table per division) ---------- */
  function renderTT() {
    const days = workDays();
    $('#ttWrap').innerHTML = S.schedules.map(s => {
      const labels = [...new Set(VARIANTS.flatMap(v => (s.variants[v] || []).map(p => p.label)))].sort(byLabel);
      if (!labels.length) return `<div><h3>${esc(s.name)}</h3><p class="muted small">No bell times yet.</p></div>`;
      const mine = S.classes.filter(c => c.scheduleId === s.id), others = S.classes.filter(c => c.scheduleId !== s.id);
      const opts = sel => `<option value="">—</option>` +
        (mine.length ? `<optgroup label="${esc(s.name)} classes">${mine.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup>` : '') +
        (others.length ? `<optgroup label="Other classes">${others.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup>` : '');
      return `<div><h3 style="margin-bottom:.45rem">${esc(s.name)}</h3><div class="table-wrap"><table class="table tt-table">
        <thead><tr><th>Period</th>${days.map(d => `<th>${DAY_NAMES[d]}<div class="muted small" style="text-transform:none;letter-spacing:0;font-weight:500">${esc(S.variantNames[variantOf(d)].split(' (')[0])}</div></th>`).join('')}</tr></thead><tbody>
        ${labels.map(label => `<tr><td><strong>${esc(label)}</strong></td>${days.map(d => {
          const p = (s.variants[variantOf(d)] || []).find(x => x.label === label);
          if (!p) return '<td class="faint" style="text-align:center">—</td>';
          const key = `${ttPrefix(ttWeek)}${d}|${s.id}:${label}`, v = S.timetable[key] || '';
          const cls = App.cls(v), c = App.course(cls?.courseId);
          const room = cls ? `<input class="tt-room ${S.rooms[key] ? 'custom' : ''}" data-room="${key}" value="${esc(S.rooms[key] || '')}" placeholder="${esc(cls.room || 'Room')}" aria-label="Room for ${DAY_NAMES[d]} ${esc(s.short)} ${esc(label)}" title="Leave empty to use the class room${cls.room ? ` (${esc(cls.room)})` : ''}">` : '';
          return `<td style="${cls ? `box-shadow:inset 4px 0 0 ${esc(colorFor(cls.id))}` : ''}"><select data-slot="${key}" aria-label="${DAY_NAMES[d]} ${esc(s.short)} ${esc(label)}">${opts(v)}</select>
            <div class="tt-meta"><span class="muted small">${esc(p.start)}–${esc(p.end)}</span>${room}</div></td>`;
        }).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    }).join('');
  }
  $('#ttWrap').addEventListener('change', e => {
    if (e.target.dataset.room) {
      const rk = e.target.dataset.room, v = e.target.value.trim();
      if (v) S.rooms[rk] = v; else delete S.rooms[rk];
      save(); e.target.classList.toggle('custom', !!v);
      toast(v ? `Room set to ${v} for this period` : 'Using the class’s default room', 'success');
      return;
    }
    const k = e.target.dataset.slot; if (!k) return;
    if (e.target.value) S.timetable[k] = e.target.value; else dropKey(k);
    S.onboarded = true;
    save(); renderTT();
    // warn when the new class overlaps another taught period on the same day
    const [dayPart, pid] = k.split('|');
    const day = dayPart.replace('w2:', '');
    // check against a real date in the cycle week being edited
    let wk = weekStart(isoDate());
    if (cycleWeekOf(wk) !== ttWeek) wk = addDays(wk, 7);
    const date = workDays().includes(day) ? addDays(wk, workDays().indexOf(day)) : null;
    if (date && e.target.value) {
      const taught = slotsOn(date).filter(p => p.classId);
      const me = taught.find(p => p.id === pid);
      const other = me && taught.find(p => p !== me && timesOverlap(p, me));
      if (other) toast(`Heads up: this overlaps ${other.name} (${other.start}–${other.end}) on ${DAY_NAMES[day]}`, 'error');
      else toast('Timetable saved', 'success');
    }
  });
  $('#clearTT').onclick = () => confirmModal('Clear the whole weekly timetable for all divisions?', () => { S.timetable = {}; S.rooms = {}; save(); renderTT(); }, 'Clear');

  /* ---------- backup ---------- */
  function storageInfo() {
    let size = 0; try { size = (localStorage.getItem(STORE_KEY) || '').length; } catch (e) { /* ignore */ }
    $('#storageInfo').textContent = `${S.lessons.length} lessons · ${S.assessments.length} assessments · ${S.teachers.length} teachers · ${S.worksheets.length} saved worksheets · about ${Math.max(1, Math.round(size / 1024))} KB used (browsers allow about 5 MB).`;
  }
  $('#exportBtn').onclick = () => { downloadFile(`mathhub-backup-${isoDate()}.json`, JSON.stringify(S, null, 2)); toast('Backup downloaded', 'success'); };
  $('#importBtn').onclick = () => $('#importFile').click();
  $('#importFile').addEventListener('change', async e => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    let data;
    try { data = JSON.parse(await readFileText(file)); } catch (err) { toast('That file is not valid JSON', 'error'); return; }
    if (!data || !data.version || !Array.isArray(data.courses)) { toast('That is not a MathHub backup file', 'error'); return; }
    confirmModal(`Replace ALL current data with the backup “${file.name}”? Export first if you are unsure.`, () => {
      App.state = data; App.save(); location.reload();
    }, 'Replace my data');
  });
  $('#sampleBtn').onclick = () => { loadSampleData(); toast('Sample data added', 'success'); setTimeout(() => location.reload(), 600); };
  $('#resetBells').onclick = () => confirmModal('Restore the default Middle School and High School bell times and day types? Your timetable entries are kept where the period names still exist.', () => {
    S.schedules = seedSchedules(); S.dayVariant = { ...DEFAULT_DAY_VARIANT }; S.variantNames = { ...DEFAULT_VARIANT_NAMES };
    S.classes.forEach(c => { if (!App.schedule(c.scheduleId)) c.scheduleId = c.courseId === 'myp8' ? 'ms' : 'hs'; });
    save(); location.reload();
  }, 'Restore');
  $('#resetBtn').onclick = () => confirmModal('Delete ALL MathHub data in this browser and start fresh? This cannot be undone.', () => {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    location.reload();
  }, 'Delete everything');

  function renderAll() { renderDayTypes(); renderCycle(); renderBells(); renderClasses(); renderTT(); storageInfo(); }
  renderAll();
  if (location.hash) setTimeout(() => $(location.hash)?.scrollIntoView({ behavior: 'smooth' }), 50);
})();
