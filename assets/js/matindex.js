'use strict';
/* ============================================================
   Material library index: semantic search over your own teaching materials, entirely in the browser.
   Sources: a folder on this computer (PDF, PowerPoint, Word, LaTeX, Markdown, text) and what MathHub
   stores (lesson plans, files saved with AI studio results, saved worksheets).
   Text is split into chunks and turned into vectors by a small language model (all-MiniLM-L6-v2,
   downloaded once from Hugging Face and cached by the browser). Chunks and vectors live in IndexedDB;
   nothing is sent anywhere. Search = cosine similarity + a keyword boost.
   ============================================================ */
const MatIndex = (() => {
  const LIBS = {
    transformers: 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0',
    pdf: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.min.mjs',
    pdfWorker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs',
    jszip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.2/dist/jszip.min.js',
  };
  const MODEL = 'Xenova/all-MiniLM-L6-v2';
  const EXT = { pdf: 'PDF', pptx: 'Slides', docx: 'Word', tex: 'LaTeX', md: 'Text', txt: 'Text' };
  const SKIP_DIRS = new Set(['.git', '.claude', 'assets', 'backup', 'node_modules', 'images', '$RECYCLE.BIN']);
  const DIR_KEY = '__materialsDir';

  /* ---------- storage (IndexedDB: docs + chunks) ---------- */
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open('mathhub-materials', 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        d.createObjectStore('docs', { keyPath: 'id' });
        d.createObjectStore('chunks', { keyPath: 'id' }).createIndex('docId', 'docId');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  async function tx(stores, mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const t = d.transaction(stores, mode);
      const out = fn(...[].concat(stores).map(s => t.objectStore(s)));
      t.oncomplete = () => resolve(out?.result ?? out);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('Storage transaction aborted'));
    });
  }
  const allDocs = () => tx('docs', 'readonly', s => s.getAll());
  let chunkCache = null; // all chunks in memory for search
  async function allChunks() { if (!chunkCache) chunkCache = await tx('chunks', 'readonly', s => s.getAll()); return chunkCache; }
  async function removeDoc(id) {
    chunkCache = null;
    await tx(['docs', 'chunks'], 'readwrite', (docs, chunks) => {
      docs.delete(id);
      const req = chunks.index('docId').openCursor(IDBKeyRange.only(id));
      req.onsuccess = () => { const c = req.result; if (c) { c.delete(); c.continue(); } };
    });
  }
  async function putDoc(doc, chunks) {
    await removeDoc(doc.id);
    chunkCache = null;
    await tx(['docs', 'chunks'], 'readwrite', (docs, cs) => { docs.put(doc); chunks.forEach(c => cs.put(c)); });
  }
  async function clear() { chunkCache = null; await tx(['docs', 'chunks'], 'readwrite', (a, b) => { a.clear(); b.clear(); }); }

  /* ---------- libraries, loaded when first needed ---------- */
  const loadScript = src => new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = () => reject(new Error(`Could not load ${src}`)); document.head.appendChild(s); });
  let embedder = null;
  async function model(onStatus) {
    if (embedder) return embedder;
    embedder = (async () => {
      onStatus?.('Loading the language model (the first time it downloads about 23 MB, then it is cached)…');
      const T = await import(LIBS.transformers);
      let last = 0;
      return T.pipeline('feature-extraction', MODEL, { dtype: 'q8', progress_callback: p => {
        if (p.status === 'progress' && p.total > 5e6 && Date.now() - last > 400) { last = Date.now(); onStatus?.(`Downloading the language model… ${Math.round(p.progress)}%`); }
      } });
    })();
    embedder.catch(() => { embedder = null; });
    return embedder;
  }
  async function embed(texts, onStatus) {
    const pipe = await model(onStatus);
    const out = [];
    for (let i = 0; i < texts.length; i += 16) {
      const t = await pipe(texts.slice(i, i + 16), { pooling: 'mean', normalize: true });
      const dim = t.dims[t.dims.length - 1], data = t.data;
      for (let j = 0; j < t.dims[0]; j++) out.push(new Float32Array(data.slice(j * dim, (j + 1) * dim)));
    }
    return out;
  }

  /* ---------- text extraction ---------- */
  async function pdfText(buf) {
    const pdfjs = await import(LIBS.pdf);
    pdfjs.GlobalWorkerOptions.workerSrc = LIBS.pdfWorker;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise; // pdf.js needs a typed array
    const pages = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const c = await (await doc.getPage(p)).getTextContent();
      pages.push(c.items.map(i => i.str + (i.hasEOL ? '\n' : ' ')).join(''));
    }
    return pages.join('\n\n');
  }
  async function zipText(buf, kind) {
    if (typeof JSZip === 'undefined') await loadScript(LIBS.jszip);
    const zip = await JSZip.loadAsync(buf);
    const xmlText = (xml, tag, para) => xml.replace(new RegExp(`</${para}>`, 'g'), '\n').replace(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'g'), '$1\u0001').replace(/<[^>]+>/g, '').replace(/\u0001/g, ' ')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
    if (kind === 'docx') return xmlText(await zip.file('word/document.xml').async('string'), 'w:t', 'w:p');
    const slides = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)));
    const out = [];
    for (const [i, n] of slides.entries()) out.push(`Slide ${i + 1}: ${xmlText(await zip.file(n).async('string'), 'a:t', 'a:p').replace(/\s*\n\s*/g, ' · ')}`);
    return out.join('\n\n');
  }
  // LaTeX → readable text: layout commands, column specs and lengths go; maths ($…$) is kept as written
  function texText(s) {
    const b = s.indexOf('\\begin{document}');
    if (b >= 0) s = s.slice(b + 16);
    s = s.replace(/(^|[^\\])%.*$/gm, '$1').replace(/\\(begin|end)\{[^}]*\}(\{[^}]*\})?(\[[^\]]*\])?/g, '\n').replace(/\\\\(\[[^\]]*\])?/g, '\n').replace(/\\(item|par|newline)\b/g, '\n');
    return s.split(/(\$[^$]*\$)/).map((part, i) => i % 2 ? part : part
      .replace(/\\[a-zA-Z@]+\*?(\[[^\]]*\])?/g, ' ')          // commands (their {arguments} stay as text)
      .replace(/[>]?\{?\b[pmb]?\{?-?\d+(\.\d+)?\s*(cm|mm|pt|em|ex|in)\}?/g, ' ') // lengths and p{7cm} column specs
      .replace(/[{}&~<>|]/g, ' ')).join('').replace(/[ \t]+/g, ' ');
  }
  async function extract(name, blob) {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return pdfText(await blob.arrayBuffer());
    if (ext === 'pptx' || ext === 'docx') return zipText(await blob.arrayBuffer(), ext);
    if (ext === 'tex') return texText(await blob.text());
    return blob.text();
  }

  /* ---------- chunks ---------- */
  function chunk(text, size = 900, overlap = 150) {
    const paras = String(text).replace(/\r/g, '').split(/\n\s*\n|(?=Slide \d+: )/).map(p => p.replace(/\s+/g, ' ').trim()).filter(p => p.length > 2);
    const out = [];
    let cur = '';
    for (const p of paras) {
      if (cur && cur.length + p.length + 1 > size) { out.push(cur); cur = cur.slice(-overlap); }
      cur = cur ? `${cur} ${p}` : p;
      while (cur.length > size * 1.4) { out.push(cur.slice(0, size)); cur = cur.slice(size - overlap); }
    }
    if (cur.trim().length > 20 || !out.length) out.push(cur);
    return out.filter(c => c.trim());
  }
  const titleOf = name => name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const gradeOf = s => (String(s).match(/\bGrade\s*(\d{1,2})\b/i) || String(s).match(/\bMYP\s*(\d{1,2})\b/i) || [])[1] || '';
  async function indexText(doc, text, onStatus) {
    const parts = chunk(text);
    const vecs = await embed(parts.map(p => `${doc.title}. ${p}`), onStatus);
    await putDoc({ ...doc, chunks: parts.length, chars: text.length, indexedAt: new Date().toISOString() },
      parts.map((t, i) => ({ id: `${doc.id}#${i}`, docId: doc.id, i, text: t, vec: vecs[i] })));
  }

  /* ---------- sources ---------- */
  const canPickFolder = () => 'showDirectoryPicker' in window;
  async function folder() { try { return (await FileStore.get(DIR_KEY)) || null; } catch (e) { return null; } }
  async function chooseFolder() {
    const dir = await window.showDirectoryPicker({ id: 'mathhub-materials', mode: 'read' });
    await FileStore.put(DIR_KEY, dir);
    return dir;
  }
  async function permitted(dir) { return (await dir.queryPermission({ mode: 'read' })) === 'granted' || (await dir.requestPermission({ mode: 'read' })) === 'granted'; }
  async function* walk(dir, path = '') {
    for await (const entry of dir.values()) {
      if (entry.kind === 'directory') { if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) yield* walk(entry, `${path}${entry.name}/`); }
      else if (EXT[entry.name.split('.').pop().toLowerCase()] && !entry.name.startsWith('~$')) yield { entry, path: path + entry.name };
    }
  }
  // index new and changed files in the folder; remove files that are gone. onStatus(text, done, total)
  async function indexFolder(onStatus) {
    const dir = await folder();
    if (!dir) throw new Error('Choose a folder first');
    if (!(await permitted(dir))) throw new Error('The browser did not get permission to read the folder');
    onStatus?.('Looking for files…');
    const files = [];
    for await (const f of walk(dir)) files.push(f);
    const known = Object.fromEntries((await allDocs()).filter(d => d.source === 'folder').map(d => [d.id, d]));
    let done = 0, added = 0, failed = [];
    for (const { entry, path } of files) {
      const id = `f:${path}`, file = await entry.getFile();
      done++;
      if (known[id] && known[id].size === file.size && known[id].mtime === file.lastModified) { delete known[id]; continue; }
      delete known[id];
      if (file.size > 40e6) continue;
      onStatus?.(`Reading ${path}`, done, files.length);
      try {
        const text = await extract(file.name, file);
        await indexText({ id, source: 'folder', name: file.name, path, title: titleOf(file.name), type: EXT[file.name.split('.').pop().toLowerCase()], grade: gradeOf(path), size: file.size, mtime: file.lastModified },
          text, s => onStatus?.(s, done, files.length));
        added++;
      } catch (e) { failed.push(`${path} (${e.message})`); }
    }
    for (const id of Object.keys(known)) await removeDoc(id);
    return { files: files.length, added, removed: Object.keys(known).length, failed };
  }
  // lesson plans, files saved with AI studio results, saved worksheets
  async function indexBrowser(onStatus) {
    const S = App.state, items = [];
    (S.lessons || []).forEach(l => {
      const cls = App.cls(l.classId), course = App.course(l.courseId);
      const text = [l.title, l.objectives, l.starter, l.main, l.plenary, l.homework, l.differentiation, l.resources, l.reflection].filter(x => x && x.trim() && x.trim() !== 'Students will be able to…').join('\n\n');
      if (text.length > 20) items.push({ doc: { id: `l:${l.id}`, source: 'lesson', name: l.title, path: `${cls?.name || course?.short || ''} · ${l.date}`, title: l.title, type: 'Lesson plan', grade: gradeOf(course?.name || cls?.name || ''), lessonId: l.id, sig: text.length }, text });
    });
    (S.worksheets || []).forEach(w => {
      const div = document.createElement('div'); div.innerHTML = w.html;
      items.push({ doc: { id: `w:${w.id}`, source: 'worksheet', name: w.title, path: `Saved worksheet · ${w.createdAt}`, title: w.title, type: 'Worksheet', grade: gradeOf(App.course(w.courseId)?.name || ''), worksheetId: w.id, sig: w.html.length }, text: div.innerText });
    });
    (S.aiResults || []).forEach(r => (r.files || []).forEach(f => {
      if (!EXT[f.name.split('.').pop().toLowerCase()]) return;
      const l = S.lessons.find(x => x.id === r.lessonId);
      items.push({ doc: { id: `a:${f.id}`, source: 'stored', name: f.name, path: `AI studio${l ? ` · ${l.title}` : ''}`, title: titleOf(f.name), type: EXT[f.name.split('.').pop().toLowerCase()], grade: gradeOf(f.name), fileId: f.id, size: f.size, sig: f.size }, file: f });
    }));
    const known = Object.fromEntries((await allDocs()).filter(d => d.source !== 'folder').map(d => [d.id, d]));
    let done = 0, added = 0, failed = [];
    for (const it of items) {
      done++;
      const k = known[it.doc.id]; delete known[it.doc.id];
      if (k && k.sig === it.doc.sig) continue;
      onStatus?.(`Reading ${it.doc.name}`, done, items.length);
      try {
        let text = it.text;
        if (it.file) { const blob = await FileStore.get(it.file.id); if (!blob) continue; text = await extract(it.file.name, blob); }
        await indexText(it.doc, text, s => onStatus?.(s, done, items.length));
        added++;
      } catch (e) { failed.push(`${it.doc.name} (${e.message})`); }
    }
    for (const id of Object.keys(known)) await removeDoc(id);
    return { files: items.length, added, removed: Object.keys(known).length, failed };
  }

  /* ---------- search ---------- */
  const words = s => [...new Set(String(s).toLowerCase().match(/[a-z0-9]{3,}/g) || [])].filter(w => !STOP.has(w));
  const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'use', 'using', 'find', 'students', 'student', 'lesson', 'about', 'what', 'which', 'into', 'their']);
  // → chunks ranked by relevance: [{ chunk, doc, score }]
  async function rankChunks(query, { filter } = {}) {
    const [qv] = await embed([query]);
    const docs = Object.fromEntries((await allDocs()).map(d => [d.id, d]));
    const qw = words(query);
    return (await allChunks()).map(c => {
      const doc = docs[c.docId];
      if (!doc || (filter && !filter(doc))) return null;
      let cos = 0; for (let i = 0; i < qv.length; i++) cos += qv[i] * c.vec[i];
      const hay = `${doc.title} ${c.text}`.toLowerCase();
      const kw = qw.length ? qw.filter(w => hay.includes(w)).length / qw.length : 0;
      return { chunk: c, doc, score: cos + 0.12 * kw };
    }).filter(Boolean).sort((a, b) => b.score - a.score);
  }
  // documents for a query, best chunk as the snippet. The same file stored twice (folder + AI studio) or two
  // lesson plans with the same text show once. Weak matches are dropped: below 0.3, or far below the best match.
  async function search(query, { limit = 30, filter } = {}) {
    const ranked = await rankChunks(query, { filter });
    const seen = new Map(), cut = Math.max(0.3, (ranked[0]?.score || 0) - 0.18);
    for (const r of ranked) {
      if (r.score < cut) break;
      const sig = r.doc.size ? `${r.doc.name.toLowerCase()}|${r.doc.size}` : `${r.doc.type}|${r.doc.title}|${r.chunk.text.slice(0, 160)}`;
      if (!seen.has(sig)) seen.set(sig, { ...r, hits: 1 });
      else seen.get(sig).hits++;
    }
    return [...seen.values()].slice(0, limit);
  }
  // Excerpts for a Claude prompt: for each query the best chunks from different documents, within maxChars.
  async function context(queries, { perQuery = 2, maxChars = 6000, filter } = {}) {
    const picked = [], used = new Set();
    for (const q of queries) {
      const ranked = await rankChunks(q, { filter });
      let n = 0;
      for (const r of ranked) {
        if (r.score < 0.3 || n >= perQuery) break;
        if (r.chunk.text.length < 160) continue; // a one-line lesson title tells Claude little
        const key = `${r.doc.name}|${r.chunk.i}`;
        if (used.has(key) || picked.some(p => p.doc.name === r.doc.name && p.q === q)) continue;
        used.add(key); picked.push({ ...r, q }); n++;
      }
    }
    let out = '', count = 0;
    for (const p of picked) {
      const piece = `[${count + 1}] ${p.doc.title} (${p.doc.type}${p.doc.grade ? `, Grade ${p.doc.grade}` : ''})\n"${p.chunk.text.slice(0, 900)}"\n\n`;
      if (out.length + piece.length > maxChars) break;
      out += piece; count++;
    }
    return { text: out.trim(), count };
  }

  async function stats() {
    const docs = await allDocs(), chunks = await allChunks();
    return { docs: docs.length, chunks: chunks.length, folder: docs.filter(d => d.source === 'folder').length, browser: docs.filter(d => d.source !== 'folder').length,
      last: docs.map(d => d.indexedAt).sort().pop() || '', types: docs.reduce((o, d) => (o[d.type] = (o[d.type] || 0) + 1, o), {}) };
  }
  // open a document from a search result
  async function open(doc) {
    if (doc.source === 'folder') {
      const dir = await folder();
      if (!dir || !(await permitted(dir))) throw new Error('The folder is not available');
      const parts = doc.path.split('/'); let h = dir;
      for (const p of parts.slice(0, -1)) h = await h.getDirectoryHandle(p);
      const file = await (await h.getFileHandle(parts.at(-1))).getFile();
      if (doc.type === 'PDF' || doc.type === 'Text' || doc.type === 'LaTeX') {
        const url = URL.createObjectURL(doc.type === 'PDF' ? new Blob([file], { type: 'application/pdf' }) : new Blob([file], { type: 'text/plain;charset=utf-8' }));
        if (!window.open(url, '_blank')) downloadBlob(file.name, file);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else downloadBlob(file.name, file);
      return;
    }
    if (doc.source === 'stored') { const meta = App.state.aiResults.flatMap(r => r.files || []).find(f => f.id === doc.fileId); if (meta) return openStoredFile(meta); throw new Error('The file is no longer stored'); }
    if (doc.source === 'lesson') { const l = App.state.lessons.find(x => x.id === doc.lessonId); if (l) return openLessonEditor(l); }
    if (doc.source === 'worksheet') location.href = 'worksheets.html';
  }

  return { canPickFolder, folder, chooseFolder, indexFolder, indexBrowser, search, context, stats, clear, open, words, model };
})();
