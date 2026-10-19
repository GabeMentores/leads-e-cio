import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import { leadsApiPlugin } from './vite-plugin-leads-api';

export default defineConfig(({ mode }) => {
  // .env inteiro (inclusive sem prefixo VITE_): as chaves do Supabase e os
  // tokens de staff/admin ficam SÓ no servidor — nada disso entra no bundle.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: { port: 5195 },
    plugins: [react(), tailwindcss(), leadsApiPlugin(env)],
    resolve: {
      alias: {
        '@bela/tokens': path.resolve(__dirname, '../../packages/tokens/src/index.ts'),
        '@bela/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
        // Aponta pro DIRETÓRIO (não pro index): o @bela/ui importa subcaminhos
        // como '@bela/types/resposta-pronta.mjs', e na Vercel não existe o link
        // de workspace no node_modules pra resolver o bare specifier — o build
        // de 15/09 (3dd3c85 em diante) quebrava exatamente aí.
        '@bela/types': path.resolve(__dirname, '../../packages/types/src'),
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
