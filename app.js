/* ======================================================================
   Image to Prompt — Logic
   Vanilla JS, zero dependencies, full client-side
   ====================================================================== */

// ── Constants ────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = /^image\/(png|jpeg|webp)$/;

const STORAGE_KEYS = {
  apiKey: "imgprompt.apiKey",
  model: "imgprompt.model",
};

// Gemini API endpoint template
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// ── DOM refs (lazy) ─────────────────────────────────────────────────────
const dom = {
  get fileInput() { return document.getElementById("fileInput"); },
  get dropzone() { return document.getElementById("dropzone"); },
  get dropzoneContent() { return document.getElementById("dropzoneContent"); },
  get preview() { return document.getElementById("preview"); },
  get clearBtn() { return document.getElementById("clearBtn"); },
  get generateBtn() { return document.getElementById("generateBtn"); },
  get styleSelect() { return document.getElementById("styleSelect"); },
  get langSelect() { return document.getElementById("langSelect"); },
  get resultBox() { return document.getElementById("result"); },
  get resultSkeleton() { return document.getElementById("resultSkeleton"); },
  get copyBtn() { return document.getElementById("copyBtn"); },
  get errorBox() { return document.getElementById("errorBox"); },
  get statusMessage() { return document.getElementById("statusMessage"); },
  get toastContainer() { return document.getElementById("toastContainer"); },
  get apiKeyBadge() { return document.getElementById("apiKeyBadge"); },
  get settingsBtn() { return document.getElementById("settingsBtn"); },
  get settingsModal() { return document.getElementById("settingsModal"); },
  get apiKeyInput() { return document.getElementById("apiKeyInput"); },
  get modelSelect() { return document.getElementById("modelSelect"); },
  get saveKeyBtn() { return document.getElementById("saveKeyBtn"); },
  get clearKeyBtn() { return document.getElementById("clearKeyBtn"); },
  get toggleKeyVisibility() { return document.getElementById("toggleKeyVisibility"); },
  get btnText() { return document.querySelector(".btn-text"); },
  get btnSpinner() { return document.querySelector(".btn-spinner"); },
};

// ── State ────────────────────────────────────────────────────────────────
let currentImage = null; // { base64, mimeType, dataUrl }

// ── Style-specific instructions for Gemini ───────────────────────────────
const STYLE_INSTRUCTIONS = Object.freeze({
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
});

// Indonesian language instruction suffix
const LANG_INSTRUCTIONS = Object.freeze({
  en: "",
  id: "\n\nIMPORTANT: Write the final prompt in natural, fluent Bahasa Indonesia. Do not mix English words unless they are proper nouns or AI tool names. Jangan terjemahkan kata demi kata dari bahasa Inggris; gunakan Bahasa Indonesia yang lancar.",
});

// ── Helpers ──────────────────────────────────────────────────────────────

/** Format error message with consistent prefix */
function formatError(msg, status = null) {
  let out = `Error: ${msg}`;
  if (status) {
    const hints = { 400: "Cek apakah API key valid.", 403: "API key ditolak — pastikan sudah aktif untuk Generative Language API.", 429: "Kuota habis — coba lagi nanti atau ganti model." };
    if (hints[status]) out += `\n${hints[status]}`;
  }
  return out;
}

/** Show a toast notification */
function showToast(message, type = "info", durationMs = 2500) {
  const container = dom.toastContainer;
  if (!container) return;

  const icons = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
  };

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.innerHTML = `<span class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</span><span class="toast-message">${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  // Remove after animation completes (toast auto-animates out at 2.5s + duration)
  const removeMs = Math.max(durationMs + 250, 3000);
  setTimeout(() => {
    toast.remove();
  }, removeMs);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/** Show a transient status message (legacy, kept for compatibility) */
function showStatus(msg, durationMs = 2500) {
  const el = dom.statusMessage;
  if (el) {
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => { el.hidden = true; }, durationMs);
  }
  showToast(msg, "success", durationMs);
}

function showError(msg) {
  dom.errorBox.textContent = msg;
  dom.errorBox.hidden = false;
  showToast(msg, "error", 4000);
}

function hideError() {
  dom.errorBox.textContent = "";
  dom.errorBox.hidden = true;
}

/** Set loading state for the generate button */
function setLoading(loading) {
  dom.generateBtn.disabled = loading || !currentImage;
  dom.generateBtn.setAttribute("aria-busy", loading);
  dom.btnText.textContent = loading ? "Membuat prompt..." : "Generate Prompt";
  dom.btnSpinner.hidden = !loading;

  if (loading) {
    dom.resultBox.hidden = true;
    dom.resultSkeleton.hidden = false;
  } else {
    dom.resultSkeleton.hidden = true;
    dom.resultBox.hidden = false;
  }
}

/** Enable / disable copy button based on result content */
function updateCopyButton() {
  dom.copyBtn.disabled = !dom.resultBox.value.trim();
}

// ── API Key badge indicator ────────────────────────────────────────────

function updateApiKeyBadge() {
  const badge = dom.apiKeyBadge;
  if (!badge) return;
  const key = localStorage.getItem(STORAGE_KEYS.apiKey);
  if (key && key.trim()) {
    badge.className = "badge connected";
    badge.textContent = "Key tersimpan";
    badge.hidden = false;
  } else {
    badge.className = "badge missing";
    badge.textContent = "Key belum diatur";
    badge.hidden = false;
  }
}

// ── File handling ───────────────────────────────────────────────────────

/**
 * Load an image File object, validate, read as base64 data URL.
 * @param {File} file
 */
function loadImageFile(file) {
  hideError();

  // Validate type
  if (!file.type || !ALLOWED_TYPES.test(file.type)) {
    showError("Format file tidak didukung. Gunakan gambar PNG, JPG, atau WebP.");
    return;
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    showError(`Ukuran file terlalu besar. Maksimal ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const dataUrl = /** @type {string} */ (reader.result);
    const base64 = dataUrl.split(",")[1];
    if (!base64) {
      showError("Gagal membaca data gambar.");
      return;
    }
    currentImage = { base64, mimeType: file.type, dataUrl };
    showPreview(dataUrl);
    dom.generateBtn.disabled = false;
  };

  reader.onerror = () => {
    showError("Gagal membaca file. Coba lagi dengan gambar lain.");
  };

  reader.readAsDataURL(file);
}

/** Display the preview image and toggle UI elements */
function showPreview(dataUrl) {
  dom.preview.src = dataUrl;
  dom.preview.hidden = false;
  dom.dropzoneContent.hidden = true;
  dom.clearBtn.hidden = false;
}

/** Clear current image and reset dropzone */
function clearImage() {
  currentImage = null;
  dom.fileInput.value = "";
  dom.preview.src = "";
  dom.preview.hidden = true;
  dom.dropzoneContent.hidden = false;
  dom.clearBtn.hidden = true;
  dom.generateBtn.disabled = true;
  dom.resultBox.value = "";
  dom.resultBox.hidden = false;
  dom.resultSkeleton.hidden = true;
  updateCopyButton();
  hideError();
}

// ── Gemini API ───────────────────────────────────────────────────────────

/**
 * Call the Gemini API to generate a prompt from an image.
 * @param {{ apiKey: string, model: string, instruction: string, imageBase64: string, mimeType: string }} params
 * @returns {Promise<string>} The generated prompt text
 */
async function callGemini({ apiKey, model, instruction, imageBase64, mimeType }) {
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`;

  const payload = {
    contents: [
      {
        parts: [
          { text: instruction },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let serverMsg = "";
    try {
      const errData = await response.json();
      serverMsg = errData?.error?.message || "";
    } catch {
      // response not JSON — use status text
      serverMsg = response.statusText || "";
    }
    const msg = serverMsg
      ? `Gemini API error (${response.status}): ${serverMsg}`
      : `Gemini API error (${response.status})`;
    throw new Error(formatError(msg, response.status));
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];

  if (!candidate) {
    const blockReason = data?.promptFeedback?.blockReason;
    throw new Error(
      blockReason
        ? `Konten diblokir oleh Gemini: ${blockReason}. Coba gambar lain.`
        : "Gemini tidak mengembalikan hasil. Coba lagi."
    );
  }

  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(`Proses generate berhenti: ${candidate.finishReason}. Coba gambar lain atau model lain.`);
  }

  const text = candidate.content?.parts
    ?.map((p) => p.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini tidak mengembalikan teks. Coba lagi atau ganti gambar.");
  }

  return text;
}

/** Handle the Generate button click */
async function onGenerate() {
  hideError();

  const apiKey = (localStorage.getItem(STORAGE_KEYS.apiKey) || "").trim();
  if (!apiKey) {
    showError("API key belum diatur. Klik ikon pengaturan (⚙) di kanan atas untuk menambahkannya.");
    openSettings();
    return;
  }

  if (!apiKey.startsWith("AIza")) {
    showError("API key tidak valid. Gemini API key biasanya diawali dengan 'AIza'.");
    openSettings();
    return;
  }

  if (!currentImage) {
    showError("Upload gambar terlebih dahulu.");
    return;
  }

  const style = dom.styleSelect.value;
  const lang = dom.langSelect.value;
  const model = localStorage.getItem(STORAGE_KEYS.model) || "gemini-2.0-flash";

  let instruction = STYLE_INSTRUCTIONS[style] || STYLE_INSTRUCTIONS.descriptive;
  const langSuffix = LANG_INSTRUCTIONS[lang] || "";
  if (langSuffix) instruction += langSuffix;

  setLoading(true);
  dom.resultBox.value = "";
  dom.copyBtn.disabled = true;

  try {
    const prompt = await callGemini({
      apiKey,
      model,
      instruction,
      imageBase64: currentImage.base64,
      mimeType: currentImage.mimeType,
    });
    dom.resultBox.value = prompt;
    updateCopyButton();
    showToast("Prompt berhasil dibuat!", "success");
  } catch (err) {
    console.error("Gemini call failed:", err);
    showError(err.message || "Terjadi kesalahan tak dikenal.");
  } finally {
    setLoading(false);
  }
}

// ── Copy to clipboard ────────────────────────────────────────────────────

async function onCopy() {
  const text = dom.resultBox.value;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    // Visual feedback
    dom.copyBtn.classList.add("copied");
    const span = dom.copyBtn.querySelector("span");
    const prev = span.textContent;
    span.textContent = "Copied!";
    showToast("Prompt disalin ke clipboard!", "success");
    setTimeout(() => {
      dom.copyBtn.classList.remove("copied");
      span.textContent = prev;
    }, 1500);
  } catch {
    // Fallback for older browsers or non-HTTPS
    dom.resultBox.removeAttribute("readonly");
    dom.resultBox.select();
    try {
      document.execCommand("copy");
      showToast("Prompt disalin ke clipboard!", "success");
    } catch {
      showError("Gagal menyalin. Silakan select & copy manual.");
    }
    dom.resultBox.setAttribute("readonly", "");
    window.getSelection()?.removeAllRanges();
  }
}

// ── Settings modal ───────────────────────────────────────────────────────

function openSettings() {
  dom.apiKeyInput.value = localStorage.getItem(STORAGE_KEYS.apiKey) || "";
  dom.modelSelect.value = localStorage.getItem(STORAGE_KEYS.model) || "gemini-2.0-flash";
  dom.settingsModal.hidden = false;

  // Focus the API key input after animation frame
  requestAnimationFrame(() => dom.apiKeyInput.focus());

  // Trap focus inside modal
  trapFocus(dom.settingsModal);
}

function closeSettings() {
  dom.settingsModal.hidden = true;
  releaseFocus();
}

function saveSettings() {
  const key = dom.apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem(STORAGE_KEYS.apiKey, key);
  } else {
    localStorage.removeItem(STORAGE_KEYS.apiKey);
  }
  localStorage.setItem(STORAGE_KEYS.model, dom.modelSelect.value);
  updateApiKeyBadge();
  closeSettings();
  showToast("Pengaturan disimpan!", "success");
}

/** Toggle API key visibility (password ↔ text) */
function toggleKeyVisibility() {
  const input = dom.apiKeyInput;
  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  dom.toggleKeyVisibility.setAttribute("aria-label", isPassword ? "Sembunyikan API key" : "Tampilkan API key");
}

// ── Focus trap (for modal accessibility) ─────────────────────────────────

let focusTrapElement = null;
let previousFocusedElement = null;

function trapFocus(element) {
  previousFocusedElement = document.activeElement;
  focusTrapElement = element;
  const focusable = Array.from(
    element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.disabled && el.offsetParent !== null);

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  first?.focus();

  element._keydownHandler = (e) => {
    if (e.key !== "Tab" || focusable.length === 0) return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };
  element.addEventListener("keydown", element._keydownHandler);
}

function releaseFocus() {
  const el = focusTrapElement;
  if (el && el._keydownHandler) {
    el.removeEventListener("keydown", el._keydownHandler);
    delete el._keydownHandler;
  }
  focusTrapElement = null;
  previousFocusedElement?.focus();
  previousFocusedElement = null;
}

// ── Drag & Drop helpers ──────────────────────────────────────────────────

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

// ── Keyboard shortcuts ───────────────────────────────────────────────────

function onDocumentKeydown(e) {
  // Escape closes modal
  if (e.key === "Escape" && !dom.settingsModal.hidden) {
    closeSettings();
    return;
  }

  // Ctrl/Cmd + Enter to generate
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    if (!dom.generateBtn.disabled) {
      onGenerate();
    }
    return;
  }

  // Ctrl/Cmd + Shift + C to copy result
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "c" || e.key === "C")) {
    e.preventDefault();
    if (!dom.copyBtn.disabled) {
      onCopy();
    }
    return;
  }

  // Ctrl/Cmd + , to open settings (common convention)
  if ((e.ctrlKey || e.metaKey) && e.key === ",") {
    e.preventDefault();
    openSettings();
  }
}

// ── Initialization ───────────────────────────────────────────────────────

function init() {
  // Restore saved model preference
  const savedModel = localStorage.getItem(STORAGE_KEYS.model);
  if (savedModel && dom.modelSelect) dom.modelSelect.value = savedModel;

  // Initialize API key badge
  updateApiKeyBadge();

  // ── File input ──
  dom.fileInput.addEventListener("change", onFileSelected);

  // ── Drag & drop ──
  dom.dropzone.addEventListener("dragenter", (e) => { e.preventDefault(); dom.dropzone.classList.add("drag-over"); });
  dom.dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dom.dropzone.classList.add("drag-over"); });
  dom.dropzone.addEventListener("dragleave", (e) => { e.preventDefault(); dom.dropzone.classList.remove("drag-over"); });
  dom.dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dom.dropzone.classList.remove("drag-over");
    onDrop(e);
  });

  // ── Dropzone keyboard support (Enter/Space to open file dialog) ──
  dom.dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      dom.fileInput.click();
    }
  });

  // ── Clipboard paste ──
  document.addEventListener("paste", onPaste);

  // ── Clear button ──
  dom.clearBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); clearImage(); });

  // ── Generate button ──
  dom.generateBtn.addEventListener("click", onGenerate);

  // ── Copy button ──
  dom.copyBtn.addEventListener("click", onCopy);

  // ── Result textarea: update copy button on input (if user manually edits) ──
  dom.resultBox.addEventListener("input", updateCopyButton);

  // ── Settings modal ──
  dom.settingsBtn.addEventListener("click", openSettings);
  dom.settingsModal.addEventListener("click", (e) => {
    if (e.target.dataset.close !== undefined || e.target === dom.settingsModal) {
      closeSettings();
    }
  });
  dom.saveKeyBtn.addEventListener("click", saveSettings);
  dom.clearKeyBtn.addEventListener("click", () => {
    dom.apiKeyInput.value = "";
    localStorage.removeItem(STORAGE_KEYS.apiKey);
    updateApiKeyBadge();
    showToast("API key dihapus.", "info");
  });
  dom.toggleKeyVisibility.addEventListener("click", toggleKeyVisibility);

  // ── Keyboard shortcuts ──
  document.addEventListener("keydown", onDocumentKeydown);

  // ── Show settings on first visit if no API key ──
  if (!localStorage.getItem(STORAGE_KEYS.apiKey)) {
    // Slight delay so the page renders first
    setTimeout(openSettings, 600);
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
