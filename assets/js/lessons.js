(() => {
  const S = App.state;
  $('#fCourse').innerHTML = courseOptions('', 'All courses');
  $('#fStatus').innerHTML = '<option value="">Any status</option>' + Object.entries(LESSON_STATUS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');

  function filtered() {
    const q = $('#q').value.trim().toLowerCase();
    const course = $('#fCourse').value, status = $('#fStatus').value, range = $('#fRange').value;
    const today = isoDate(), mon = weekStart(today), fri = addDays(mon, 6);
    return S.lessons.filter(l => {
      if (course && l.courseId !== course) return false;
      if (status && l.status !== status) return false;
      if (range === 'upcoming' && l.date < today) return false;
      if (range === 'past' && l.date >= today) return false;
      if (range === 'week' && (l.date < mon || l.date > fri)) return false;
      if (q && !`${l.title} ${l.objectives} ${l.main} ${l.resources}`.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => {
      const order = range === 'past' ? -1 : 1;
      return order * (a.date.localeCompare(b.date) || (App.periodOn(a.periodId, a.date)?.start || '').localeCompare(App.periodOn(b.periodId, b.date)?.start || ''));
    });
  }

  function render() {
    const list = filtered();
    const taught = S.lessons.filter(l => l.status === 'taught').length;
    $('#summary').textContent = `${S.lessons.length} lesson plans · ${taught} taught`;
    if (!list.length) {
      $('#list').innerHTML = `<div class="card"><p class="empty">No lessons match these filters. <button class="link" id="emptyNew">Create a lesson plan</button></p></div>`;
      $('#emptyNew').onclick = () => openLessonEditor({}, render);
      return;
    }
    const groups = {};
    list.forEach(l => (groups[l.date] = groups[l.date] || []).push(l));
    $('#list').innerHTML = Object.entries(groups).map(([date, ls]) => `<section class="lesson-group">
      <h3>${esc(fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))} · ${relDay(date)}</h3>
      ${ls.map(l => {
        const c = App.course(l.courseId), u = App.unit(l.courseId, l.unitId), p = App.periodOn(l.periodId, l.date), cls = App.cls(l.classId);
        return `<article class="lesson-card" style="--c:${esc(colorFor(l.classId, l.courseId))}">
          <div class="grow">
            <h4>${esc(l.title)}</h4>
            <div class="lesson-meta">${courseTag(c)}${cls ? `<span>${esc(cls.name)}</span>` : ''}${p ? `<span>· ${esc(p.name)} ${esc(p.start)}</span>` : ''}${u ? `<span>· ${esc(u.title)}</span>` : ''}
              ${l.criteria?.length ? `<span class="chip">Crit ${esc(l.criteria.join(', '))}</span>` : ''} ${statusBadge(LESSON_STATUS, l.status)}</div>
            ${l.objectives ? `<div class="lesson-obj">${esc(l.objectives)}</div>` : ''}
          </div>
          <div class="lesson-actions">
            <button class="btn btn-sm btn-ghost" data-act="edit" data-id="${l.id}">Edit</button>
            <button class="btn btn-sm btn-ghost" data-act="dup" data-id="${l.id}">Duplicate</button>
            <button class="btn btn-sm btn-ghost" data-act="print" data-id="${l.id}">Print</button>
            <a class="btn btn-sm btn-ghost" href="ai.html?lesson=${l.id}" title="Create lesson content with Claude">🤖 AI${(S.aiResults || []).some(r => r.lessonId === l.id) ? ' ✓' : ''}</a>
            ${l.status !== 'taught' ? `<button class="btn btn-sm btn-soft" data-act="taught" data-id="${l.id}">Mark taught</button>` : ''}
          </div></article>`;
      }).join('')}</section>`).join('');
  }

  $('#list').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const l = S.lessons.find(x => x.id === b.dataset.id);
    if (!l) return;
    if (b.dataset.act === 'edit') openLessonEditor(l, render);
    if (b.dataset.act === 'dup') openLessonEditor({ ...JSON.parse(JSON.stringify(l)), id: null, title: `${l.title} (copy)`, status: 'planned', reflection: '', periodId: '' }, render);
    if (b.dataset.act === 'print') printLesson(l);
    if (b.dataset.act === 'taught') { l.status = 'taught'; App.save(); render(); toast('Marked as taught — add a reflection when you can'); }
  });

  $('#newLesson').onclick = () => openLessonEditor({ courseId: $('#fCourse').value }, render);
  ['#q', '#fCourse', '#fStatus', '#fRange'].forEach(s => $(s).addEventListener('input', render));

  $('#exportCsv').onclick = () => {
    const cols = ['date', 'period', 'class', 'course', 'unit', 'title', 'objectives', 'criteria', 'starter', 'main', 'plenary', 'homework', 'differentiation', 'resources', 'status', 'reflection'];
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [...S.lessons].sort((a, b) => a.date.localeCompare(b.date)).map(l => [
      l.date, periodText(App.periodOn(l.periodId, l.date)), App.cls(l.classId)?.name, App.course(l.courseId)?.short, App.unit(l.courseId, l.unitId)?.title,
      l.title, l.objectives, (l.criteria || []).join(' '), l.starter, l.main, l.plenary, l.homework, l.differentiation, l.resources, l.status, l.reflection,
    ].map(q).join(','));
    downloadFile(`lesson-plans-${isoDate()}.csv`, '﻿' + [cols.join(','), ...rows].join('\r\n'), 'text/csv');
  };

  render();
})();
