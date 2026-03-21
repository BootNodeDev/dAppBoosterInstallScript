import { type ChildProcess, spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}))

const { exec, execFile } = await import('../../operations/exec.js')

type StderrEmitter = EventEmitter & { on: (event: string, cb: (data: Buffer) => void) => void }

function createMockChild(): ChildProcess {
  const child = new EventEmitter() as ChildProcess
  child.stderr = new EventEmitter() as StderrEmitter
  return child
}

function mockSpawnWith(child: ChildProcess): void {
  vi.mocked(spawn).mockReturnValue(child)
}

describe('exec', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves when process exits with code 0', async () => {
    const child = createMockChild()
    mockSpawnWith(child)

    const promise = exec('echo hello')
    child.emit('close', 0, null)

    await expect(promise).resolves.toBeUndefined()
  })

  it('rejects with stderr when process exits with non-zero code', async () => {
    const child = createMockChild()
    mockSpawnWith(child)

    const promise = exec('false')
    child.stderr?.emit('data', Buffer.from('something went wrong'))
    child.emit('close', 1, null)

    await expect(promise).rejects.toThrow('something went wrong')
  })

  it('rejects with exit code message when stderr is empty', async () => {
    const child = createMockChild()
    mockSpawnWith(child)

    const promise = exec('false')
    child.emit('close', 1, null)

    await expect(promise).rejects.toThrow('Command failed with exit code 1')
  })

  it('rejects with signal name when process is killed by a signal', async () => {
    const child = createMockChild()
    mockSpawnWith(child)

    const promise = exec('sleep 999')
    child.emit('close', null, 'SIGTERM')

    await expect(promise).rejects.toThrow('Process killed by signal SIGTERM')
  })

  it('rejects with stderr over signal message when both are available', async () => {
    const child = createMockChild()
    mockSpawnWith(child)

    const promise = exec('sleep 999')
    child.stderr?.emit('data', Buffer.from('Terminated'))
    child.emit('close', null, 'SIGTERM')

    await expect(promise).rejects.toThrow('Terminated')
  })

  it('rejects when spawn emits an error', async () => {
    const child = createMockChild()
    mockSpawnWith(child)

    const promise = exec('nonexistent')
    child.emit('error', new Error('spawn ENOENT'))

    await expect(promise).rejects.toThrow('spawn ENOENT')
  })

  it('spawns /bin/sh -c with the command string', async () => {
    const child = createMockChild()
    mockSpawnWith(child)

    const promise = exec('echo hello', { cwd: '/tmp' })
    child.emit('close', 0, null)
    await promise

    expect(spawn).toHaveBeenCalledWith('/bin/sh', ['-c', 'echo hello'], {
      cwd: '/tmp',
      stdio: ['ignore', 'ignore', 'pipe'],
    })
  })
})

describe('execFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('spawns the file directly with args array', async () => {
    const child = createMockChild()
    mockSpawnWith(child)

    const promise = execFile('rm', ['-rf', 'dist'], { cwd: '/project' })
    child.emit('close', 0, null)
    await promise

    expect(spawn).toHaveBeenCalledWith('rm', ['-rf', 'dist'], {
      cwd: '/project',
      stdio: ['ignore', 'ignore', 'pipe'],
    })
  })

  it('rejects with signal name when killed', async () => {
    const child = createMockChild()
    mockSpawnWith(child)

    const promise = execFile('sleep', ['999'])
    child.emit('close', null, 'SIGKILL')

    await expect(promise).rejects.toThrow('Process killed by signal SIGKILL')
  })
})
