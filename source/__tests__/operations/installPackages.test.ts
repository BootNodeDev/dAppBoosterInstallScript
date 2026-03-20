import { beforeEach, describe, expect, it, vi } from 'vitest'
import { featureDefinitions } from '../../constants/config.js'

vi.mock('../../operations/exec.js', () => ({
  exec: vi.fn().mockResolvedValue(''),
  execFile: vi.fn().mockResolvedValue(''),
}))

const { exec } = await import('../../operations/exec.js')
const { installPackages } = await import('../../operations/installPackages.js')

describe('installPackages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('full mode', () => {
    it('runs pnpm i', async () => {
      await installPackages('/project/my_app', 'full')

      expect(exec).toHaveBeenCalledWith('pnpm i', { cwd: '/project/my_app' })
    })

    it('runs only one command', async () => {
      await installPackages('/project/my_app', 'full')

      expect(exec).toHaveBeenCalledTimes(1)
    })

    it('ignores features argument', async () => {
      await installPackages('/project/my_app', 'full', ['demo', 'subgraph'])

      expect(exec).toHaveBeenCalledTimes(1)
      expect(exec).toHaveBeenCalledWith('pnpm i', { cwd: '/project/my_app' })
    })
  })

  describe('custom mode — all features selected', () => {
    it('runs pnpm i when no packages to remove', async () => {
      const allFeatures = Object.keys(featureDefinitions) as Array<keyof typeof featureDefinitions>
      await installPackages('/project/my_app', 'custom', allFeatures)

      expect(exec).toHaveBeenCalledTimes(1)
      expect(exec).toHaveBeenCalledWith('pnpm i', { cwd: '/project/my_app' })
    })
  })

  describe('custom mode — some features deselected', () => {
    it('runs pnpm remove with deselected feature packages', async () => {
      await installPackages('/project/my_app', 'custom', ['demo'])

      const removeCall = vi
        .mocked(exec)
        .mock.calls.find((call) => typeof call[0] === 'string' && call[0].startsWith('pnpm remove'))
      expect(removeCall).toBeDefined()

      const removeCmd = removeCall?.[0] as string
      for (const pkg of featureDefinitions.subgraph.packages) {
        expect(removeCmd).toContain(pkg)
      }
      for (const pkg of featureDefinitions.typedoc.packages) {
        expect(removeCmd).toContain(pkg)
      }
    })

    it('runs postinstall after pnpm remove', async () => {
      const callOrder: string[] = []
      vi.mocked(exec).mockImplementation(async (cmd) => {
        if (typeof cmd === 'string' && cmd.startsWith('pnpm remove')) {
          callOrder.push('remove')
        }
        if (typeof cmd === 'string' && cmd.includes('postinstall')) {
          callOrder.push('postinstall')
        }
        return ''
      })

      await installPackages('/project/my_app', 'custom', ['demo'])

      expect(callOrder).toEqual(['remove', 'postinstall'])
    })

    it('does not include selected feature packages in remove command', async () => {
      await installPackages('/project/my_app', 'custom', ['demo', 'subgraph'])

      const removeCall = vi
        .mocked(exec)
        .mock.calls.find((call) => typeof call[0] === 'string' && call[0].startsWith('pnpm remove'))
      expect(removeCall).toBeDefined()

      const removeCmd = removeCall?.[0] as string
      for (const pkg of featureDefinitions.subgraph.packages) {
        expect(removeCmd).not.toContain(pkg)
      }
    })
  })
})
