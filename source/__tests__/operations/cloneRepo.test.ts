import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stackDefinitions } from '../../constants/config.js'

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

const evmRepoUrl = stackDefinitions.evm.repoUrl
const cantonRepoUrl = stackDefinitions.canton.repoUrl
const cantonBranch = stackDefinitions.canton.ref

describe('cloneRepo — evm (tag-latest)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clones with execFile using evm repo url and projectName as arg', async () => {
    await cloneRepo('evm', 'my_app')

    expect(execFile).toHaveBeenCalledWith('git', [
      'clone',
      '--depth',
      '1',
      '--no-checkout',
      evmRepoUrl,
      'my_app',
    ])
  })

  it('fetches tags with execFile', async () => {
    await cloneRepo('evm', 'my_app')

    expect(execFile).toHaveBeenCalledWith('git', ['fetch', '--tags'], {
      cwd: expect.stringContaining('my_app'),
    })
  })

  it('checks out latest tag with exec (needs shell)', async () => {
    await cloneRepo('evm', 'my_app')

    expect(exec).toHaveBeenCalledWith(expect.stringContaining('git checkout $(git describe'), {
      cwd: expect.stringContaining('my_app'),
    })
  })

  it('removes .git with fs.rm', async () => {
    await cloneRepo('evm', 'my_app')

    expect(rm).toHaveBeenCalledWith(expect.stringContaining('my_app/.git'), {
      recursive: true,
      force: true,
    })
  })

  it('initializes fresh git repo with execFile', async () => {
    await cloneRepo('evm', 'my_app')

    expect(execFile).toHaveBeenCalledWith('git', ['init'], {
      cwd: expect.stringContaining('my_app'),
    })
  })

  it('does not interpolate projectName into shell strings', async () => {
    await cloneRepo('evm', 'my_app')

    for (const call of vi.mocked(exec).mock.calls) {
      expect(call[0]).not.toContain('my_app')
    }
  })

  it('reports the canonical 5 progress steps in order', async () => {
    const steps: string[] = []
    await cloneRepo('evm', 'my_app', (step) => steps.push(step))

    expect(steps).toEqual([
      'Cloning EVM in my_app',
      'Fetching tags',
      'Checking out latest tag',
      'Removing .git folder',
      'Initializing Git repository',
    ])
  })

  it('works without a callback', async () => {
    await expect(cloneRepo('evm', 'my_app')).resolves.toBeUndefined()
  })
})

describe('cloneRepo — canton (branch)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clones the canton repo on the configured branch (no --no-checkout, no fetch tags)', async () => {
    await cloneRepo('canton', 'my_app')

    expect(execFile).toHaveBeenCalledWith('git', [
      'clone',
      '--depth',
      '1',
      '--branch',
      cantonBranch as string,
      '--single-branch',
      cantonRepoUrl,
      'my_app',
    ])

    // no fetch / no shell checkout for canton
    expect(execFile).not.toHaveBeenCalledWith('git', ['fetch', '--tags'], expect.anything())
    expect(exec).not.toHaveBeenCalled()
  })

  it('reinitializes git with execFile', async () => {
    await cloneRepo('canton', 'my_app')

    expect(execFile).toHaveBeenCalledWith('git', ['init'], {
      cwd: expect.stringContaining('my_app'),
    })
  })

  it('progress steps mention Canton and the branch', async () => {
    const steps: string[] = []
    await cloneRepo('canton', 'my_app', (step) => steps.push(step))

    expect(steps[0]).toContain('Canton')
    expect(steps[0]).toContain('my_app')
    expect(steps[0]).toContain(cantonBranch as string)
    expect(steps.at(-1)).toBe('Initializing Git repository')
  })
})
