import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import viteTsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteTsconfigPaths()],
  server: {
    port: 3700,
    host: true,
    watch: {
      usePolling: true,
    },
  },
});
