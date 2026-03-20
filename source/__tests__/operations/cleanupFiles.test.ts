import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeatureName } from '../../constants/config.js'

vi.mock('../../operations/exec.js', () => ({
  exec: vi.fn().mockResolvedValue(''),
  execFile: vi.fn().mockResolvedValue(''),
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

const { exec } = await import('../../operations/exec.js')
const { readFileSync, writeFileSync } = await import('node:fs')
const { cleanupFiles } = await import('../../operations/cleanupFiles.js')

function getExecCommands(): string[] {
  return vi.mocked(exec).mock.calls.map((call) => call[0] as string)
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

      const commands = getExecCommands()
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

      const commands = getExecCommands()
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

      const commands = getExecCommands()
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

      const commands = getExecCommands()
      expect(commands).toContain('rm -rf src/subgraphs')
    })

    it('cleans up subgraph demos when demo IS selected', async () => {
      await cleanupFiles('/project/my_app', 'custom', ['demo', 'typedoc', 'vocs', 'husky'])

      const commands = getExecCommands()
      const homeFolder = 'src/components/pageComponents/home'
      expect(commands).toContain(`rm -rf ${homeFolder}/Examples/demos/subgraphs`)
      expect(commands).toContain(`rm ${homeFolder}/Examples/index.tsx`)
      expect(commands).toContain(
        `cp .install-files/home/Examples/index.tsx ${homeFolder}/Examples/index.tsx`,
      )
    })

    it('does NOT clean up subgraph demos when demo is also deselected', async () => {
      await cleanupFiles('/project/my_app', 'custom', ['typedoc', 'vocs', 'husky'])

      const commands = getExecCommands()
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

      const commands = getExecCommands()
      expect(commands).toContain('rm typedoc.json')
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

      const commands = getExecCommands()
      expect(commands).toContain('rm vocs.config.ts')
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

      const commands = getExecCommands()
      expect(commands).toContain('rm -rf .husky')
      expect(commands).toContain('rm .lintstagedrc.mjs')
      expect(commands).toContain('rm commitlint.config.js')
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

      const commands = getExecCommands()
      expect(commands).toContain('rm -rf src/components/pageComponents/home')
      expect(commands).toContain('rm -rf src/subgraphs')
      expect(commands).toContain('rm typedoc.json')
      expect(commands).toContain('rm vocs.config.ts')
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

    const commands = getExecCommands()
    expect(commands.at(-1)).toBe('rm -rf .install-files')
  })
})
