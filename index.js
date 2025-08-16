// server.js — Single-file "Gambar jadi URL" website // Cara pakai: // 1) Pastikan Node.js v18+ terpasang. // 2) Jalankan:  npm init -y && npm i express multer uuid helmet compression morgan && node server.js // 3) Buka http://localhost:3000 — Upload gambar, langsung dapat URL publik (served dari server ini).

import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import express from 'express'; import multer from 'multer'; import { v4 as uuidv4 } from 'uuid'; import helmet from 'helmet'; import compression from 'compression'; import morgan from 'morgan';

// __dirname shim for ES modules const __filename = fileURLToPath(import.meta.url); const __dirname = path.dirname(__filename);

// ==== Config dasar ==== const PORT = process.env.PORT || 3000; const UPLOAD_DIR = path.join(__dirname, 'uploads'); const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']);

// Pastikan folder uploads ada fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer storage + filter const storage = multer.diskStorage({ destination: (_req, _file, cb) => cb(null, UPLOAD_DIR), filename: (_req, file, cb) => { const ext = mimeToExt(file.mimetype); cb(null, ${uuidv4()}${ext}); }, });

function mimeToExt(mimetype) { switch (mimetype) { case 'image/png': return '.png'; case 'image/jpeg': return '.jpg'; case 'image/webp': return '.webp'; case 'image/gif': return '.gif'; case 'image/svg+xml': return '.svg'; default: return ''; } }

const upload = multer({ storage, limits: { fileSize: MAX_SIZE_BYTES }, fileFilter: (_req, file, cb) => { if (!ALLOWED_MIME.has(file.mimetype)) { return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file')); } cb(null, true); } });

// ==== App ==== const app = express();

// Security + perf app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: { useDefaults: true, directives: { // Mengizinkan inline script untuk demo single-file ini // (kalau mau lebih ketat, pindahkan JS ke file terpisah dan non-inline) 'script-src': ["'self'", "'unsafe-inline'"], 'connect-src': ["'self'"], 'img-src': ["'self'", 'data:'], 'style-src': ["'self'", "'unsafe-inline'"], } } })); app.use(compression()); app.use(morgan('tiny'));

// Static untuk hasil upload di /u app.use('/u', express.static(UPLOAD_DIR, { fallthrough: true, setHeaders: (res) => { res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); } }));

// Halaman utama (UI upload) app.get('/', (_req, res) => { res.type('html').send(`<!doctype html>

<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Gambar ➜ URL</title>
  <meta name="description" content="Upload gambar lalu dapatkan URL langsung." />
  <style>
    :root { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, Noto Sans, sans-serif; }
    body { margin: 0; background: #0b1020; color: #e7e9ee; }
    .wrap { max-width: 880px; margin: 0 auto; padding: 32px 20px 60px; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    p.sub { opacity: .8; margin-top: 0; }
    .card { background: #0f162f; border: 1px solid #1b2450; border-radius: 18px; padding: 22px; box-shadow: 0 10px 30px rgba(0,0,0,.25); }
    .drop { border: 2px dashed #334; border-radius: 16px; padding: 26px; text-align: center; transition: .2s; background: #0e1530; }
    .drop.dragover { border-color: #5da0ff; background: #0f1b3f; }
    .btn { appearance: none; background: #3b82f6; color: white; border: none; padding: 12px 16px; border-radius: 12px; font-weight: 600; cursor: pointer; }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .row { display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap; }
    .muted { opacity: .75; }
    .out { margin-top: 18px; display: none; }
    .field { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; background: #0b122b; border: 1px solid #1b2552; padding: 10px; border-radius: 12px; }
    input[type=url] { width: 100%; background: transparent; color: #e7e9ee; border: none; outline: none; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; }
    .preview { margin-top: 10px; text-align: center; }
    .preview img { max-width: 100%; border-radius: 12px; border: 1px solid #1b2552; }
    footer { margin-top: 22px; text-align: center; opacity: .6; font-size: 13px; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Gambar ➜ URL</h1>
    <p class="sub">Upload gambar lalu dapatkan tautan langsung yang bisa dibagikan.</p><div class="card">
  <div id="drop" class="drop" tabindex="0">
    <p><strong>Drag & drop</strong> gambar ke sini, atau</p>
    <div class="row">
      <input id="file" type="file" accept="image/*" />
      <button id="btnUpload" class="btn">Upload</button>
    </div>
    <p class="muted">Maksimal 15 MB • PNG, JPG, WEBP, GIF, SVG</p>
    <p class="muted">Tip: tekan <kbd>Ctrl/⌘ + V</kbd> untuk paste gambar dari clipboard.</p>
  </div>

  <div id="out" class="out">
    <label class="muted">URL Gambar</label>
    <div class="field">
      <input id="url" type="url" readonly value="" />
      <button id="copy" class="btn">Copy</button>
    </div>
    <div id="preview" class="preview"></div>
  </div>

</div>

<footer>Made with ❤ — disimpan lokal di server ini di <code>/uploads</code>.</footer>

  </div><script>
const $ = (s) => document.querySelector(s);
const drop = $('#drop');
const input = $('#file');
const btnUpload = $('#btnUpload');
const out = $('#out');
const urlInp = $('#url');
const copyBtn = $('#copy');
const preview = $('#preview');
let selectedFile = null;

function showError(msg) {
  alert(msg);
}

// Drag & drop
['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('dragover'); }));
['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('dragover'); }));
drop.addEventListener('drop', e => {
  const f = e.dataTransfer.files?.[0];
  if (f) { input.files = e.dataTransfer.files; selectedFile = f; }
});

document.addEventListener('paste', e => {
  const item = [...(e.clipboardData?.items || [])].find(it => it.type.startsWith('image/'));
  if (item) {
    const f = item.getAsFile();
    if (f) { selectedFile = f; const dt = new DataTransfer(); dt.items.add(f); input.files = dt.files; }
  }
});

input.addEventListener('change', () => { selectedFile = input.files?.[0] || null; });

btnUpload.addEventListener('click', async () => {
  if (!selectedFile) return showError('Pilih gambar dulu.');
  btnUpload.disabled = true; btnUpload.textContent = 'Uploading…';
  try {
    const fd = new FormData();
    fd.append('file', selectedFile);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    urlInp.value = data.url;
    out.style.display = 'block';
    preview.innerHTML = `<img src="${data.url}" alt="preview" />`;
  } catch (err) {
    console.error(err);
    showError('Gagal upload: ' + (err.message || 'unknown'));
  } finally {
    btnUpload.disabled = false; btnUpload.textContent = 'Upload';
  }
});

copyBtn.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(urlInp.value); copyBtn.textContent = 'Copied!'; setTimeout(()=>copyBtn.textContent='Copy', 1200); } catch {}
});
</script></body>
</html>`);
});// API upload app.post('/api/upload', upload.single('file'), (req, res) => { try { if (!req.file) return res.status(400).json({ error: 'Tidak ada file.' }); const base = ${req.protocol}://${req.get('host')}; const url = ${base}/u/${encodeURIComponent(req.file.filename)}; res.json({ url, name: req.file.originalname, size: req.file.size }); } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); } });

// Error handler untuk Multer & lainnya app.use((err, _req, res, _next) => { if (err instanceof multer.MulterError) { if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).send('File terlalu besar (maks 15MB).'); if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(415).send('Tipe file tidak didukung.'); return res.status(400).send('Upload error: ' + err.code); } console.error(err); res.status(500).send('Terjadi kesalahan.'); });

app.listen(PORT, () => { console.log(✅ Gambar ➜ URL siap di http://localhost:${PORT}); });

  return (
    <div
      className="h-screen flex flex-col justify-center items-center bg-cover bg-center"
      style={{ backgroundImage: "url('https://files.catbox.moe/8o5gnw.png')" }}
    >
      <div className="bg-white/80 p-6 rounded-2xl shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-4">Upload ke Catbox</h1>
        <input type="file" onChange={handleUpload} className="mb-4" />
        {loading && <p>Uploading...</p>}
        {link && (
          <div>
            <p className="mb-2">✅ File terupload:</p>
            <a href={link} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              {link}
            </a>
            <br />
            <button
              onClick={copyLink}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Copy Link
            </button>
          </div>
        )}
        <p className="mt-4 text-gray-600">By VanzzCloud</p>
      </div>
    </div>
  );
}
