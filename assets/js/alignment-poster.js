(() => {
  /* A3 poster (two landscape pages) built from the same data as the Curriculum alignment page. */
  const { myp, COURSES, courseTopics, counts, pct, dpTopics, levelCount, myp8Count, strandColumns, findings, STRANDS } = AlignCalc;
  const S = App.state;
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const author = [S.profile?.name, S.profile?.school].filter(Boolean).join(' · ');
  const PRIO = ['high', 'medium', 'low'];

  // gaps numbered G1… by priority; which DP topics each one affects ("AA AHL 3.12–3.18" → AA AHL 3.12 … 3.18)
  const gaps = [...ALIGN.gaps].sort((a, b) => PRIO.indexOf(a.priority) - PRIO.indexOf(b.priority)).map((g, i) => ({ ...g, id: `G${i + 1}` }));
  const gapIds = {}; // "aa|SL 1.4" → ['G1']
  gaps.forEach(g => g.dp.forEach(ref => {
    const m = ref.match(/^(AA|AI) (SL|AHL) (\d+)\.(\d+)(?:–(\d+)\.(\d+))?$/);
    if (!m) return;
    for (let k = Number(m[4]); k <= Number(m[6] || m[4]); k++) (gapIds[`${m[1].toLowerCase()}|${m[2]} ${m[3]}.${k}`] ||= []).push(g.id);
  }));

  const st = s => `<span class="st ${s || 'none'}">${s || '–'}</span>`;
  const ref = r => { const m = myp(r); return `<span class="ref g${m.grade}"><b>${m.grade}</b>${esc(m.code)}${m.ext ? ' <span class="ext">E</span>' : ''}</span>`; };
  const refLong = r => { const m = myp(r); return `<span class="ref g${m.grade}"><b>${m.grade}</b>${esc(m.code)} ${esc(m.title)}${m.ext ? ' <span class="ext">E</span>' : ''}</span>`; };
  const legend = `<div class="legend">
    <span>${st('R')} Repeat — already taught in MYP</span><span>${st('P')} Partly — MYP lays the foundation</span><span>${st('N')} New in DP</span>
    <span><span class="gapdot">!</span> Gap — expected but not taught in MYP</span><span><span class="ext">E</span> MYP Extended</span>
    <span><span class="ref g8"><b>8</b></span><span class="ref g9"><b>9</b></span><span class="ref g10"><b>10</b></span> MYP grade</span></div>`;
  const foot = n => `<footer><span>${author ? `Prepared by ${esc(author)} · ` : ''}${esc(today)} · Source: MathHub Curriculum library — MYP 8–10 school curricula (${esc(ALIGN.asOf)}) and the IB DP AA/AI guides (first assessment 2021, outcomes paraphrased)</span><span>Page ${n} of 3</span></footer>`;

  /* ---------- page 1: overview ---------- */
  function page1() {
    const box = (label, sub, cls = '') => `<div class="node ${cls}"><strong>${esc(label)}</strong><span>${esc(sub)}</span></div>`;
    const arrow = '<div class="arrow">→</div>';
    const n = c => courseTopics(COURSES.find(x => x.key === c)).length;
    const path = `<div class="flow">${box('MYP 8', `${myp8Count()} topics · all students`, 'start')}<div class="lanes">
      <div class="lane std"><span class="tagl">Standard</span>${box('MYP 9 Standard', `${levelCount('myp9', 'Standard')} topics`)}${arrow}${box('MYP 10 Standard', `${levelCount('myp10', 'Standard')} topics`)}${arrow}
        <div class="ends">${box('AA SL', `${n('aa-sl')} DP topics`)}${box('AI SL', `${n('ai-sl')} DP topics`)}</div></div>
      <div class="lane ext"><span class="tagl">Extended</span>${box('MYP 9 Extended', `${levelCount('myp9', 'Extended')} topics`)}${arrow}${box('MYP 10 Extended', `${levelCount('myp10', 'Extended')} topics`)}${arrow}
        <div class="ends">${box('AA HL', `${n('aa-hl')} DP topics`)}${box('AI HL', `${n('ai-hl')} DP topics`)}</div></div></div></div>`;

    const kpis = COURSES.map(c => {
      const list = courseTopics(c), k = counts(list), t = list.length, r = pct(k.R, t), p = pct(k.R + k.P, t) - r; // same rounding as the website
      return `<div class="kpi"><div class="donut" style="background:conic-gradient(var(--R) 0 ${r}%, var(--P) ${r}% ${r + p}%, var(--N) ${r + p}% 100%)"><div>${r + p}%</div></div>
        <div><strong>${c.label}</strong><span class="sub">${esc(c.from)}</span><div class="sub">of ${t} topics have MYP groundwork</div>
        <div class="nums"><span>${st('R')}${k.R}</span><span>${st('P')}${k.P}</span><span>${st('N')}${k.N}</span><span><span class="gapdot">!</span>${list.filter(x => x.gaps.length).length}</span></div></div></div>`;
    }).join('');

    const cols = strandColumns(), max = Math.max(...cols.flatMap(c => c[1]));
    const heat = `<table class="heat"><thead><tr class="grp"><th></th><th colspan="5">MYP</th><th colspan="4" class="dp">DP</th></tr>
      <tr><th>Strand</th>${cols.map(([h], i) => `<th class="${i === 5 ? 'dp' : ''}">${h}</th>`).join('')}</tr></thead><tbody>
      ${STRANDS.map((s, r) => `<tr><td>${s}</td>${cols.map(([, v], i) => { const a = Math.round(v[r] / max * 100); return `<td class="v${i === 5 ? ' dp' : ''}" style="--a:${a}%;--c:${a > 55 ? '#fff' : 'var(--ink)'}">${v[r] || '—'}</td>`; }).join('')}</tr>`).join('')}
      <tr class="total"><td>Total</td>${cols.map(([, v], i) => `<td class="${i === 5 ? 'dp' : ''}">${v.reduce((x, y) => x + y, 0)}</td>`).join('')}</tr></tbody></table>`;

    const gapList = gaps.map(g => `<div class="gap"><span class="gid ${g.priority}">${g.id}</span><div><strong>${esc(g.title)}</strong>
      <div class="for">${g.courses.map(c => `<span class="tag">${esc(c)}</span>`).join('')}</div><div class="where">${esc(g.where)}</div></div></div>`).join('');

    $('#page1').innerHTML = `
      <div class="hero"><div><div class="eyebrow">Mathematics department · Vertical alignment · ${esc(ALIGN.asOf)}</div>
        <h1>From MYP 8 to the Diploma — what repeats, what is missing</h1>
        <p class="lead">Every DP AA and AI topic compared with the MYP 8, 9 and 10 curricula. Standard students (MYP 9 S → MYP 10 S) usually continue to AA SL or AI SL; Extended students (MYP 9 E → MYP 10 E) to AA HL or AI HL.</p></div>${legend}</div>
      <div class="grid">
        <div class="panel a-path"><h2><span class="n">1</span>Pathways</h2>${path}</div>
        <div class="panel a-kpi"><h2><span class="n">2</span>How much of each DP course is prepared in MYP</h2><div class="kpis">${kpis}</div></div>
        <div class="panel a-find"><h2><span class="n">3</span>Key findings</h2><ol class="findings">${findings().map(([t, d]) => `<li><div><strong>${esc(t)}</strong>${esc(d)}</div></li>`).join('')}</ol></div>
        <div class="panel a-heat"><h2><span class="n">4</span>Topics per strand and stage</h2>${heat}<p class="sub" style="margin-top:1.4mm">MYP Extended and DP HL columns include the Standard / SL topics. Calculus starts in DP.</p></div>
        <div class="panel a-gaps"><h2><span class="n">5</span>Gaps — expected in DP, not taught in MYP (with a suggested place in MYP)</h2><div class="gaps">${gapList}</div></div>
      </div>${foot(1)}`;
  }

  /* ---------- page 2: every DP topic ---------- */
  function coverage(dp, label) {
    const sl = COURSES.find(c => c.dp === dp && c.level === 'SL'), hl = COURSES.find(c => c.dp === dp && c.level === 'HL');
    const S_ = Object.fromEntries(courseTopics(sl).map(t => [t.code, t])), E_ = Object.fromEntries(courseTopics(hl).map(t => [t.code, t]));
    let unit = '';
    const rows = dpTopics(dp).map(t => {
      const s = S_[t.code], e = E_[t.code], head = t.unit !== unit ? `<div class="row u">${esc(t.unit)}</div>` : '';
      unit = t.unit;
      const refs = (e?.from || []).map(ref).join('');
      const g = gapIds[`${dp}|${t.code}`] || [];
      return `${head}<div class="row${t.code.startsWith('AHL') ? ' ahl' : ''}"><span class="code">${esc(t.code)}</span><span class="t">${esc(t.title)}</span>
        <span class="c">${st(s?.status)}</span><span class="c">${st(e?.status)}</span><span class="refs">${refs || '<span style="color:var(--faint)">—</span>'}</span><span class="g">${g.join(' ')}</span></div>`;
    }).join('');
    // a grid with a fixed row height (tables add their own minimum row height)
    return `<div class="cov"><h2>${esc(label)}</h2><div class="rows">
      <div class="row th"><span>Code</span><span>Topic</span><span class="c">SL</span><span class="c">HL</span><span>Taught / prepared in MYP</span><span>Gap</span></div>${rows}</div></div>`;
  }
  function page2() {
    $('#page2').innerHTML = `
      <div class="top"><div><div class="eyebrow">Detailed map · every DP topic</div><h1>DP topics and where MYP prepares them</h1>
        <p class="sub" style="margin-top:1mm">SL column: status for Standard students (MYP 9 S → 10 S) going to SL · HL column: status for Extended students (MYP 9 E → 10 E) going to HL; AHL topics in purple · MYP references show grade and topic code · gap numbers refer to page 1.</p></div>${legend}</div>
      <div class="cols">${coverage('aa', 'DP Mathematics: Analysis and Approaches')}${coverage('ai', 'DP Mathematics: Applications and Interpretation')}</div>${foot(2)}`;
  }

  /* ---------- page 3: actions and supporting checks ---------- */
  function page3() {
    const stageColor = s => /Extended/.test(s) ? 'var(--ext)' : /Standard/.test(s) ? 'var(--std)' : 'var(--R)';
    const recs = ALIGN.recommendations.map(r => `<div class="rec" style="--c:${stageColor(r.stage)}"><h3><i></i>${esc(r.stage)}</h3><ul>${r.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('');
    const kindLabel = { deepens: ['deepens', 'Deepens'], duplicate: ['duplicate', 'Duplicate'], 'long gap': ['gap', 'Long gap'] };
    const spiral = ALIGN.spiral.map(s => `<div class="sp"><strong>${esc(s.topic)}</strong><span class="kind ${kindLabel[s.kind][0]}">${kindLabel[s.kind][1]}</span>
      <div class="chain">${s.refs.map(ref).join('<span>→</span>')}</div></div>`).join('');
    const pc = { high: 'var(--high)', medium: 'var(--medium)', low: 'var(--low)', ok: 'var(--ok)' };
    const placement = ALIGN.placement.map(p => `<div style="--c:${pc[p.priority]}"><i></i><div>${refLong(p.myp)}<br>${esc(p.issue)} <strong>${esc(p.fix)}</strong></div></div>`).join('');
    const only = ALIGN.mypOnly.map(m => `<div style="--c:var(--N)"><i></i><div>${refLong(m.ref)} — ${esc(m.note.split(' — ').slice(1).join(' — ') || m.note)}</div></div>`).join('');
    $('#page3').innerHTML = `
      <div class="top"><div><div class="eyebrow">Actions · supporting checks</div><h1>What to change, and where</h1>
        <p class="sub" style="margin-top:1mm">Recommendations for each stage, followed by the checks behind them.</p></div>${legend}</div>
      <div class="p3grid">
        <div class="panel tint a-recs"><h2><span class="n">7</span>Recommendations by stage</h2><div class="recs">${recs}</div></div>
        <div class="panel a-place"><h2><span class="n">8</span>Standard / Extended placement check</h2><div class="plist">${placement}</div></div>
        <div class="panel a-spiral"><h2><span class="n">9</span>Repetition inside MYP 8 → 10</h2><div class="spiral">${spiral}</div></div>
        <div class="a-last">
          <div class="panel"><h2><span class="n">10</span>MYP content not continued in DP</h2><div class="plist">${only}</div></div>
          <div class="panel tint method"><h2>How this was made</h2><p>Every DP topic in AA and AI (SL and AHL) was compared, outcome by outcome, with the MYP 8, MYP 9 and MYP 10 curricula. <strong>R</strong>: the pathway already teaches its main outcomes; <strong>P</strong>: it teaches prerequisites or an introduction; <strong>N</strong>: new in DP. SL courses are checked against the Standard pathway, HL courses against the Extended pathway. DP outcomes are paraphrased from the IB guides — check borderline cases against the guide and discuss them as a department.</p></div>
        </div>
      </div>${foot(3)}`;
  }

  page1(); page2(); page3();
  $('#printBtn').onclick = () => window.print();
})();
