import fs from 'fs';
import path from 'path';

export interface Config {
  rulesDir: string;
  troubleshootFile: string;
  log: {
    tailLines: number;
    pollIntervalMs: number;
  };
}

const DEFAULTS: Config = {
  rulesDir: './rules',
  troubleshootFile: './troubleshoot.md',
  log: {
    tailLines: 50,
    pollIntervalMs: 500,
  },
};

// pkg 번들 실행 시 process.pkg가 설정됨.
// 그 외에는 config.json 또는 rules/ 폴더가 있는 디렉터리를 우선 탐색하고 cwd로 폴백.
export function getBaseDir(): string {
  if ((process as NodeJS.Process & { pkg?: unknown }).pkg !== undefined) {
    return path.dirname(process.execPath);
  }

  // npm link 등 심볼릭 링크 경유 시 실제 파일 경로로 해석
  const resolved = (() => {
    try { return fs.realpathSync(path.resolve(process.argv[1])); } catch { return path.resolve(process.argv[1]); }
  })();
  // 실제 경로에서 최대 4단계 위까지 올라가며 config.json 또는 rules/ 탐색
  let dir = path.dirname(resolved);
  for (let i = 0; i < 4; i++) {
    if (
      fs.existsSync(path.join(dir, 'config.json')) ||
      fs.existsSync(path.join(dir, 'rules'))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return process.cwd();
}

export function loadConfig(): Config {
  const configPath = path.join(getBaseDir(), 'config.json');
  if (!fs.existsSync(configPath)) return DEFAULTS;
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<Config>;
    return {
      ...DEFAULTS,
      ...parsed,
      log: { ...DEFAULTS.log, ...parsed.log },
    };
  } catch {
    return DEFAULTS;
  }
}

export function resolveFromBase(relativePath: string): string {
  return path.resolve(getBaseDir(), relativePath);
}
