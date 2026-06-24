import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        // Browser APIs
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        requestAnimationFrame: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        console: "readonly",

        // Browser constructors & DOM types
        FileReader: "readonly",
        Image: "readonly",
        HTMLInputElement: "readonly",
        HTMLElement: "readonly",
        HTMLCanvasElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLImageElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLSpanElement: "readonly",
        HTMLSelectElement: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
    },
  },
];
