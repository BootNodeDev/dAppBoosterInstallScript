import { beforeEach, describe, expect, it, vi } from 'vitest'
import { featureDefinitions, featureNames } from '../../config.js'

vi.mock('../../operations/exec.js', () => ({
  exec: vi.fn().mockResolvedValue(undefined),
  execFile: vi.fn().mockResolvedValue(undefined),
}))

const { execFile } = await import('../../operations/exec.js')
const { installPackages } = await import('../../operations/installPackages.js')

describe('installPackages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('every feature kept', () => {
    it('runs pnpm install via execFile', async () => {
      await installPackages('/project/my_app', featureNames)

      expect(execFile).toHaveBeenCalledWith('pnpm', ['install'], { cwd: '/project/my_app' })
    })

    it('runs only one command', async () => {
      await installPackages('/project/my_app', featureNames)

      expect(execFile).toHaveBeenCalledTimes(1)
    })
  })

  describe('some features deselected', () => {
    it('runs pnpm remove with deselected feature packages', async () => {
      await installPackages('/project/my_app', ['demo'])

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
        if (args[0] === 'run' && args.includes('postinstall')) {
          callOrder.push('postinstall')
        }
      })

      await installPackages('/project/my_app', ['demo'])

      expect(callOrder).toEqual(['remove', 'postinstall'])
    })

    it('does not include selected feature packages in remove command', async () => {
      await installPackages('/project/my_app', ['demo', 'subgraph'])

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
      await installPackages('/project/my_app', ['demo'])

      expect(execFile).toHaveBeenCalledWith('pnpm', expect.arrayContaining(['remove']), {
        cwd: '/project/my_app',
      })
    })

    it('passes each package as a separate arg to execFile', async () => {
      await installPackages('/project/my_app', ['demo'])

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
      await installPackages('/project/my_app', ['demo'])

      expect(execFile).toHaveBeenCalledWith('pnpm', ['run', '--if-present', 'postinstall'], {
        cwd: '/project/my_app',
      })
    })
  })

  it('never uses exec (shell) for any command', async () => {
    const { exec } = await import('../../operations/exec.js')

    await installPackages('/project/my_app', ['demo'])

    expect(exec).not.toHaveBeenCalled()
  })

  describe('onProgress callback', () => {
    it('reports one step when every feature is kept', async () => {
      const steps: string[] = []
      await installPackages('/project/my_app', featureNames, (step) => steps.push(step))

      expect(steps).toEqual(['Installing packages'])
    })

    it('reports two steps when packages are removed', async () => {
      const steps: string[] = []
      await installPackages('/project/my_app', ['demo'], (step) => steps.push(step))

      expect(steps).toEqual(['Installing packages', 'Executing post-install scripts'])
    })

    it('works without a callback', async () => {
      await expect(installPackages('/project/my_app', featureNames)).resolves.toBeUndefined()
    })
  })
})
