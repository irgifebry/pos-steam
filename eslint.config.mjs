import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  { ignores: ["public/sw.js", "public/sw.js.map"] },
  ...nextVitals,
  ...nextTs,
  {
    ignores: ["public/sw.js"],
  },
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
