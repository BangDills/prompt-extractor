# Image to Prompt

Web tool sederhana untuk mengubah foto/gambar menjadi **prompt AI** yang siap pakai di Midjourney, Stable Diffusion, DALL·E, Flux, atau model anime Danbooru.

Seluruhnya berjalan di **browser** (HTML + CSS + JavaScript vanilla), tanpa backend. Gambar dan API key tidak dikirim ke server mana pun selain Google Gemini API.

## ✨ Fitur

- 📤 **Upload** via klik, drag & drop, atau paste dari clipboard (Ctrl+V)
- 🎨 **6 gaya prompt**: Midjourney, Stable Diffusion, DALL·E 3, Flux, Danbooru tags, Deskriptif
- 🌐 **Output bilingual**: English atau Bahasa Indonesia
- 📋 **Copy to clipboard** satu klik
- 🔐 **API key** disimpan hanya di `localStorage` browser kamu
- 👁️ **Toggle visibilitas** API key di modal pengaturan
- ⌨️ **Keyboard accessible** — skip link, focus trap modal, dropzone via Enter/Space
- 🌙 **Dark theme** modern dengan efek blur & gradien
- 📱 **Responsive design** — tampil rapi di desktop, tablet, maupun mobile
- ♿ **Aksesibilitas**: ARIA labels, `role="alert"`, `aria-live` regions, `prefers-reduced-motion`

## 🚀 Cara Pakai

1. Dapatkan Gemini API key gratis di [Google AI Studio](https://aistudio.google.com/apikey).
2. Buka `index.html` di browser (atau host sebagai static site — GitHub Pages, Netlify, Vercel, dsb).
3. Klik ikon ⚙ di kanan atas, tempelkan API key, lalu **Simpan**.
4. Upload gambar, pilih gaya prompt dan bahasa output, klik **Generate Prompt**.

## 🖥️ Menjalankan Lokal

Karena murni static files, kamu bisa langsung buka `index.html` dengan double-click. Tapi untuk performa & keamanan optimal, jalankan dengan local server:

```bash
# Python 3
python3 -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

Lalu buka `http://localhost:8000`.

## 🤖 Model Gemini yang Didukung

| Model | Kecepatan | Catatan |
|---|---|---|
| `gemini-2.0-flash` (default) | ⚡ Cepat | Free tier generous |
| `gemini-2.5-flash` | ⚡ Cepat | Model terbaru |
| `gemini-1.5-flash` | 🐢 Sedang | Legacy, tetap support |

## 📁 Struktur Proyek

```
.
├── index.html   → UI & layout (semantic HTML5)
├── style.css    → Styling (dark theme, responsive, accessible)
├── app.js       → Logic: upload, Gemini API call, settings
└── README.md    → Dokumentasi
```

## 🔒 Privasi

- Gambar diproses di browser kamu, lalu dikirim ke **Google Gemini API** bersama instruksi prompt.
- **API key** disimpan hanya di `localStorage` browser — tidak pernah dikirim ke server lain.
- Tidak ada backend, tidak ada database, tidak ada tracking.

## 🛠️ Tech Stack

- **Vanilla JavaScript** (ES6+) — zero dependencies
- **CSS Custom Properties** — konsisten, mudah dikustomisasi
- **Semantic HTML5** — ARIA, roles, keyboard navigation
- **Google Gemini API** — multimodal (vision + text)

## 📝 Lisensi

MIT — bebas digunakan, dimodifikasi, dan didistribusikan.
