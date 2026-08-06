import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  build: {
    // Typsnitten måste ligga i CSS:en som data, inte som separata filer.
    //
    // ALVA publiceras bland annat som en självbärande sida bakom en
    // strikt CSP där varje extern begäran blockeras. En @font-face som
    // pekar på en assetfil skulle då tyst falla tillbaka till enhetens
    // eget snitt — vilket är precis det inbäddningen ska avskaffa.
    //
    // Bara woff2 bakas in. Bilderna i värdapplikationen är megabyte
    // stora och ska fortsatt vara egna filer.
    assetsInlineLimit: (filePath: string) => (filePath.endsWith(".woff2") ? true : undefined),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
