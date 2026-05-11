/* ======================================================================
   Image to Prompt - main logic
   ====================================================================== */

// ----- Storage keys -----
const STORAGE_KEY_API = "imgprompt.apiKey";
const STORAGE_KEY_MODEL = "imgprompt.model";

// ----- Elements -----
const $ = (id) => document.getElementById(id);
const fileInput = $("fileInput");
const dropzone = $("dropzone");
const dropzoneContent = $("dropzoneContent");
const preview = $("preview");
const clearBtn = $("clearBtn");
const generateBtn = $("generateBtn");
const styleSelect = $("styleSelect");
const langSelect = $("langSelect");
const resultBox = $("result");
const copyBtn = $("copyBtn");
const errorBox = $("errorBox");
const settingsBtn = $("settingsBtn");
const settingsModal = $("settingsModal");
const apiKeyInput = $("apiKeyInput");
const modelSelect = $("modelSelect");
const saveKeyBtn = $("saveKeyBtn");
const clearKeyBtn = $("clearKeyBtn");
const btnText = generateBtn.querySelector(".btn-text");
const btnSpinner = generateBtn.querySelector(".btn-spinner");

// ----- State -----
let currentImage = null; // { base64, mimeType, dataUrl }

// ======================================================================
// STYLE-SPECIFIC INSTRUCTIONS (sent to Gemini)
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

// ======================================================================
// INITIALIZATION
// ======================================================================
function init() {
  // Restore model preference
  const savedModel = localStorage.getItem(STORAGE_KEY_MODEL);
  if (savedModel) modelSelect.value = savedModel;

  // File input handlers
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

  // Paste from clipboard
  document.addEventListener("paste", onPaste);

  // Buttons
  clearBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearImage();
  });
  generateBtn.addEventListener("click", onGenerate);
  copyBtn.addEventListener("click", onCopy);

  // Settings modal
  settingsBtn.addEventListener("click", openSettings);
  settingsModal.addEventListener("click", (e) => {
    if (e.target.dataset.close !== undefined) closeSettings();
  });
  saveKeyBtn.addEventListener("click", saveSettings);
  clearKeyBtn.addEventListener("click", () => {
    apiKeyInput.value = "";
    localStorage.removeItem(STORAGE_KEY_API);
    showError("API key dihapus.");
    setTimeout(hideError, 2000);
  });

  // Esc closes modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !settingsModal.hidden) closeSettings();
  });

  // Show settings on first load if no key
  if (!localStorage.getItem(STORAGE_KEY_API)) {
    openSettings();
  }
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

  // Validate
  if (!file.type.startsWith("image/")) {
    showError("File harus berupa gambar (PNG, JPG, atau WebP).");
    return;
  }
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    showError("Ukuran file maksimal 10MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const base64 = dataUrl.split(",")[1];
    currentImage = {
      base64,
      mimeType: file.type,
      dataUrl,
    };
    showPreview(dataUrl);
    generateBtn.disabled = false;
  };
  reader.onerror = () => showError("Gagal membaca file.");
  reader.readAsDataURL(file);
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
  hideError();
}

// ======================================================================
// GEMINI API CALL
// ======================================================================
async function onGenerate() {
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
  const model = localStorage.getItem(STORAGE_KEY_MODEL) || "gemini-2.0-flash";

  let instruction = STYLE_INSTRUCTIONS[style] || STYLE_INSTRUCTIONS.descriptive;
  if (lang === "id") {
    instruction += "\n\nIMPORTANT: Write the final prompt in Bahasa Indonesia (natural, fluent Indonesian).";
  }

  setLoading(true);
  resultBox.value = "";
  copyBtn.disabled = true;

  try {
    const prompt = await callGemini({
      apiKey,
      model,
      instruction,
      imageBase64: currentImage.base64,
      mimeType: currentImage.mimeType,
    });
    resultBox.value = prompt.trim();
    copyBtn.disabled = false;
  } catch (err) {
    console.error(err);
    showError(err.message || "Terjadi kesalahan saat memanggil Gemini API.");
  } finally {
    setLoading(false);
  }
}

async function callGemini({ apiKey, model, instruction, imageBase64, mimeType }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        parts: [
          { text: instruction },
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
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
  if (!text) {
    throw new Error("Gemini tidak mengembalikan teks. Coba lagi atau ganti gambar.");
  }
  return text;
}

// ======================================================================
// UI HELPERS
// ======================================================================
function setLoading(loading) {
  generateBtn.disabled = loading || !currentImage;
  btnText.textContent = loading ? "Membuat prompt..." : "Generate Prompt";
  btnSpinner.hidden = !loading;
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}
function hideError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}

async function onCopy() {
  if (!resultBox.value) return;
  try {
    await navigator.clipboard.writeText(resultBox.value);
    copyBtn.classList.add("copied");
    const span = copyBtn.querySelector("span");
    const prev = span.textContent;
    span.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.classList.remove("copied");
      span.textContent = prev;
    }, 1500);
  } catch {
    // Fallback
    resultBox.removeAttribute("readonly");
    resultBox.select();
    document.execCommand("copy");
    resultBox.setAttribute("readonly", "");
  }
}

// ======================================================================
// SETTINGS MODAL
// ======================================================================
function openSettings() {
  apiKeyInput.value = localStorage.getItem(STORAGE_KEY_API) || "";
  modelSelect.value = localStorage.getItem(STORAGE_KEY_MODEL) || "gemini-2.0-flash";
  settingsModal.hidden = false;
}
function closeSettings() {
  settingsModal.hidden = true;
}
function saveSettings() {
  const key = apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem(STORAGE_KEY_API, key);
  } else {
    localStorage.removeItem(STORAGE_KEY_API);
  }
  localStorage.setItem(STORAGE_KEY_MODEL, modelSelect.value);
  closeSettings();
}

// ======================================================================
init();
