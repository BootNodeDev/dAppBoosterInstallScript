import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type FeatureName, getStackConfig } from '../../constants/config.js'

vi.mock('node:fs/promises', () => ({
  rm: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  copyFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../operations/exec.js', () => ({
  execFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('node:fs', () => ({
  readFileSync: vi.fn().mockReturnValue(
    JSON.stringify({
      scripts: {
        dev: 'next dev',
        build: 'next build',
        'subgraph-codegen': 'graphql-codegen',
        'typedoc:build': 'typedoc',
        'docs:build': 'vocs build',
        'docs:dev': 'vocs dev',
        'docs:preview': 'vocs preview',
        prepare: 'husky install',
      },
    }),
  ),
  writeFileSync: vi.fn(),
}))

const { rm, mkdir, copyFile } = await import('node:fs/promises')
const { readFileSync, writeFileSync } = await import('node:fs')
const { execFile } = await import('../../operations/exec.js')
const { cleanupFiles } = await import('../../operations/cleanupFiles.js')

function getRmPaths(): string[] {
  return vi.mocked(rm).mock.calls.map((call) => call[0] as string)
}

function getMkdirPaths(): string[] {
  return vi.mocked(mkdir).mock.calls.map((call) => call[0] as string)
}

function getCopyFileCalls(): Array<{ src: string; dst: string }> {
  return vi.mocked(copyFile).mock.calls.map((call) => ({
    src: call[0] as string,
    dst: call[1] as string,
  }))
}

function getWrittenPackageJson(): Record<string, unknown> {
  const lastCall = vi.mocked(writeFileSync).mock.calls.at(-1)
  if (!lastCall) {
    throw new Error('writeFileSync was never called — no package.json to read')
  }
  return JSON.parse(lastCall[1] as string)
}

// Reads the workspaces field in either form (string[] or { packages }).
function getWorkspacePackages(pkg: Record<string, unknown>): string[] {
  const workspaces = pkg.workspaces

  if (Array.isArray(workspaces)) {
    return workspaces as string[]
  }

  const packages = (workspaces as { packages?: unknown } | undefined)?.packages
  return Array.isArray(packages) ? (packages as string[]) : []
}

// Dirs removed for a selection, derived from config — keeps the invariant config-driven instead of
// hardcoding carpincho-wallet.
function removedCantonDirs(selected: FeatureName[]): string[] {
  return Object.entries(getStackConfig('canton').features)
    .filter(([name, definition]) => !selected.includes(name) && (definition.paths?.length ?? 0) > 0)
    .flatMap(([, definition]) => definition.paths as string[])
}

function entryTargetsRemovedDir(entry: string, removedDirs: string[]): boolean {
  return removedDirs.some((dir) => entry === dir || entry.startsWith(`${dir}/`))
}

function mockEvmPackageJson() {
  vi.mocked(readFileSync).mockReturnValue(
    JSON.stringify({
      scripts: {
        dev: 'next dev',
        build: 'next build',
        'subgraph-codegen': 'graphql-codegen',
        'typedoc:build': 'typedoc',
        'docs:build': 'vocs build',
        'docs:dev': 'vocs dev',
        'docs:preview': 'vocs preview',
        prepare: 'husky install',
      },
    }),
  )
}

// Mirrors cn-dappbooster@main's root package.json, including the workspaces array — carpincho-wallet
// is a workspace, so deselecting carpincho must prune it.
const CANTON_WORKSPACES = [
  'canton-connect-kit',
  'carpincho-wallet',
  'canton-barebones',
  'canton-barebones/wallet-service',
  'dapp/daml',
  'dapp/e2e',
  'dapp/frontend',
]

const CANTON_SCRIPTS = {
  'canton:up': 'npm --prefix canton-barebones run up',
  'canton:down': 'npm --prefix canton-barebones run down',
  'canton:health': 'npm --prefix canton-barebones run health',
  'canton:token': 'npm --prefix canton-barebones run token',
  'build-dar': 'bash scripts/build-dar.sh',
  'deploy-dar': 'bash canton-barebones/scripts/deploy-dar.sh',
  'wallet:dev': 'npm --prefix carpincho-wallet run dev',
  'wallet-service:dev': 'npm --prefix canton-barebones/wallet-service run dev',
  'wallet-service:health': 'curl -fsS http://localhost:3010/health',
  'carpincho:build:extension': 'npm --prefix carpincho-wallet run build:extension',
  'app:dev': 'npm --prefix dapp/frontend run dev -- --host localhost --port 3012 --strictPort',
  lint: 'biome check',
  'lint:fix': 'biome check --write',
  format: 'biome format --write',
  e2e: 'npm --prefix dapp/e2e test',
  'e2e:headed': 'npm --prefix dapp/e2e run test:headed',
  'e2e:ui': 'npm --prefix dapp/e2e run test:ui',
  prepare: 'husky',
}

const CANTON_DEV_DEPS = {
  husky: '^9.1.7',
  'lint-staged': '^17.0.4',
  '@commitlint/cli': '^21.0.1',
  '@commitlint/config-conventional': '^21.0.1',
}

// Pass { packages } to exercise the object form; defaults to the string[] form.
function mockCantonPackageJson(workspaces: unknown = CANTON_WORKSPACES) {
  vi.mocked(readFileSync).mockReturnValue(
    JSON.stringify({
      workspaces,
      scripts: CANTON_SCRIPTS,
      devDependencies: CANTON_DEV_DEPS,
    }),
  )
}

describe('cleanupFiles — evm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEvmPackageJson()
  })

  describe('full mode', () => {
    it('removes repository metadata, git automation files, and .install-files', async () => {
      await cleanupFiles('evm', '/project/my_app', 'full')

      const paths = getRmPaths()
      expect(paths).toContain(resolve('/project/my_app', '.install-files'))
      expect(paths).toContain(resolve('/project/my_app', '.github'))
      expect(paths).toContain(resolve('/project/my_app', '.claude'))
      expect(paths).toContain(resolve('/project/my_app', '.husky'))
    })

    it('patches package.json to remove tooling scripts', async () => {
      await cleanupFiles('evm', '/project/my_app', 'full')

      const scripts = getWrittenPackageJson().scripts as Record<string, unknown>
      expect(scripts.prepare).toBeUndefined()
      expect(scripts.dev).toBe('next dev')
      expect(execFile).not.toHaveBeenCalled()
    })
  })

  describe('custom mode — all features selected', () => {
    it('removes hygiene files plus .install-files and patches package.json', async () => {
      const allFeatures: FeatureName[] = ['demo', 'subgraph', 'typedoc', 'vocs', 'husky']
      await cleanupFiles('evm', '/project/my_app', 'custom', allFeatures)

      const paths = getRmPaths()
      expect(paths).toContain(resolve('/project/my_app', '.install-files'))
      expect(paths).toContain(resolve('/project/my_app', '.github'))
      expect(writeFileSync).toHaveBeenCalled()
    })

    it('preserves all scripts when all features selected', async () => {
      const allFeatures: FeatureName[] = ['demo', 'subgraph', 'typedoc', 'vocs', 'husky']
      await cleanupFiles('evm', '/project/my_app', 'custom', allFeatures)

      const pkg = getWrittenPackageJson()
      const scripts = pkg.scripts as Record<string, unknown>
      expect(scripts['subgraph-codegen']).toBe('graphql-codegen')
      expect(scripts['typedoc:build']).toBe('typedoc')
      expect(scripts['docs:build']).toBe('vocs build')
      expect(scripts.prepare).toBeUndefined()
    })
  })

  describe('custom mode — demo deselected', () => {
    it('removes home folder, recreates it, copies replacement', async () => {
      await cleanupFiles('evm', '/project/my_app', 'custom', [
        'subgraph',
        'typedoc',
        'vocs',
        'husky',
      ])

      const homeFolder = resolve('/project/my_app', 'src/components/pageComponents/home')
      expect(getRmPaths()).toContain(homeFolder)
      expect(getMkdirPaths()).toContain(homeFolder)

      const copies = getCopyFileCalls()
      expect(copies).toContainEqual({
        src: resolve('/project/my_app', '.install-files/home/index.tsx'),
        dst: resolve(homeFolder, 'index.tsx'),
      })
    })
  })

  describe('custom mode — subgraph deselected', () => {
    it('removes src/subgraphs', async () => {
      await cleanupFiles('evm', '/project/my_app', 'custom', ['demo', 'typedoc', 'vocs', 'husky'])

      expect(getRmPaths()).toContain(resolve('/project/my_app', 'src/subgraphs'))
    })

    it('cleans up subgraph demos when demo IS selected', async () => {
      await cleanupFiles('evm', '/project/my_app', 'custom', ['demo', 'typedoc', 'vocs', 'husky'])

      const homeFolder = resolve('/project/my_app', 'src/components/pageComponents/home')
      expect(getRmPaths()).toContain(resolve(homeFolder, 'Examples/demos/subgraphs'))
      expect(getRmPaths()).toContain(resolve(homeFolder, 'Examples/index.tsx'))

      const copies = getCopyFileCalls()
      expect(copies).toContainEqual({
        src: resolve('/project/my_app', '.install-files/home/Examples/index.tsx'),
        dst: resolve(homeFolder, 'Examples/index.tsx'),
      })
    })

    it('does NOT clean up subgraph demos when demo is also deselected', async () => {
      await cleanupFiles('evm', '/project/my_app', 'custom', ['typedoc', 'vocs', 'husky'])

      const subgraphDemosPath = resolve(
        '/project/my_app',
        'src/components/pageComponents/home/Examples/demos/subgraphs',
      )
      expect(getRmPaths()).not.toContain(subgraphDemosPath)
    })

    it('removes subgraph-codegen from package.json scripts', async () => {
      await cleanupFiles('evm', '/project/my_app', 'custom', ['demo', 'typedoc', 'vocs', 'husky'])

      const pkg = getWrittenPackageJson()
      const scripts = pkg.scripts as Record<string, unknown>
      expect(scripts['subgraph-codegen']).toBeUndefined()
    })
  })

  describe('custom mode — typedoc deselected', () => {
    it('removes typedoc.json', async () => {
      await cleanupFiles('evm', '/project/my_app', 'custom', ['demo', 'subgraph', 'vocs', 'husky'])

      expect(getRmPaths()).toContain(resolve('/project/my_app', 'typedoc.json'))
    })

    it('removes typedoc:build from package.json scripts', async () => {
      await cleanupFiles('evm', '/project/my_app', 'custom', ['demo', 'subgraph', 'vocs', 'husky'])

      const pkg = getWrittenPackageJson()
      const scripts = pkg.scripts as Record<string, unknown>
      expect(scripts['typedoc:build']).toBeUndefined()
    })
  })

  describe('custom mode — vocs deselected', () => {
    it('removes vocs.config.ts and docs folder', async () => {
      await cleanupFiles('evm', '/project/my_app', 'custom', [
        'demo',
        'subgraph',
        'typedoc',
        'husky',
      ])

      expect(getRmPaths()).toContain(resolve('/project/my_app', 'vocs.config.ts'))
      expect(getRmPaths()).toContain(resolve('/project/my_app', 'docs'))
    })

    it('removes docs scripts from package.json', async () => {
      await cleanupFiles('evm', '/project/my_app', 'custom', [
        'demo',
        'subgraph',
        'typedoc',
        'husky',
      ])

      const pkg = getWrittenPackageJson()
      const scripts = pkg.scripts as Record<string, unknown>
      expect(scripts['docs:build']).toBeUndefined()
      expect(scripts['docs:dev']).toBeUndefined()
      expect(scripts['docs:preview']).toBeUndefined()
    })
  })

  describe('custom mode — husky deselected', () => {
    it('removes husky folder and config files', async () => {
      await cleanupFiles('evm', '/project/my_app', 'custom', [
        'demo',
        'subgraph',
        'typedoc',
        'vocs',
      ])

      expect(getRmPaths()).toContain(resolve('/project/my_app', '.husky'))
      expect(getRmPaths()).toContain(resolve('/project/my_app', '.lintstagedrc.mjs'))
      expect(getRmPaths()).toContain(resolve('/project/my_app', 'commitlint.config.js'))
    })

    it('removes prepare from package.json scripts', async () => {
      await cleanupFiles('evm', '/project/my_app', 'custom', [
        'demo',
        'subgraph',
        'typedoc',
        'vocs',
      ])

      const pkg = getWrittenPackageJson()
      const scripts = pkg.scripts as Record<string, unknown>
      expect(scripts.prepare).toBeUndefined()
    })
  })

  describe('custom mode — no features selected', () => {
    it('runs all cleanup operations', async () => {
      await cleanupFiles('evm', '/project/my_app', 'custom', [])

      const paths = getRmPaths()
      expect(paths).toContain(resolve('/project/my_app', 'src/components/pageComponents/home'))
      expect(paths).toContain(resolve('/project/my_app', 'src/subgraphs'))
      expect(paths).toContain(resolve('/project/my_app', 'typedoc.json'))
      expect(paths).toContain(resolve('/project/my_app', 'vocs.config.ts'))
      expect(paths).toContain(resolve('/project/my_app', '.husky'))
      expect(paths).toContain(resolve('/project/my_app', '.install-files'))
    })

    it('removes all optional scripts from package.json', async () => {
      await cleanupFiles('evm', '/project/my_app', 'custom', [])

      const pkg = getWrittenPackageJson()
      const scripts = pkg.scripts as Record<string, unknown>
      expect(scripts['subgraph-codegen']).toBeUndefined()
      expect(scripts['typedoc:build']).toBeUndefined()
      expect(scripts['docs:build']).toBeUndefined()
      expect(scripts['docs:dev']).toBeUndefined()
      expect(scripts['docs:preview']).toBeUndefined()
      expect(scripts.prepare).toBeUndefined()
      expect(scripts.dev).toBe('next dev')
      expect(scripts.build).toBe('next build')
    })
  })

  it('always removes .install-files as the last rm call', async () => {
    await cleanupFiles('evm', '/project/my_app', 'custom', ['demo'])

    const paths = getRmPaths()
    expect(paths.at(-1)).toBe(resolve('/project/my_app', '.install-files'))
  })

  it('uses force option on all rm calls', async () => {
    await cleanupFiles('evm', '/project/my_app', 'custom', [])

    for (const call of vi.mocked(rm).mock.calls) {
      const options = call[1] as { force?: boolean }
      expect(options.force).toBe(true)
    }
  })

  describe('onProgress callback', () => {
    it('reports only Install script for full mode', async () => {
      const steps: string[] = []
      await cleanupFiles('evm', '/project/my_app', 'full', [], (step) => steps.push(step))

      expect(steps).toEqual([
        'Repository metadata',
        'Git hooks and commit linting',
        'Install script',
      ])
    })

    it('reports all feature cleanups when no features selected', async () => {
      const steps: string[] = []
      await cleanupFiles('evm', '/project/my_app', 'custom', [], (step) => steps.push(step))

      expect(steps).toEqual([
        'Repository metadata',
        'Git hooks and commit linting',
        'Component demos',
        'Subgraph',
        'Typedoc',
        'Vocs',
        'Install script',
      ])
    })

    it('skips steps for selected features', async () => {
      const steps: string[] = []
      await cleanupFiles('evm', '/project/my_app', 'custom', ['demo', 'subgraph'], (step) =>
        steps.push(step),
      )

      expect(steps).not.toContain('Component demos')
      expect(steps).not.toContain('Subgraph')
      expect(steps).toContain('Typedoc')
      expect(steps).toContain('Install script')
    })

    it('works without a callback', async () => {
      await expect(cleanupFiles('evm', '/project/my_app', 'full')).resolves.toBeUndefined()
    })
  })
})

describe('cleanupFiles — canton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCantonPackageJson()
  })

  describe('full mode (keep everything)', () => {
    it('keeps .github, pre-commit files, carpincho-wallet, and agent metadata', async () => {
      await cleanupFiles('canton', '/project/my_app', 'full')

      const paths = getRmPaths()
      expect(paths).not.toContain(resolve('/project/my_app', '.github'))
      expect(paths).not.toContain(resolve('/project/my_app', '.husky'))
      expect(paths).not.toContain(resolve('/project/my_app', '.lintstagedrc.mjs'))
      expect(paths).not.toContain(resolve('/project/my_app', 'commitlint.config.js'))
      expect(paths).not.toContain(resolve('/project/my_app', 'carpincho-wallet'))
      expect(paths).not.toContain(resolve('/project/my_app', '.claude'))
    })

    it('keeps the prepare script and husky deps, then makes the initial commit', async () => {
      await cleanupFiles('canton', '/project/my_app', 'full')

      const pkg = getWrittenPackageJson()
      const scripts = pkg.scripts as Record<string, unknown>
      const devDeps = pkg.devDependencies as Record<string, unknown>
      expect(scripts.prepare).toBe('husky')
      expect(scripts['canton:up']).toBe('npm --prefix canton-barebones run up')
      expect(scripts['wallet:dev']).toBe('npm --prefix carpincho-wallet run dev')
      expect(devDeps.husky).toBe('^9.1.7')
      expect(execFile).toHaveBeenCalledWith('git', ['add', '.'], { cwd: '/project/my_app' })
    })

    it('keeps the full workspaces array (nothing removed)', async () => {
      await cleanupFiles('canton', '/project/my_app', 'full')

      expect(getWorkspacePackages(getWrittenPackageJson())).toEqual(CANTON_WORKSPACES)
    })

    it('makes the initial commit with --no-verify so kept project hooks cannot block it', async () => {
      await cleanupFiles('canton', '/project/my_app', 'full')

      const commitCall = vi
        .mocked(execFile)
        .mock.calls.find((call) => call[0] === 'git' && (call[1] as string[]).includes('commit'))
      expect(commitCall).toBeDefined()
      expect(commitCall?.[1]).toContain('--no-verify')
    })
  })

  describe('default mode (drop github + precommit, keep the rest)', () => {
    it('removes .github and the pre-commit files but keeps carpincho-wallet and agent metadata', async () => {
      await cleanupFiles('canton', '/project/my_app', 'default', ['carpincho', 'llm'])

      const paths = getRmPaths()
      expect(paths).toContain(resolve('/project/my_app', '.github'))
      expect(paths).toContain(resolve('/project/my_app', '.husky'))
      expect(paths).toContain(resolve('/project/my_app', '.lintstagedrc.mjs'))
      expect(paths).toContain(resolve('/project/my_app', 'commitlint.config.js'))
      expect(paths).not.toContain(resolve('/project/my_app', 'carpincho-wallet'))
      expect(paths).not.toContain(resolve('/project/my_app', '.claude'))
    })

    it('strips the prepare script and husky deps from package.json', async () => {
      await cleanupFiles('canton', '/project/my_app', 'default', ['carpincho', 'llm'])

      const pkg = getWrittenPackageJson()
      const scripts = pkg.scripts as Record<string, unknown>
      const devDeps = pkg.devDependencies as Record<string, unknown>
      expect(scripts.prepare).toBeUndefined()
      expect(devDeps.husky).toBeUndefined()
      expect(devDeps['lint-staged']).toBeUndefined()
      expect(devDeps['@commitlint/cli']).toBeUndefined()
      // Carpincho is kept, so its scripts survive.
      expect(scripts['wallet:dev']).toBe('npm --prefix carpincho-wallet run dev')
    })

    it('still makes the initial commit', async () => {
      await cleanupFiles('canton', '/project/my_app', 'default', ['carpincho', 'llm'])
      expect(execFile).toHaveBeenCalledWith('git', ['add', '.'], { cwd: '/project/my_app' })
    })
  })

  describe('custom mode — keep github, drop precommit', () => {
    it('keeps .github but removes pre-commit files, prepare, and husky deps', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', ['github', 'carpincho', 'llm'])

      const paths = getRmPaths()
      expect(paths).not.toContain(resolve('/project/my_app', '.github'))
      expect(paths).toContain(resolve('/project/my_app', '.husky'))

      const pkg = getWrittenPackageJson()
      const scripts = pkg.scripts as Record<string, unknown>
      const devDeps = pkg.devDependencies as Record<string, unknown>
      expect(scripts.prepare).toBeUndefined()
      expect(devDeps.husky).toBeUndefined()
    })
  })

  describe('custom mode — keep precommit', () => {
    it('keeps the husky files, prepare script, and deps', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', ['precommit', 'carpincho', 'llm'])

      const paths = getRmPaths()
      expect(paths).not.toContain(resolve('/project/my_app', '.husky'))
      expect(paths).toContain(resolve('/project/my_app', '.github'))

      const pkg = getWrittenPackageJson()
      const scripts = pkg.scripts as Record<string, unknown>
      const devDeps = pkg.devDependencies as Record<string, unknown>
      expect(scripts.prepare).toBe('husky')
      expect(devDeps.husky).toBe('^9.1.7')
    })
  })

  describe('custom mode — carpincho deselected', () => {
    it('removes carpincho-wallet and strips its scripts', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', ['github', 'precommit', 'llm'])

      expect(getRmPaths()).toContain(resolve('/project/my_app', 'carpincho-wallet'))
      const scripts = getWrittenPackageJson().scripts as Record<string, unknown>
      expect(scripts['wallet:dev']).toBeUndefined()
      expect(scripts['carpincho:build:extension']).toBeUndefined()
    })

    it('prunes carpincho-wallet from the workspaces array but keeps the rest', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', ['github', 'precommit', 'llm'])

      const workspaces = getWorkspacePackages(getWrittenPackageJson())
      expect(workspaces).not.toContain('carpincho-wallet')
      expect(workspaces).toContain('canton-barebones')
      expect(workspaces).toContain('dapp/frontend')
    })

    // The invariant the bug violated — asserted generally, not just for carpincho-wallet.
    it('leaves no workspace entry pointing at a removed directory', async () => {
      const selected: FeatureName[] = ['github', 'precommit', 'llm']
      await cleanupFiles('canton', '/project/my_app', 'custom', selected)

      const removedDirs = removedCantonDirs(selected)
      const workspaces = getWorkspacePackages(getWrittenPackageJson())
      for (const entry of workspaces) {
        expect(entryTargetsRemovedDir(entry, removedDirs)).toBe(false)
      }
      // Guard against the array being emptied wholesale.
      expect(workspaces.length).toBeGreaterThan(0)
    })

    it('prunes the { packages } object form and preserves sibling keys', async () => {
      mockCantonPackageJson({ packages: CANTON_WORKSPACES, nohoist: ['**/react'] })
      await cleanupFiles('canton', '/project/my_app', 'custom', ['github', 'precommit', 'llm'])

      const written = getWrittenPackageJson()
      expect(Array.isArray(written.workspaces)).toBe(false)
      const workspaces = written.workspaces as { packages: string[]; nohoist: string[] }
      expect(workspaces.packages).not.toContain('carpincho-wallet')
      expect(workspaces.packages).toContain('dapp/frontend')
      expect(workspaces.nohoist).toEqual(['**/react'])
    })
  })

  describe('custom mode — llm deselected', () => {
    it('removes agent metadata and llm artifact paths', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', [
        'github',
        'precommit',
        'carpincho',
      ])

      const paths = getRmPaths()
      expect(paths).toContain(resolve('/project/my_app', '.claude'))
      expect(paths).toContain(resolve('/project/my_app', 'AGENTS.md'))
      expect(paths).toContain(resolve('/project/my_app', 'architecture.md'))
      expect(paths).toContain(resolve('/project/my_app', 'llms.txt'))
    })

    // llm's paths aren't workspaces — removing it must not touch the array.
    it('leaves the workspaces array intact (its paths are not workspaces)', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', [
        'github',
        'precommit',
        'carpincho',
      ])

      expect(getWorkspacePackages(getWrittenPackageJson())).toEqual(CANTON_WORKSPACES)
    })
  })

  describe('onProgress callback', () => {
    it('reports only the initial commit for full mode (no forced hygiene)', async () => {
      const steps: string[] = []
      await cleanupFiles('canton', '/project/my_app', 'full', [], (step) => steps.push(step))

      expect(steps).toEqual(['Initial commit'])
    })

    it('reports github + pre-commit removals then the commit for default mode', async () => {
      const steps: string[] = []
      await cleanupFiles('canton', '/project/my_app', 'default', ['carpincho', 'llm'], (step) =>
        steps.push(step),
      )

      expect(steps).toEqual(['GitHub templates & workflows', 'Pre-commit hooks', 'Initial commit'])
    })

    it('reports every feature removal then the commit when nothing is selected', async () => {
      const steps: string[] = []
      await cleanupFiles('canton', '/project/my_app', 'custom', [], (step) => steps.push(step))

      expect(steps).toEqual([
        'GitHub templates & workflows',
        'Pre-commit hooks',
        'Carpincho wallet',
        'LLM & agent artifacts',
        'Initial commit',
      ])
    })
  })
})
