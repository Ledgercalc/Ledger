import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" makes the built site work under github.io/<repo>/ as well as on a custom domain.
export default defineConfig({ base: "./", plugins: [react()] });
