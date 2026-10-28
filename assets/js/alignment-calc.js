'use strict';
/* Shared calculations for the alignment page and the A3 poster: ALIGN (alignment-data.js) read against the
   built-in curricula (titles and outcomes from builtinCurricula(); MYP 8 titles from ALIGN.myp8). */
const AlignCalc = (() => {
  const B = Object.fromEntries(builtinCurricula().map(c => [c.id, c]));
  const topicsOf = c => c.units.flatMap((u, ui) => u.topics.map(t => ({ ...t, unit: u.title, ui })));
  const byCode = id => Object.fromEntries(topicsOf(B[id]).map(t => [t.code, t]));
  const MYP = { 9: byCode('myp9'), 10: byCode('myp10') };
  const COURSES = [
    { key: 'aa-sl', dp: 'aa', level: 'SL', label: 'AA SL', path: 's', from: 'MYP 9 Standard → MYP 10 Standard' },
    { key: 'aa-hl', dp: 'aa', level: 'HL', label: 'AA HL', path: 'e', from: 'MYP 9 Extended → MYP 10 Extended' },
    { key: 'ai-sl', dp: 'ai', level: 'SL', label: 'AI SL', path: 's', from: 'MYP 9 Standard → MYP 10 Standard' },
    { key: 'ai-hl', dp: 'ai', level: 'HL', label: 'AI HL', path: 'e', from: 'MYP 9 Extended → MYP 10 Extended' },
  ];
  const STATUS = { R: ['Repeat', 'success'], P: ['Partly', 'info'], N: ['New', 'neutral'] };
  const STRANDS = ['Number & algebra', 'Functions', 'Geometry & trigonometry', 'Statistics & probability', 'Calculus'];

  // "10:3.7" → { grade, code, title, ext, outcomes }
  function myp(ref) {
    const [g, code] = ref.split(':'), grade = Number(g);
    if (grade === 8) return { grade, code, title: ALIGN.myp8[code] || '', ext: false, outcomes: [] };
    const t = MYP[grade]?.[code];
    return { grade, code, title: t?.title || '', ext: !!t?.tracks?.includes('Extended'), outcomes: (t?.outcomes || []).map(o => o.text) };
  }
  const dpTopics = dp => topicsOf(B[dp === 'aa' ? 'dp-aa' : 'dp-ai']);
  // topics of a DP course with the status for its pathway (the Standard pathway has no Extended MYP topics)
  function courseTopics(c) {
    const data = ALIGN.dp[c.dp];
    return dpTopics(c.dp).filter(t => c.level === 'HL' || t.code.startsWith('SL')).map(t => {
      const a = data[t.code] || { from: [], note: '' };
      const from = (a.from || []).filter(r => c.path === 'e' || !myp(r).ext);
      const gaps = [a.gap, c.path === 's' ? a.gapS : null].filter(Boolean);
      return { ...t, status: (c.path === 's' ? a.s : a.e) || 'N', from, note: a.note || '', gaps, a };
    });
  }
  const counts = list => list.reduce((o, t) => (o[t.status]++, o), { R: 0, P: 0, N: 0 });
  const pct = (n, d) => (d ? Math.round(n / d * 100) : 0);
  const levelCount = (id, track) => topicsOf(B[id]).filter(t => !track || !t.tracks?.length || t.tracks.includes(track)).length;
  const myp8Count = () => (App.state.curricula || []).find(c => c.id === 'myp8')?.units.reduce((s, u) => s + u.topics.length, 0) || Object.keys(ALIGN.myp8).length;

  // topics per strand for each stage (MYP 8 from the library, when it has content)
  function strandColumns() {
    const m8 = (App.state.curricula || []).find(c => c.id === 'myp8');
    const m8Strand = title => /number|exponent|equation|system/i.test(title) ? 0 : /function|linear relat/i.test(title) ? 1 : /transform|pythag|geometry|volume|congruen/i.test(title) ? 2 : /statistic|data|probab/i.test(title) ? 3 : -1;
    const col8 = [0, 0, 0, 0, 0];
    if (m8?.units?.length) m8.units.forEach(u => { const s = m8Strand(u.title); if (s >= 0) col8[s] += u.topics.length; });
    else Object.keys(ALIGN.myp8).forEach(code => { col8[{ 1: 0, 2: 0, 3: 1, 4: 2, 5: 2, 6: 3 }[code.split('.')[0]]]++; });
    const col = (id, track, keep = () => true) => STRANDS.map((_, i) => topicsOf(B[id]).filter(t => t.ui === i && (!track || !t.tracks?.length || t.tracks.includes(track)) && keep(t)).length);
    const sl = t => t.code.startsWith('SL');
    return [
      ['MYP 8', col8], ['MYP 9 S', col('myp9', 'Standard')], ['MYP 9 E', col('myp9', 'Extended')], ['MYP 10 S', col('myp10', 'Standard')], ['MYP 10 E', col('myp10', 'Extended')],
      ['AA SL', col('dp-aa', '', sl)], ['AA HL', col('dp-aa')], ['AI SL', col('dp-ai', '', sl)], ['AI HL', col('dp-ai')],
    ];
  }

  // the key findings, with numbers computed from the data: [title, text]
  function findings() {
    const L = Object.fromEntries(COURSES.map(c => [c.key, courseTopics(c)]));
    const k = Object.fromEntries(COURSES.map(c => [c.key, counts(L[c.key])]));
    const strandRepeat = (key, n) => { const s = L[key].filter(t => t.ui === n); return pct(s.filter(t => t.status === 'R').length, s.length); };
    const high = ALIGN.gaps.filter(g => g.priority === 'high');
    const dup = ALIGN.spiral.filter(s => s.kind === 'duplicate').length;
    const hlNew = key => L[key].filter(t => t.code.startsWith('AHL') && t.status === 'N').length;
    return [
      ['Much of DP SL is review for Standard students', `On the Standard pathway, ${pct(k['aa-sl'].R, L['aa-sl'].length)}% of AA SL and ${pct(k['ai-sl'].R, L['ai-sl'].length)}% of AI SL topics are already taught in MYP. Repetition is heaviest in Topic 1 Number & algebra (AA SL ${strandRepeat('aa-sl', 0)}%), Topic 2 Functions (${strandRepeat('aa-sl', 1)}%) and Topic 4 Statistics & probability (${strandRepeat('aa-sl', 3)}%).`],
      ['Calculus is entirely new', 'No MYP grade teaches calculus — expected — but gradient as a rate of change (MYP 8–9) and sign diagrams (MYP 10) give a good start for DP Topic 5.'],
      [`${high.length} high-priority gaps`, `${high.map(g => g.title.split(':')[0]).join(', ')}: none is taught in MYP 8–10, yet DP treats them as known or as SL content.`],
      ['SL content is placed in MYP Extended', 'Arc length and sector area (MYP 10 3.7) and the normal distribution (10 4.7) are Extended in MYP but SL content in both AA and AI.'],
      ['HL groundwork is thin', `Counting principles (AA HL) are well prepared, but not vectors, polynomials or matrices. ${hlNew('aa-hl')} AA HL-only and ${hlNew('ai-hl')} AI HL-only topics are completely new.`],
      ['Extended students repeat MYP 9 topics in MYP 10', 'Sine/cosine rules, exponential equations and conditional probability are Extended in MYP 9 and taught again to everyone in MYP 10.'],
      [`${dup} near-duplicates inside MYP 8 → 10`, 'E.g. slope and y = mx + c (MYP 8 and 9), quadratic forms (9 and 10), distance between points (8 and 9) — natural places to add the missing content.'],
      ['AI SL students arrive with HL-level knowledge', 'MYP 10 Standard teaches log laws and composite/inverse functions to everyone; in AI these are HL-only topics (AHL 1.9, 2.7).'],
    ];
  }

  return { B, topicsOf, dpTopics, myp, COURSES, STATUS, STRANDS, courseTopics, counts, pct, levelCount, myp8Count, strandColumns, findings };
})();
