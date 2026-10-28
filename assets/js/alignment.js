(() => {
  /* Curriculum alignment page: renders ALIGN (alignment-data.js) with the shared AlignCalc helpers. */
  const { B, topicsOf, myp, COURSES, STATUS, courseTopics, counts, pct } = AlignCalc;
  const PRIORITY = { high: ['High', 'danger'], medium: ['Medium', 'warning'], low: ['Low', 'neutral'], ok: ['Fine', 'success'] };
  const pill = (s, short = false) => `<span class="badge tone-${STATUS[s][1]}" title="${STATUS[s][0]}">${short ? s : `${s} · ${STATUS[s][0]}`}</span>`;
  const prio = p => `<span class="badge tone-${PRIORITY[p][1]}">${PRIORITY[p][0]}</span>`;
  const mypChip = (ref, dim = false) => {
    const m = myp(ref);
    return `<span class="al-chip g${m.grade}${dim ? ' dim' : ''}" title="${esc(`MYP ${m.grade} ${m.code} ${m.title}${m.outcomes.length ? `\n• ${m.outcomes.join('\n• ')}` : ''}`)}"><b>${m.grade}</b> ${esc(m.code)} ${esc(m.title)}${m.ext ? ' <span class="al-ext">E</span>' : ''}</span>`;
  };

  $('#asOf').textContent = `Based on the MYP 8, MYP 9, MYP 10, DP AA and DP AI curricula in the library (${ALIGN.asOf}).`;
  $('#printBtn').onclick = () => window.print();

  /* ---------- pathways ---------- */
  function renderPathways() {
    const n = AlignCalc.levelCount;
    const box = (label, sub, cls = '') => `<div class="al-node ${cls}"><strong>${esc(label)}</strong><span>${esc(sub)}</span></div>`;
    const arrow = '<div class="al-arrow" aria-hidden="true">→</div>';
    $('#pathwayDiagram').innerHTML = `<div class="al-flow">
      ${box('MYP 8', `${AlignCalc.myp8Count()} topics · all students`, 'start')}
      <div class="al-fork">
        <div class="al-lane std">${arrow}${box('MYP 9 Standard', `${n('myp9', 'Standard')} topics`)}${arrow}${box('MYP 10 Standard', `${n('myp10', 'Standard')} topics`)}${arrow}
          <div class="al-ends">${box('AA SL', `${courseTopics(COURSES[0]).length} topics`, 'dp')}${box('AI SL', `${courseTopics(COURSES[2]).length} topics`, 'dp')}</div></div>
        <div class="al-lane ext">${arrow}${box('MYP 9 Extended', `${n('myp9', 'Extended')} topics`)}${arrow}${box('MYP 10 Extended', `${n('myp10', 'Extended')} topics`)}${arrow}
          <div class="al-ends">${box('AA HL', `${courseTopics(COURSES[1]).length} topics`, 'dp hl')}${box('AI HL', `${courseTopics(COURSES[3]).length} topics`, 'dp hl')}</div></div>
      </div></div>`;
  }

  /* ---------- KPIs ---------- */
  function renderKpis() {
    $('#kpis').innerHTML = COURSES.map(c => {
      const list = courseTopics(c), k = counts(list), total = list.length, gaps = list.filter(t => t.gaps.length).length;
      return `<div class="card al-kpi"><div class="al-kpi-head"><strong>${c.label}</strong><span class="small muted">${esc(c.from)}</span></div>
        <div class="al-kpi-num">${pct(k.R + k.P, total)}%<span class="small muted"> of ${total} topics have MYP groundwork</span></div>
        <div class="al-bar" role="img" aria-label="${k.R} repeat, ${k.P} partly, ${k.N} new">
          <span class="r" style="width:${pct(k.R, total)}%"></span><span class="p" style="width:${pct(k.P, total)}%"></span><span class="n" style="width:${pct(k.N, total)}%"></span></div>
        <div class="al-kpi-legend small"><span>${pill('R', true)} ${k.R}</span><span>${pill('P', true)} ${k.P}</span><span>${pill('N', true)} ${k.N}</span><span><span class="al-gap-mark">!</span> ${gaps} with gaps</span></div></div>`;
    }).join('');
  }

  /* ---------- findings (numbers computed from the data) ---------- */
  function renderFindings() {
    $('#findingList').innerHTML = AlignCalc.findings().map(([t, d]) => `<li><strong>${esc(t)}.</strong> ${esc(d)}</li>`).join('');
  }

  /* ---------- heatmap: topics per strand and stage ---------- */
  function renderHeatmap() {
    const strands = AlignCalc.STRANDS, cols = AlignCalc.strandColumns();
    const max = Math.max(...cols.flatMap(c => c[1]));
    $('#heatmap').innerHTML = `<table class="table al-heat"><thead><tr><th>Strand</th>${cols.map(([h], i) => `<th class="num${i === 5 ? ' sep' : ''}">${h}</th>`).join('')}</tr></thead><tbody>
      ${strands.map((s, r) => `<tr><td>${s}</td>${cols.map(([, v], i) => `<td class="num${i === 5 ? ' sep' : ''}" style="--a:${Math.round(v[r] / max * 100)}%">${v[r] || '—'}</td>`).join('')}</tr>`).join('')}
      <tr class="al-total"><td>Total</td>${cols.map(([, v], i) => `<td class="num${i === 5 ? ' sep' : ''}">${v.reduce((a, b) => a + b, 0)}</td>`).join('')}</tr></tbody></table>`;
  }

  /* ---------- gaps ---------- */
  function renderGaps() {
    const order = { high: 0, medium: 1, low: 2 };
    $('#gapTable').innerHTML = `<table class="table"><thead><tr><th>Priority</th><th>Missing in MYP</th><th>Needed for</th><th>Suggested place</th></tr></thead><tbody>
      ${[...ALIGN.gaps].sort((a, b) => order[a.priority] - order[b.priority]).map(g => `<tr>
        <td>${prio(g.priority)}</td>
        <td><strong>${esc(g.title)}</strong><div class="small muted">${esc(g.why)}</div></td>
        <td><div class="al-tags">${g.courses.map(c => `<span class="badge tone-neutral">${esc(c)}</span>`).join(' ')}</div><div class="small muted" style="margin-top:.25rem">${esc(g.dp.join(', '))}</div></td>
        <td class="small">${esc(g.where)}</td></tr>`).join('')}</tbody></table>`;
  }

  /* ---------- coverage map ---------- */
  let course = COURSES[0], filter = '';
  function renderCourseTabs() {
    $('#courseTabs').innerHTML = COURSES.map(c => `<button class="tab ${c === course ? 'active' : ''}" data-course="${c.key}" role="tab">${c.label}</button>`).join('');
    const list = courseTopics(course), k = counts(list), g = list.filter(t => t.gaps.length).length;
    $('#statusFilter').innerHTML = [['', `All (${list.length})`], ['R', `Repeat (${k.R})`], ['P', `Partly (${k.P})`], ['N', `New (${k.N})`], ['gap', `With gaps (${g})`]]
      .map(([v, l]) => `<button class="chip-btn ${filter === v ? 'active' : ''}" data-filter="${v}">${l}</button>`).join('') + `<span class="small muted">Pathway: ${esc(course.from)}</span>`;
  }
  function renderCoverage() {
    renderCourseTabs();
    const list = courseTopics(course).filter(t => !filter || (filter === 'gap' ? t.gaps.length : t.status === filter));
    const units = [...new Set(list.map(t => t.unit))];
    $('#coverageMap').innerHTML = units.map(u => `<h3 class="al-unit">${esc(u)}</h3><div class="table-wrap"><table class="table al-cov"><tbody>
      ${list.filter(t => t.unit === u).map(t => `<tr>
        <td class="al-code"><b>${esc(t.code)}</b></td>
        <td class="al-title" title="${esc(t.outcomes.map(o => `• ${o.text}`).join('\n'))}">${esc(t.title)}</td>
        <td>${pill(t.status)}</td>
        <td class="al-from">${t.from.map(r => mypChip(r)).join('') || '<span class="muted small">—</span>'}</td>
        <td class="small">${esc(t.note)}${t.gaps.map(gp => `<div class="al-gap"><span class="al-gap-mark">!</span> ${esc(gp)}</div>`).join('')}</td></tr>`).join('')}</tbody></table></div>`).join('') || '<p class="muted">No topics match this filter.</p>';
  }
  $('#courseTabs').addEventListener('click', e => { const b = e.target.closest('[data-course]'); if (b) { course = COURSES.find(c => c.key === b.dataset.course); renderCoverage(); } });
  $('#statusFilter').addEventListener('click', e => { const b = e.target.closest('[data-filter]'); if (b) { filter = b.dataset.filter; renderCoverage(); } });

  /* ---------- MYP topics repeated in DP (inverse of the coverage map) ---------- */
  let grade = 10;
  function renderRepeats() {
    $('#gradeTabs').innerHTML = [8, 9, 10].map(g => `<button class="tab ${g === grade ? 'active' : ''}" data-grade="${g}" role="tab">MYP ${g}</button>`).join('');
    const use = {}; // ref → { courseKey: [{ code, status }] }
    COURSES.forEach(c => courseTopics(c).forEach(t => {
      if (t.status === 'N') return;
      t.from.forEach(r => { ((use[r] = use[r] || {})[c.key] = use[r][c.key] || []).push({ code: t.code, status: t.status }); });
    }));
    const refs = grade === 8 ? Object.keys(ALIGN.myp8).map(c => `8:${c}`) : topicsOf(B[`myp${grade}`]).map(t => `${grade}:${t.code}`);
    const only = new Set(ALIGN.mypOnly.map(m => m.ref));
    $('#repeatTable').innerHTML = `<table class="table al-rep"><thead><tr><th>MYP ${grade} topic</th>${COURSES.map(c => `<th>${c.label}</th>`).join('')}</tr></thead><tbody>
      ${refs.map(r => {
        const u = use[r] || {}, any = Object.keys(u).length;
        return `<tr class="${any ? '' : 'none'}"><td>${mypChip(r)}${!any && only.has(r) ? '<div class="small muted">Not continued in DP</div>' : ''}</td>
          ${COURSES.map(c => `<td>${(u[c.key] || []).map(x => `<span class="al-dp ${x.status}" title="${STATUS[x.status][0]}">${esc(x.code)}</span>`).join(' ') || '<span class="muted small">—</span>'}</td>`).join('')}</tr>`;
      }).join('')}</tbody></table>`;
  }
  $('#gradeTabs').addEventListener('click', e => { const b = e.target.closest('[data-grade]'); if (b) { grade = Number(b.dataset.grade); renderRepeats(); } });

  /* ---------- placement, spiral, MYP-only, recommendations ---------- */
  function renderRest() {
    $('#placementTable').innerHTML = `<table class="table"><thead><tr><th>MYP topic</th><th>Issue</th><th>Suggestion</th><th></th></tr></thead><tbody>
      ${ALIGN.placement.map(p => `<tr><td>${mypChip(p.myp)}</td><td class="small">${esc(p.issue)}</td><td class="small">${esc(p.fix)}</td><td>${prio(p.priority)}</td></tr>`).join('')}</tbody></table>`;
    const kind = { deepens: ['Deepens', 'success'], duplicate: ['Duplicate', 'warning'], 'long gap': ['Long gap', 'neutral'] };
    $('#spiralTable').innerHTML = `<table class="table"><thead><tr><th>Topic</th><th>Where it appears</th><th>Type</th><th>Comment</th></tr></thead><tbody>
      ${ALIGN.spiral.map(s => `<tr><td><strong>${esc(s.topic)}</strong></td><td class="al-from">${s.refs.map(r => mypChip(r)).join('')}</td>
        <td><span class="badge tone-${kind[s.kind][1]}">${kind[s.kind][0]}</span></td><td class="small">${esc(s.note)}</td></tr>`).join('')}</tbody></table>`;
    $('#mypOnlyList').innerHTML = ALIGN.mypOnly.map(m => `<li>${mypChip(m.ref)}<span class="small">${esc(m.note)}</span></li>`).join('');
    $('#recList').innerHTML = ALIGN.recommendations.map(r => `<div class="al-rec"><h3>${esc(r.stage)}</h3><ul>${r.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('');
  }

  renderPathways(); renderKpis(); renderFindings(); renderHeatmap(); renderGaps(); renderCoverage(); renderRepeats(); renderRest();
})();
