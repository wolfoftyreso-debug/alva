// Tjänsterna är rena Node-moduler — inga React-regler, men Node-globaler
// måste vara kända (console, process, Buffer, fetch).
import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["**/node_modules/**"] },
  {
    files: ["**/*.mjs"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
];
