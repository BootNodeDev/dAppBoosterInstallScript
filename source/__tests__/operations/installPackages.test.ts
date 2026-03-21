import { beforeEach, describe, expect, it, vi } from 'vitest'
import { featureDefinitions } from '../../constants/config.js'

vi.mock('../../operations/exec.js', () => ({
  exec: vi.fn().mockResolvedValue(''),
  execFile: vi.fn().mockResolvedValue(''),
}))

const { execFile } = await import('../../operations/exec.js')
const { installPackages } = await import('../../operations/installPackages.js')

describe('installPackages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('full mode', () => {
    it('runs pnpm i via execFile', async () => {
      await installPackages('/project/my_app', 'full')

      expect(execFile).toHaveBeenCalledWith('pnpm', ['i'], { cwd: '/project/my_app' })
    })

    it('runs only one command', async () => {
      await installPackages('/project/my_app', 'full')

      expect(execFile).toHaveBeenCalledTimes(1)
    })

    it('ignores features argument', async () => {
      await installPackages('/project/my_app', 'full', ['demo', 'subgraph'])

      expect(execFile).toHaveBeenCalledTimes(1)
      expect(execFile).toHaveBeenCalledWith('pnpm', ['i'], { cwd: '/project/my_app' })
    })
  })

  describe('custom mode — all features selected', () => {
    it('runs pnpm i when no packages to remove', async () => {
      const allFeatures = Object.keys(featureDefinitions) as Array<keyof typeof featureDefinitions>
      await installPackages('/project/my_app', 'custom', allFeatures)

      expect(execFile).toHaveBeenCalledTimes(1)
      expect(execFile).toHaveBeenCalledWith('pnpm', ['i'], { cwd: '/project/my_app' })
    })
  })

  describe('custom mode — some features deselected', () => {
    it('runs pnpm remove with deselected feature packages', async () => {
      await installPackages('/project/my_app', 'custom', ['demo'])

      const removeCall = vi
        .mocked(execFile)
        .mock.calls.find((call) => call[0] === 'pnpm' && call[1][0] === 'remove')
      expect(removeCall).toBeDefined()

      const removeArgs = removeCall?.[1] as string[]
      for (const pkg of featureDefinitions.subgraph.packages) {
        expect(removeArgs).toContain(pkg)
      }
      for (const pkg of featureDefinitions.typedoc.packages) {
        expect(removeArgs).toContain(pkg)
      }
    })

    it('runs postinstall after pnpm remove', async () => {
      const callOrder: string[] = []
      vi.mocked(execFile).mockImplementation(async (_file, args) => {
        if (args[0] === 'remove') {
          callOrder.push('remove')
        }
        if (args[0] === 'run' && args[1] === 'postinstall') {
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
        .mocked(execFile)
        .mock.calls.find((call) => call[0] === 'pnpm' && call[1][0] === 'remove')
      expect(removeCall).toBeDefined()

      const removeArgs = removeCall?.[1] as string[]
      for (const pkg of featureDefinitions.subgraph.packages) {
        expect(removeArgs).not.toContain(pkg)
      }
    })

    it('uses execFile for pnpm remove to avoid shell interpolation', async () => {
      await installPackages('/project/my_app', 'custom', ['demo'])

      expect(execFile).toHaveBeenCalledWith('pnpm', expect.arrayContaining(['remove']), {
        cwd: '/project/my_app',
      })
    })

    it('passes each package as a separate arg to execFile', async () => {
      await installPackages('/project/my_app', 'custom', ['demo'])

      const removeCall = vi
        .mocked(execFile)
        .mock.calls.find((call) => call[0] === 'pnpm' && call[1][0] === 'remove')
      expect(removeCall).toBeDefined()

      const removeArgs = removeCall?.[1] as string[]
      expect(removeArgs[0]).toBe('remove')
      for (const pkg of featureDefinitions.subgraph.packages) {
        expect(removeArgs).toContain(pkg)
      }
    })

    it('runs postinstall via execFile', async () => {
      await installPackages('/project/my_app', 'custom', ['demo'])

      expect(execFile).toHaveBeenCalledWith('pnpm', ['run', 'postinstall'], {
        cwd: '/project/my_app',
      })
    })
  })

  it('never uses exec (shell) for any command', async () => {
    const { exec } = await import('../../operations/exec.js')

    await installPackages('/project/my_app', 'custom', ['demo'])

    expect(exec).not.toHaveBeenCalled()
  })

  describe('onProgress callback', () => {
    it('reports one step for full mode', async () => {
      const steps: string[] = []
      await installPackages('/project/my_app', 'full', [], (step) => steps.push(step))

      expect(steps).toEqual(['Installing packages'])
    })

    it('reports two steps for custom mode with packages to remove', async () => {
      const steps: string[] = []
      await installPackages('/project/my_app', 'custom', ['demo'], (step) => steps.push(step))

      expect(steps).toEqual(['Installing packages', 'Executing post-install scripts'])
    })

    it('reports one step for custom mode with all features selected', async () => {
      const allFeatures = Object.keys(featureDefinitions) as Array<keyof typeof featureDefinitions>
      const steps: string[] = []
      await installPackages('/project/my_app', 'custom', allFeatures, (step) => steps.push(step))

      expect(steps).toEqual(['Installing packages'])
    })

    it('works without a callback', async () => {
      await expect(installPackages('/project/my_app', 'full')).resolves.toBeUndefined()
    })
  })
})
