// Read-only gates only. The formatter runs first, from .lintstagedrc.format.mjs, so these are safe
// to run concurrently with each other.
export default {
  'source/**/*.{ts,tsx}': () => ['pnpm typecheck', 'pnpm test'],
  '{package.json,knip.json,source/**/*.{ts,tsx}}': () => 'pnpm knip',
}
