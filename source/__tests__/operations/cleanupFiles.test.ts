import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeatureName } from '../../constants/config.js'

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

// Mirrors the real root package.json on BootNodeDev/cn-dappbooster@main.
function mockCantonPackageJson() {
  vi.mocked(readFileSync).mockReturnValue(
    JSON.stringify({
      scripts: {
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
        'app:dev':
          'npm --prefix counter/frontend run dev -- --host localhost --port 3012 --strictPort',
        lint: 'biome check',
        'lint:fix': 'biome check --write',
        format: 'biome format --write',
        e2e: 'npm --prefix e2e test',
        'e2e:headed': 'npm --prefix e2e run test:headed',
        'e2e:ui': 'npm --prefix e2e run test:ui',
        prepare: 'husky',
      },
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

  describe('hygiene (every mode)', () => {
    it('removes .github and git automation but keeps llm/agent metadata', async () => {
      await cleanupFiles('canton', '/project/my_app', 'full')

      const paths = getRmPaths()
      expect(paths).toContain(resolve('/project/my_app', '.github'))
      expect(paths).toContain(resolve('/project/my_app', '.husky'))
      expect(paths).toContain(resolve('/project/my_app', '.lintstagedrc.mjs'))
      expect(paths).toContain(resolve('/project/my_app', 'commitlint.config.js'))
      // Metadata + LLM artifacts belong to the `llm` feature, so full mode keeps them.
      expect(paths).not.toContain(resolve('/project/my_app', '.claude'))
      expect(paths).not.toContain(resolve('/project/my_app', 'AGENTS.md'))
      expect(paths).not.toContain(resolve('/project/my_app', 'architecture.md'))
      expect(paths).not.toContain(resolve('/project/my_app', 'llms.txt'))
    })
  })

  describe('full mode', () => {
    it('keeps every script — including carpincho — and makes the initial commit', async () => {
      await cleanupFiles('canton', '/project/my_app', 'full')

      const scripts = getWrittenPackageJson().scripts as Record<string, unknown>
      expect(scripts['canton:up']).toBe('npm --prefix canton-barebones run up')
      expect(scripts['build-dar']).toBe('bash scripts/build-dar.sh')
      expect(scripts['deploy-dar']).toBe('bash canton-barebones/scripts/deploy-dar.sh')
      expect(scripts['wallet-service:dev']).toBe(
        'npm --prefix canton-barebones/wallet-service run dev',
      )
      expect(scripts['wallet:dev']).toBe('npm --prefix carpincho-wallet run dev')
      expect(scripts['carpincho:build:extension']).toBe(
        'npm --prefix carpincho-wallet run build:extension',
      )
      expect(scripts['app:dev']).toBeDefined()
      expect(scripts.e2e).toBe('npm --prefix e2e test')
      expect(execFile).toHaveBeenCalledWith('git', ['add', '.'], { cwd: '/project/my_app' })
    })

    it('keeps the carpincho-wallet, counter and e2e directories', async () => {
      await cleanupFiles('canton', '/project/my_app', 'full')

      const paths = getRmPaths()
      expect(paths).not.toContain(resolve('/project/my_app', 'carpincho-wallet'))
      expect(paths).not.toContain(resolve('/project/my_app', 'counter'))
      expect(paths).not.toContain(resolve('/project/my_app', 'e2e'))
    })
  })

  describe('custom mode — carpincho deselected', () => {
    it('removes the carpincho-wallet directory', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', ['counter', 'e2e', 'llm'])

      expect(getRmPaths()).toContain(resolve('/project/my_app', 'carpincho-wallet'))
    })

    it('strips wallet:dev and carpincho:build:extension', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', ['counter', 'e2e', 'llm'])

      const scripts = getWrittenPackageJson().scripts as Record<string, unknown>
      expect(scripts['wallet:dev']).toBeUndefined()
      expect(scripts['carpincho:build:extension']).toBeUndefined()
    })

    it('keeps carpincho-wallet and its scripts when carpincho IS selected', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', ['carpincho'])

      expect(getRmPaths()).not.toContain(resolve('/project/my_app', 'carpincho-wallet'))
      const scripts = getWrittenPackageJson().scripts as Record<string, unknown>
      expect(scripts['wallet:dev']).toBe('npm --prefix carpincho-wallet run dev')
    })
  })

  describe('custom mode — llm deselected', () => {
    it('removes agent metadata and llm artifact paths', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', ['counter', 'e2e', 'carpincho'])

      const paths = getRmPaths()
      expect(paths).toContain(resolve('/project/my_app', '.claude'))
      expect(paths).toContain(resolve('/project/my_app', 'AGENTS.md'))
      expect(paths).toContain(resolve('/project/my_app', 'CLAUDE.md'))
      expect(paths).toContain(resolve('/project/my_app', 'architecture.md'))
      expect(paths).toContain(resolve('/project/my_app', 'llms.txt'))
      expect(paths).toContain(resolve('/project/my_app', 'docs/llm'))
    })

    it('keeps agent metadata when llm IS selected', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', ['llm'])

      expect(getRmPaths()).not.toContain(resolve('/project/my_app', '.claude'))
      expect(getRmPaths()).not.toContain(resolve('/project/my_app', 'AGENTS.md'))
    })
  })

  describe('custom mode — counter deselected', () => {
    it('removes counter/ (and not the base canton-barebones/dars)', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', ['e2e', 'carpincho', 'llm'])

      const paths = getRmPaths()
      expect(paths).toContain(resolve('/project/my_app', 'counter'))
      expect(paths).not.toContain(resolve('/project/my_app', 'dars'))
    })

    it('strips only counter-owned scripts (app:dev)', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', ['e2e', 'carpincho', 'llm'])

      const scripts = getWrittenPackageJson().scripts as Record<string, unknown>
      expect(scripts['app:dev']).toBeUndefined()
    })

    it('keeps base-infra scripts: canton:*, build-dar, deploy-dar, wallet-service:*', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', ['e2e', 'carpincho', 'llm'])

      const scripts = getWrittenPackageJson().scripts as Record<string, unknown>
      expect(scripts['canton:up']).toBe('npm --prefix canton-barebones run up')
      expect(scripts['canton:down']).toBe('npm --prefix canton-barebones run down')
      expect(scripts['build-dar']).toBe('bash scripts/build-dar.sh')
      expect(scripts['deploy-dar']).toBe('bash canton-barebones/scripts/deploy-dar.sh')
      expect(scripts['wallet-service:dev']).toBe(
        'npm --prefix canton-barebones/wallet-service run dev',
      )
      expect(scripts['wallet-service:health']).toBeDefined()
      expect(scripts.e2e).toBe('npm --prefix e2e test')
    })
  })

  describe('custom mode — e2e deselected', () => {
    it('removes e2e/ directory', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', ['counter', 'carpincho', 'llm'])

      expect(getRmPaths()).toContain(resolve('/project/my_app', 'e2e'))
    })

    it('strips all e2e scripts (e2e, e2e:headed, e2e:ui)', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', ['counter', 'carpincho', 'llm'])

      const scripts = getWrittenPackageJson().scripts as Record<string, unknown>
      expect(scripts.e2e).toBeUndefined()
      expect(scripts['e2e:headed']).toBeUndefined()
      expect(scripts['e2e:ui']).toBeUndefined()
    })

    it('keeps counter scripts (app:dev)', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', ['counter', 'carpincho', 'llm'])

      const scripts = getWrittenPackageJson().scripts as Record<string, unknown>
      expect(scripts['app:dev']).toBeDefined()
    })
  })

  describe('custom mode — nothing selected', () => {
    it('removes counter/, e2e/, carpincho-wallet and llm paths (never canton-barebones)', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', [])

      const paths = getRmPaths()
      expect(paths).toContain(resolve('/project/my_app', 'counter'))
      expect(paths).toContain(resolve('/project/my_app', 'e2e'))
      expect(paths).toContain(resolve('/project/my_app', 'carpincho-wallet'))
      expect(paths).toContain(resolve('/project/my_app', '.claude'))
      expect(paths).not.toContain(resolve('/project/my_app', 'canton-barebones'))
    })

    it('strips app:dev, e2e and carpincho scripts but keeps base infra, then commits', async () => {
      await cleanupFiles('canton', '/project/my_app', 'custom', [])

      const scripts = getWrittenPackageJson().scripts as Record<string, unknown>
      expect(scripts['app:dev']).toBeUndefined()
      expect(scripts.e2e).toBeUndefined()
      expect(scripts['e2e:ui']).toBeUndefined()
      expect(scripts['wallet:dev']).toBeUndefined()
      expect(scripts['carpincho:build:extension']).toBeUndefined()
      expect(scripts['canton:up']).toBeDefined()
      expect(scripts['build-dar']).toBeDefined()
      expect(scripts['wallet-service:dev']).toBeDefined()
      expect(scripts.lint).toBe('biome check')
      expect(scripts.prepare).toBeUndefined()

      expect(execFile).toHaveBeenCalledWith('git', ['add', '.'], { cwd: '/project/my_app' })
      expect(execFile).toHaveBeenCalledWith(
        'git',
        [
          '-c',
          'user.name=dAppBooster',
          '-c',
          'user.email=no-reply@dappbooster.dev',
          '-c',
          'commit.gpgsign=false',
          'commit',
          '-m',
          'chore: initial commit',
        ],
        { cwd: '/project/my_app' },
      )
    })
  })

  describe('onProgress callback', () => {
    it('reports per-feature steps in config order', async () => {
      const steps: string[] = []
      await cleanupFiles('canton', '/project/my_app', 'custom', [], (step) => steps.push(step))

      expect(steps).toEqual([
        'Repository metadata',
        'Git hooks and commit linting',
        'Counter demo',
        'E2E tests',
        'Carpincho wallet',
        'LLM & agent artifacts',
        'Initial commit',
      ])
    })

    it('skips steps for selected features', async () => {
      const steps: string[] = []
      await cleanupFiles('canton', '/project/my_app', 'custom', ['counter', 'carpincho'], (step) =>
        steps.push(step),
      )

      expect(steps).not.toContain('Counter demo')
      expect(steps).not.toContain('Carpincho wallet')
      expect(steps).toContain('E2E tests')
      expect(steps).toContain('LLM & agent artifacts')
    })

    it('reports only hygiene and the commit for full mode', async () => {
      const steps: string[] = []
      await cleanupFiles('canton', '/project/my_app', 'full', [], (step) => steps.push(step))

      expect(steps).toEqual([
        'Repository metadata',
        'Git hooks and commit linting',
        'Initial commit',
      ])
    })
  })
})
