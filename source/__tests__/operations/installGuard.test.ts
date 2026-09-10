import process from 'node:process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:fs', () => ({ rmSync: vi.fn() }))

const { rmSync } = await import('node:fs')
const { abortInstall, beginInstall, completeInstall, removeActiveProject } = await import(
  '../../operations/installGuard.js'
)

describe('installGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    completeInstall()
  })

  afterEach(() => {
    process.exitCode = undefined
  })

  it('removes the active project folder when an install is in progress', () => {
    const rm = vi.fn()
    beginInstall('/tmp/proj')

    removeActiveProject(rm)

    expect(rm).toHaveBeenCalledWith('/tmp/proj', { recursive: true, force: true })
  })

  it('does nothing when no install is active', () => {
    const rm = vi.fn()

    removeActiveProject(rm)

    expect(rm).not.toHaveBeenCalled()
  })

  it('does not remove after completeInstall — a finished project is safe', () => {
    const rm = vi.fn()
    beginInstall('/tmp/proj')
    completeInstall()

    removeActiveProject(rm)

    expect(rm).not.toHaveBeenCalled()
  })

  it('removes only once, then clears the active folder', () => {
    const rm = vi.fn()
    beginInstall('/tmp/proj')

    removeActiveProject(rm)
    removeActiveProject(rm)

    expect(rm).toHaveBeenCalledTimes(1)
  })

  it('tracks the most recent project folder', () => {
    const rm = vi.fn()
    beginInstall('/tmp/a')
    beginInstall('/tmp/b')

    removeActiveProject(rm)

    expect(rm).toHaveBeenCalledWith('/tmp/b', { recursive: true, force: true })
  })

  describe('abortInstall', () => {
    it('removes the partial project and reports failure to the shell', () => {
      beginInstall('/tmp/proj')

      abortInstall()

      expect(rmSync).toHaveBeenCalledWith('/tmp/proj', { recursive: true, force: true })
      expect(process.exitCode).toBe(1)
    })

    it('still reports failure once the scaffold is complete', () => {
      beginInstall('/tmp/proj')
      completeInstall()

      abortInstall()

      expect(rmSync).not.toHaveBeenCalled()
      expect(process.exitCode).toBe(1)
    })
  })
})
