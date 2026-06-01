import { beforeEach, describe, expect, it, vi } from 'vitest'

const { beginInstall, completeInstall, removeActiveProject } = await import(
  '../../operations/installGuard.js'
)

describe('installGuard', () => {
  // Clear any active state left over from a previous test (module-level singleton).
  beforeEach(() => {
    completeInstall()
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
})
