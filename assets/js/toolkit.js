(() => {
  const S = App.state;

  /* ---------- tabs ---------- */
  function showTab(id) {
    if (!$(`[data-panel="${id}"]`)) id = 'grades';
    $$('.tab[data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === id));
    $$('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== id; });
  }
  $$('.tab[data-tab]').forEach(t => t.onclick = () => { history.replaceState(null, '', `#${t.dataset.tab}`); showTab(t.dataset.tab); });
  showTab(location.hash.slice(1));
  window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));

  /* ---------- MYP grade calculator ---------- */
  // Published MYP 1–7 grade boundaries (sum of four criteria, 0–32).
  const BOUNDS = [[1, 1, 5], [2, 6, 9], [3, 10, 14], [4, 15, 18], [5, 19, 23], [6, 24, 27], [7, 28, 32]];
  const DESC = {
    1: 'Very limited quality work; many significant misunderstandings.',
    2: 'Limited quality work; misunderstandings or significant gaps.',
    3: 'Acceptable quality work; basic understanding with some gaps.',
    4: 'Good quality work; general understanding with occasional gaps.',
    5: 'Generally high-quality work; secure understanding.',
    6: 'High-quality, occasionally innovative work; extensive understanding.',
    7: 'High-quality, frequently innovative work; comprehensive, nuanced understanding.',
  };
  const gradeOf = total => (BOUNDS.find(([, lo, hi]) => total >= lo && total <= hi) || [null])[0];
  function calc() {
    const vals = $$('[data-crit]').map(i => Math.max(0, Math.min(8, Number(i.value) || 0)));
    const total = vals.reduce((s, v) => s + v, 0);
    const g = gradeOf(total);
    $('#gTotal').textContent = `${total} / 32`;
    $('#gGrade').textContent = g || '—';
    $('#gDesc').textContent = g ? DESC[g] : 'Enter a level (0–8) for each criterion.';
    $('#gBounds').innerHTML = BOUNDS.map(([gr, lo, hi]) => `<span class="${gr === g ? 'hit' : ''}">${gr}: ${lo}–${hi}</span>`).join('');
  }
  $$('[data-crit]').forEach(i => i.addEventListener('input', calc));
  calc();

  function bulk() {
    const rows = $('#bulkIn').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const [name, ...rest] = l.split(/[,;\t]/).map(s => s.trim());
      const lv = rest.slice(0, 4).map(v => v === '' || v === undefined ? null : Math.max(0, Math.min(8, Number(v) || 0)));
      while (lv.length < 4) lv.push(null);
      const assessed = lv.filter(v => v !== null);
      // If fewer than 4 criteria were assessed, scale to /32 so the boundaries still apply.
      const total = assessed.length ? Math.round(assessed.reduce((s, v) => s + v, 0) * 4 / assessed.length) : 0;
      return { name, lv, total, scaled: assessed.length && assessed.length < 4, grade: assessed.length ? gradeOf(total) : '—' };
    });
    $('#bulkOut').innerHTML = rows.length ? `<thead><tr><th>Student</th><th class="num">A</th><th class="num">B</th><th class="num">C</th><th class="num">D</th><th class="num">Total</th><th class="num">Grade</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${esc(r.name)}</td>${r.lv.map(v => `<td class="num">${v ?? '–'}</td>`).join('')}<td class="num">${r.total}${r.scaled ? '*' : ''}</td><td class="num"><strong>${r.grade || '—'}</strong></td></tr>`).join('')}</tbody>` : '';
    if (rows.some(r => r.scaled)) $('#bulkOut').insertAdjacentHTML('beforeend', '<caption class="muted small" style="caption-side:bottom;text-align:left;padding:.4rem .8rem">* scaled to 32 because not all criteria were assessed. Use as a guide only.</caption>');
  }
  $('#bulkIn').addEventListener('input', debounce(bulk, 250));

  /* ---------- rubric builder ---------- */
  const BANDS = {
    A: ['Selects appropriate mathematics for simple problems in familiar situations and applies it with some success.',
      'Selects appropriate mathematics for more complex problems in familiar situations and applies it mostly successfully.',
      'Selects appropriate mathematics for challenging problems in familiar situations, applies it successfully and generally solves problems correctly.',
      'Selects appropriate mathematics for challenging problems in familiar and unfamiliar situations, applies it successfully and solves problems correctly.'],
    B: ['Applies given problem-solving techniques to recognise patterns and states predictions consistent with them.',
      'Applies problem-solving techniques to recognise patterns and suggests general rules consistent with the findings.',
      'Selects and applies techniques to recognise patterns, suggests general rules consistent with the findings and verifies them.',
      'Selects and applies techniques to discover complex patterns, describes them as general rules, and proves or verifies and justifies these rules.'],
    C: ['Uses limited mathematical language and forms of representation; lines of reasoning are hard to follow.',
      'Uses some appropriate language and representations; communication is sometimes clear but not always complete or logical.',
      'Usually uses appropriate language and representations and moves between forms; reasoning is usually complete and coherent.',
      'Consistently uses appropriate language and representations, moves between forms effectively; reasoning is complete, coherent, concise and logically organised.'],
    D: ['Identifies some elements of the real-life situation and applies strategies with limited success.',
      'Identifies relevant elements, applies strategies to reach a solution and describes whether it makes sense.',
      'Identifies relevant elements, selects adequate strategies and applies them successfully; explains the accuracy and whether the solution makes sense.',
      'Identifies relevant elements, selects appropriate strategies, applies them successfully and justifies the degree of accuracy and whether the solution makes sense in context.'],
  };
  $('#rCourse').innerHTML = S.courses.filter(c => c.framework === 'MYP').map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') || '<option value="">MYP</option>';
  $('#rCrit').innerHTML = Object.entries(MYP.criteria).map(([k, v]) => `<label class="chip-check"><input type="checkbox" value="${k}" ${k === 'A' ? 'checked' : ''}> ${k} · ${esc(v)}</label>`).join('');
  function buildRubric() {
    const crit = $$('#rCrit input:checked').map(i => i.value);
    if (!crit.length) { toast('Choose at least one criterion', 'error'); return; }
    const title = $('#rTitle').value.trim() || 'Assessment task';
    const course = App.course($('#rCourse').value);
    $('#rubricOut').innerHTML = `<div class="card" id="rubricCard"><h2>${esc(title)}</h2><p class="muted small">${esc(course?.name || '')} · Click the right-hand column to write task-specific clarifications.</p>
      ${crit.map(k => `<h3 style="margin:1rem 0 .4rem">Criterion ${k}: ${esc(MYP.criteria[k])} (max 8)</h3>
        <div class="table-wrap"><table class="rubric"><thead><tr><th style="width:70px">Level</th><th>General descriptor (summary)</th><th>Task-specific clarification</th></tr></thead><tbody>
        <tr><td>0</td><td>Does not reach a standard described below.</td><td contenteditable="true"></td></tr>
        ${BANDS[k].map((d, i) => `<tr><td>${i * 2 + 1}–${i * 2 + 2}</td><td>${esc(d)}</td><td contenteditable="true"></td></tr>`).join('')}
        </tbody></table></div>`).join('')}</div>`;
  }
  $('#rBuild').onclick = buildRubric;
  $('#rPrint').onclick = () => {
    if (!$('#rubricCard')) buildRubric();
    const card = $('#rubricCard');
    if (card) printHTML($('#rTitle').value || 'Rubric', card.innerHTML.replace(/contenteditable="true"/g, ''));
  };

  /* ---------- command terms ---------- */
  const TERMS = [
    ['Calculate', 'Obtain a numerical answer, showing the relevant stages of working.'],
    ['Comment', 'Give a judgment based on a given statement or the result of a calculation.'],
    ['Compare', 'Give an account of the similarities between two or more items or situations.'],
    ['Compare and contrast', 'Give an account of the similarities and differences between items or situations.'],
    ['Construct', 'Display information in a diagrammatic or logical form.'],
    ['Deduce', 'Reach a conclusion from the information given.'],
    ['Demonstrate', 'Make clear by reasoning or evidence, illustrating with examples or practical application.'],
    ['Describe', 'Give a detailed account.'],
    ['Determine', 'Obtain the only possible answer.'],
    ['Draw', 'Represent with a labelled, accurate diagram or graph, using pencil and ruler where appropriate.'],
    ['Estimate', 'Obtain an approximate value.'],
    ['Explain', 'Give a detailed account including reasons or causes.'],
    ['Find', 'Obtain an answer, showing relevant stages in the working.'],
    ['Hence', 'Use the preceding work to obtain the required result.'],
    ['Hence or otherwise', 'The preceding work is suggested, but other methods can also earn credit.'],
    ['Identify', 'Provide an answer from a number of possibilities.'],
    ['Interpret', 'Use knowledge and understanding to recognise trends and draw conclusions from given information.'],
    ['Investigate', 'Observe, study or make a detailed and systematic examination to establish facts and reach new conclusions.'],
    ['Justify', 'Give valid reasons or evidence to support an answer or conclusion.'],
    ['Label', 'Add labels to a diagram.'],
    ['List', 'Give a sequence of brief answers with no explanation.'],
    ['Plot', 'Mark the position of points on a diagram.'],
    ['Predict', 'Give an expected result.'],
    ['Prove', 'Use a sequence of logical steps to obtain the required result in a formal way.'],
    ['Show', 'Give the steps in a calculation or derivation.'],
    ['Show that', 'Obtain the required result (possibly using given information) without the formality of proof.'],
    ['Sketch', 'Represent with a diagram or graph that gives a general idea of the shape or relationship and includes relevant features.'],
    ['Solve', 'Obtain the answer(s) using algebraic, numerical and/or graphical methods.'],
    ['State', 'Give a specific name, value or other brief answer without explanation.'],
    ['Suggest', 'Propose a solution, hypothesis or other possible answer.'],
    ['Verify', 'Provide evidence that validates the result.'],
    ['Write down', 'Obtain the answer(s), usually by extracting information. Little or no calculation is required.'],
  ];
  function renderTerms() {
    const q = $('#termQ').value.trim().toLowerCase();
    $('#terms').innerHTML = TERMS.filter(([t, d]) => !q || `${t} ${d}`.toLowerCase().includes(q))
      .map(([t, d]) => `<div class="term"><strong>${esc(t)}</strong><span>${esc(d)}</span></div>`).join('') || '<p class="empty">No matching terms.</p>';
  }
  $('#termQ').addEventListener('input', renderTerms);
  renderTerms();

  /* ---------- IA milestones ---------- */
  function renderMilestones() {
    const list = S.iaMilestones;
    $('#milestones').innerHTML = list.map((m, i) => `<div class="ms-row ${m.done ? 'done' : ''}" data-i="${i}">
      <input type="checkbox" data-k="done" ${m.done ? 'checked' : ''} aria-label="Done">
      <input type="text" data-k="label" value="${esc(m.label)}" aria-label="Milestone">
      <input type="date" data-k="date" value="${esc(m.date)}" aria-label="Date">
      <button class="icon-btn sm" data-rm="${i}" aria-label="Remove">×</button></div>`).join('') || '<p class="empty">No milestones.</p>';
  }
  $('#milestones').addEventListener('change', e => {
    const row = e.target.closest('[data-i]'); if (!row) return;
    const m = S.iaMilestones[row.dataset.i], k = e.target.dataset.k;
    m[k] = k === 'done' ? e.target.checked : e.target.value;
    App.save(); if (k === 'done') renderMilestones();
  });
  $('#milestones').addEventListener('click', e => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    S.iaMilestones.splice(Number(b.dataset.rm), 1); App.save(); renderMilestones();
  });
  $('#msAdd').addEventListener('submit', e => {
    e.preventDefault();
    const label = e.target.label.value.trim(); if (!label) return;
    S.iaMilestones.push({ id: uid('ms'), label, date: e.target.date.value, done: false });
    S.iaMilestones.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    App.save(); e.target.reset(); renderMilestones();
  });
  renderMilestones();
})();
