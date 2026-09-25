(() => {
  const S = App.state;
  const params = new URLSearchParams(location.search);
  let week = weekStart(params.get('date') || isoDate());
  const prefs = S.plannerPrefs || (S.plannerPrefs = { showFree: false, division: '' });

  const weekDates = () => workDays().map((_, i) => addDays(week, i));

  $('#fDivision').innerHTML = '<option value="">All divisions</option>' + S.schedules.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  $('#fDivision').value = prefs.division && App.schedule(prefs.division) ? prefs.division : '';
  $('#showFree').checked = !!prefs.showFree;

  function slotCard(date, p, lessons, taught) {
    const cls = App.cls(p.classId);
    const lesson = lessons.find(l => l.periodId === p.id);
    const course = App.course(lesson?.courseId || cls?.courseId);
    const data = `data-date="${date}" data-period="${p.id}" data-class="${cls?.id || ''}" ${lesson ? `data-lesson="${lesson.id}"` : ''} tabindex="0" role="button"`;
    if (!cls && !lesson) {
      return `<div class="slot free" ${data} aria-label="${esc(p.name)} free, add a lesson"><span class="slot-time">${esc(p.start)}–${esc(p.end)}</span><span class="slot-div">${esc(p.name)}</span><span class="slot-plus">+</span></div>`;
    }
    const clash = p.classId && taught.some(o => o !== p && timesOverlap(o, p));
    const st = lesson ? LESSON_STATUS[lesson.status] || LESSON_STATUS.planned : null;
    return `<div class="slot" style="--c:${esc(colorFor(lesson?.classId || cls?.id, course?.id))}" ${data}>
      <div class="slot-top"><span class="slot-time">${esc(p.start)}–${esc(p.end)}</span><span class="slot-div">${esc(p.name)} ${filesBadge(lesson?.id, 'inline')}</span></div>
      <div class="slot-class">${esc(cls?.name || course?.short || '')}${clash ? ' <span class="overdue-text small">⚠ clash</span>' : ''}</div>
      ${cls && p.room ? `<div class="tl-room"><span class="slot-room">📍 ${esc(p.room)}</span></div>` : ''}
      ${lesson ? `<div class="slot-title">${esc(lesson.title)}</div>${badge(st.label, st.tone)}` : '<div class="slot-empty">Not planned</div>'}
    </div>`;
  }

  // Periods shown for a day: taught ones, ones with a lesson, and free ones if requested.
  function visibleSlots(date) {
    const all = slotsOn(date);
    const lessons = S.lessons.filter(l => l.date === date);
    return {
      all, lessons,
      taught: all.filter(p => p.classId),
      visible: all.filter(p => (!prefs.division || p.schedId === prefs.division)
        && (p.classId || prefs.showFree || lessons.some(l => l.periodId === p.id))),
      loose: lessons.filter(l => !App.periodOn(l.periodId, date)),
    };
  }
  function dayHead(date) {
    const variant = S.variantNames?.[variantOf(weekdayKey(date))] || '';
    return `<header class="day-head"><strong>${esc(DAY_NAMES[weekdayKey(date)])}</strong><span>${esc(fmtDate(date, { day: 'numeric', month: 'short' }))}</span>
      ${variant ? `<small>${esc(variant.split(' (')[0])} bells</small>` : ''}</header>`;
  }
  function dayFooter(date, loose) {
    return `${loose.map(l => { const c = App.course(l.courseId); return `<div class="slot" style="--c:${esc(colorFor(l.classId, l.courseId))}" data-lesson="${l.id}" tabindex="0" role="button">
        <div class="slot-top"><span class="slot-time">No fixed period</span>${filesBadge(l.id, 'inline')}</div><div class="slot-class">${esc(App.cls(l.classId)?.name || c?.short || '')}</div><div class="slot-title">${esc(l.title)}</div></div>`; }).join('')}
      <div class="day-add-row"><button class="btn btn-sm btn-ghost day-add" data-add="${date}">+ Lesson</button><button class="btn btn-sm btn-ghost day-add" data-add-event="${date}">+ Event</button></div>
      <textarea class="day-note" data-note="${date}" aria-label="Notes for ${esc(fmtDate(date))}" placeholder="Notes…">${esc(S.notes[date] || '')}</textarea>`;
  }

  function eventCard(date, ev, taught) {
    const clash = taught.some(p => timesOverlap(p, ev));
    return `<div class="slot ev-card" style="--c:${esc(ev.color)}" data-event="${ev.id}" data-occ="${date}" tabindex="0" role="button">
      <div class="slot-top"><span class="slot-time">${esc(ev.start)}–${esc(ev.end)}</span><span class="slot-div">${ev.repeat !== 'none' ? '↻ ' : ''}Event</span></div>
      <div class="slot-class">◆ ${esc(ev.title)}${clash ? ' <span class="overdue-text small">⚠ overlaps a class</span>' : ''}</div>
      ${ev.location ? `<div class="small muted">📍 ${esc(ev.location)}</div>` : ''}
    </div>`;
  }

  function dayColumn(date) {
    const { lessons, taught, visible, loose } = visibleSlots(date);
    const items = [
      ...visible.map(p => ({ t: p.start, html: slotCard(date, p, lessons, taught) })),
      ...eventsOn(date).map(ev => ({ t: ev.start, html: eventCard(date, ev, taught) })),
    ].sort((a, b) => a.t.localeCompare(b.t));
    return `<section class="day-col ${date === isoDate() ? 'is-today' : ''}">${dayHead(date)}
      <div class="day-body">
        ${items.map(i => i.html).join('') || '<p class="faint small" style="text-align:center;margin:.6rem 0">No classes</p>'}
        ${dayFooter(date, loose)}
      </div></section>`;
  }

  /* ---------- timeline view ---------- */
  let PX = 1.9; // pixels per minute (smaller while building the print version)
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fmtMin = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  // Side-by-side lanes for blocks that overlap (e.g. MS and HS periods at the same time).
  function layoutLanes(blocks) {
    blocks.sort((a, b) => a.s - b.s || b.e - a.e);
    let cluster = [], lanes = [], clusterEnd = -1;
    const flush = () => { cluster.forEach(b => { b.lanes = lanes.length; }); cluster = []; lanes = []; clusterEnd = -1; };
    blocks.forEach(b => {
      if (cluster.length && b.s >= clusterEnd) flush();
      let i = lanes.findIndex(end => end <= b.s);
      if (i < 0) { i = lanes.length; lanes.push(b.e); } else lanes[i] = b.e;
      b.lane = i;
      cluster.push(b);
      clusterEnd = Math.max(clusterEnd, b.e);
    });
    flush();
    return blocks;
  }

  // Free gaps between busy periods inside the day.
  function gapsOf(blocks) {
    const busy = blocks.filter(b => b.busy).map(b => [b.s, b.e]).sort((a, b) => a[0] - b[0]);
    const merged = [];
    busy.forEach(([s, e]) => { const last = merged[merged.length - 1]; if (last && s <= last[1]) last[1] = Math.max(last[1], e); else merged.push([s, e]); });
    const gaps = [];
    for (let i = 1; i < merged.length; i++) if (merged[i][0] - merged[i - 1][1] >= 10) gaps.push([merged[i - 1][1], merged[i][0]]);
    return gaps;
  }

  function tlBlock(date, b, start, lessons, taught) {
    const p = b.p;
    const cls = App.cls(p.classId);
    const lesson = lessons.find(l => l.periodId === p.id);
    const course = App.course(lesson?.courseId || cls?.courseId);
    const top = (b.s - start) * PX, h = Math.max((b.e - b.s) * PX - 2, 14), w = 100 / b.lanes;
    const pos = `top:${top}px;height:${h}px;left:calc(${b.lane * w}% + 2px);width:calc(${w}% - 4px)`;
    const data = `data-date="${date}" data-period="${p.id}" data-class="${cls?.id || ''}" ${lesson ? `data-lesson="${lesson.id}"` : ''} tabindex="0" role="button"`;
    const endTag = `<span class="tl-end">${esc(p.end)}</span>`;
    if (!cls && !lesson) {
      return `<div class="slot tl-block free" style="${pos}" ${data} title="${esc(`${p.name} ${p.start}–${p.end} · free`)}"><span>${esc(p.name)}</span>${endTag}</div>`;
    }
    const clash = p.classId && taught.some(o => o !== p && timesOverlap(o, p));
    const st = lesson ? LESSON_STATUS[lesson.status] || LESSON_STATUS.planned : null;
    const room = cls ? p.room : '';
    const tip = `${p.start}–${p.end} · ${p.name} · ${cls?.name || course?.short || ''}${room ? ` · Room ${room}` : ''}${lesson ? ` · ${lesson.title} (${st.label})` : ' · not planned'}${clash ? ' · CLASH' : ''}`;
    if (h < 34) {
      return `<div class="slot tl-block micro ${clash ? 'clash' : ''} ${lesson ? '' : 'unplanned'}" style="--c:${esc(colorFor(lesson?.classId || cls?.id, course?.id))};${pos}" ${data} title="${esc(tip)}">
        <div class="tl-micro"><span class="slot-time">${esc(p.start)}<span class="micro-end">–${esc(p.end)}</span></span> <span class="slot-class">${esc(cls?.name || course?.short || '')}</span>${room ? ` <span class="micro-loc">📍 ${esc(room)}</span>` : ''} <span>${lesson ? esc(lesson.title) : 'Not planned'}</span></div>
        ${filesBadge(lesson?.id)}
      </div>`;
    }
    const tiny = h < 58;
    // with the room on its own line, a 40-minute block only has space for one line of title
    const short = !tiny && room && h < 80;
    return `<div class="slot tl-block ${tiny ? 'tiny' : ''} ${short ? 'short' : ''} ${clash ? 'clash' : ''} ${lesson ? '' : 'unplanned'}" style="--c:${esc(colorFor(lesson?.classId || cls?.id, course?.id))};${pos}" ${data} title="${esc(tip)}">
      <div class="tl-line"><span class="slot-time">${esc(p.start)}</span> <span class="slot-class">${esc(cls?.name || course?.short || '')}</span> <span class="slot-div">${esc(p.name)}</span></div>
      ${room && !tiny ? `<div class="tl-room"><span class="slot-room">📍 ${esc(room)}</span></div>` : ''}
      <div class="tl-title">${room && tiny ? `<span class="slot-room">📍 ${esc(room)}</span> ` : ''}${lesson ? `<i class="dot tone-${st.tone}"></i> ${esc(lesson.title)}` : '<span class="slot-empty">Not planned</span>'}</div>
      ${endTag}${filesBadge(lesson?.id)}
    </div>`;
  }

  function tlEvent(date, b, start, taught) {
    const ev = b.ev;
    const top = (b.s - start) * PX, h = Math.max((b.e - b.s) * PX - 2, 14), w = 100 / b.lanes;
    const pos = `top:${top}px;height:${h}px;left:calc(${b.lane * w}% + 2px);width:calc(${w}% - 4px)`;
    const clash = taught.some(p => timesOverlap(p, ev));
    const tip = `${ev.start}–${ev.end} · ${ev.title}${ev.location ? ` · ${ev.location}` : ''}${ev.repeat !== 'none' ? ` · ${repeatText(ev)}` : ''}${clash ? ' · overlaps a class' : ''}`;
    if (h < 34) {
      // very short (≈ under 18 min): one compact line; hover/focus expands it
      return `<div class="slot tl-block ev-block micro ${clash ? 'clash' : ''}" style="--c:${esc(ev.color)};${pos}" data-event="${ev.id}" data-occ="${date}" tabindex="0" role="button" title="${esc(tip)}">
        <div class="tl-micro"><span class="slot-time">${esc(ev.start)}<span class="micro-end">–${esc(ev.end)}</span></span> <span class="slot-class">${esc(ev.title)}</span>${ev.location ? ` <span class="micro-loc">📍 ${esc(ev.location)}</span>` : ''}</div>
      </div>`;
    }
    return `<div class="slot tl-block ev-block ${h < 58 ? 'tiny' : ''} ${clash ? 'clash' : ''}" style="--c:${esc(ev.color)};${pos}" data-event="${ev.id}" data-occ="${date}" tabindex="0" role="button" title="${esc(tip)}">
      <div class="tl-line"><span class="slot-time">${esc(ev.start)}</span> <span class="slot-class">${ev.repeat !== 'none' ? '↻ ' : '◆ '}${esc(ev.title)}</span></div>
      <div class="tl-title">${ev.location ? `📍 ${esc(ev.location)}` : '<span class="slot-empty">Event</span>'}</div>
      <span class="tl-end">${esc(ev.end)}</span>
    </div>`;
  }

  function renderTimeline(dates) {
    const t = timelineHTML(dates);
    const grid = $('#weekGrid');
    grid.style.gridTemplateColumns = t.cols;
    grid.innerHTML = t.html;
  }

  // Builds one week's timeline. mode 'screen' = interactive; 'print' = scaled down, notes as text, no "now" line.
  function timelineHTML(dates, { mode = 'screen', scale = 1.9, notes = true } = {}) {
    const prevPX = PX;
    PX = scale;
    try { return buildTimeline(dates, mode, notes); } finally { PX = prevPX; }
  }

  function buildTimeline(dates, mode, withNotes) {
    const screen = mode === 'screen';
    // Visible range: whole school day of every division shown plus any events, rounded to half hours.
    let lo = Infinity, hi = -Infinity;
    dates.forEach(d => periodsOn(d).filter(p => !prefs.division || p.schedId === prefs.division)
      .forEach(p => { lo = Math.min(lo, toMin(p.start)); hi = Math.max(hi, toMin(p.end)); }));
    dates.forEach(d => eventsOn(d).forEach(ev => { lo = Math.min(lo, toMin(ev.start)); hi = Math.max(hi, toMin(ev.end)); }));
    if (!isFinite(lo)) { lo = 7 * 60 + 30; hi = 15 * 60; }
    const start = Math.floor(lo / 30) * 30, end = Math.ceil(hi / 30) * 30;
    const H = (end - start) * PX;
    const today = screen ? isoDate() : '';
    const hourOffset = (start % 60) * PX;
    const bg = `background-size:100% ${60 * PX}px, 100% ${30 * PX}px;background-position:0 ${-hourOffset}px, 0 0`;

    let axis = '';
    for (let m = start; m <= end; m += 30) {
      axis += `<span class="tl-tick ${m % 60 ? 'half' : ''}" style="top:${(m - start) * PX}px">${m % 60 ? '' : fmtMin(m)}</span>`;
    }
    const cols = dates.map(date => {
      const { lessons, taught, visible } = visibleSlots(date);
      const blocks = layoutLanes([
        ...visible.map(p => ({ p, s: toMin(p.start), e: toMin(p.end), busy: !!(p.classId || lessons.some(l => l.periodId === p.id)) })),
        ...eventsOn(date).map(ev => ({ ev, s: toMin(ev.start), e: toMin(ev.end), busy: true })),
      ]);
      const gaps = gapsOf(blocks).map(([s, e]) => `<div class="tl-gap" style="top:${(s - start) * PX}px;height:${(e - s) * PX}px">${(e - s) * PX >= 16 ? `free · ${e - s} min` : ''}</div>`).join('');
      let now = '';
      if (date === today) {
        const n = new Date(), m = n.getHours() * 60 + n.getMinutes();
        if (m >= start && m <= end) now = `<div class="tl-now" data-start="${start}" style="top:${(m - start) * PX}px"></div>`;
      }
      return `<div class="tl-day ${date === today ? 'is-today' : ''}" data-date="${date}" data-start="${start}" style="height:${H}px;${bg}" ${screen ? 'title="Click an empty spot to add an event at that time"' : ''}>${gaps}${blocks.map(b => b.ev ? tlEvent(date, b, start, taught) : tlBlock(date, b, start, lessons, taught)).join('')}${now}</div>`;
    });
    let foot = '';
    if (screen) {
      foot = `<div></div>${dates.map(d => `<div class="day-body tl-foot">${dayFooter(d, visibleSlots(d).loose)}</div>`).join('')}`;
    } else {
      // print: lessons without a period and (optionally) day notes, as plain text
      const texts = dates.map(d => {
        const loose = visibleSlots(d).loose.map(l => `• ${l.title}`);
        const note = withNotes && S.notes[d] ? [S.notes[d]] : [];
        return [...loose, ...note].join('\n');
      });
      if (texts.some(Boolean)) foot = `<div></div>${texts.map(x => `<div class="print-note">${esc(x)}</div>`).join('')}`;
    }
    return {
      cols: screen ? `52px repeat(${dates.length}, minmax(170px, 1fr))` : `38px repeat(${dates.length}, minmax(0, 1fr))`,
      html: `<div class="tl-corner"></div>${dates.map(d => `<div class="day-col tl-headcell ${d === today ? 'is-today' : ''}">${dayHead(d)}</div>`).join('')}` +
        `<div class="tl-axis" style="height:${H}px">${axis}</div>${cols.join('')}${foot}`,
    };
  }

  /* ---------- printing (one week, or both weeks of the cycle) ---------- */
  function printWeeks(count, withNotes) {
    let first = week;
    if (count === 2 && cycleOn() && cycleWeekOf(week) === 2) first = addDays(week, -7); // always Week 1 then Week 2
    const starts = count === 2 ? [first, addDays(first, 7)] : [week];
    const division = prefs.division ? App.schedule(prefs.division)?.name : '';
    const html = starts.map(ws => {
      const dates = workDays().map((_, i) => addDays(ws, i));
      const t = timelineHTML(dates, { mode: 'print', scale: 1.15, notes: withNotes });
      const range = `${fmtDate(dates[0], { day: 'numeric', month: 'short' })} – ${fmtDate(dates[dates.length - 1], { day: 'numeric', month: 'short', year: 'numeric' })}`;
      return `<section class="print-week">
        <header class="print-head"><h2>${cycleOn() ? `${esc(cycleLabel(ws))} · ` : ''}${esc(range)}</h2>
          <span>${esc([S.profile.name, S.profile.school, division].filter(Boolean).join(' · '))}</span></header>
        <div class="week-grid timeline print-grid" style="grid-template-columns:${t.cols}">${t.html}</div></section>`;
    }).join('');
    let area = $('#printArea');
    if (!area) { area = document.createElement('div'); area.id = 'printArea'; area.className = 'print-area'; document.body.appendChild(area); }
    area.innerHTML = html;
    document.documentElement.dataset.theme = 'light'; // print on white paper even in dark mode
    document.body.classList.add('printing-weeks');
    setTimeout(() => window.print(), 60);
  }
  window.addEventListener('afterprint', () => {
    if (!document.body.classList.contains('printing-weeks')) return;
    document.body.classList.remove('printing-weeks');
    applyTheme(getTheme());
  });

  function render() {
    const dates = weekDates();
    $('#weekLabel').innerHTML = `${esc(fmtDate(dates[0], { day: 'numeric', month: 'short' }))} – ${esc(fmtDate(dates[dates.length - 1], { day: 'numeric', month: 'short', year: 'numeric' }))}` +
      (cycleOn() ? ` ${badge(cycleLabel(dates[0]), cycleWeekOf(dates[0]) === 1 ? 'info' : 'warning')}` : '');
    let slots = 0, planned = 0, clashes = 0;
    dates.forEach(d => {
      const taught = slotsOn(d).filter(p => p.classId);
      taught.forEach(p => {
        slots++;
        if (S.lessons.some(l => l.date === d && l.periodId === p.id)) planned++;
        if (taught.some(o => o !== p && timesOverlap(o, p))) clashes++;
      });
    });
    $('#weekSummary').innerHTML = slots ? `${planned} of ${slots} timetabled lessons planned this week${clashes ? ` · <span class="overdue-text">${clashes} periods clash</span>` : ''}` : 'Plan lessons across your week';
    $('#emptyTT').innerHTML = Object.keys(S.timetable).length ? '' :
      `<div class="empty-hint">Your timetable is empty. <a href="settings.html#timetable">Set it up in Settings</a> so your Middle School and High School classes appear here. You can still add lessons with “+ Add lesson”.</div>`;
    const view = prefs.view === 'list' ? 'list' : 'timeline';
    $$('#viewToggle button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    $('#weekGrid').classList.toggle('timeline', view === 'timeline');
    if (view === 'timeline') { renderTimeline(dates); return; }
    $('#weekGrid').style.gridTemplateColumns = `repeat(${dates.length}, minmax(190px, 1fr))`;
    $('#weekGrid').innerHTML = dates.map(dayColumn).join('');
  }

  $('#viewToggle').addEventListener('click', e => {
    const b = e.target.closest('[data-view]'); if (!b) return;
    prefs.view = b.dataset.view; App.save(true); render();
  });
  // keep the "now" line moving without re-rendering (notes may be in use)
  setInterval(() => {
    const line = $('.tl-now'); if (!line) return;
    const n = new Date();
    line.style.top = `${(n.getHours() * 60 + n.getMinutes() - Number(line.dataset.start)) * PX}px`;
  }, 60000);

  function open(el) {
    if (el.dataset.lesson) openLessonEditor(S.lessons.find(l => l.id === el.dataset.lesson), render);
    else openLessonEditor({ date: el.dataset.date, periodId: el.dataset.period, classId: el.dataset.class }, render);
  }
  const grid = $('#weekGrid');
  const openEvent = el => openEventEditor((S.events || []).find(ev => ev.id === el.dataset.event), render, el.dataset.occ);
  grid.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) { openLessonEditor({ date: add.dataset.add }, render); return; }
    const addEv = e.target.closest('[data-add-event]');
    if (addEv) { openEventEditor({ date: addEv.dataset.addEvent }, render); return; }
    const ev = e.target.closest('[data-event]');
    if (ev) { openEvent(ev); return; }
    const slot = e.target.closest('.slot');
    if (slot) { open(slot); return; }
    // empty spot on the timeline → new event starting there (rounded to 5 minutes)
    const day = e.target.closest('.tl-day');
    if (day) {
      const m = Number(day.dataset.start) + Math.round((e.clientY - day.getBoundingClientRect().top) / PX / 5) * 5;
      openEventEditor({ date: day.dataset.date, start: fmtMin(m), end: fmtMin(m + 30) }, render);
    }
  });
  grid.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.closest('[data-files-lesson]')) return; // the 📎 button handles its own Enter/Space
    const ev = e.target.closest('[data-event]');
    if (ev) { e.preventDefault(); openEvent(ev); return; }
    const slot = e.target.closest('.slot');
    if (slot) { e.preventDefault(); open(slot); }
  });
  const saveNote = debounce(el => {
    if (el.value.trim()) S.notes[el.dataset.note] = el.value; else delete S.notes[el.dataset.note];
    App.save();
  }, 400);
  grid.addEventListener('input', e => { if (e.target.dataset.note) saveNote(e.target); });

  $('#fDivision').addEventListener('change', e => { prefs.division = e.target.value; App.save(true); render(); });
  $('#showFree').addEventListener('change', e => { prefs.showFree = e.target.checked; App.save(true); render(); });
  $('#prevWeek').onclick = () => { week = addDays(week, -7); render(); };
  $('#nextWeek').onclick = () => { week = addDays(week, 7); render(); };
  $('#thisWeek').onclick = () => { week = weekStart(isoDate()); render(); };
  $('#printWeek').onclick = () => {
    const two = cycleOn() ? 'Two-week cycle (Week 1 + Week 2)' : 'Two weeks (this week + next week)';
    openModal({
      title: 'Print weekly planner',
      body: `<div class="stack" style="gap:.7rem">
        <label class="inline"><input type="radio" name="pw" value="1" ${cycleOn() ? '' : 'checked'}> This week only</label>
        <label class="inline"><input type="radio" name="pw" value="2" ${cycleOn() ? 'checked' : ''}> ${two}</label>
        <label class="inline"><input type="checkbox" data-notes checked> Include day notes</label>
        <p class="muted small" style="margin:0">Each week prints on its own landscape page${prefs.division ? ` (only ${esc(App.schedule(prefs.division)?.name || '')}, as filtered)` : ''}. In the print dialog, turn on <strong>Background graphics</strong> to keep the colours.</p>
      </div>`,
      actions: [{ label: 'Cancel', cls: 'btn-ghost' }, {
        label: 'Print', cls: 'btn-primary', onClick: dlg => {
          const count = Number($('input[name=pw]:checked', dlg).value);
          const notes = $('[data-notes]', dlg).checked;
          setTimeout(() => printWeeks(count, notes), 0); // after the dialog has closed
        },
      }],
    });
  };
  $('#copyWeek').onclick = () => {
    const dates = weekDates();
    const src = S.lessons.filter(l => dates.includes(l.date));
    if (!src.length) { toast('There are no lessons in this week to copy', 'error'); return; }
    // In a two-week cycle the matching timetable is two weeks ahead.
    const step = cycleOn() ? 14 : 7;
    const target = cycleOn() ? `the same days two weeks later (next ${cycleLabel(dates[0])})` : 'the same days next week';
    confirmModal(`Copy ${src.length} lesson plan(s) to ${target}? Periods that already have a lesson are skipped.`, () => {
      let n = 0;
      src.forEach(l => {
        const date = addDays(l.date, step);
        if (l.periodId && S.lessons.some(x => x.date === date && x.periodId === l.periodId)) return;
        S.lessons.push({ ...JSON.parse(JSON.stringify(l)), id: uid('L'), date, status: 'planned', reflection: '' });
        n++;
      });
      App.save();
      week = addDays(week, step);
      render();
      toast(`${n} lesson(s) copied`, 'success');
    }, 'Copy lessons');
  };

  if (cycleOn()) $('#copyWeek').textContent = 'Copy to next cycle';
  $('#newEvent').onclick = () => {
    const d = weekDates().includes(isoDate()) ? isoDate() : week;
    openEventEditor({ date: d }, render);
  };
  render();
})();
