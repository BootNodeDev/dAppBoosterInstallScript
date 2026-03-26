import { beforeEach, describe, expect, it, vi } from 'vitest'
import { repoUrl } from '../../constants/config.js'

vi.mock('../../operations/exec.js', () => ({
  exec: vi.fn().mockResolvedValue(undefined),
  execFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('node:fs/promises', () => ({
  rm: vi.fn().mockResolvedValue(undefined),
}))

const { exec, execFile } = await import('../../operations/exec.js')
const { rm } = await import('node:fs/promises')
const { cloneRepo } = await import('../../operations/cloneRepo.js')

describe('cloneRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls 5 operations in sequence', async () => {
    await cloneRepo('my_app')

    const execFileCalls = vi.mocked(execFile).mock.calls
    const execCalls = vi.mocked(exec).mock.calls
    const rmCalls = vi.mocked(rm).mock.calls
    expect(execFileCalls.length + execCalls.length + rmCalls.length).toBe(5)
  })

  it('clones with execFile passing projectName as arg', async () => {
    await cloneRepo('my_app')

    expect(execFile).toHaveBeenCalledWith('git', [
      'clone',
      '--depth',
      '1',
      '--no-checkout',
      repoUrl,
      'my_app',
    ])
  })

  it('fetches tags with execFile', async () => {
    await cloneRepo('my_app')

    expect(execFile).toHaveBeenCalledWith('git', ['fetch', '--tags'], {
      cwd: expect.stringContaining('my_app'),
    })
  })

  it('checks out latest tag with exec (needs shell)', async () => {
    await cloneRepo('my_app')

    expect(exec).toHaveBeenCalledWith(expect.stringContaining('git checkout $(git describe'), {
      cwd: expect.stringContaining('my_app'),
    })
  })

  it('removes .git with fs.rm', async () => {
    await cloneRepo('my_app')

    expect(rm).toHaveBeenCalledWith(expect.stringContaining('my_app/.git'), {
      recursive: true,
      force: true,
    })
  })

  it('initializes fresh git repo with execFile', async () => {
    await cloneRepo('my_app')

    expect(execFile).toHaveBeenCalledWith('git', ['init'], {
      cwd: expect.stringContaining('my_app'),
    })
  })

  it('executes operations in correct order', async () => {
    const callOrder: string[] = []
    vi.mocked(execFile).mockImplementation(async (file, args) => {
      callOrder.push(`${file} ${args[0]}`)
    })
    vi.mocked(exec).mockImplementation(async (_cmd) => {
      callOrder.push('git checkout')
    })
    vi.mocked(rm).mockImplementation(async () => {
      callOrder.push('fs.rm .git')
    })

    await cloneRepo('my_app')

    expect(callOrder).toEqual(['git clone', 'git fetch', 'git checkout', 'fs.rm .git', 'git init'])
  })

  it('does not interpolate projectName into shell strings', async () => {
    await cloneRepo('my_app')

    for (const call of vi.mocked(exec).mock.calls) {
      expect(call[0]).not.toContain('my_app')
    }
  })

  describe('onProgress callback', () => {
    it('reports all 5 steps in order', async () => {
      const steps: string[] = []
      await cloneRepo('my_app', (step) => steps.push(step))

      expect(steps).toEqual([
        'Cloning dAppBooster in my_app',
        'Fetching tags',
        'Checking out latest tag',
        'Removing .git folder',
        'Initializing Git repository',
      ])
    })

    it('works without a callback', async () => {
      await expect(cloneRepo('my_app')).resolves.toBeUndefined()
    })
  })
})
