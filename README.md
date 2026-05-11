# Image to Prompt

Web tool sederhana untuk mengubah foto/gambar menjadi **prompt AI** yang siap pakai di Midjourney, Stable Diffusion, DALL·E, Flux, atau model anime Danbooru.

Seluruhnya berjalan di **browser** (HTML + CSS + JavaScript vanilla), tanpa backend. Gambar dan API key tidak dikirim ke server mana pun selain Google Gemini.

## Fitur

- Upload via klik, drag & drop, atau paste clipboard (Ctrl+V)
- Pilih gaya prompt: Midjourney, Stable Diffusion, DALL·E 3, Flux, Danbooru tags, atau deskriptif
- Output dalam English atau Bahasa Indonesia
- Copy hasil ke clipboard 1-klik
- API key disimpan hanya di `localStorage` browser
- Dark theme, responsive

## Cara pakai

1. Dapatkan Gemini API key gratis di <https://aistudio.google.com/apikey>.
2. Buka `index.html` di browser (atau host sebagai static site — GitHub Pages, Netlify, Vercel, dll).
3. Klik ikon pengaturan (⚙) di kanan atas, tempelkan API key, lalu Simpan.
4. Upload gambar, pilih gaya prompt dan bahasa, klik **Generate Prompt**.

## Menjalankan secara lokal

Karena ini murni static, kamu bisa buka `index.html` langsung dengan double-click. Tapi untuk performa/keamanan terbaik, jalankan via local server:

```bash
# Python 3
python3 -m http.server 8000

# atau Node
npx serve .
```

Lalu buka `http://localhost:8000`.

## Model yang didukung

- `gemini-2.0-flash` (default — cepat, free tier generous)
- `gemini-2.5-flash`
- `gemini-1.5-flash`

## Struktur

```
index.html   -- UI & layout
style.css    -- styling (dark theme)
app.js       -- logic upload + Gemini API call
```

## Privasi

- Gambar diproses di browser kamu, lalu dikirim ke Google Gemini API bersama prompt instruksi.
- API key disimpan hanya di `localStorage` browser — tidak pernah diupload ke server lain.
