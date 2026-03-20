import { beforeEach, describe, expect, it, vi } from 'vitest'
import { repoUrl } from '../../constants/config.js'

vi.mock('../../operations/exec.js', () => ({
  exec: vi.fn().mockResolvedValue(''),
  execFile: vi.fn().mockResolvedValue(''),
}))

const { exec, execFile } = await import('../../operations/exec.js')
const { cloneRepo } = await import('../../operations/cloneRepo.js')

describe('cloneRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls 5 commands in sequence', async () => {
    await cloneRepo('my_app')

    const execFileCalls = vi.mocked(execFile).mock.calls
    const execCalls = vi.mocked(exec).mock.calls
    expect(execFileCalls.length + execCalls.length).toBe(5)
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

  it('removes .git with execFile', async () => {
    await cloneRepo('my_app')

    expect(execFile).toHaveBeenCalledWith('rm', ['-rf', '.git'], {
      cwd: expect.stringContaining('my_app'),
    })
  })

  it('initializes fresh git repo with execFile', async () => {
    await cloneRepo('my_app')

    expect(execFile).toHaveBeenCalledWith('git', ['init'], {
      cwd: expect.stringContaining('my_app'),
    })
  })

  it('executes commands in correct order', async () => {
    const callOrder: string[] = []
    vi.mocked(execFile).mockImplementation(async (file, args) => {
      callOrder.push(`${file} ${args[0]}`)
      return ''
    })
    vi.mocked(exec).mockImplementation(async (_cmd) => {
      callOrder.push('git checkout')
      return ''
    })

    await cloneRepo('my_app')

    expect(callOrder).toEqual(['git clone', 'git fetch', 'git checkout', 'rm -rf', 'git init'])
  })

  it('does not interpolate projectName into shell strings', async () => {
    await cloneRepo('my_app')

    for (const call of vi.mocked(exec).mock.calls) {
      expect(call[0]).not.toContain('my_app')
    }
  })
})
