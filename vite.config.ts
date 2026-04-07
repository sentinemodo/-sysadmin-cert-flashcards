import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const base =
    process.env.BASE_PATH ?? (mode === 'production' ? '/-sysadmin-cert-flashcards/' : '/');

  return {
    root: '.',
    base,
    publicDir: 'public',
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
