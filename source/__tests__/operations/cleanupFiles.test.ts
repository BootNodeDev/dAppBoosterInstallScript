import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeatureName } from '../../constants/config.js'

vi.mock('../../operations/exec.js', () => ({
  exec: vi.fn().mockResolvedValue(undefined),
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

const { execFile } = await import('../../operations/exec.js')
const { readFileSync, writeFileSync } = await import('node:fs')
const { cleanupFiles } = await import('../../operations/cleanupFiles.js')

function getExecFileCommands(): string[] {
  return vi
    .mocked(execFile)
    .mock.calls.map((call) => `${call[0]} ${(call[1] as string[]).join(' ')}`)
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

      const commands = getExecFileCommands()
      expect(commands).toHaveLength(1)
      expect(commands[0]).toBe('rm -rf .install-files')
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

      const commands = getExecFileCommands()
      expect(commands).toEqual(['rm -rf .install-files'])
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

      const commands = getExecFileCommands()
      expect(commands).toContain('rm -rf src/components/pageComponents/home')
      expect(commands).toContain('mkdir -p src/components/pageComponents/home')
      expect(commands).toContain(
        'cp .install-files/home/index.tsx src/components/pageComponents/home/',
      )
    })
  })

  describe('custom mode — subgraph deselected', () => {
    it('removes src/subgraphs', async () => {
      await cleanupFiles('/project/my_app', 'custom', ['demo', 'typedoc', 'vocs', 'husky'])

      const commands = getExecFileCommands()
      expect(commands).toContain('rm -rf src/subgraphs')
    })

    it('cleans up subgraph demos when demo IS selected', async () => {
      await cleanupFiles('/project/my_app', 'custom', ['demo', 'typedoc', 'vocs', 'husky'])

      const commands = getExecFileCommands()
      const homeFolder = 'src/components/pageComponents/home'
      expect(commands).toContain(`rm -rf ${homeFolder}/Examples/demos/subgraphs`)
      expect(commands).toContain(`rm -f ${homeFolder}/Examples/index.tsx`)
      expect(commands).toContain(
        `cp .install-files/home/Examples/index.tsx ${homeFolder}/Examples/index.tsx`,
      )
    })

    it('does NOT clean up subgraph demos when demo is also deselected', async () => {
      await cleanupFiles('/project/my_app', 'custom', ['typedoc', 'vocs', 'husky'])

      const commands = getExecFileCommands()
      const demoCleanupCommands = commands.filter((cmd) => cmd.includes('Examples/demos/subgraphs'))
      expect(demoCleanupCommands).toHaveLength(0)
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

      const commands = getExecFileCommands()
      expect(commands).toContain('rm -f typedoc.json')
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

      const commands = getExecFileCommands()
      expect(commands).toContain('rm -f vocs.config.ts')
      expect(commands).toContain('rm -rf docs')
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

      const commands = getExecFileCommands()
      expect(commands).toContain('rm -rf .husky')
      expect(commands).toContain('rm -f .lintstagedrc.mjs')
      expect(commands).toContain('rm -f commitlint.config.js')
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

      const commands = getExecFileCommands()
      expect(commands).toContain('rm -rf src/components/pageComponents/home')
      expect(commands).toContain('rm -rf src/subgraphs')
      expect(commands).toContain('rm -f typedoc.json')
      expect(commands).toContain('rm -f vocs.config.ts')
      expect(commands).toContain('rm -rf .husky')
      expect(commands).toContain('rm -rf .install-files')
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
      // Preserved scripts
      expect(scripts.dev).toBe('next dev')
      expect(scripts.build).toBe('next build')
    })
  })

  it('always removes .install-files as the last step', async () => {
    await cleanupFiles('/project/my_app', 'custom', ['demo'])

    const commands = getExecFileCommands()
    expect(commands.at(-1)).toBe('rm -rf .install-files')
  })

  it('uses -f flag on all single-file rm calls for idempotent cleanup', async () => {
    await cleanupFiles('/project/my_app', 'custom', [])

    const commands = getExecFileCommands()
    const rmCommands = commands.filter((cmd) => cmd.startsWith('rm '))
    for (const cmd of rmCommands) {
      expect(cmd).toMatch(/^rm -[rf]/)
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
