import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { loadConfig, resolveFromBase } from '../utils/config';

interface LogOptions {
  lines?: number;
  troubleshoot?: string;
  interval?: number;
}

type ChalkColor = typeof chalk.red;

const LEVEL_STYLES: Array<{ pattern: RegExp; style: ChalkColor }> = [
  { pattern: /\bERROR\b/, style: chalk.red.bold },
  { pattern: /\bWARN(?:ING)?\b/, style: chalk.yellow.bold },
  { pattern: /\bINFO\b/, style: chalk.green },
  { pattern: /\bDEBUG\b/, style: chalk.cyan },
  { pattern: /\bTRACE\b/, style: chalk.gray },
];

// Mi-Framework / Spring Boot 특화 키워드
const MI_STYLES: Array<{ pattern: RegExp; style: ChalkColor }> = [
  { pattern: /\bMiFramework\b/, style: chalk.magenta.bold },
  { pattern: /(?:BEGIN|COMMIT|ROLLBACK)\b/, style: chalk.blue.bold },
  { pattern: /\bDataSource\b/, style: chalk.blue },
  { pattern: /\bPreparing:/, style: chalk.white.bold },
  { pattern: /\bParameters:/, style: chalk.white },
];

export function logCommand(filePath: string, options: LogOptions): void {
  const absPath = path.resolve(filePath);

  if (!fs.existsSync(absPath)) {
    console.error(chalk.red(`로그 파일을 찾을 수 없습니다: ${absPath}`));
    process.exit(1);
  }

  const config = loadConfig();
  const tailLines = options.lines ?? config.log.tailLines;
  const pollMs = options.interval ?? config.log.pollIntervalMs;

  const troubleshootPath = options.troubleshoot
    ? path.resolve(options.troubleshoot)
    : resolveFromBase(config.troubleshootFile);

  let troubleshootContent = '';
  if (fs.existsSync(troubleshootPath)) {
    troubleshootContent = fs.readFileSync(troubleshootPath, 'utf-8');
  }

  // 초기 tail 출력
  const initial = readLastLines(absPath, tailLines);
  initial.forEach(line => printLine(line));

  console.log(chalk.gray(`\n--- ${absPath} 감시 중 (Ctrl+C 종료) ---\n`));

  // 폴링 방식 tail (fs.watch보다 Windows에서 안정적)
  let fileSize = fs.statSync(absPath).size;

  setInterval(() => {
    try {
      const stat = fs.statSync(absPath);
      if (stat.size <= fileSize) return;

      const buf = Buffer.alloc(stat.size - fileSize);
      const fd = fs.openSync(absPath, 'r');
      fs.readSync(fd, buf, 0, buf.length, fileSize);
      fs.closeSync(fd);
      fileSize = stat.size;

      const newLines = buf.toString('utf-8').split(/\r?\n/).filter(l => l.trim());
      newLines.forEach(line => {
        printLine(line);
        if (/\bERROR\b/.test(line) && troubleshootContent) {
          suggestTroubleshoot(line, troubleshootContent);
        }
      });
    } catch {
      // 파일 회전 등으로 일시적 오류 발생 가능 — 무시하고 계속 감시
    }
  }, pollMs);
}

function printLine(line: string): void {
  for (const { pattern, style } of LEVEL_STYLES) {
    if (pattern.test(line)) {
      console.log(style(line));
      return;
    }
  }
  for (const { pattern, style } of MI_STYLES) {
    if (pattern.test(line)) {
      console.log(style(line));
      return;
    }
  }
  console.log(line);
}

function suggestTroubleshoot(errorLine: string, content: string): void {
  // 타임스탬프, 로그레벨 등 노이즈 제거 후 의미 있는 키워드 추출
  const cleaned = errorLine
    .replace(/\d{4}-\d{2}-\d{2}[\s\d:.,-]+/g, '')
    .replace(/\b(ERROR|WARN|INFO|DEBUG|TRACE)\b/g, '');

  const keywords = [...new Set(
    cleaned.split(/[\s\[\]()]+/).filter(w => w.length > 4)
  )];

  const sections = content.split(/^##\s+/m).filter(Boolean);

  for (const section of sections) {
    const lower = section.toLowerCase();
    const matched = keywords.some(kw => lower.includes(kw.toLowerCase()));
    if (matched) {
      const title = section.split('\n')[0].trim();
      const body = section.split('\n').slice(1).filter(l => l.trim()).slice(0, 4).join('\n');
      console.log(chalk.bgYellow.black('\n💡 troubleshoot.md 관련 항목:'));
      console.log(chalk.yellow(`  ## ${title}`));
      console.log(chalk.yellow(body));
      console.log();
      return;
    }
  }
}

function readLastLines(filePath: string, n: number): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  return lines.slice(-n);
}
