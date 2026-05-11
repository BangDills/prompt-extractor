# Image to Prompt

Web tool untuk mengubah foto/gambar menjadi **prompt AI** yang siap pakai di Midjourney, Stable Diffusion, DALL·E, Flux, atau model anime Danbooru.

Seluruhnya berjalan di **browser** (HTML + CSS + JavaScript vanilla, tanpa backend, tanpa build step). Gambar & API key tidak dikirim ke server mana pun selain Google Gemini.

## Fitur

### Input gambar
- Upload via klik, drag & drop, atau paste clipboard (`Ctrl/Cmd + V`)
- Ambil foto dari **webcam**
- Muat dari **URL**
- Tombol **Demo** untuk coba cepat

### Prompt generation
- 6 gaya output: Midjourney, Stable Diffusion, DALL·E 3, Flux, Danbooru tags, Deskriptif
- 2 bahasa: English / Bahasa Indonesia
- 3 tingkat panjang: Ringkas / Seimbang / Detail
- **Slider kreativitas** (temperature 0 – 1.5)
- **Enhancer chips** toggleable: Cinematic, 8K, Photorealistic, Bokeh, Golden hour, dll (16 preset)
- **Regenerate** — hasilkan variasi baru dari gambar yang sama
- **Negative prompt generator** untuk Stable Diffusion

### Output
- **Copy** 1-klik
- **Download** sebagai `.txt`
- Hasil prompt bisa di-edit langsung di textarea
- Karakter & kata counter real-time

### Ekstra
- **Color palette extraction** — 5 warna dominan dari gambar (client-side, klik swatch untuk copy hex)
- **Image metadata** — dimensi, ukuran file, format
- **History** — 15 generate terakhir tersimpan, bisa restore atau copy lagi
- **Dark theme** responsive
- **Keyboard shortcuts**: `Ctrl/Cmd+Enter` generate, `Ctrl/Cmd+K` settings, `H` history, `Esc` close modal

## Cara pakai

1. Dapatkan Gemini API key gratis di <https://aistudio.google.com/apikey>.
2. Buka `index.html` di browser, atau host sebagai static site (GitHub Pages, Netlify, Vercel, Cloudflare Pages).
3. Klik ikon ⚙ (pengaturan) di kanan atas, tempelkan API key, lalu Simpan.
4. Upload gambar → pilih gaya, panjang, bahasa, enhancer → klik **Generate Prompt**.

## Menjalankan secara lokal

```bash
# Python 3
python3 -m http.server 8000

# atau Node
npx serve .
```

Lalu buka `http://localhost:8000`.

> Catatan: fitur webcam butuh HTTPS atau `localhost` untuk berjalan (browser security).

## Model yang didukung

- `gemini-2.0-flash` (default — cepat, free tier generous)
- `gemini-2.5-flash`
- `gemini-1.5-flash`

## Struktur file

```
index.html   — UI & layout
style.css    — dark theme, responsive
app.js       — logic: upload, palette extraction, Gemini API, history, webcam, dll
```

## Privasi

- Gambar diproses di browser kamu, lalu dikirim ke Google Gemini API bersama prompt instruksi.
- API key, preferensi, dan history disimpan **hanya di `localStorage`** browser kamu.
- Tidak ada server lain yang terlibat.
