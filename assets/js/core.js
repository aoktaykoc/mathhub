'use strict';
/* ============================================================
   MathHub core — storage, seed data, layout and shared UI.
   Everything is stored in this browser (localStorage).
   ============================================================ */

const STORE_KEY = 'mathhub.v1';
const ALL_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_NAMES = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };
const WORK_WEEKS = { 'sun-thu': ['sun', 'mon', 'tue', 'wed', 'thu'], 'mon-fri': ['mon', 'tue', 'wed', 'thu', 'fri'] };

/* ---------- small helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
function uid(prefix = 'id') { return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`; }
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function debounce(fn, ms = 400) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }
function linkify(text) {
  return esc(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}

/* ---------- small Markdown renderer (for AI answers pasted back into the site) ----------
   Headings, bold/italic, inline code, bullet and numbered lists, tables, rules, paragraphs.
   Text is escaped first, so pasted content can never inject HTML. */
function mdToHtml(md) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  let html = '', list = null, para = [], table = [];
  const inline = s => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>');
  const flushPara = () => { if (para.length) { html += `<p>${para.map(inline).join('<br>')}</p>`; para = []; } };
  const flushList = () => { if (list) { html += `<${list.type}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.type}>`; list = null; } };
  const flushTable = () => {
    if (!table.length) return;
    const rows = table.filter(r => !/^\|?\s*:?-{2,}/.test(r)).map(r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
    html += `<div class="md-table"><table>${rows.map((r, i) => `<tr>${r.map(c => i ? `<td>${inline(c)}</td>` : `<th>${inline(c)}</th>`).join('')}</tr>`).join('')}</table></div>`;
    table = [];
  };
  const flush = () => { flushPara(); flushList(); flushTable(); };
  lines.forEach(line => {
    const t = line.trim();
    let m;
    if (!t) { flush(); return; }
    if (/^\|.*\|$/.test(t)) { flushPara(); flushList(); table.push(t); return; }
    flushTable();
    if ((m = t.match(/^(#{1,4})\s+(.*)$/))) { flush(); const lv = Math.min(m[1].length + 1, 5); html += `<h${lv}>${inline(m[2])}</h${lv}>`; return; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flush(); html += '<hr>'; return; }
    if ((m = t.match(/^[-*•]\s+(.*)$/))) { flushPara(); if (list?.type !== 'ul') { flushList(); list = { type: 'ul', items: [] }; } list.items.push(m[1]); return; }
    if ((m = t.match(/^\d+[.)]\s+(.*)$/))) { flushPara(); if (list?.type !== 'ol') { flushList(); list = { type: 'ol', items: [] }; } list.items.push(m[1]); return; }
    flushList();
    para.push(t);
  });
  flush();
  return html;
}

/* ---------- dates (local time, ISO yyyy-mm-dd strings) ---------- */
function isoDate(d = new Date()) {
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function parseISO(s) { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function addDays(s, n) { const d = parseISO(s); d.setDate(d.getDate() + n); return isoDate(d); }
function weekdayKey(s) { return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][parseISO(s).getDay()]; }
function workDays() { return WORK_WEEKS[App.state?.workWeek] || WORK_WEEKS['sun-thu']; }
function isWorkDay(s) { return workDays().includes(weekdayKey(s)); }
function nextWorkDay(s) { let d = s; for (let i = 0; i < 7 && !isWorkDay(d); i++) d = addDays(d, 1); return d; }
// First school day of the week containing s. On weekend days this is the upcoming week.
function weekStart(s) {
  const days = workDays();
  const diff = (parseISO(s).getDay() - ALL_DAYS.indexOf(days[0]) + 7) % 7;
  return diff >= days.length ? addDays(s, 7 - diff) : addDays(s, -diff);
}
function fmtDate(s, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return s ? parseISO(s).toLocaleDateString('en-GB', opts) : '';
}
function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
function relDay(s) {
  const n = daysBetween(isoDate(), s);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

/* ---------- IB reference data ---------- */
const MYP = {
  keyConcepts: ['Form', 'Logic', 'Relationships', 'Aesthetics', 'Change', 'Communication', 'Communities', 'Connections', 'Creativity', 'Culture', 'Development', 'Global interactions', 'Identity', 'Perspective', 'Systems', 'Time, place and space'],
  relatedConcepts: ['Change', 'Equivalence', 'Generalization', 'Justification', 'Measurement', 'Model', 'Pattern', 'Quantity', 'Representation', 'Simplification', 'Space', 'System'],
  globalContexts: ['Identities and relationships', 'Orientation in space and time', 'Personal and cultural expression', 'Scientific and technical innovation', 'Globalization and sustainability', 'Fairness and development'],
  criteria: { A: 'Knowing and understanding', B: 'Investigating patterns', C: 'Communicating', D: 'Applying mathematics in real-life contexts' },
};
const UNIT_STATUS = {
  'not-started': { label: 'Not started', tone: 'neutral' },
  'in-progress': { label: 'In progress', tone: 'info' },
  complete: { label: 'Complete', tone: 'success' },
};
const LESSON_STATUS = {
  planned: { label: 'Planned', tone: 'neutral' },
  ready: { label: 'Ready', tone: 'info' },
  taught: { label: 'Taught', tone: 'success' },
};
const A_STATUS = {
  requested: { label: 'Requested', tone: 'neutral' },
  submitted: { label: 'Submitted', tone: 'info' },
  'in-review': { label: 'In review', tone: 'warning' },
  revision: { label: 'Revision needed', tone: 'danger' },
  approved: { label: 'Approved', tone: 'success' },
};
const REVIEW_CHECKS = {
  common: [
    'Aligned with the unit objectives / syllabus content',
    'Mark scheme or task-specific clarifications included',
    'Command terms used correctly and consistently',
    'Instructions, marks per question and timing are clear',
    'Difficulty progresses; accessible to all learners',
    'Layout is clean; diagrams and units are correct',
  ],
  MYP: [
    'Criteria assessed are stated (A–D)',
    'Tasks give access to every achievement level (1–8)',
    'Connected to the global context / statement of inquiry',
  ],
  DP: [
    'Question style matches Paper 1 / Paper 2',
    'Mark scheme uses M / A / R marks',
    'GDC expectations are clear',
  ],
  Custom: [],
};
function checksFor(course) { return [...REVIEW_CHECKS.common, ...(REVIEW_CHECKS[course?.framework] || [])]; }

/* ---------- seed data ---------- */
function makeUnit(title, o = {}, topics = []) {
  return Object.assign({
    id: uid('u'), title, weeks: '', hours: '', keyConcept: '', relatedConcepts: [], globalContext: '',
    soi: '', criteria: [], status: 'not-started', notes: '', syllabusRef: '',
  }, o, { topics: topics.map(t => ({ id: uid('t'), text: t, done: false })) });
}

function seedCourses() {
  const u = makeUnit;
  return [
    {
      id: 'myp8', name: 'MYP Mathematics — Grade 8 (MYP Year 3)', short: 'MYP 8', framework: 'MYP', color: '#3b82f6',
      units: [
        u('Number sense & proportional reasoning', { weeks: 5, keyConcept: 'Relationships', relatedConcepts: ['Quantity', 'Equivalence'], globalContext: 'Fairness and development', soi: 'Proportional relationships help us make fair decisions about how resources are shared.', criteria: ['A', 'D'] },
          ['Integers & order of operations', 'Fractions, decimals & percentages', 'Ratio & proportion', 'Percentage change']),
        u('Algebraic thinking', { weeks: 6, keyConcept: 'Form', relatedConcepts: ['Representation', 'Simplification'], globalContext: 'Scientific and technical innovation', soi: 'Representing patterns in general form lets us simplify and predict.', criteria: ['A', 'B'] },
          ['Expressions & substitution', 'Expanding brackets', 'Solving linear equations', 'Linear inequalities']),
        u('Linear relationships', { weeks: 5, keyConcept: 'Relationships', relatedConcepts: ['Change', 'Model'], globalContext: 'Globalization and sustainability', soi: 'Modelling change with linear relationships helps us understand consumption and sustainability.', criteria: ['A', 'C', 'D'] },
          ['Coordinates & tables of values', 'Gradient', 'y = mx + c', 'Real-life linear models']),
        u('Geometry & measurement', { weeks: 6, keyConcept: 'Logic', relatedConcepts: ['Space', 'Justification'], globalContext: 'Orientation in space and time', soi: 'Logical reasoning about space allows us to justify measurements in the built environment.', criteria: ['A', 'C'] },
          ["Pythagoras' theorem", 'Circles: circumference & area', 'Volume & surface area of prisms and cylinders']),
        u('Statistics & probability', { weeks: 5, keyConcept: 'Relationships', relatedConcepts: ['Quantity', 'Representation', 'Justification'], globalContext: 'Identities and relationships', soi: 'Representing data truthfully allows us to justify claims about our communities.', criteria: ['B', 'D'] },
          ['Collecting data', 'Averages & range', 'Statistical graphs', 'Theoretical probability']),
      ],
    },
    {
      id: 'myp9', name: 'MYP Mathematics — Grade 9 (MYP Year 4)', short: 'MYP 9', framework: 'MYP', color: '#0d9488',
      units: [
        u('Powers & scientific notation', { weeks: 4, keyConcept: 'Form', relatedConcepts: ['Quantity', 'Simplification'], globalContext: 'Scientific and technical innovation', soi: 'Simplified forms let scientists represent and compare quantities of very different scale.', criteria: ['A'] },
          ['Laws of indices', 'Zero, negative & fractional indices', 'Standard form calculations']),
        u('Systems of equations', { weeks: 5, keyConcept: 'Relationships', relatedConcepts: ['Equivalence', 'Model'], globalContext: 'Fairness and development', soi: 'Modelling with equivalent systems helps us compare options and make fair choices.', criteria: ['A', 'D'] },
          ['Solving graphically', 'Substitution method', 'Elimination method', 'Word problems']),
        u('Quadratic expressions & equations', { weeks: 6, keyConcept: 'Form', relatedConcepts: ['Pattern', 'Representation'], globalContext: 'Scientific and technical innovation', soi: 'Different representations of a quadratic reveal different properties of motion and design.', criteria: ['A', 'B'] },
          ['Expanding double brackets', 'Factorising', 'Solving quadratic equations', 'Graphs of quadratics']),
        u('Right-angled trigonometry', { weeks: 5, keyConcept: 'Logic', relatedConcepts: ['Space', 'Measurement'], globalContext: 'Orientation in space and time', soi: 'Logical relationships between sides and angles allow us to measure the inaccessible.', criteria: ['A', 'D'] },
          ['Trigonometric ratios', 'Finding missing sides', 'Finding missing angles', 'Angles of elevation & depression']),
        u('Sequences & patterns', { weeks: 4, keyConcept: 'Form', relatedConcepts: ['Pattern', 'Generalization'], globalContext: 'Personal and cultural expression', soi: 'Generalizing patterns reveals the structure behind artistic and cultural designs.', criteria: ['B', 'C'] },
          ['Arithmetic sequences', 'nth term', 'Geometric patterns']),
        u('Bivariate data', { weeks: 4, keyConcept: 'Relationships', relatedConcepts: ['Change', 'Justification'], globalContext: 'Globalization and sustainability', soi: 'Analysing relationships in data helps us justify decisions about sustainable development.', criteria: ['C', 'D'] },
          ['Scatter graphs', 'Correlation', 'Line of best fit']),
      ],
    },
    {
      id: 'dpaisl', name: 'DP Mathematics: Applications & Interpretation SL', short: 'AI SL', framework: 'DP', color: '#8b5cf6',
      units: [
        u('Topic 1 — Number & algebra', { hours: 16, syllabusRef: 'SL 1.1–1.8' },
          ['Scientific notation & approximation', 'Arithmetic sequences & series', 'Geometric sequences & series', 'Financial applications (compound interest, annuities, loans)', 'Exponents & logarithms', 'Approximation & percentage error']),
        u('Topic 2 — Functions', { hours: 31, syllabusRef: 'SL 2.1–2.6' },
          ['Equations of lines & gradient', 'Function concepts, domain & range', 'Linear, quadratic & exponential models', 'Direct/inverse variation, cubic & sinusoidal models', 'The modelling process']),
        u('Topic 3 — Geometry & trigonometry', { hours: 18, syllabusRef: 'SL 3.1–3.6' },
          ['3D volume & surface area', 'Right-angled & non-right-angled trigonometry', 'Bearings, elevation & depression', 'Arc length & sector area', 'Voronoi diagrams']),
        u('Topic 4 — Statistics & probability', { hours: 36, syllabusRef: 'SL 4.1–4.11' },
          ['Sampling & data collection', 'Descriptive statistics & box plots', 'Bivariate data: correlation & regression', "Spearman's rank correlation", 'Probability, Venn & tree diagrams', 'Discrete random variables', 'Binomial & normal distributions', 'Hypothesis testing: χ² and t-test']),
        u('Topic 5 — Calculus', { hours: 19, syllabusRef: 'SL 5.1–5.8' },
          ['Limits & the derivative', 'Increasing & decreasing functions', 'Differentiating polynomials', 'Tangents & normals', 'Local max/min & optimisation', 'Trapezoidal rule', 'Introduction to integration']),
        u('Toolkit & Internal Assessment', { hours: 30, syllabusRef: 'Toolkit' },
          ['GDC skills', 'IA topic exploration', 'IA research question approved', 'IA first draft', 'IA final submission']),
      ],
    },
    {
      id: 'nondp', name: 'Non-DP Mathematics (school curriculum)', short: 'Non-DP', framework: 'Custom', color: '#ea8a0c',
      units: [
        u('Number & financial literacy', { weeks: 5 }, ['Percentages & interest', 'Budgeting & taxes', 'Exchange rates']),
        u('Algebra & functions', { weeks: 6 }, ['Linear equations', 'Linear functions & graphs', 'Introduction to quadratic functions']),
        u('Geometry & measurement', { weeks: 5 }, ['Trigonometry', 'Area & volume', 'Scale drawings & maps']),
        u('Data & probability', { weeks: 5 }, ['Descriptive statistics', 'Probability', 'Interpreting data in the media']),
        u('Problem solving & modelling', { weeks: 4 }, ['Modelling project', 'Logic & reasoning']),
      ],
    },
  ];
}

/* Bell schedules: each division (Middle / High School) has a regular day and an alternative day.
   `dayVariant` says which one each weekday uses. A period is identified as "<divisionId>:<label>". */
function bells(text) {
  return text.trim().split(/\s*,\s*/).map(item => { const [label, start, end] = item.split(/\s+/); return { label, start, end }; });
}
function seedSchedules() {
  return [
    {
      id: 'ms', name: 'Middle School', short: 'MS',
      variants: {
        std: bells('P1 07:35 08:25, P2 08:30 08:55, P3 09:15 10:05, P4 10:10 11:00, P6 11:30 12:20, P7 12:25 13:15, P8 13:40 14:30'),
        alt: bells('P1 07:35 08:25, P3 08:30 09:20, P5 09:45 10:35, P6 10:40 11:30, P8 11:55 12:45'),
      },
    },
    {
      id: 'hs', name: 'High School', short: 'HS',
      variants: {
        std: bells('P1 07:35 08:15, P2 08:15 08:55, P3 09:00 09:25, P4 10:05 10:45, P5 10:45 11:25, P6 11:30 12:10, P7 12:10 12:50, P8 13:15 13:55, P9 13:55 14:35'),
        alt: bells('P1 07:35 08:05, P2 08:05 08:30, P3 08:35 09:20, P4 09:25 09:55, P5 09:55 10:20, P6 10:50 11:20, P7 11:20 11:45, P8 11:50 12:20, P9 12:20 12:45'),
      },
    },
  ];
}
const DEFAULT_DAY_VARIANT = { sun: 'std', mon: 'std', tue: 'alt', wed: 'std', thu: 'std', fri: 'std', sat: 'std' };
const DEFAULT_VARIANT_NAMES = { std: 'Regular (Sun, Mon, Wed, Thu)', alt: 'Tuesday' };

// Distinct colours for classes (so two groups of the same course look different).
const CLASS_COLORS = ['#3b82f6', '#0d9488', '#8b5cf6', '#ea8a0c', '#e11d48', '#16a34a', '#0891b2', '#c026d3', '#ca8a04', '#64748b', '#db2777', '#4f46e5'];
function nextClassColor(classes) {
  const used = new Set(classes.map(c => (c.color || '').toLowerCase()));
  return CLASS_COLORS.find(c => !used.has(c)) || CLASS_COLORS[classes.length % CLASS_COLORS.length];
}
// Colour for a lesson/period: the class colour, falling back to the course colour.
function colorFor(classId, courseId) {
  const cls = App.cls(classId);
  return cls?.color || App.course(cls?.courseId || courseId)?.color || '#98a2b3';
}

function seedState() {
  const today = isoDate();
  return {
    version: 2,
    onboarded: false,
    profile: { name: '', school: '', role: 'Mathematics teacher & subject lead' },
    courses: seedCourses(),
    classes: [
      { id: 'cls-myp8', name: 'MYP 8', courseId: 'myp8', scheduleId: 'ms', color: CLASS_COLORS[0] },
      { id: 'cls-myp9', name: 'MYP 9', courseId: 'myp9', scheduleId: 'hs', color: CLASS_COLORS[1] },
      { id: 'cls-dp', name: 'DP AI SL', courseId: 'dpaisl', scheduleId: 'hs', color: CLASS_COLORS[2] },
      { id: 'cls-nondp', name: 'Non-DP', courseId: 'nondp', scheduleId: 'hs', color: CLASS_COLORS[3] },
    ],
    workWeek: 'sun-thu',
    schedules: seedSchedules(),
    dayVariant: { ...DEFAULT_DAY_VARIANT },
    variantNames: { ...DEFAULT_VARIANT_NAMES },
    timetable: {}, // "[w2:]<day>|<divisionId>:<label>" → classId
    cycle: { enabled: false, anchor: '' },
    rooms: {}, // same keys as timetable → room for that period (overrides the class default)
    events: [], // { id, title, date, start, end, location, repeat, days, until, skip, color, notes }
    aiResults: [], // { id, lessonId, templateId, templateName, result, createdAt } — answers pasted back from Claude
    lessons: [],
    tasks: [
      { id: uid('task'), text: 'Enter my timetable in Settings', done: false, due: today, priority: 'high' },
      { id: uid('task'), text: 'Ask the department to share this term’s formative & summative drafts', done: false, due: addDays(today, 3), priority: 'normal' },
      { id: uid('task'), text: 'Review the DP AI SL IA timeline', done: false, due: '', priority: 'normal' },
    ],
    notes: {},
    teachers: [],
    assessments: [],
    worksheets: [],
    iaMilestones: [
      'Introduce the IA & explore sample work', 'Topic proposal submitted', 'Research question approved', 'First draft submitted',
      'Written feedback returned', 'Final IA submitted', 'Internal standardisation / moderation', 'Marks & samples uploaded',
    ].map(label => ({ id: uid('ms'), label, date: '', done: false })),
  };
}

/* ---------- store ---------- */
const App = {
  state: null,
  load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { s = null; }
    if (!s || typeof s !== 'object' || !s.version) s = seedState();
    if (!s.schedules) { // v1 → v2: single bell schedule replaced by divisions; old timetable keys no longer apply
      s.schedules = seedSchedules();
      s.dayVariant = { ...DEFAULT_DAY_VARIANT };
      s.variantNames = { ...DEFAULT_VARIANT_NAMES };
      s.workWeek = 'sun-thu';
      s.timetable = {};
      (s.lessons || []).forEach(l => { if (l.periodId && !l.periodId.includes(':')) l.periodId = ''; });
      delete s.periods;
      s.version = 2;
    }
    (s.classes || []).forEach(c => { if (!c.scheduleId) c.scheduleId = c.courseId === 'myp8' ? 'ms' : (s.schedules[1] || s.schedules[0])?.id || ''; });
    (s.classes || []).forEach(c => { if (!c.color) c.color = nextClassColor(s.classes); });
    const fresh = seedState();
    for (const k of Object.keys(fresh)) if (s[k] === undefined) s[k] = fresh[k];
    this.state = s;
    this.save(true);
  },
  save(silent = false) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this.state)); return true; } catch (e) {
      if (!silent) toast('Could not save — browser storage is unavailable or full.', 'error');
      return false;
    }
  },
  course(id) { return this.state.courses.find(c => c.id === id); },
  cls(id) { return this.state.classes.find(c => c.id === id); },
  unit(courseId, unitId) { const c = this.course(courseId); return c ? c.units.find(u => u.id === unitId) : null; },
  schedule(id) { return this.state.schedules.find(s => s.id === id); },
  periodOn(id, date) { return id && date ? periodsOn(date).find(p => p.id === id) || null : null; },
  teacher(id) { return this.state.teachers.find(t => t.id === id); },
  courseProgress(c) {
    const topics = c.units.flatMap(u => u.topics);
    const done = topics.filter(t => t.done).length;
    return { done, total: topics.length, pct: topics.length ? Math.round(done / topics.length * 100) : 0 };
  },
};

/* ---------- bell schedule helpers ---------- */
function variantOf(dayKey) { return App.state.dayVariant?.[dayKey] || 'std'; }
// Every period of every division on this date, sorted by start time.
function periodsOn(date) {
  const v = variantOf(weekdayKey(date));
  return App.state.schedules.flatMap(s => (s.variants[v] || []).map(p => ({
    id: `${s.id}:${p.label}`, schedId: s.id, sched: s, label: p.label, start: p.start, end: p.end, name: `${s.short} ${p.label}`,
  }))).sort((a, b) => a.start.localeCompare(b.start) || a.schedId.localeCompare(b.schedId));
}
/* Two-week cycle: Week 1 timetable keys are "<day>|<period>", Week 2 keys are "w2:<day>|<period>".
   `cycle.anchor` is any date in a Week 1; weeks then alternate from there. */
function cycleOn() { return !!(App.state.cycle?.enabled && App.state.cycle.anchor); }
function cycleWeekOf(date) {
  if (!cycleOn()) return 1;
  const weeks = Math.round(daysBetween(weekStart(App.state.cycle.anchor), weekStart(date)) / 7);
  return ((weeks % 2) + 2) % 2 === 0 ? 1 : 2;
}
function ttPrefix(week) { return week === 2 ? 'w2:' : ''; }
function ttKey(date, periodId) { return `${ttPrefix(cycleWeekOf(date))}${weekdayKey(date)}|${periodId}`; }
function classAt(date, periodId) { return App.state.timetable[ttKey(date, periodId)] || ''; }
// Room for a period: the room typed in that timetable cell, otherwise the class's default room.
function roomAt(date, periodId) {
  const k = ttKey(date, periodId);
  return App.state.rooms?.[k] || App.cls(App.state.timetable[k])?.room || '';
}
function cycleLabel(date) { return cycleOn() ? `Week ${cycleWeekOf(date)}` : ''; }

// Periods on this date with the class taught in each ('' when free).
function slotsOn(date) {
  return periodsOn(date).map(p => ({ ...p, classId: classAt(date, p.id), room: roomAt(date, p.id) }));
}
function timesOverlap(a, b) { return a.start < b.end && b.start < a.end; }

/* ---------- events (meetings, duties, anything with a time and place) ---------- */
const EVENT_COLORS = ['#0891b2', '#e11d48', '#65a30d', '#d97706', '#7c3aed', '#475569'];
const REPEAT_LABELS = { none: 'Does not repeat', daily: 'Every school day', weekly: 'Weekly', biweekly: 'Every two weeks' };
function eventDays(ev) { return ev.days?.length ? ev.days : [weekdayKey(ev.date)]; }
function eventOccursOn(ev, date) {
  if (date < ev.date || (ev.until && date > ev.until) || (ev.skip || []).includes(date)) return false;
  const r = ev.repeat || 'none';
  if (r === 'none') return date === ev.date;
  if (r === 'daily') return isWorkDay(date);
  if (!eventDays(ev).includes(weekdayKey(date))) return false;
  if (r === 'weekly') return true;
  // every two weeks, counted from the week of the first date
  return Math.round(daysBetween(weekStart(ev.date), weekStart(date)) / 7) % 2 === 0;
}
function eventsOn(date) {
  return (App.state.events || []).filter(ev => eventOccursOn(ev, date)).sort((a, b) => a.start.localeCompare(b.start));
}
function repeatText(ev) {
  const r = ev.repeat || 'none';
  if (r === 'none') return '';
  const days = r === 'daily' ? '' : ` on ${eventDays(ev).map(d => DAY_NAMES[d].slice(0, 3)).join(', ')}`;
  return `${REPEAT_LABELS[r]}${days}${ev.until ? ` until ${fmtDate(ev.until, { day: 'numeric', month: 'short' })}` : ''}`;
}
function periodText(p) { return p ? `${p.name} · ${p.start}–${p.end}` : ''; }

/* ---------- UI helpers ---------- */
const ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  book: '<path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 0 2 2h13"/><path d="M9 7h6"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  sheet: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h8"/>',
  check: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  save: '<path d="M5 3h11l5 5v13H5z"/><path d="M8 3v6h8M8 21v-7h8v7"/>',
  wand: '<path d="M15 4V2M15 10V8M11 6h2M17 6h2"/><path d="M3 21l11-11"/><path d="M13 7l4 4"/>',
  library: '<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="M16.5 4.5l3.5 1-4 15-3.5-1z"/>',
  sparkle: '<path d="M11 3l1.8 4.7L17.5 9.5l-4.7 1.8L11 16l-1.8-4.7L4.5 9.5l4.7-1.8z"/><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
};
function icon(name) {
  return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
function badge(label, tone = 'neutral') { return `<span class="badge tone-${tone}">${esc(label)}</span>`; }
function statusBadge(map, key) { const s = map[key] || { label: key, tone: 'neutral' }; return badge(s.label, s.tone); }
function courseTag(course) { return course ? `<span class="course-tag" style="--c:${esc(course.color)}">${esc(course.short)}</span>` : ''; }
function courseOptions(selected, withEmpty = '') {
  return (withEmpty ? `<option value="">${esc(withEmpty)}</option>` : '') +
    App.state.courses.map(c => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
}

function toast(msg, type = '') {
  let box = $('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function openModal({ title, body, wide = false, actions = [], onOpen }) {
  const dlg = document.createElement('dialog');
  dlg.className = `modal${wide ? ' wide' : ''}`;
  dlg.innerHTML = `<div class="modal-inner">
      <header class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">×</button></header>
      <div class="modal-body">${body}</div>
      <footer class="modal-foot"></footer></div>`;
  const foot = $('.modal-foot', dlg);
  const close = () => { dlg.close(); dlg.remove(); };
  actions.forEach(a => {
    if (a === 'spacer') { foot.insertAdjacentHTML('beforeend', '<span class="spacer"></span>'); return; }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${a.cls || ''}`;
    b.textContent = a.label;
    b.addEventListener('click', () => { const keepOpen = a.onClick ? a.onClick(dlg) === false : false; if (!keepOpen) close(); });
    foot.appendChild(b);
  });
  if (!actions.length) foot.remove();
  $('[data-close]', dlg).addEventListener('click', close);
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
  document.body.appendChild(dlg);
  dlg.showModal();
  if (onOpen) onOpen(dlg);
  return { el: dlg, close };
}

function confirmModal(message, onYes, yesLabel = 'Delete') {
  openModal({
    title: 'Please confirm',
    body: `<p>${esc(message)}</p>`,
    actions: [{ label: 'Cancel', cls: 'btn-ghost' }, { label: yesLabel, cls: 'btn-danger', onClick: () => { onYes(); } }],
  });
}

function downloadFile(filename, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function readFileText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard', 'success'); return; } catch (e) { /* fall back below */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); toast('Copied to clipboard', 'success'); } catch (e) { toast('Copy failed — select the text manually', 'error'); }
  ta.remove();
}
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'file'; }

function downloadBlob(filename, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function fmtBytes(n) { return n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`; }
function fileIcon(name) {
  const ext = String(name).split('.').pop().toLowerCase();
  return { pdf: '📕', pptx: '📊', ppt: '📊', key: '📊', tex: '📐', docx: '📝', doc: '📝', md: '📝', txt: '📝', xlsx: '📗', csv: '📗', zip: '🗜️', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️' }[ext] || '📎';
}

/* ---------- file store (IndexedDB) — for PDFs, slides and other files too big for localStorage ---------- */
const FileStore = {
  _db: null,
  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('This browser cannot store files')); return; }
      const req = indexedDB.open('mathhub-files', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('files');
      req.onsuccess = () => { this._db = req.result; resolve(this._db); };
      req.onerror = () => reject(req.error);
    });
  },
  async run(mode, fn) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const t = db.transaction('files', mode);
      const req = fn(t.objectStore('files'));
      t.oncomplete = () => resolve(req?.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('Storage transaction aborted'));
    });
  },
  put(id, blob) { return this.run('readwrite', s => s.put(blob, id)); },
  get(id) { return this.run('readonly', s => s.get(id)); },
  del(id) { return this.run('readwrite', s => s.delete(id)); },
};
// Open a stored file: PDFs, images and text in a new tab; everything else downloads.
async function openStoredFile(meta, forceDownload = false) {
  let blob;
  try { blob = await FileStore.get(meta.id); } catch (e) { blob = null; }
  if (!blob) { toast(`“${meta.name}” is not in this browser’s storage (it may have been saved on another computer or browser).`, 'error'); return; }
  const ext = meta.name.split('.').pop().toLowerCase();
  const textLike = ['tex', 'md', 'txt', 'csv', 'json', 'sty', 'bib'].includes(ext);
  const viewable = textLike || /^(application\/pdf|image\/)/.test(blob.type) || ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext);
  if (forceDownload || !viewable) { downloadBlob(meta.name, blob); return; }
  const view = textLike ? new Blob([blob], { type: 'text/plain;charset=utf-8' }) : (ext === 'pdf' && !blob.type ? new Blob([blob], { type: 'application/pdf' }) : blob);
  const url = URL.createObjectURL(view);
  if (!window.open(url, '_blank')) downloadBlob(meta.name, blob);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ---------- files attached to a lesson (uploaded in the AI content studio) ---------- */
function lessonFiles(lessonId) {
  if (!lessonId) return [];
  return (App.state.aiResults || []).filter(r => r.lessonId === lessonId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap(r => (r.files || []).map(f => ({ ...f, resultId: r.id })));
}
// Small 📎 badge for lesson blocks; clicking it opens the file list (handled by a delegated listener below).
function filesBadge(lessonId, extraClass = '') {
  const n = lessonFiles(lessonId).length;
  return n ? `<button type="button" class="files-badge ${extraClass}" data-files-lesson="${esc(lessonId)}" title="${n} file${n > 1 ? 's' : ''} — click to open" aria-label="${n} attached file${n > 1 ? 's' : ''}">📎${n}</button>` : '';
}
function fileRowsHtml(files) {
  return `<ul class="file-list">${files.map(f => `<li>
    <span class="file-name">${fileIcon(f.name)} ${esc(f.name)}</span><span class="small muted">${fmtBytes(f.size)}</span>
    <button type="button" class="btn btn-sm btn-soft" data-file-open="${esc(f.id)}">Open</button>
    <button type="button" class="btn btn-sm btn-ghost" data-file-download="${esc(f.id)}">Download</button></li>`).join('')}</ul>`;
}
// Clicks on any data-file-open / data-file-download button, anywhere on the page.
document.addEventListener('click', e => {
  const o = e.target.closest('[data-file-open], [data-file-download]');
  if (!o) return;
  e.stopPropagation();
  const id = o.dataset.fileOpen || o.dataset.fileDownload;
  const meta = (App.state.aiResults || []).flatMap(r => r.files || []).find(f => f.id === id);
  if (meta) openStoredFile(meta, !!o.dataset.fileDownload);
}, true);
function openLessonFiles(lessonId) {
  const l = App.state.lessons.find(x => x.id === lessonId);
  const files = lessonFiles(lessonId);
  const p = l && App.periodOn(l.periodId, l.date);
  openModal({
    title: `Files — ${l ? l.title : 'lesson'}`,
    body: `<p class="muted small" style="margin-top:0">${esc([l && fmtDate(l.date, { weekday: 'long', day: 'numeric', month: 'long' }), p && p.name, App.cls(l?.classId)?.name].filter(Boolean).join(' · '))}</p>
      ${files.length ? fileRowsHtml(files) : '<p class="muted">No files attached to this lesson yet.</p>'}`,
    actions: [
      { label: 'Add or manage files', cls: 'btn-ghost', onClick: () => { location.href = `ai.html?lesson=${encodeURIComponent(lessonId)}`; } },
      { label: 'Open lesson plan', cls: 'btn-ghost', onClick: () => { if (l) openLessonEditor(l, () => location.reload()); } },
      { label: 'Close', cls: 'btn-primary' },
    ],
  });
}
// Badge clicks open the file list instead of the lesson block underneath.
document.addEventListener('click', e => {
  const b = e.target.closest('[data-files-lesson]');
  if (!b) return;
  e.stopPropagation();
  e.preventDefault();
  openLessonFiles(b.dataset.filesLesson);
}, true);

const PRINT_CSS = `body{font-family:"Segoe UI",Arial,sans-serif;color:#111;margin:24px;font-size:13px;line-height:1.5}
h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:16px 0 4px;text-transform:uppercase;letter-spacing:.05em;color:#444}
.meta{color:#555;margin-bottom:12px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px 8px;vertical-align:top;text-align:left}
th{background:#f0f0f0}.pre{white-space:pre-wrap}.box{border:1px solid #bbb;border-radius:6px;padding:8px 10px;margin-bottom:8px}
.md h2,.md h3,.md h4,.md h5{text-transform:none;letter-spacing:0;color:#111;margin:12px 0 4px}.md h2{font-size:16px}.md h3{font-size:14px}.md h4,.md h5{font-size:13px}
.md table{margin:6px 0}.md ul,.md ol{margin:4px 0 8px;padding-left:22px}.md p{margin:4px 0 8px}code{background:#f2f2f2;padding:0 3px;border-radius:3px}`;
function printHTML(title, html) {
  const w = window.open('', '_blank');
  if (!w) { toast('Allow pop-ups for this page to print', 'error'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body>${html}<script>window.onload=function(){window.print();}<\/script></body></html>`);
  w.document.close();
}

/* ---------- lesson editor (shared by dashboard, planner, lessons) ---------- */
function lessonDefaults(extra = {}) {
  return Object.assign({
    id: null, date: isoDate(), periodId: '', classId: '', courseId: '', unitId: '', title: '',
    objectives: '', criteria: [], starter: '', main: '', plenary: '', homework: '', differentiation: '',
    resources: '', status: 'planned', reflection: '',
    duration: '',      // minutes
    curriculum: null,  // { level, topicId, outcomeIds, custom } when built from the curriculum library
  }, extra);
}

function openLessonEditor(lesson, onSaved) {
  const S = App.state;
  const L = lessonDefaults(JSON.parse(JSON.stringify(lesson || {})));
  const isNew = !L.id || !S.lessons.some(l => l.id === L.id);
  if (!L.courseId && L.classId) L.courseId = App.cls(L.classId)?.courseId || '';
  if (!L.courseId) L.courseId = S.courses[0]?.id || '';
  const opt = (v, label, sel) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(label)}</option>`;
  const ta = (f, label, rows = 3, ph = '') => `<label>${label}<textarea data-f="${f}" rows="${rows}" placeholder="${esc(ph)}">${esc(L[f])}</textarea></label>`;
  const body = `<div class="form-grid">
      <label class="span-2">Lesson title<input data-f="title" value="${esc(L.title)}" placeholder="e.g. Solving two-step equations"></label>
      <label>Date<input type="date" data-f="date" value="${esc(L.date)}"></label>
      <label>Period<select data-f="periodId"></select></label>
      <label>Class<select data-f="classId">${opt('', '— none —', L.classId)}${S.classes.map(c => opt(c.id, c.name, L.classId)).join('')}</select></label>
      <label>Course<select data-f="courseId">${courseOptions(L.courseId)}</select></label>
      <label class="span-2">Unit<select data-f="unitId"></select></label>
      <div class="span-2" data-crit></div>
      ${ta('objectives', 'Learning objectives / success criteria', 2, 'Students will be able to…')}
      ${ta('starter', 'Starter / do-now', 3)}
      ${ta('main', 'Main activities', 4)}
      ${ta('plenary', 'Plenary / exit ticket', 3)}
      ${ta('homework', 'Homework', 2)}
      ${ta('differentiation', 'Differentiation, ATL & support', 2)}
      ${ta('resources', 'Resources & links', 2, 'Worksheets, slides, GDC files, links…')}
      <label>Status<select data-f="status">${Object.entries(LESSON_STATUS).map(([k, v]) => opt(k, v.label, L.status)).join('')}</select></label>
      <label>Duration (minutes)<input type="number" min="5" max="600" step="5" data-f="duration" value="${esc(L.duration)}" placeholder="e.g. 40"></label>
      ${L.id && lessonFiles(L.id).length ? `<div class="span-2"><label style="margin-bottom:.2rem">📎 Files</label>${fileRowsHtml(lessonFiles(L.id))}</div>` : ''}
      ${L.id ? `<p class="span-2 small muted" style="margin:0">🤖 ${(S.aiResults || []).filter(r => r.lessonId === L.id).length} AI content result(s) saved · <a href="ai.html?lesson=${esc(L.id)}">Create content or add files →</a></p>` : ''}
      ${L.curriculum && L.id ? `<p class="span-2 small muted" style="margin:0">📚 Linked to the curriculum: ${esc(typeof levelLabel === 'function' ? levelLabel(L.curriculum.level) : '')} · ${(L.curriculum.outcomeIds || []).length} outcome(s). <a href="builder.html?lesson=${esc(L.id)}">Change topic &amp; outcomes in the Lesson builder →</a></p>` : ''}
      <label class="span-2">Reflection (after teaching)<textarea data-f="reflection" rows="2" placeholder="What worked? What to change next time?">${esc(L.reflection)}</textarea></label>
    </div>`;

  const fillUnits = (dlg, courseId, selected) => {
    const c = App.course(courseId);
    $('[data-f=unitId]', dlg).innerHTML = opt('', '— no unit —', selected) + (c ? c.units.map(u => opt(u.id, u.title, selected)).join('') : '');
    const crit = $('[data-crit]', dlg);
    if (c && c.framework === 'MYP') {
      crit.innerHTML = `<label style="margin-bottom:.3rem">MYP criteria addressed</label><div class="chip-group">${Object.entries(MYP.criteria).map(([k, v]) =>
        `<label class="chip-check"><input type="checkbox" value="${k}" ${L.criteria.includes(k) ? 'checked' : ''}> ${k} · ${esc(v)}</label>`).join('')}</div>`;
    } else crit.innerHTML = '';
  };

  const actions = [];
  if (!isNew) {
    actions.push({
      label: 'Delete', cls: 'btn-danger-ghost', onClick: () => {
        confirmModal('Delete this lesson plan?', () => {
          S.lessons = S.lessons.filter(l => l.id !== L.id);
          App.save(); toast('Lesson deleted'); onSaved && onSaved(null);
        });
      },
    });
    actions.push({ label: 'Print', cls: 'btn-ghost', onClick: () => { printLesson(L); return false; } });
  }
  actions.push('spacer', { label: 'Cancel', cls: 'btn-ghost' }, {
    label: isNew ? 'Create lesson' : 'Save changes', cls: 'btn-primary', onClick: dlg => {
      $$('[data-f]', dlg).forEach(el => { L[el.dataset.f] = el.value.trim(); });
      L.criteria = $$('[data-crit] input:checked', dlg).map(i => i.value);
      if (!L.title) { toast('Please give the lesson a title', 'error'); $('[data-f=title]', dlg).focus(); return false; }
      if (!L.date) { toast('Please choose a date', 'error'); return false; }
      if (isNew) { L.id = uid('L'); S.lessons.push(L); } else { S.lessons = S.lessons.map(l => l.id === L.id ? L : l); }
      App.save();
      toast(isNew ? 'Lesson created' : 'Lesson saved', 'success');
      onSaved && onSaved(L);
    },
  });

  openModal({
    title: isNew ? 'New lesson plan' : 'Edit lesson plan', body, wide: true, actions,
    onOpen: dlg => {
      const fillPeriods = () => {
        const sel = $('[data-f=periodId]', dlg);
        const date = $('[data-f=date]', dlg).value;
        const cur = sel.value || L.periodId;
        const day = date ? weekdayKey(date) : '';
        const groups = date ? S.schedules.map(s => {
          const ps = periodsOn(date).filter(p => p.schedId === s.id);
          return ps.length ? `<optgroup label="${esc(s.name)}">${ps.map(p => {
            const cls = App.cls(classAt(date, p.id));
            return opt(p.id, `${p.label} · ${p.start}–${p.end}${cls ? ` · ${cls.name}` : ''}`, cur);
          }).join('')}</optgroup>` : '';
        }).join('') : '';
        sel.innerHTML = opt('', '— no fixed period —', cur) + groups;
      };
      fillPeriods();
      $('[data-f=date]', dlg).addEventListener('change', fillPeriods);
      $('[data-f=periodId]', dlg).addEventListener('change', e => {
        const date = $('[data-f=date]', dlg).value;
        const cls = App.cls(classAt(date, e.target.value));
        if (cls && !$('[data-f=classId]', dlg).value) {
          $('[data-f=classId]', dlg).value = cls.id;
          $('[data-f=courseId]', dlg).value = cls.courseId;
          fillUnits(dlg, cls.courseId, '');
        }
      });
      fillUnits(dlg, L.courseId, L.unitId);
      $('[data-f=courseId]', dlg).addEventListener('change', e => { L.criteria = $$('[data-crit] input:checked', dlg).map(i => i.value); fillUnits(dlg, e.target.value, ''); });
      $('[data-f=classId]', dlg).addEventListener('change', e => {
        const c = App.cls(e.target.value);
        if (c) { $('[data-f=courseId]', dlg).value = c.courseId; fillUnits(dlg, c.courseId, ''); }
      });
      if (isNew) $('[data-f=title]', dlg).focus();
    },
  });
}

function printLesson(L) {
  const course = App.course(L.courseId);
  const unit = App.unit(L.courseId, L.unitId);
  const period = App.periodOn(L.periodId, L.date);
  const cls = App.cls(L.classId);
  // use the timetable room when this lesson sits in its class's timetabled period
  const room = period && classAt(L.date, L.periodId) === L.classId ? roomAt(L.date, L.periodId) : cls?.room || '';
  const row = (label, v) => v ? `<h2>${esc(label)}</h2><div class="box pre">${esc(v)}</div>` : '';
  printHTML(L.title, `<h1>${esc(L.title)}</h1>
    <div class="meta">${esc(fmtDate(L.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}
    ${period ? ` · ${esc(periodText(period))}` : ''}${cls ? ` · ${esc(cls.name)}` : ''}${room ? ` · Room ${esc(room)}` : ''}${L.duration ? ` · ${esc(L.duration)} min` : ''}<br>
    ${esc(course?.name || '')}${unit ? ` — ${esc(unit.title)}` : ''}${L.criteria?.length ? ` · Criteria: ${esc(L.criteria.join(', '))}` : ''}</div>
    ${row('Objectives / success criteria', L.objectives)}${row('Starter', L.starter)}${row('Main activities', L.main)}
    ${row('Plenary / exit ticket', L.plenary)}${row('Homework', L.homework)}${row('Differentiation & ATL', L.differentiation)}
    ${row('Resources', L.resources)}${row('Reflection', L.reflection)}
    ${(() => { const r = (App.state.aiResults || []).filter(x => x.lessonId === L.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      const files = (App.state.aiResults || []).filter(x => x.lessonId === L.id).flatMap(x => x.files || []);
      return (r && r.result ? `<h2>Lesson content (${esc(r.templateName || 'AI')})</h2><div class="box md">${mdToHtml(r.result)}</div>` : '') +
        (files.length ? `<h2>Files</h2><div class="box">${files.map(f => `${fileIcon(f.name)} ${esc(f.name)} <span style="color:#777">(${fmtBytes(f.size)})</span>`).join('<br>')}</div>` : ''); })()}`);
}

/* ---------- event editor (shared by planner and dashboard) ---------- */
// occDate: the day that was clicked, so a single occurrence of a repeating event can be removed.
function openEventEditor(event, onSaved, occDate) {
  const S = App.state;
  S.events = S.events || [];
  const isNew = !event?.id || !S.events.some(e => e.id === event.id);
  const E = Object.assign({
    id: null, title: '', date: isoDate(), start: '15:00', end: '15:30', location: '', repeat: 'none', days: [], until: '', skip: [], color: EVENT_COLORS[0], notes: '',
  }, JSON.parse(JSON.stringify(event || {})));
  if (!E.days.length) E.days = [weekdayKey(E.date)];
  const opt = (v, label, sel) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(label)}</option>`;
  const body = `<div class="form-grid">
      <label class="span-2">Event name<input data-f="title" value="${esc(E.title)}" placeholder="e.g. Department meeting, Lunch duty, Parent conference"></label>
      <label>Date${E.repeat !== 'none' ? ' (first occurrence)' : ''}<input type="date" data-f="date" value="${esc(E.date)}"></label>
      <label>Location<input data-f="location" value="${esc(E.location)}" placeholder="e.g. Library, Room A101"></label>
      <label>Starts<input type="time" data-f="start" value="${esc(E.start)}"></label>
      <label>Ends<input type="time" data-f="end" value="${esc(E.end)}"></label>
      <label>Repeat<select data-f="repeat">${Object.entries(REPEAT_LABELS).map(([k, v]) => opt(k, v, E.repeat)).join('')}</select></label>
      <label data-until>Repeat until (optional)<input type="date" data-f="until" value="${esc(E.until)}"></label>
      <div class="span-2" data-days><label style="margin-bottom:.35rem">On these days</label><div class="chip-group">${workDays().map(d =>
        `<label class="chip-check"><input type="checkbox" value="${d}" ${E.days.includes(d) ? 'checked' : ''}> ${DAY_NAMES[d]}</label>`).join('')}</div></div>
      <div class="span-2"><label style="margin-bottom:.35rem">Colour</label><div class="chip-group" data-colors>${EVENT_COLORS.map(c =>
        `<label class="color-dot" style="--c:${c}"><input type="radio" name="evcolor" value="${c}" ${c === E.color ? 'checked' : ''} aria-label="Colour ${c}"></label>`).join('')}</div></div>
      <label class="span-2">Notes<textarea data-f="notes" rows="2">${esc(E.notes)}</textarea></label>
      ${E.skip?.length ? `<p class="span-2 muted small" style="margin:0">Removed on: ${E.skip.map(d => esc(fmtDate(d, { day: 'numeric', month: 'short' }))).join(', ')} · <button type="button" class="link" data-restore>restore all</button></p>` : ''}
    </div>`;

  const remove = () => { S.events = S.events.filter(e => e.id !== E.id); App.save(); toast('Event deleted'); onSaved && onSaved(null); };
  const actions = [];
  if (!isNew) {
    if (E.repeat !== 'none' && occDate) {
      actions.push({ label: 'Delete this day only', cls: 'btn-danger-ghost', onClick: () => {
        const ev = S.events.find(e => e.id === E.id);
        ev.skip = [...new Set([...(ev.skip || []), occDate])];
        App.save(); toast(`Removed on ${fmtDate(occDate)}`); onSaved && onSaved(ev);
      } });
      actions.push({ label: 'Delete series', cls: 'btn-danger-ghost', onClick: () => { confirmModal(`Delete every “${E.title}” event?`, remove); } });
    } else {
      actions.push({ label: 'Delete', cls: 'btn-danger-ghost', onClick: () => { confirmModal(`Delete “${E.title}”?`, remove); } });
    }
  }
  actions.push('spacer', { label: 'Cancel', cls: 'btn-ghost' }, {
    label: isNew ? 'Create event' : 'Save event', cls: 'btn-primary', onClick: dlg => {
      $$('[data-f]', dlg).forEach(el => { E[el.dataset.f] = el.value.trim(); });
      E.days = $$('[data-days] input:checked', dlg).map(i => i.value);
      E.color = $('[data-colors] input:checked', dlg)?.value || EVENT_COLORS[0];
      if (!E.title) { toast('Give the event a name', 'error'); $('[data-f=title]', dlg).focus(); return false; }
      if (!E.date || !E.start || !E.end) { toast('Date, start and end time are required', 'error'); return false; }
      if (E.end <= E.start) { toast('The end time must be after the start time', 'error'); return false; }
      if ((E.repeat === 'weekly' || E.repeat === 'biweekly') && !E.days.length) { toast('Choose at least one day', 'error'); return false; }
      if (E.repeat === 'none') { E.until = ''; E.days = [weekdayKey(E.date)]; }
      if (E.until && E.until < E.date) { toast('“Repeat until” is before the first date', 'error'); return false; }
      if (isNew) { E.id = uid('ev'); S.events.push(E); } else { S.events = S.events.map(e => e.id === E.id ? E : e); }
      App.save();
      toast(isNew ? 'Event created' : 'Event saved', 'success');
      onSaved && onSaved(E);
    },
  });

  openModal({
    title: isNew ? 'New event' : 'Edit event', body, wide: true, actions,
    onOpen: dlg => {
      const sync = () => {
        const r = $('[data-f=repeat]', dlg).value;
        $('[data-days]', dlg).hidden = !(r === 'weekly' || r === 'biweekly');
        $('[data-until]', dlg).hidden = r === 'none';
      };
      sync();
      $('[data-f=repeat]', dlg).addEventListener('change', sync);
      // moving the start keeps the same length
      $('[data-f=start]', dlg).addEventListener('change', e => {
        const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const len = Math.max(5, toMin(E.end) - toMin(E.start));
        const s = toMin(e.target.value || E.start), n = s + len;
        $('[data-f=end]', dlg).value = `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
        E.start = e.target.value; E.end = $('[data-f=end]', dlg).value;
      });
      $('[data-f=date]', dlg).addEventListener('change', e => {
        if (!e.target.value || $('[data-f=repeat]', dlg).value !== 'none') return;
        $$('[data-days] input', dlg).forEach(i => { i.checked = i.value === weekdayKey(e.target.value); });
      });
      $('[data-restore]', dlg)?.addEventListener('click', e => { E.skip = []; e.target.closest('p').remove(); });
      if (isNew) $('[data-f=title]', dlg).focus();
    },
  });
}

/* ---------- sample data (for exploring the site) ---------- */
function loadSampleData() {
  const S = App.state;
  const today = isoDate();
  const start = weekStart(today);
  [['cls-myp8', 'MYP 8', 'myp8', 'ms'], ['cls-myp9', 'MYP 9', 'myp9', 'hs'], ['cls-dp', 'DP AI SL', 'dpaisl', 'hs'], ['cls-nondp', 'Non-DP', 'nondp', 'hs']].forEach(([id, name, courseId, scheduleId]) => {
    if (!App.cls(id) && App.course(courseId)) S.classes.push({ id, name, courseId, scheduleId, color: nextClassColor(S.classes) });
  });
  // Middle School and High School periods chosen so they never overlap in time
  const pattern = {
    sun: [['ms:P1', 'cls-myp8'], ['hs:P4', 'cls-myp9'], ['hs:P6', 'cls-dp'], ['hs:P8', 'cls-nondp']],
    mon: [['hs:P2', 'cls-myp9'], ['ms:P3', 'cls-myp8'], ['hs:P7', 'cls-dp']],
    tue: [['ms:P3', 'cls-myp8'], ['hs:P5', 'cls-myp9'], ['hs:P8', 'cls-nondp']],
    wed: [['hs:P1', 'cls-dp'], ['ms:P4', 'cls-myp8'], ['hs:P6', 'cls-myp9'], ['hs:P9', 'cls-nondp']],
    thu: [['ms:P1', 'cls-myp8'], ['hs:P3', 'cls-dp'], ['hs:P5', 'cls-myp9']],
  };
  if (!Object.keys(S.timetable).length) {
    workDays().forEach((d, i) => {
      const ids = new Set(periodsOn(addDays(start, i)).map(p => p.id));
      (pattern[d] || []).forEach(([pid, cid]) => { if (ids.has(pid) && App.cls(cid)) S.timetable[`${d}|${pid}`] = cid; });
    });
  }
  // lessons for this week's first few slots
  const lessonIdeas = {
    myp8: ['Solving two-step equations', 'Equations with unknowns on both sides', 'Linear inequalities on a number line', 'Forming equations from word problems', 'Algebra review & exit quiz'],
    myp9: ['Factorising quadratics (a = 1)', 'Solving quadratics by factorising', 'Investigating parabola graphs', 'Factorising when a > 1', 'Quadratics problem solving'],
    dpaisl: ['Descriptive statistics with the GDC', 'Box plots & outliers', 'Pearson correlation', 'Regression lines & prediction', 'Spearman’s rank'],
    nondp: ['Compound interest in real life', 'Comparing savings accounts', 'Budget project work', 'Loans & repayments', 'Project presentations'],
  };
  const unitIndex = { myp8: 1, myp9: 2, dpaisl: 3, nondp: 0 };
  const used = {};
  // this week plus the first three days of next week; later slots stay unplanned
  [0, 1, 2, 3, 4, 7, 8, 9].forEach(offset => {
    const date = addDays(start, offset);
    slotsOn(date).forEach(p => {
      const cls = App.cls(p.classId);
      if (!cls || S.lessons.some(l => l.date === date && l.periodId === p.id)) return;
      const ideas = lessonIdeas[cls.courseId]; if (!ideas) return;
      const n = used[cls.courseId] = (used[cls.courseId] || 0) + 1;
      const course = App.course(cls.courseId);
      S.lessons.push(lessonDefaults({
        id: uid('L'), date, periodId: p.id, classId: cls.id, courseId: cls.courseId,
        unitId: course?.units[unitIndex[cls.courseId]]?.id || '',
        title: ideas[(n - 1) % ideas.length], objectives: 'Students will be able to…',
        status: date < today ? 'taught' : 'ready',
      }));
    });
  });
  if (!S.teachers.length) {
    S.teachers.push(
      { id: 'tch-1', name: 'Elif Yılmaz', email: 'elif@school.example', courses: ['myp8'] },
      { id: 'tch-2', name: 'James Carter', email: 'james@school.example', courses: ['myp9', 'dpaisl'] },
      { id: 'tch-3', name: 'Selin Demir', email: 'selin@school.example', courses: ['nondp', 'myp8'] },
    );
  }
  if (!S.assessments.length) {
    const mk = (o) => Object.assign({
      id: uid('A'), code: newReqCode(), unit: '', criteria: [], deadline: '', date: '', duration: '', marks: '', link: '', markschemeLink: '',
      notes: '', status: 'requested', checklist: {}, feedback: '', log: [{ at: today, text: 'Request created' }], createdAt: today,
    }, o);
    S.assessments.push(
      mk({ title: 'Algebraic thinking — summative test', type: 'summative', courseId: 'myp8', teacherId: 'tch-1', criteria: ['A', 'B'], deadline: addDays(today, -2), date: addDays(today, 16), unit: 'Algebraic thinking' }),
      mk({ title: 'Quadratics — formative quiz', type: 'formative', courseId: 'myp9', teacherId: 'tch-2', criteria: ['A'], deadline: addDays(today, -4), date: addDays(today, 5), status: 'submitted', link: 'https://drive.google.com/…', unit: 'Quadratic expressions & equations', duration: '30 min', marks: '24' }),
      mk({ title: 'Statistics Paper 2-style test', type: 'summative', courseId: 'dpaisl', teacherId: 'tch-2', deadline: addDays(today, 6), date: addDays(today, 20), unit: 'Topic 4 — Statistics & probability' }),
      mk({ title: 'Financial literacy project', type: 'summative', courseId: 'nondp', teacherId: 'tch-3', deadline: addDays(today, -8), date: addDays(today, 9), status: 'revision', feedback: 'Please add a marking rubric and state the timing for each part.' }),
      mk({ title: 'Ratio & proportion exit tickets', type: 'formative', courseId: 'myp8', teacherId: 'tch-3', criteria: ['A'], deadline: addDays(today, -10), date: addDays(today, -3), status: 'approved' }),
    );
  }
  S.events = S.events || [];
  if (!S.events.length) {
    const days = workDays();
    S.events.push(
      { id: uid('ev'), title: 'Maths department meeting', date: addDays(start, 1), start: '14:40', end: '15:30', location: 'Room A101', repeat: 'weekly', days: [days[1]], until: '', skip: [], color: '#7c3aed', notes: '' },
      { id: uid('ev'), title: 'Lunch duty', date: addDays(start, 3), start: '12:20', end: '12:50', location: 'Cafeteria', repeat: 'biweekly', days: [days[3]], until: '', skip: [], color: '#d97706', notes: '' },
      { id: uid('ev'), title: 'Parent conference', date: addDays(start, 2), start: '13:00', end: '13:45', location: 'Meeting room 2', repeat: 'none', days: [days[2]], until: '', skip: [], color: '#e11d48', notes: '' },
    );
  }
  S.onboarded = true;
  App.save();
}
function newReqCode() {
  const used = new Set((App.state.assessments || []).map(a => a.code));
  let code;
  do { code = 'REQ-' + Math.random().toString(36).slice(2, 6).toUpperCase(); } while (used.has(code));
  return code;
}

/* ---------- colour theme (light / dark / follow system), remembered per browser ---------- */
const THEME_KEY = 'mathhub.theme';
function getTheme() { try { return localStorage.getItem(THEME_KEY) || 'system'; } catch (e) { return 'system'; } }
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}
function setTheme(t) {
  try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* private mode: still applies for this page */ }
  applyTheme(t);
  $$('[data-theme-set]').forEach(b => { b.classList.toggle('active', b.dataset.themeSet === t); b.setAttribute('aria-pressed', b.dataset.themeSet === t); });
}
function themeSwitch() {
  const cur = getTheme();
  return `<div class="theme-switch" role="group" aria-label="Colour theme">${[['light', '☀', 'Light'], ['dark', '☾', 'Dark'], ['system', '◐', 'System']].map(([k, i, l]) =>
    `<button type="button" data-theme-set="${k}" class="${cur === k ? 'active' : ''}" aria-pressed="${cur === k}" title="${l} theme">${i} <span>${l}</span></button>`).join('')}</div>`;
}
applyTheme(getTheme());
document.addEventListener('click', e => { const b = e.target.closest('[data-theme-set]'); if (b) setTheme(b.dataset.themeSet); });

/* ---------- layout ---------- */
function renderSidebar() {
  const sb = $('#sidebar');
  if (!sb) return;
  const page = document.body.dataset.page;
  const S = App.state;
  const reviewCount = S.assessments.filter(a => a.status === 'submitted' || a.status === 'in-review').length;
  const groups = [
    { title: 'Teaching', items: [
      { id: 'dashboard', href: 'index.html', label: 'Dashboard', icon: 'home' },
      { id: 'planner', href: 'planner.html', label: 'Weekly planner', icon: 'calendar' },
      { id: 'builder', href: 'builder.html', label: 'Lesson builder', icon: 'wand' },
      { id: 'lessons', href: 'lessons.html', label: 'Lesson plans', icon: 'book' },
      { id: 'ai', href: 'ai.html', label: 'AI content studio', icon: 'sparkle' },
      { id: 'curriculum', href: 'curriculum.html', label: 'Curriculum library', icon: 'library' },
      { id: 'courses', href: 'courses.html', label: 'Courses & units', icon: 'layers' },
      { id: 'worksheets', href: 'worksheets.html', label: 'Worksheet generator', icon: 'sheet' },
    ] },
    { title: 'Subject lead', items: [
      { id: 'assessments', href: 'assessments.html', label: 'Assessment hub', icon: 'check', count: reviewCount },
      { id: 'submit', href: 'submit.html', label: 'Teacher submission form', icon: 'send' },
    ] },
    { title: 'Reference', items: [
      { id: 'toolkit', href: 'toolkit.html', label: 'IB toolkit', icon: 'compass' },
      { id: 'settings', href: 'settings.html', label: 'Settings & backup', icon: 'gear' },
    ] },
  ];
  sb.innerHTML = `<a class="brand" href="index.html"><span class="brand-mark">∑</span><span><strong>MathHub</strong><small>${esc(S.profile.name || S.profile.school || 'Mathematics department')}</small></span></a>
    <nav aria-label="Main">${groups.map(g => `<div class="nav-section">${g.title}</div>${g.items.map(i =>
      `<a class="nav-link ${i.id === page ? 'active' : ''}" href="${i.href}" ${i.id === page ? 'aria-current="page"' : ''}>${icon(i.icon)}<span>${i.label}</span>${i.count ? `<span class="nav-count">${i.count}</span>` : ''}</a>`).join('')}`).join('')}</nav>
    <div class="sidebar-foot">${themeSwitch()}Saved in this browser only.<br><a href="settings.html#backup">Back up your data</a></div>`;
}

function initShell() {
  renderSidebar();
  // pages without the sidebar (teacher submission form) get the switch in their header
  const plainHead = $('.plain-head');
  if (plainHead && !$('#sidebar')) plainHead.insertAdjacentHTML('beforeend', themeSwitch());
  const btn = $('#menuBtn');
  if (btn) {
    btn.addEventListener('click', () => document.body.classList.toggle('nav-open'));
    const scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.addEventListener('click', () => document.body.classList.remove('nav-open'));
    document.body.appendChild(scrim);
  }
}

App.load();
initShell();
