import { ExecSyncOptions } from 'child_process'

export const repoUrl = 'https://github.com/BootNodeDev/dAppBooster.git'
export const homeFolder = '/src/components/pageComponents/home'

export const defaultExecOptions: ExecSyncOptions = {
  stdio: 'pipe',
  shell: 'true',
}

export const fileExecOptions = {
  recursive: true,
  force: true,
}

export const installPackageExecOptions: ExecSyncOptions = {
  stdio: 'inherit',
  shell: 'true',
}
