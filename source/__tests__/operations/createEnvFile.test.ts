import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../operations/exec.js', () => ({
  exec: vi.fn().mockResolvedValue(''),
  execFile: vi.fn().mockResolvedValue(''),
}))

const { exec } = await import('../../operations/exec.js')
const { createEnvFile } = await import('../../operations/createEnvFile.js')

describe('createEnvFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('copies .env.example to .env.local', async () => {
    await createEnvFile('/project/my_app')

    expect(exec).toHaveBeenCalledWith('cp .env.example .env.local', { cwd: '/project/my_app' })
  })

  it('uses the provided project folder as cwd', async () => {
    await createEnvFile('/other/path')

    expect(exec).toHaveBeenCalledWith(expect.any(String), { cwd: '/other/path' })
  })
})
