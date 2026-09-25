(() => {
  const S = App.state;
  const form = $('#form');
  const params = new URLSearchParams(location.search);
  const ME_KEY = 'mathhub.teacher';
  let last = null;

  $('#course').innerHTML = courseOptions(params.get('course') || '', 'Choose a course…');

  function syncCourse() {
    const c = App.course($('#course').value);
    $('#unitList').innerHTML = (c?.units || []).map(u => `<option value="${esc(u.title)}">`).join('');
    const pre = params.get('criteria') || '';
    $('#critWrap').innerHTML = c?.framework === 'MYP' ? `<label style="margin-bottom:.35rem">MYP criteria assessed</label><div class="chip-group">${Object.entries(MYP.criteria).map(([k, v]) =>
      `<label class="chip-check"><input type="checkbox" name="criteria" value="${k}" ${pre.includes(k) ? 'checked' : ''}> ${k} · ${esc(v)}</label>`).join('')}</div>` : '';
    $('#selfCheck').innerHTML = checksFor(c).map(t => `<li><label><input type="checkbox" name="self" value="${esc(t)}"> ${esc(t)}</label></li>`).join('');
  }

  // prefill from request link or remembered teacher details
  let me = {};
  try { me = JSON.parse(localStorage.getItem(ME_KEY) || '{}'); } catch (e) { me = {}; }
  form.name.value = params.get('teacher') || me.name || '';
  form.email.value = params.get('email') || me.email || '';
  form.title.value = params.get('title') || '';
  form.type.value = params.get('type') === 'summative' ? 'summative' : 'formative';
  form.unit.value = params.get('unit') || '';
  form.requestCode.value = params.get('req') || '';
  const due = params.get('due');
  if (due) $('#dueNote').textContent = `Requested by ${fmtDate(due, { weekday: 'long', day: 'numeric', month: 'long' })}.`;
  syncCourse();
  $('#course').addEventListener('change', syncCourse);

  function emailText(d) {
    const c = App.course(d.assessment.courseId);
    return `Hello,\n\nPlease find attached my ${d.assessment.type} assessment for review.\n\n` +
      `Title: ${d.assessment.title}\nCourse: ${c?.name || ''}\n${d.assessment.unit ? `Unit: ${d.assessment.unit}\n` : ''}` +
      `${d.assessment.criteria.length ? `Criteria: ${d.assessment.criteria.join(', ')}\n` : ''}${d.assessment.date ? `Date: ${fmtDate(d.assessment.date, { day: 'numeric', month: 'long', year: 'numeric' })}\n` : ''}` +
      `${d.requestCode ? `Request code: ${d.requestCode}\n` : ''}\nAssessment: ${d.assessment.link}\n${d.assessment.markschemeLink ? `Mark scheme: ${d.assessment.markschemeLink}\n` : ''}` +
      `${d.assessment.notes ? `\nNotes: ${d.assessment.notes}\n` : ''}\nBest wishes,\n${d.teacher.name}`;
  }
  function fileName(d) { return `assessment-${slug(d.teacher.name)}-${slug(d.assessment.title)}.json`; }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const missing = ['name', 'title', 'courseId', 'link'].filter(n => !form[n].value.trim());
    if (missing.length) { toast('Please fill in the required fields (*)', 'error'); form[missing[0]].focus(); return; }
    if (!/^https?:\/\//i.test(form.link.value.trim())) { toast('The document link should start with https://', 'error'); form.link.focus(); return; }
    const selfCheck = $$('input[name=self]:checked', form).map(i => i.value);
    const total = $$('input[name=self]', form).length;
    const d = {
      kind: 'mathhub-submission', version: 1, submittedAt: new Date().toISOString(),
      requestCode: form.requestCode.value.trim().toUpperCase(),
      teacher: { name: form.name.value.trim(), email: form.email.value.trim() },
      assessment: {
        title: form.title.value.trim(), type: form.type.value, courseId: form.courseId.value, unit: form.unit.value.trim(),
        criteria: $$('input[name=criteria]:checked', form).map(i => i.value), date: form.date.value, duration: form.duration.value.trim(),
        marks: form.marks.value.trim(), link: form.link.value.trim(), markschemeLink: form.markschemeLink.value.trim(), notes: form.notes.value.trim(),
      },
      selfCheck,
    };
    try { localStorage.setItem(ME_KEY, JSON.stringify(d.teacher)); } catch (err) { /* private mode */ }
    last = d;
    downloadFile(fileName(d), JSON.stringify(d, null, 2));
    $('#fileName').textContent = fileName(d);
    $('#done').hidden = false;
    $('#done').scrollIntoView({ behavior: 'smooth' });
    if (selfCheck.length < total) toast(`Heads up: ${total - selfCheck.length} self-check item(s) not ticked`);
  });
  $('#again').onclick = () => last && downloadFile(fileName(last), JSON.stringify(last, null, 2));
  $('#copyEmail').onclick = () => last && copyText(emailText(last));
})();
