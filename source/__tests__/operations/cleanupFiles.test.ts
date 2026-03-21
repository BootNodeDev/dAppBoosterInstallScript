import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeatureName } from '../../constants/config.js'

vi.mock('node:fs/promises', () => ({
  rm: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  copyFile: vi.fn().mockResolvedValue(undefined),
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

describe('cleanupFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
  })

  describe('full mode', () => {
    it('only removes .install-files', async () => {
      await cleanupFiles('/project/my_app', 'full')

      expect(rm).toHaveBeenCalledTimes(1)
      expect(getRmPaths()[0]).toBe(resolve('/project/my_app', '.install-files'))
    })

    it('does not patch package.json', async () => {
      await cleanupFiles('/project/my_app', 'full')

      expect(writeFileSync).not.toHaveBeenCalled()
    })
  })

  describe('custom mode — all features selected', () => {
    it('only removes .install-files and patches package.json', async () => {
      const allFeatures: FeatureName[] = ['demo', 'subgraph', 'typedoc', 'vocs', 'husky']
      await cleanupFiles('/project/my_app', 'custom', allFeatures)

      expect(rm).toHaveBeenCalledTimes(1)
      expect(getRmPaths()[0]).toBe(resolve('/project/my_app', '.install-files'))
      expect(writeFileSync).toHaveBeenCalled()
    })

    it('preserves all scripts when all features selected', async () => {
      const allFeatures: FeatureName[] = ['demo', 'subgraph', 'typedoc', 'vocs', 'husky']
      await cleanupFiles('/project/my_app', 'custom', allFeatures)

      const pkg = getWrittenPackageJson()
      const scripts = pkg.scripts as Record<string, unknown>
      expect(scripts['subgraph-codegen']).toBe('graphql-codegen')
      expect(scripts['typedoc:build']).toBe('typedoc')
      expect(scripts['docs:build']).toBe('vocs build')
      expect(scripts.prepare).toBe('husky install')
    })
  })

  describe('custom mode — demo deselected', () => {
    it('removes home folder, recreates it, copies replacement', async () => {
      await cleanupFiles('/project/my_app', 'custom', ['subgraph', 'typedoc', 'vocs', 'husky'])

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
      await cleanupFiles('/project/my_app', 'custom', ['demo', 'typedoc', 'vocs', 'husky'])

      expect(getRmPaths()).toContain(resolve('/project/my_app', 'src/subgraphs'))
    })

    it('cleans up subgraph demos when demo IS selected', async () => {
      await cleanupFiles('/project/my_app', 'custom', ['demo', 'typedoc', 'vocs', 'husky'])

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
      await cleanupFiles('/project/my_app', 'custom', ['typedoc', 'vocs', 'husky'])

      const subgraphDemosPath = resolve(
        '/project/my_app',
        'src/components/pageComponents/home/Examples/demos/subgraphs',
      )
      expect(getRmPaths()).not.toContain(subgraphDemosPath)
    })

    it('removes subgraph-codegen from package.json scripts', async () => {
      await cleanupFiles('/project/my_app', 'custom', ['demo', 'typedoc', 'vocs', 'husky'])

      const pkg = getWrittenPackageJson()
      const scripts = pkg.scripts as Record<string, unknown>
      expect(scripts['subgraph-codegen']).toBeUndefined()
    })
  })

  describe('custom mode — typedoc deselected', () => {
    it('removes typedoc.json', async () => {
      await cleanupFiles('/project/my_app', 'custom', ['demo', 'subgraph', 'vocs', 'husky'])

      expect(getRmPaths()).toContain(resolve('/project/my_app', 'typedoc.json'))
    })

    it('removes typedoc:build from package.json scripts', async () => {
      await cleanupFiles('/project/my_app', 'custom', ['demo', 'subgraph', 'vocs', 'husky'])

      const pkg = getWrittenPackageJson()
      const scripts = pkg.scripts as Record<string, unknown>
      expect(scripts['typedoc:build']).toBeUndefined()
    })
  })

  describe('custom mode — vocs deselected', () => {
    it('removes vocs.config.ts and docs folder', async () => {
      await cleanupFiles('/project/my_app', 'custom', ['demo', 'subgraph', 'typedoc', 'husky'])

      expect(getRmPaths()).toContain(resolve('/project/my_app', 'vocs.config.ts'))
      expect(getRmPaths()).toContain(resolve('/project/my_app', 'docs'))
    })

    it('removes docs scripts from package.json', async () => {
      await cleanupFiles('/project/my_app', 'custom', ['demo', 'subgraph', 'typedoc', 'husky'])

      const pkg = getWrittenPackageJson()
      const scripts = pkg.scripts as Record<string, unknown>
      expect(scripts['docs:build']).toBeUndefined()
      expect(scripts['docs:dev']).toBeUndefined()
      expect(scripts['docs:preview']).toBeUndefined()
    })
  })

  describe('custom mode — husky deselected', () => {
    it('removes husky folder and config files', async () => {
      await cleanupFiles('/project/my_app', 'custom', ['demo', 'subgraph', 'typedoc', 'vocs'])

      expect(getRmPaths()).toContain(resolve('/project/my_app', '.husky'))
      expect(getRmPaths()).toContain(resolve('/project/my_app', '.lintstagedrc.mjs'))
      expect(getRmPaths()).toContain(resolve('/project/my_app', 'commitlint.config.js'))
    })

    it('removes prepare from package.json scripts', async () => {
      await cleanupFiles('/project/my_app', 'custom', ['demo', 'subgraph', 'typedoc', 'vocs'])

      const pkg = getWrittenPackageJson()
      const scripts = pkg.scripts as Record<string, unknown>
      expect(scripts.prepare).toBeUndefined()
    })
  })

  describe('custom mode — no features selected', () => {
    it('runs all cleanup operations', async () => {
      await cleanupFiles('/project/my_app', 'custom', [])

      const paths = getRmPaths()
      expect(paths).toContain(resolve('/project/my_app', 'src/components/pageComponents/home'))
      expect(paths).toContain(resolve('/project/my_app', 'src/subgraphs'))
      expect(paths).toContain(resolve('/project/my_app', 'typedoc.json'))
      expect(paths).toContain(resolve('/project/my_app', 'vocs.config.ts'))
      expect(paths).toContain(resolve('/project/my_app', '.husky'))
      expect(paths).toContain(resolve('/project/my_app', '.install-files'))
    })

    it('removes all optional scripts from package.json', async () => {
      await cleanupFiles('/project/my_app', 'custom', [])

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
    await cleanupFiles('/project/my_app', 'custom', ['demo'])

    const paths = getRmPaths()
    expect(paths.at(-1)).toBe(resolve('/project/my_app', '.install-files'))
  })

  it('uses force option on all rm calls', async () => {
    await cleanupFiles('/project/my_app', 'custom', [])

    for (const call of vi.mocked(rm).mock.calls) {
      const options = call[1] as { force?: boolean }
      expect(options.force).toBe(true)
    }
  })

  describe('onProgress callback', () => {
    it('reports only Install script for full mode', async () => {
      const steps: string[] = []
      await cleanupFiles('/project/my_app', 'full', [], (step) => steps.push(step))

      expect(steps).toEqual(['Install script'])
    })

    it('reports all feature cleanups when no features selected', async () => {
      const steps: string[] = []
      await cleanupFiles('/project/my_app', 'custom', [], (step) => steps.push(step))

      expect(steps).toEqual([
        'Component demos',
        'Subgraph',
        'Typedoc',
        'Vocs',
        'Husky',
        'Install script',
      ])
    })

    it('skips steps for selected features', async () => {
      const steps: string[] = []
      await cleanupFiles('/project/my_app', 'custom', ['demo', 'subgraph'], (step) =>
        steps.push(step),
      )

      expect(steps).not.toContain('Component demos')
      expect(steps).not.toContain('Subgraph')
      expect(steps).toContain('Typedoc')
      expect(steps).toContain('Install script')
    })

    it('works without a callback', async () => {
      await expect(cleanupFiles('/project/my_app', 'full')).resolves.toBeUndefined()
    })
  })
})
