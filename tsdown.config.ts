import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // pi-ai deliberately hides the Node-only OAuth implementation behind a
    // variable dynamic import. Emit the target at the exact relative path the
    // bundled provider resolves after the .ts -> .js rewrite.
    'openai-codex': 'node_modules/@earendil-works/pi-ai/dist/auth/oauth/openai-codex.js',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  outDir: 'lib',
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  platform: 'node',
  unbundle: false,
  deps: {
    // The published package must not require pi-ai's provider-wide dependency
    // graph. Inline only the Codex path and its streaming JSON parser.
    alwaysBundle: [/^@earendil-works\/pi-ai(?:\/|$)/],
    onlyBundle: [/^@earendil-works\/pi-ai(?:\/|$)/, /^partial-json$/],
  },
})
