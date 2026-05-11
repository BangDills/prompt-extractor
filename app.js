/* ======================================================================
   Image to Prompt - main logic
   ====================================================================== */

// ----- Storage keys -----
const STORAGE_KEY_API = "imgprompt.apiKey";
const STORAGE_KEY_MODEL = "imgprompt.model";
const STORAGE_KEY_HISTORY = "imgprompt.history";
const STORAGE_KEY_PREFS = "imgprompt.prefs";
const MAX_HISTORY = 15;

// ----- Elements -----
const $ = (id) => document.getElementById(id);
const fileInput = $("fileInput");
const dropzone = $("dropzone");
const dropzoneContent = $("dropzoneContent");
const preview = $("preview");
const clearBtn = $("clearBtn");
const generateBtn = $("generateBtn");
const regenerateBtn = $("regenerateBtn");
const styleSelect = $("styleSelect");
const langSelect = $("langSelect");
const lengthSelect = $("lengthSelect");
const creativityRange = $("creativityRange");
const creativityValue = $("creativityValue");
const resultBox = $("result");
const negResultWrap = $("negResultWrap");
const negResult = $("negResult");
const copyBtn = $("copyBtn");
const copyNegBtn = $("copyNegBtn");
const negBtn = $("negBtn");
const downloadBtn = $("downloadBtn");
const charCount = $("charCount");
const errorBox = $("errorBox");
const settingsBtn = $("settingsBtn");
const historyBtn = $("historyBtn");
const historyCount = $("historyCount");
const settingsModal = $("settingsModal");
const historyModal = $("historyModal");
const urlModal = $("urlModal");
const webcamModal = $("webcamModal");
const apiKeyInput = $("apiKeyInput");
const modelSelect = $("modelSelect");
const saveKeyBtn = $("saveKeyBtn");
const clearKeyBtn = $("clearKeyBtn");
const historyList = $("historyList");
const clearHistoryBtn = $("clearHistoryBtn");
const webcamBtn = $("webcamBtn");
const urlBtn = $("urlBtn");
const demoBtn = $("demoBtn");
const urlInput = $("urlInput");
const loadUrlBtn = $("loadUrlBtn");
const webcamVideo = $("webcamVideo");
const webcamCanvas = $("webcamCanvas");
const captureBtn = $("captureBtn");
const imageInfo = $("imageInfo");
const metaDimensions = $("metaDimensions");
const metaSize = $("metaSize");
const metaFormat = $("metaFormat");
const paletteRow = $("paletteRow");
const enhancersGrid = $("enhancersGrid");
const toast = $("toast");

const btnText = generateBtn.querySelector(".btn-text");
const btnSpinner = generateBtn.querySelector(".btn-spinner");

// ----- State -----
let currentImage = null; // { base64, mimeType, dataUrl, width, height, sizeBytes }
let webcamStream = null;
let activeEnhancers = new Set();

// ======================================================================
// STYLE-SPECIFIC INSTRUCTIONS
// ======================================================================
const STYLE_INSTRUCTIONS = {
  midjourney: `Describe this image as a Midjourney prompt.
- Start with the main subject and action.
- Add visual style, composition, lighting, color palette, mood.
- Include artistic references if relevant (e.g. "cinematic", "photorealistic", "oil painting").
- End with Midjourney parameters like --ar 16:9 --style raw --v 6 when appropriate.
- Return ONLY the prompt as a single paragraph of comma-separated descriptors. No preamble, no markdown, no quotes.`,

  "stable-diffusion": `Describe this image as a Stable Diffusion prompt.
- Use a comma-separated list of densely packed descriptive tags.
- Order: subject, detailed features, clothing/materials, pose, environment, lighting, camera/lens, art style, quality tags.
- Include typical quality boosters like "masterpiece, best quality, highly detailed, 8k, sharp focus" if fitting.
- Return ONLY the prompt. No preamble, no markdown, no quotes.`,

  dalle: `Describe this image as a DALL·E 3 prompt.
- Use natural, flowing English sentences (DALL·E rewrites prompts internally, so natural language works best).
- Be specific about subject, style, composition, lighting, mood, and color palette.
- Keep it 2-4 sentences, vivid but not over-stuffed with tags.
- Return ONLY the prompt. No preamble, no markdown, no quotes.`,

  flux: `Describe this image as a Flux (FLUX.1) prompt.
- Flux responds best to detailed natural language descriptions.
- Describe subject, action, setting, lighting, camera angle, photography style, mood.
- Be specific and descriptive in full sentences (not tags).
- Keep it under ~120 words.
- Return ONLY the prompt. No preamble, no markdown, no quotes.`,

  descriptive: `Write a rich, detailed natural-language description of this image that could be used as a generic image generation prompt.
- Cover subject, environment, composition, lighting, colors, mood, and style.
- Use full, flowing sentences.
- Return ONLY the description. No preamble, no markdown, no quotes.`,

  danbooru: `Describe this image as Danbooru-style tags (for anime / NovelAI / Stable Diffusion anime models).
- Output a comma-separated list of lowercase tags with underscores where appropriate (e.g. "long_hair", "school_uniform").
- Include: character count, hair, eyes, clothing, pose, expression, background, composition tags.
- Add quality tags like "masterpiece, best quality" at the start if appropriate.
- Return ONLY the tag list. No preamble, no markdown, no quotes.`,
};

const LENGTH_HINTS = {
  concise: "Keep it short and punchy — around 30-50 words / 8-12 tags.",
  balanced: "Keep it moderate — around 60-100 words / 15-25 tags.",
  detailed: "Be thorough and richly detailed — around 120-180 words / 25-40 tags.",
};

// ----- Enhancer presets -----
const ENHANCERS = [
  { id: "cinematic", label: "Cinematic" },
  { id: "photorealistic", label: "Photorealistic" },
  { id: "8k", label: "8K ultra detailed" },
  { id: "bokeh", label: "Bokeh" },
  { id: "golden-hour", label: "Golden hour" },
  { id: "dramatic-lighting", label: "Dramatic lighting" },
  { id: "studio-lighting", label: "Studio lighting" },
  { id: "moody", label: "Moody" },
  { id: "vibrant", label: "Vibrant colors" },
  { id: "minimalist", label: "Minimalist" },
  { id: "hyperdetailed", label: "Hyperdetailed" },
  { id: "concept-art", label: "Concept art" },
  { id: "oil-painting", label: "Oil painting" },
  { id: "watercolor", label: "Watercolor" },
  { id: "anime", label: "Anime style" },
  { id: "3d-render", label: "3D render" },
];

// Demo image (small purple gradient with a sun - data URL)
const DEMO_IMAGE_URL = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80";

// ======================================================================
// INITIALIZATION
// ======================================================================
function init() {
  // Restore prefs
  restorePrefs();

  // Build enhancer chips
  buildEnhancers();

  // Update history badge
  updateHistoryBadge();

  // File input
  fileInput.addEventListener("change", onFileSelected);

  // Drag & drop
  ["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("drag-over");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("drag-over");
    })
  );
  dropzone.addEventListener("drop", onDrop);

  // Paste
  document.addEventListener("paste", onPaste);

  // Main buttons
  clearBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearImage();
  });
  generateBtn.addEventListener("click", () => onGenerate(false));
  regenerateBtn.addEventListener("click", () => onGenerate(true));
  copyBtn.addEventListener("click", () => copyText(resultBox.value, copyBtn));
  copyNegBtn.addEventListener("click", () => copyText(negResult.value, copyNegBtn));
  negBtn.addEventListener("click", onGenerateNegative);
  downloadBtn.addEventListener("click", onDownload);

  // Result box — update char count on edit
  resultBox.addEventListener("input", updateCharCount);

  // Creativity slider
  creativityRange.addEventListener("input", () => {
    creativityValue.textContent = parseFloat(creativityRange.value).toFixed(1);
    savePrefs();
  });

  // Settings
  settingsBtn.addEventListener("click", openSettings);
  settingsModal.addEventListener("click", (e) => {
    if (e.target.dataset.close !== undefined) closeModal(settingsModal);
  });
  saveKeyBtn.addEventListener("click", saveSettings);
  clearKeyBtn.addEventListener("click", () => {
    apiKeyInput.value = "";
    localStorage.removeItem(STORAGE_KEY_API);
    showToast("API key dihapus");
  });

  // History
  historyBtn.addEventListener("click", openHistory);
  historyModal.addEventListener("click", (e) => {
    if (e.target.dataset.close !== undefined) closeModal(historyModal);
  });
  clearHistoryBtn.addEventListener("click", () => {
    if (confirm("Hapus semua riwayat?")) {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
      renderHistory();
      updateHistoryBadge();
      showToast("Riwayat dikosongkan");
    }
  });

  // URL loader
  urlBtn.addEventListener("click", () => {
    urlInput.value = "";
    openModal(urlModal);
    setTimeout(() => urlInput.focus(), 100);
  });
  urlModal.addEventListener("click", (e) => {
    if (e.target.dataset.close !== undefined) closeModal(urlModal);
  });
  loadUrlBtn.addEventListener("click", onLoadUrl);
  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onLoadUrl();
  });

  // Webcam
  webcamBtn.addEventListener("click", openWebcam);
  webcamModal.addEventListener("click", (e) => {
    if (e.target.dataset.close !== undefined) closeWebcam();
  });
  captureBtn.addEventListener("click", captureWebcam);

  // Demo
  demoBtn.addEventListener("click", () => loadImageFromUrl(DEMO_IMAGE_URL));

  // Save prefs on change
  [styleSelect, langSelect, lengthSelect].forEach((el) =>
    el.addEventListener("change", savePrefs)
  );

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      [settingsModal, historyModal, urlModal].forEach((m) => {
        if (!m.hidden) closeModal(m);
      });
      if (!webcamModal.hidden) closeWebcam();
      return;
    }
    // ignore shortcuts when typing in input/textarea (except our specific combos)
    const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || "");

    // Cmd/Ctrl+Enter — generate
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!generateBtn.disabled) onGenerate(false);
    }
    // Cmd/Ctrl+K — settings
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openSettings();
    }
    // H — history (only when not typing)
    else if (!typing && e.key.toLowerCase() === "h" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      openHistory();
    }
  });

  // First-run: open settings if no key
  if (!localStorage.getItem(STORAGE_KEY_API)) {
    openSettings();
  }
}

// ======================================================================
// PREFERENCES
// ======================================================================
function restorePrefs() {
  const savedModel = localStorage.getItem(STORAGE_KEY_MODEL);
  if (savedModel) modelSelect.value = savedModel;

  try {
    const prefs = JSON.parse(localStorage.getItem(STORAGE_KEY_PREFS) || "{}");
    if (prefs.style) styleSelect.value = prefs.style;
    if (prefs.lang) langSelect.value = prefs.lang;
    if (prefs.length) lengthSelect.value = prefs.length;
    if (typeof prefs.creativity === "number") {
      creativityRange.value = prefs.creativity;
      creativityValue.textContent = prefs.creativity.toFixed(1);
    }
  } catch {
    /* ignore */
  }
}

function savePrefs() {
  const prefs = {
    style: styleSelect.value,
    lang: langSelect.value,
    length: lengthSelect.value,
    creativity: parseFloat(creativityRange.value),
  };
  localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs));
}

// ======================================================================
// ENHANCERS
// ======================================================================
function buildEnhancers() {
  enhancersGrid.innerHTML = "";
  ENHANCERS.forEach((e) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "enhancer-chip";
    btn.dataset.id = e.id;
    btn.textContent = e.label;
    btn.addEventListener("click", () => {
      if (activeEnhancers.has(e.id)) {
        activeEnhancers.delete(e.id);
        btn.classList.remove("active");
      } else {
        activeEnhancers.add(e.id);
        btn.classList.add("active");
      }
    });
    enhancersGrid.appendChild(btn);
  });
}

function getEnhancerLabels() {
  return ENHANCERS.filter((e) => activeEnhancers.has(e.id)).map((e) => e.label);
}

// ======================================================================
// FILE HANDLING
// ======================================================================
function onFileSelected(e) {
  const file = e.target.files?.[0];
  if (file) loadImageFile(file);
}

function onDrop(e) {
  const file = e.dataTransfer.files?.[0];
  if (file) loadImageFile(file);
}

function onPaste(e) {
  // Don't intercept paste into inputs
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;

  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) {
        loadImageFile(file);
        break;
      }
    }
  }
}

function loadImageFile(file) {
  hideError();
  if (!file.type.startsWith("image/")) {
    showError("File harus berupa gambar (PNG, JPG, atau WebP).");
    return;
  }
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    showError("Ukuran file maksimal 10MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const base64 = dataUrl.split(",")[1];
    const img = new Image();
    img.onload = () => {
      currentImage = {
        base64,
        mimeType: file.type,
        dataUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
        sizeBytes: file.size,
      };
      showPreview(dataUrl);
      updateImageInfo();
      extractPalette(img);
      generateBtn.disabled = false;
      regenerateBtn.disabled = true; // enabled only after first generation
    };
    img.onerror = () => showError("Gagal memuat gambar.");
    img.src = dataUrl;
  };
  reader.onerror = () => showError("Gagal membaca file.");
  reader.readAsDataURL(file);
}

async function loadImageFromUrl(url) {
  hideError();
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) {
      throw new Error("URL tidak mengembalikan gambar.");
    }
    const file = new File([blob], "from-url", { type: blob.type });
    loadImageFile(file);
  } catch (err) {
    showError(`Gagal muat URL: ${err.message}. Kemungkinan diblokir CORS — coba download manual.`);
  }
}

function showPreview(dataUrl) {
  preview.src = dataUrl;
  preview.hidden = false;
  dropzoneContent.hidden = true;
  clearBtn.hidden = false;
}

function clearImage() {
  currentImage = null;
  fileInput.value = "";
  preview.src = "";
  preview.hidden = true;
  dropzoneContent.hidden = false;
  clearBtn.hidden = true;
  generateBtn.disabled = true;
  regenerateBtn.disabled = true;
  imageInfo.hidden = true;
  paletteRow.innerHTML = "";
  hideError();
}

// ======================================================================
// IMAGE METADATA + PALETTE
// ======================================================================
function updateImageInfo() {
  if (!currentImage) return;
  metaDimensions.textContent = `${currentImage.width}×${currentImage.height}px`;
  metaSize.textContent = formatBytes(currentImage.sizeBytes);
  metaFormat.textContent = currentImage.mimeType.replace("image/", "").toUpperCase();
  imageInfo.hidden = false;
}

function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Extract up to 5 dominant colors using simple bucket quantization
 * on a downscaled canvas — fully client-side, fast.
 */
function extractPalette(img) {
  const MAX_DIM = 80;
  const scale = Math.min(MAX_DIM / img.naturalWidth, MAX_DIM / img.naturalHeight, 1);
  const w = Math.max(1, Math.floor(img.naturalWidth * scale));
  const h = Math.max(1, Math.floor(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  let data;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    paletteRow.innerHTML = "";
    return; // cross-origin, skip
  }

  // Quantize into 4-bit-per-channel buckets
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 125) continue;
    const r = data[i] >> 4;
    const g = data[i + 1] >> 4;
    const b = data[i + 2] >> 4;
    const key = (r << 8) | (g << 4) | b;
    const entry = buckets.get(key);
    if (entry) {
      entry.count++;
      entry.r += data[i];
      entry.g += data[i + 1];
      entry.b += data[i + 2];
    } else {
      buckets.set(key, { count: 1, r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  }

  const sorted = Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((e) => ({
      r: Math.round(e.r / e.count),
      g: Math.round(e.g / e.count),
      b: Math.round(e.b / e.count),
    }));

  paletteRow.innerHTML = "";
  sorted.forEach((c) => {
    const hex = rgbToHex(c.r, c.g, c.b);
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "swatch";
    swatch.style.background = hex;
    swatch.title = `${hex} — klik untuk copy`;
    swatch.addEventListener("click", () => {
      navigator.clipboard.writeText(hex).then(() => showToast(`Copied ${hex}`));
    });
    const label = document.createElement("span");
    label.className = "swatch-label";
    label.textContent = hex;
    const wrap = document.createElement("div");
    wrap.className = "swatch-wrap";
    wrap.appendChild(swatch);
    wrap.appendChild(label);
    paletteRow.appendChild(wrap);
  });
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

// ======================================================================
// GEMINI API CALL
// ======================================================================
async function onGenerate(isRegenerate = false) {
  hideError();

  const apiKey = localStorage.getItem(STORAGE_KEY_API);
  if (!apiKey) {
    showError("API key belum diatur. Klik ikon pengaturan di kanan atas.");
    openSettings();
    return;
  }
  if (!currentImage) {
    showError("Upload gambar terlebih dahulu.");
    return;
  }

  const style = styleSelect.value;
  const lang = langSelect.value;
  const length = lengthSelect.value;
  const creativity = parseFloat(creativityRange.value);
  const model = localStorage.getItem(STORAGE_KEY_MODEL) || "gemini-2.0-flash";

  let instruction = STYLE_INSTRUCTIONS[style] || STYLE_INSTRUCTIONS.descriptive;
  instruction += `\n\nLength: ${LENGTH_HINTS[length]}`;

  const enhancerLabels = getEnhancerLabels();
  if (enhancerLabels.length) {
    instruction += `\n\nWeave in these stylistic modifiers naturally: ${enhancerLabels.join(", ")}.`;
  }

  if (lang === "id") {
    instruction += "\n\nIMPORTANT: Write the final prompt in natural fluent Bahasa Indonesia.";
  }

  if (isRegenerate) {
    instruction += "\n\nProduce a DIFFERENT variation than before — emphasize different aspects, angles, or adjectives.";
  }

  setLoading(true);
  if (!isRegenerate) {
    resultBox.value = "";
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
    negBtn.disabled = true;
    negResultWrap.hidden = true;
  }

  try {
    const prompt = await callGemini({
      apiKey,
      model,
      instruction,
      imageBase64: currentImage.base64,
      mimeType: currentImage.mimeType,
      temperature: creativity,
    });
    const cleaned = prompt.trim();
    resultBox.value = cleaned;
    updateCharCount();
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
    negBtn.disabled = false;
    regenerateBtn.disabled = false;

    // Save to history
    saveHistory({
      thumbnail: await makeThumbnail(currentImage.dataUrl),
      prompt: cleaned,
      style,
      lang,
      length,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error(err);
    showError(err.message || "Terjadi kesalahan saat memanggil Gemini API.");
  } finally {
    setLoading(false);
  }
}

async function onGenerateNegative() {
  hideError();
  const apiKey = localStorage.getItem(STORAGE_KEY_API);
  if (!apiKey || !currentImage || !resultBox.value) return;

  const model = localStorage.getItem(STORAGE_KEY_MODEL) || "gemini-2.0-flash";
  const lang = langSelect.value;

  let instruction = `Given this image and its positive prompt, produce a NEGATIVE PROMPT for Stable Diffusion to avoid common defects.
- Use comma-separated tags like: "lowres, bad anatomy, bad hands, blurry, watermark, text, signature, deformed, extra limbs, jpeg artifacts, worst quality".
- Tailor it to the image's subject matter (e.g. add "cropped face" if portrait, "wrong perspective" if architecture).
- Return ONLY the negative prompt tags as a comma-separated list. No preamble, no markdown, no quotes.

Positive prompt context: ${resultBox.value.slice(0, 300)}`;

  if (lang === "id") {
    instruction += "\n\nIMPORTANT: Still use standard English Stable Diffusion negative tags (they're universal).";
  }

  negBtn.disabled = true;
  const origText = negBtn.querySelector("span").textContent;
  negBtn.querySelector("span").textContent = "…";

  try {
    const text = await callGemini({
      apiKey,
      model,
      instruction,
      imageBase64: currentImage.base64,
      mimeType: currentImage.mimeType,
      temperature: 0.3,
    });
    negResult.value = text.trim();
    negResultWrap.hidden = false;
  } catch (err) {
    showError(err.message || "Gagal membuat negative prompt.");
  } finally {
    negBtn.disabled = false;
    negBtn.querySelector("span").textContent = origText;
  }
}

async function callGemini({ apiKey, model, instruction, imageBase64, mimeType, temperature }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        parts: [
          { text: instruction },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: typeof temperature === "number" ? temperature : 0.7,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = `Gemini API error (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) msg += `: ${errJson.error.message}`;
    } catch {
      /* ignore */
    }
    if (res.status === 400) msg += "\nCek apakah API key valid.";
    if (res.status === 403) msg += "\nAPI key ditolak — pastikan sudah aktif untuk Generative Language API.";
    if (res.status === 429) msg += "\nKuota habis — coba lagi nanti atau ganti model.";
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text)
    .filter(Boolean)
    .join("\n");
  if (!text) throw new Error("Gemini tidak mengembalikan teks. Coba lagi atau ganti gambar.");
  return text;
}

// ======================================================================
// UI HELPERS
// ======================================================================
function setLoading(loading) {
  generateBtn.disabled = loading || !currentImage;
  regenerateBtn.disabled = loading || !currentImage || !resultBox.value;
  btnText.textContent = loading ? "Membuat prompt..." : "Generate Prompt";
  btnSpinner.hidden = !loading;
}

function updateCharCount() {
  const text = resultBox.value;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  charCount.textContent = `${text.length} karakter · ${words} kata`;
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}
function hideError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}

let toastTimeout;
function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => (toast.hidden = true), 200);
  }, 2000);
}

async function copyText(text, btn) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
  if (btn) {
    btn.classList.add("copied");
    const span = btn.querySelector("span");
    const prev = span?.textContent;
    if (span) span.textContent = "Copied!";
    setTimeout(() => {
      btn.classList.remove("copied");
      if (span) span.textContent = prev;
    }, 1500);
  }
  showToast("Tersalin ke clipboard");
}

function onDownload() {
  if (!resultBox.value) return;
  let content = resultBox.value;
  if (negResult.value && !negResultWrap.hidden) {
    content += `\n\n--- NEGATIVE PROMPT ---\n${negResult.value}`;
  }
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  a.href = url;
  a.download = `prompt-${styleSelect.value}-${ts}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("File .txt diunduh");
}

// ======================================================================
// MODALS
// ======================================================================
function openModal(el) {
  el.hidden = false;
}
function closeModal(el) {
  el.hidden = true;
}

function openSettings() {
  apiKeyInput.value = localStorage.getItem(STORAGE_KEY_API) || "";
  modelSelect.value = localStorage.getItem(STORAGE_KEY_MODEL) || "gemini-2.0-flash";
  openModal(settingsModal);
}
function saveSettings() {
  const key = apiKeyInput.value.trim();
  if (key) localStorage.setItem(STORAGE_KEY_API, key);
  else localStorage.removeItem(STORAGE_KEY_API);
  localStorage.setItem(STORAGE_KEY_MODEL, modelSelect.value);
  closeModal(settingsModal);
  showToast("Pengaturan disimpan");
}

function openHistory() {
  renderHistory();
  openModal(historyModal);
}

function onLoadUrl() {
  const url = urlInput.value.trim();
  if (!url) return;
  closeModal(urlModal);
  loadImageFromUrl(url);
}

// ======================================================================
// WEBCAM
// ======================================================================
async function openWebcam() {
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    webcamVideo.srcObject = webcamStream;
    openModal(webcamModal);
  } catch (err) {
    showError("Tidak bisa akses kamera: " + err.message);
  }
}

function closeWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach((t) => t.stop());
    webcamStream = null;
  }
  webcamVideo.srcObject = null;
  closeModal(webcamModal);
}

function captureWebcam() {
  const v = webcamVideo;
  if (!v.videoWidth) return;
  webcamCanvas.width = v.videoWidth;
  webcamCanvas.height = v.videoHeight;
  const ctx = webcamCanvas.getContext("2d");
  ctx.drawImage(v, 0, 0);
  webcamCanvas.toBlob((blob) => {
    const file = new File([blob], "webcam.jpg", { type: "image/jpeg" });
    loadImageFile(file);
    closeWebcam();
  }, "image/jpeg", 0.92);
}

// ======================================================================
// HISTORY
// ======================================================================
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(entry) {
  const hist = getHistory();
  hist.unshift(entry);
  const trimmed = hist.slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(trimmed));
  } catch (e) {
    // quota exceeded — drop some entries
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(trimmed.slice(0, 5)));
  }
  updateHistoryBadge();
}

function updateHistoryBadge() {
  const hist = getHistory();
  if (hist.length > 0) {
    historyCount.textContent = hist.length;
    historyCount.hidden = false;
  } else {
    historyCount.hidden = true;
  }
}

async function makeThumbnail(dataUrl, size = 120) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(size / img.width, size / img.height, 1);
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function renderHistory() {
  const hist = getHistory();
  if (!hist.length) {
    historyList.innerHTML = `<p class="history-empty">Belum ada riwayat. Generate prompt pertamamu!</p>`;
    return;
  }
  historyList.innerHTML = "";
  hist.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "history-item";
    card.innerHTML = `
      <img src="${item.thumbnail}" alt="thumbnail" class="history-thumb" />
      <div class="history-body">
        <div class="history-meta">
          <span class="history-tag">${escapeHtml(item.style)}</span>
          <span class="history-date">${formatDate(item.timestamp)}</span>
        </div>
        <p class="history-prompt">${escapeHtml(item.prompt.slice(0, 220))}${item.prompt.length > 220 ? "…" : ""}</p>
        <div class="history-actions">
          <button class="secondary-btn small-btn" data-action="copy" data-idx="${idx}">Copy</button>
          <button class="secondary-btn small-btn" data-action="restore" data-idx="${idx}">Restore</button>
          <button class="secondary-btn small-btn" data-action="delete" data-idx="${idx}">Hapus</button>
        </div>
      </div>
    `;
    historyList.appendChild(card);
  });

  historyList.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(btn.dataset.idx, 10);
      const action = btn.dataset.action;
      const entries = getHistory();
      const entry = entries[idx];
      if (!entry) return;
      if (action === "copy") {
        copyText(entry.prompt);
      } else if (action === "restore") {
        resultBox.value = entry.prompt;
        updateCharCount();
        copyBtn.disabled = false;
        downloadBtn.disabled = false;
        closeModal(historyModal);
        showToast("Prompt dipulihkan ke editor");
      } else if (action === "delete") {
        entries.splice(idx, 1);
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(entries));
        renderHistory();
        updateHistoryBadge();
      }
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);
  if (diffMin < 1) return "baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} jam lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) +
         " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// ======================================================================
init();
