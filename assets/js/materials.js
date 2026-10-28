(() => {
  /* Material library page: sources, indexing and semantic search (engine: matindex.js). */
  const TYPES = ['All', 'PDF', 'Slides', 'LaTeX', 'Word', 'Text', 'Lesson plan', 'Worksheet'];
  let type = 'All', grade = '', last = [];

  const bar = (text, done, total) => {
    $('#progress').hidden = false;
    $('#progressText').textContent = total ? `${text} (${done}/${total})` : text;
    $('#progressBar').style.width = total ? `${Math.round(done / total * 100)}%` : '8%';
  };
  const busy = on => $$('#sources button').forEach(b => { b.disabled = on; });

  async function renderStats() {
    const s = await MatIndex.stats(), dir = MatIndex.canPickFolder() ? await MatIndex.folder() : null;
    $('#statsLine').textContent = s.docs
      ? `${s.docs} documents · ${s.chunks} passages indexed${s.last ? ` · last update ${new Date(s.last).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}`
      : 'Nothing indexed yet — update a source below.';
    $('#folderInfo').textContent = !MatIndex.canPickFolder() ? 'This browser cannot read folders — use Chrome or Edge.' : dir ? `Folder “${dir.name}” · ${s.folder} documents` : 'No folder chosen yet.';
    $('#browserInfo').textContent = `${s.browser} documents`;
    $('#chooseFolder').textContent = dir ? 'Change folder…' : 'Choose folder…';
    if (!MatIndex.canPickFolder()) { $('#chooseFolder').disabled = true; $('#indexFolder').disabled = true; }
    renderFilters(s);
  }
  function renderFilters(s) {
    $('#filters').innerHTML = TYPES.filter(t => t === 'All' || s.types[t]).map(t => `<button type="button" class="chip-btn ${t === type ? 'active' : ''}" data-type="${t}">${t}${t !== 'All' ? ` · ${s.types[t]}` : ''}</button>`).join('') +
      `<select id="grade" aria-label="Grade" class="mat-grade"><option value="">All grades</option>${[8, 9, 10, 11, 12].map(g => `<option value="${g}" ${String(g) === grade ? 'selected' : ''}>Grade ${g}</option>`).join('')}</select>`;
    $('#grade').onchange = e => { grade = e.target.value; if ($('#q').value.trim()) run(); };
  }
  $('#filters').addEventListener('click', e => { const b = e.target.closest('[data-type]'); if (!b) return; type = b.dataset.type; $$('#filters [data-type]').forEach(x => x.classList.toggle('active', x === b)); if ($('#q').value.trim()) run(); });

  const mark = (text, words) => { let h = esc(text); words.forEach(w => { h = h.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>'); }); return h; };
  function snippet(text, words) {
    const low = text.toLowerCase(), at = Math.max(0, Math.min(...words.map(w => { const i = low.indexOf(w); return i < 0 ? Infinity : i; }).concat([Infinity])) - 80);
    const start = Number.isFinite(at) ? at : 0, s = text.slice(start, start + 320);
    return `${start ? '…' : ''}${mark(s, words)}${start + 320 < text.length ? '…' : ''}`;
  }
  async function run() {
    const q = $('#q').value.trim();
    if (!q) return;
    $('#searchInfo').textContent = 'Searching…';
    try {
      const filter = d => (type === 'All' || d.type === type) && (!grade || d.grade === grade);
      last = await MatIndex.search(q, { filter, limit: 30 });
      const words = MatIndex.words(q);
      $('#searchInfo').textContent = last.length ? `${last.length} document${last.length > 1 ? 's' : ''} — best matches first` : 'No close matches. Try other words, or update the sources below.';
      $('#results').innerHTML = last.map((r, i) => `<article class="mat-hit">
        <div class="mat-hit-icon">${fileIcon(r.doc.name.includes('.') ? r.doc.name : `x.${r.doc.type === 'Lesson plan' ? 'md' : 'txt'}`)}</div>
        <div class="grow"><div class="mat-hit-head"><strong>${esc(r.doc.title)}</strong>
          <span class="badge tone-neutral">${esc(r.doc.type)}</span>${r.doc.grade ? `<span class="badge tone-info">Grade ${esc(r.doc.grade)}</span>` : ''}
          <span class="mat-score" title="Relevance"><i style="width:${Math.min(100, Math.round((r.score - 0.2) / 0.5 * 100))}%"></i></span></div>
          <div class="small muted">${esc(r.doc.path)}${r.hits > 1 ? ` · ${r.hits} matching passages` : ''}</div>
          <p class="mat-snip">${snippet(r.chunk.text, words)}</p></div>
        <div class="mat-hit-actions"><button class="btn btn-sm btn-soft" data-open="${i}">Open</button><button class="btn btn-sm btn-ghost" data-copy="${i}">Copy passage</button></div>
      </article>`).join('');
    } catch (e) { $('#searchInfo').textContent = `Search failed: ${e.message}`; }
  }
  $('#searchForm').addEventListener('submit', e => { e.preventDefault(); run(); });
  $('#results').addEventListener('click', async e => {
    const o = e.target.closest('[data-open]'), c = e.target.closest('[data-copy]');
    try {
      if (o) await MatIndex.open(last[o.dataset.open].doc);
      if (c) copyText(last[c.dataset.copy].chunk.text);
    } catch (err) { toast(err.message, 'error'); }
  });

  async function update(kind) {
    busy(true);
    try {
      const r = kind === 'folder' ? await MatIndex.indexFolder(bar) : await MatIndex.indexBrowser(bar);
      toast(`${r.files} files checked · ${r.added} read${r.removed ? ` · ${r.removed} removed` : ''}${r.failed.length ? ` · ${r.failed.length} could not be read` : ''}`, r.failed.length ? 'error' : 'success');
      if (r.failed.length) console.warn('Not indexed:', r.failed);
      bar(r.failed.length ? `Done. Could not read: ${r.failed.slice(0, 3).join('; ')}${r.failed.length > 3 ? '…' : ''}` : 'Done.', 1, 1);
    } catch (e) { if (e.name !== 'AbortError') { toast(e.message, 'error'); bar(`Stopped: ${e.message}`); } }
    busy(false);
    renderStats();
  }
  $('#chooseFolder').onclick = async () => { try { await MatIndex.chooseFolder(); await renderStats(); update('folder'); } catch (e) { if (e.name !== 'AbortError') toast(e.message, 'error'); } };
  $('#indexFolder').onclick = async () => { if (!(await MatIndex.folder())) { $('#chooseFolder').click(); return; } update('folder'); };
  $('#indexBrowser').onclick = () => update('browser');
  $('#clearIdx').onclick = () => confirmModal('Remove the whole search index? Your files are not touched; you can index them again.', async () => { await MatIndex.clear(); last = []; $('#results').innerHTML = ''; renderStats(); }, 'Clear index');

  renderStats();
  const q = new URLSearchParams(location.search).get('q');
  if (q) { $('#q').value = q; run(); }
})();
