import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export interface Config {
  auto_commit: boolean
  embedding: string
}

const DEFAULT: Config = { auto_commit: true, embedding: '' }

function configPath(): string {
  return path.join(os.homedir(), '.pk', 'config.json')
}

export function loadConfig(): Config {
  const p = configPath()
  if (!existsSync(p)) return { ...DEFAULT }
  try {
    return { ...DEFAULT, ...JSON.parse(readFileSync(p, 'utf8')) } as Config
  } catch {
    return { ...DEFAULT }
  }
}

export function saveConfig(config: Config): void {
  const p = configPath()
  mkdirSync(path.dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(config, null, 2) + '\n')
}
