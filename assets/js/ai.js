(() => {
  const S = App.state;
  ensureCurricula();
  const params = new URLSearchParams(location.search);

  const PLACEHOLDERS = AI_PLACEHOLDERS;
  const prefs = aiInit();
  App.save(true);

  let lessonId = params.get('lesson') || '';
  const V = { topic: '', class: '', level: '', unit: '', code: '', duration: '', date: '', outcomes: '', outline: '', extra: '', lessons: '1', prior: '', homework: '' };
  const KEEP = ['extra', 'lessons', 'prior', 'homework']; // typed on this page, not taken from the lesson

  /* ---------- lesson → values ---------- */
  function fillFromLesson() {
    const l = S.lessons.find(x => x.id === lessonId);
    Object.keys(V).forEach(k => { if (!KEEP.includes(k)) V[k] = ''; });
    Object.assign(V, aiLessonValues(l));
    $$('[data-v]').forEach(el => { el.value = V[el.dataset.v] || ''; });
  }

  function fillLessonSelect() {
    const list = [...S.lessons].sort((a, b) => b.date.localeCompare(a.date));
    const today = isoDate();
    $('#fLesson').innerHTML = '<option value="">— none: type the details below —</option>' +
      `<optgroup label="Upcoming">${list.filter(l => l.date >= today).reverse().map(opt).join('')}</optgroup>` +
      `<optgroup label="Past">${list.filter(l => l.date < today).map(opt).join('')}</optgroup>`;
    $('#fLesson').value = S.lessons.some(l => l.id === lessonId) ? lessonId : '';
    function opt(l) {
      const n = S.aiResults.filter(r => r.lessonId === l.id).length;
      return `<option value="${l.id}">${esc(fmtDate(l.date, { day: 'numeric', month: 'short' }))} · ${esc(App.cls(l.classId)?.name || App.course(l.courseId)?.short || '')} · ${esc(l.title)}${n ? `  (🤖 ${n})` : ''}</option>`;
    }
  }

  /* ---------- template → prompt ---------- */
  const tpl = () => S.aiTemplates.find(t => t.id === prefs.templateId) || S.aiTemplates[0];
  function fillTemplateSelect() {
    $('#fTemplate').innerHTML = S.aiTemplates.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
    $('#fTemplate').value = tpl().id;
  }
  const buildPrompt = () => aiBuildPrompt(tpl().text, V);
  function renderPrompt() {
    const { out, used, unknown } = buildPrompt();
    $('#promptOut').value = out;
    $('#promptInfo').textContent = `${out.length.toLocaleString()} characters${used.size ? '' : ' · lesson details added at the end'}`;
    const optional = ['extra', 'outline', 'prior', 'homework', 'code'];
    const empty = [...used].filter(k => !optional.includes(k) && !(V[k] || '').trim());
    $('#missing').innerHTML = [
      unknown.size ? `<div class="empty-hint">Unknown placeholder(s): ${[...unknown].map(k => `<code>{{${esc(k)}}}</code>`).join(' ')}. Check the spelling in the template.</div>` : '',
      empty.length ? `<p class="small muted" style="margin:0 0 .5rem">Not filled in: ${empty.map(k => esc(PLACEHOLDERS[k].split(' (')[0])).join(', ')}.</p>` : '',
    ].join('');
  }

  /* ---------- saved results ---------- */
  function renderSaved() {
    const list = S.aiResults.filter(r => (lessonId ? r.lessonId === lessonId : !r.lessonId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    $('#saved').innerHTML = list.length ? `<ul class="review-list">${list.map(r => {
      const files = r.files || [];
      return `<li><div class="grow"><button class="link" data-view-result="${r.id}" style="color:var(--text);font-weight:600;text-align:left">${esc(r.templateName || 'Result')}</button>
        <div class="muted small">${esc(new Date(r.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}${r.result ? ` · ${r.result.length.toLocaleString()} characters` : ''}${files.length ? ` · 📎 ${files.length} file${files.length > 1 ? 's' : ''} (${fmtBytes(files.reduce((s, f) => s + f.size, 0))})` : ''}</div>
        ${files.length ? `<div class="file-chips">${files.slice(0, 6).map(f => `<button type="button" class="file-chip" data-open-file="${f.id}" data-result="${r.id}" title="Open ${esc(f.name)}">${fileIcon(f.name)} ${esc(f.name)}</button>`).join('')}${files.length > 6 ? `<span class="small muted">+${files.length - 6} more</span>` : ''}</div>` : ''}</div>
        <button class="icon-btn sm" data-del-result="${r.id}" aria-label="Delete">×</button></li>`;
    }).join('')}</ul>`
      : `<p class="muted small" style="margin:0">${lessonId ? 'Nothing saved for this lesson yet.' : 'Choose a lesson to see its saved content.'}</p>`;
  }

  async function deleteResult(id) {
    const r = S.aiResults.find(x => x.id === id);
    S.aiResults = S.aiResults.filter(x => x.id !== id);
    for (const f of r?.files || []) await releaseStoredFile(f.id); // kept while a copied lesson still uses it
    App.save(); renderSaved(); fillLessonSelect();
  }

  const storeFiles = aiStoreFiles;

  function viewResult(r) {
    const l = S.lessons.find(x => x.id === r.lessonId);
    const filesHtml = () => (r.files || []).length ? `<ul class="file-list">${r.files.map(f => `<li>
        <span class="file-name">${fileIcon(f.name)} ${esc(f.name)}</span><span class="small muted">${fmtBytes(f.size)}</span>
        <button type="button" class="btn btn-sm btn-soft" data-open="${f.id}">Open</button>
        <button type="button" class="btn btn-sm btn-ghost" data-download="${f.id}">Download</button>
        <button type="button" class="icon-btn sm" data-remove="${f.id}" aria-label="Remove file">×</button></li>`).join('')}</ul>` : '<p class="muted small">No files attached.</p>';
    openModal({
      title: `${r.templateName || 'AI content'}${l ? ` — ${l.title}` : ''}`, wide: true,
      body: `<h3 style="margin-bottom:.4rem">Files</h3><div data-files>${filesHtml()}</div>
        <div class="form-row" style="margin:.4rem 0 1rem"><button type="button" class="btn btn-sm btn-ghost" data-add-files>+ Add files</button><input type="file" multiple hidden data-file-input></div>
        ${r.result ? `<h3 style="margin-bottom:.4rem">Claude’s answer</h3><div class="md-view">${mdToHtml(r.result)}</div>` : ''}`,
      actions: [
        { label: 'Delete', cls: 'btn-danger-ghost', onClick: () => { confirmModal(`Delete this saved result${(r.files || []).length ? ` and its ${r.files.length} file(s)` : ''}?`, () => deleteResult(r.id)); } },
        'spacer',
        ...(r.result ? [
          { label: 'Edit text here', cls: 'btn-ghost', onClick: () => { $('#result').value = r.result; setView('edit'); $('#result').focus(); toast('Loaded into step 3 — save again to keep your changes as a new result'); } },
          { label: 'Copy', cls: 'btn-ghost', onClick: () => { copyText(r.result); return false; } },
          { label: 'Print', cls: 'btn-ghost', onClick: () => { printHTML(l?.title || 'Lesson content', `<h1>${esc(l?.title || 'Lesson content')}</h1><div class="meta">${esc([App.cls(l?.classId)?.name, l ? fmtDate(l.date, { weekday: 'long', day: 'numeric', month: 'long' }) : ''].filter(Boolean).join(' · '))}</div><div class="md">${mdToHtml(r.result)}</div>`); return false; } },
        ] : []),
        { label: 'Close', cls: 'btn-primary' },
      ],
      onOpen: dlg => {
        const refresh = () => { $('[data-files]', dlg).innerHTML = filesHtml(); renderSaved(); };
        dlg.addEventListener('click', async e => {
          const b = e.target.closest('button'); if (!b) return;
          const find = id => r.files.find(f => f.id === id);
          if (b.dataset.open) openStoredFile(find(b.dataset.open));
          else if (b.dataset.download) openStoredFile(find(b.dataset.download), true);
          else if (b.dataset.remove) {
            const f = find(b.dataset.remove);
            r.files = r.files.filter(x => x.id !== f.id);
            await releaseStoredFile(f.id);
            App.save(); refresh(); toast(`Removed ${f.name}`);
          } else if (b.hasAttribute('data-add-files')) $('[data-file-input]', dlg).click();
        });
        $('[data-file-input]', dlg).addEventListener('change', async e => {
          const files = [...e.target.files]; e.target.value = '';
          if (!files.length) return;
          try {
            const metas = await storeFiles(files);
            r.files = [...(r.files || []), ...metas];
            if (App.save()) {
              refresh(); toast(`${metas.length} file(s) added`, 'success');
              if (l) { await fileLessonMaterials(l); refresh(); }
            }
          } catch (x) { toast(`Could not store the file(s): ${x.message || x}`, 'error'); }
        });
      },
    });
  }

  /* ---------- template manager ---------- */
  function manageTemplates() {
    let editing = tpl().id;
    const draw = dlg => {
      const t = S.aiTemplates.find(x => x.id === editing);
      $('[data-list]', dlg).innerHTML = S.aiTemplates.map(x => `<button type="button" class="tp ${x.id === editing ? 'active' : ''}" data-pick="${x.id}"><span class="tp-title">${esc(x.name)}</span></button>`).join('');
      $('[data-name]', dlg).value = t.name;
      $('[data-text]', dlg).value = t.text;
    };
    const saveCurrent = dlg => {
      const t = S.aiTemplates.find(x => x.id === editing);
      if (!t) return;
      t.name = $('[data-name]', dlg).value.trim() || 'Untitled prompt';
      t.text = $('[data-text]', dlg).value;
    };
    openModal({
      title: 'Prompt templates', wide: true,
      body: `<div class="tpl-layout">
        <div><div data-list class="topic-pick" style="max-height:360px"></div>
          <button type="button" class="btn btn-sm btn-soft" data-new style="margin-top:.5rem;width:100%">+ New template</button></div>
        <div class="stack" style="gap:.6rem">
          <label>Name<input data-name></label>
          <label>Prompt<textarea data-text rows="14" placeholder="Paste your prompt here…"></textarea></label>
          <div class="small muted">Placeholders you can use — they are replaced with the lesson’s details:
            <div class="chip-group" style="margin-top:.35rem">${Object.entries(PLACEHOLDERS).map(([k, d]) => `<button type="button" class="chip ph" data-ph="${k}" title="${esc(d)} — click to insert">{{${k}}}</button>`).join('')}</div>
            If the prompt has no placeholders, the lesson details are added at the end automatically.</div>
        </div></div>`,
      actions: [
        { label: 'Delete template', cls: 'btn-danger-ghost', onClick: dlg => {
          if (S.aiTemplates.length < 2) { toast('Keep at least one template', 'error'); return false; }
          S.aiTemplates = S.aiTemplates.filter(x => x.id !== editing);
          editing = S.aiTemplates[0].id; App.save(); draw(dlg); return false;
        } },
        'spacer',
        { label: 'Done', cls: 'btn-primary', onClick: dlg => {
          saveCurrent(dlg); prefs.templateId = editing; App.save();
          fillTemplateSelect(); renderPrompt(); toast('Templates saved', 'success');
        } },
      ],
      onOpen: dlg => {
        draw(dlg);
        $('[data-list]', dlg).addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (!b) return; saveCurrent(dlg); editing = b.dataset.pick; draw(dlg); });
        $('[data-new]', dlg).addEventListener('click', () => {
          saveCurrent(dlg);
          const t = { id: uid('tpl'), name: 'New prompt', text: '' };
          S.aiTemplates.push(t); editing = t.id; draw(dlg); $('[data-name]', dlg).select();
        });
        $('[data-name]', dlg).addEventListener('input', () => { saveCurrent(dlg); $('[data-list] .tp.active .tp-title', dlg).textContent = $('[data-name]', dlg).value; });
        dlg.addEventListener('click', e => {
          const b = e.target.closest('[data-ph]'); if (!b) return;
          const ta = $('[data-text]', dlg), ins = `{{${b.dataset.ph}}}`, s = ta.selectionStart ?? ta.value.length;
          ta.value = ta.value.slice(0, s) + ins + ta.value.slice(ta.selectionEnd ?? s);
          ta.focus(); ta.selectionStart = ta.selectionEnd = s + ins.length;
        });
      },
    });
  }

  /* ---------- result view toggle ---------- */
  function setView(v) {
    $$('#viewSeg button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    $('#result').hidden = v !== 'edit';
    $('#resultPreview').hidden = v !== 'preview';
    if (v === 'preview') $('#resultPreview').innerHTML = mdToHtml($('#result').value) || '<p class="muted">Nothing pasted yet.</p>';
  }

  /* ---------- events ---------- */
  $('#fLesson').addEventListener('change', e => {
    lessonId = e.target.value;
    history.replaceState(null, '', lessonId ? `?lesson=${lessonId}` : location.pathname);
    fillFromLesson(); renderPrompt(); renderSaved();
  });
  $$('[data-v]').forEach(el => el.addEventListener('input', () => { V[el.dataset.v] = el.value; renderPrompt(); }));
  $('#fTemplate').addEventListener('change', e => { prefs.templateId = e.target.value; App.save(true); renderPrompt(); });
  $('#manageTpl').onclick = manageTemplates;
  $('#copyPrompt').onclick = () => copyText($('#promptOut').value);
  $('#copyOpen').onclick = () => copyPromptAndOpenClaude($('#promptOut').value);
  $('#viewSeg').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
  $('#result').addEventListener('paste', () => setTimeout(() => { if ($('#result').value.trim()) setView('preview'); }, 50));
  /* ---------- files waiting to be saved ---------- */
  let pending = [];
  function renderPending() {
    $('#pending').innerHTML = pending.map((f, i) => `<li><span class="file-name">${fileIcon(f.name)} ${esc(f.name)}</span>
      <span class="small muted">${fmtBytes(f.size)}</span><button type="button" class="icon-btn sm" data-unpend="${i}" aria-label="Remove ${esc(f.name)}">×</button></li>`).join('');
    const total = pending.reduce((s, f) => s + f.size, 0);
    $('#saveResult').textContent = pending.length ? `Save to lesson (${pending.length} file${pending.length > 1 ? 's' : ''}, ${fmtBytes(total)})` : 'Save to lesson';
  }
  function addPending(list) {
    const files = [...list].filter(f => f.size > 0 && !pending.some(p => p.name === f.name && p.size === f.size));
    const big = files.filter(f => f.size > 200 * 1048576);
    if (big.length) toast(`Skipped ${big.map(f => f.name).join(', ')} — files over 200 MB are too large to keep in the browser`, 'error');
    pending.push(...files.filter(f => f.size <= 200 * 1048576));
    renderPending();
  }
  const dz = $('#dropzone');
  dz.addEventListener('click', () => $('#fileInput').click());
  dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#fileInput').click(); } });
  $('#fileInput').addEventListener('change', e => { addPending(e.target.files); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => addPending(e.dataTransfer.files));
  // dropping a file anywhere else on the page should not open it in the browser
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => { if (!e.target.closest('#dropzone')) e.preventDefault(); });
  $('#pending').addEventListener('click', e => { const b = e.target.closest('[data-unpend]'); if (!b) return; pending.splice(Number(b.dataset.unpend), 1); renderPending(); });

  $('#clearResult').onclick = () => { $('#result').value = ''; pending = []; renderPending(); setView('edit'); };
  $('#saveResult').onclick = async () => {
    const result = $('#result').value.trim();
    if (!result && !pending.length) { toast('Paste Claude’s answer or add its files first', 'error'); setView('edit'); $('#result').focus(); return; }
    const btn = $('#saveResult');
    btn.disabled = true; btn.textContent = 'Saving…';
    let files = [];
    try { files = await storeFiles(pending); } catch (e) {
      btn.disabled = false; renderPending();
      toast(`Could not store the files: ${e.message || e}. The browser may be out of space.`, 'error');
      return;
    }
    S.aiResults.push({ id: uid('ai'), lessonId: lessonId || '', templateId: tpl().id, templateName: tpl().name, result, files, createdAt: new Date().toISOString() });
    btn.disabled = false;
    if (!App.save()) { renderPending(); return; }
    const l = S.lessons.find(x => x.id === lessonId);
    toast(`${l ? `Saved to “${l.title}”` : 'Saved (not linked to a lesson)'}${files.length ? ` with ${files.length} file(s)` : ''}`, 'success');
    $('#result').value = ''; pending = []; renderPending(); setView('edit');
    renderSaved(); fillLessonSelect();
    if (l && files.length) { await fileLessonMaterials(l); renderSaved(); }
  };
  $('#saved').addEventListener('click', e => {
    const v = e.target.closest('[data-view-result]'), d = e.target.closest('[data-del-result]'), f = e.target.closest('[data-open-file]');
    if (v) viewResult(S.aiResults.find(r => r.id === v.dataset.viewResult));
    if (f) openStoredFile(S.aiResults.find(r => r.id === f.dataset.result).files.find(x => x.id === f.dataset.openFile));
    if (d) {
      const r = S.aiResults.find(x => x.id === d.dataset.delResult);
      confirmModal(`Delete this saved result${(r.files || []).length ? ` and its ${r.files.length} file(s)` : ''}?`, () => deleteResult(r.id));
    }
  });

  $$('[data-folder-line]').forEach(el => { el.innerHTML = folderLineHtml(); });
  fillLessonSelect(); fillTemplateSelect(); fillFromLesson(); renderPrompt(); renderSaved();
})();
