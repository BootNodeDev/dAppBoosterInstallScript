// The writing half of the pre-commit, kept apart so the read-only gates in .lintstagedrc.mjs can
// run concurrently behind it. See .husky/pre-commit.
export default {
  'source/**/*.{ts,tsx}': 'biome check --write --no-errors-on-unmatched',
  '*.{js,mjs,ts,json}': 'biome check --write --no-errors-on-unmatched',
}
