// The writing half of the pre-commit, kept apart so the read-only gates in .lintstagedrc.mjs can
// run concurrently behind it. See .husky/pre-commit.
export default {
  'source/**/*.{ts,tsx}': 'biome check --write --no-errors-on-unmatched',
  // Keep the leading './'. Without a slash lint-staged matches on the basename alone, so this
  // would also claim every source/**/*.ts and write it concurrently with the glob above.
  './*.{js,mjs,ts,json}': 'biome check --write --no-errors-on-unmatched',
}
