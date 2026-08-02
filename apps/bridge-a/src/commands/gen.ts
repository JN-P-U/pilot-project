import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { loadConfig, resolveFromBase } from '../utils/config';
import { copyToClipboard } from '../utils/clipboard';

interface GenOptions {
  maxChars?: number;
  rule?: string;
  list?: boolean;
  noContext?: boolean;
  file?: string[];
}

// 확장자별 우선순위: 높을수록 먼저 포함
const ENTRY_PATTERNS: Array<{ match: (rel: string) => boolean; priority: number }> = [
  // 설정/메타
  { match: r => r === 'package.json',                          priority: 100 },
  { match: r => r === 'tsconfig.json',                         priority: 90 },
  // Next.js 핵심
  { match: r => /^app\/layout\.[tj]sx?$/.test(r),             priority: 85 },
  { match: r => /^app\/page\.[tj]sx?$/.test(r),               priority: 84 },
  { match: r => /^app\/.*\/page\.[tj]sx?$/.test(r),           priority: 80 },
  // 타입 정의
  { match: r => /types?\/index\.[tj]s$/.test(r),              priority: 75 },
  { match: r => /types?\.[tj]s$/.test(r),                     priority: 74 },
  // 공통 컴포넌트/훅
  { match: r => /components?\/.+\.[tj]sx?$/.test(r),          priority: 60 },
  { match: r => /hooks?\/.+\.[tj]sx?$/.test(r),               priority: 55 },
  // lib/util/service
  { match: r => /(?:lib|util|service|api)\/.+\.[tj]sx?$/.test(r), priority: 50 },
  // 일반 소스 파일
  { match: r => /\.[tj]sx?$/.test(r),                         priority: 20 },
];

const IGNORE_DIRS = new Set([
  'node_modules', 'dist', '.git', '.next', 'out', 'build',
  'coverage', '.turbo', 'public', '.cursor', 'prompts',
]);

const FILE_CHAR_LIMIT = 1500;  // 파일 1개당 최대 포함 글자 수
const TOTAL_FILE_CHAR_LIMIT = 6000; // 파일 전체 합산 최대 글자 수

function getPriority(relPath: string): number {
  const normalized = relPath.replace(/\\/g, '/');
  for (const { match, priority } of ENTRY_PATTERNS) {
    if (match(normalized)) return priority;
  }
  return 0;
}

// 프로젝트에서 읽을 파일 목록 수집 (우선순위 정렬)
function collectSourceFiles(cwd: string): string[] {
  const files: Array<{ rel: string; priority: number }> = [];

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const abs = path.join(dir, entry.name);
      const rel = path.relative(cwd, abs);

      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) walk(abs);
      } else {
        const priority = getPriority(rel);
        if (priority > 0) files.push({ rel, priority });
      }
    }
  }

  walk(cwd);
  return files
    .sort((a, b) => b.priority - a.priority)
    .map(f => f.rel);
}

function collectProjectContext(cwd: string, extraFiles: string[]): { content: string; included: string[] } {
  const parts: string[] = [];
  const included: string[] = [];

  // package.json에서 스택 정보 추출
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const stack = Object.keys(deps)
        .filter(k => ['next', 'react', 'typescript', 'spring-boot', 'vue', 'express', 'tailwind'].some(f => k.includes(f)))
        .map(k => `${k}@${deps[k]}`);
      parts.push(`[프로젝트 정보]`);
      if (pkg.name) parts.push(`name: ${pkg.name}`);
      if (stack.length) parts.push(`주요 스택: ${stack.join(', ')}`);
    } catch { /* 무시 */ }
  }

  // 핵심 파일 내용 수집
  const fileParts: string[] = [];
  let totalChars = 0;

  const candidates = collectSourceFiles(cwd);

  // -f 로 지정한 파일을 최우선으로
  const manualFiles = (extraFiles ?? []).map(f => path.resolve(cwd, f));
  const orderedFiles = [
    ...manualFiles.map(abs => path.relative(cwd, abs)),
    ...candidates.filter(rel => !manualFiles.includes(path.resolve(cwd, rel))),
  ];

  for (const rel of orderedFiles) {
    if (totalChars >= TOTAL_FILE_CHAR_LIMIT) break;

    const abs = path.resolve(cwd, rel);
    if (!fs.existsSync(abs)) {
      console.error(chalk.yellow(`파일을 찾을 수 없어 건너뜁니다: ${rel}`));
      continue;
    }

    let content = fs.readFileSync(abs, 'utf-8').trim();
    let truncated = false;
    if (content.length > FILE_CHAR_LIMIT) {
      content = content.slice(0, FILE_CHAR_LIMIT);
      truncated = true;
    }

    fileParts.push(`### ${rel}${truncated ? ' (일부)' : ''}\n\`\`\`\n${content}\n\`\`\``);
    included.push(rel);
    totalChars += content.length;
  }

  if (fileParts.length > 0) {
    parts.push(`\n[주요 파일 내용]\n${fileParts.join('\n\n')}`);
  }

  return { content: parts.join('\n'), included };
}

export function genCommand(question: string, options: GenOptions): void {
  const config = loadConfig();
  const rulesDir = resolveFromBase(config.rulesDir);
  const cwd = process.cwd();

  if (!fs.existsSync(rulesDir)) {
    console.error(chalk.red(`rules/ 폴더를 찾을 수 없습니다: ${rulesDir}`));
    console.error(chalk.gray('실행 파일과 같은 경로에 rules/ 폴더를 만들어 주세요.'));
    process.exit(1);
  }

  let mdFiles = fs.readdirSync(rulesDir).filter(f => f.endsWith('.md'));

  if (options.list) {
    console.log(chalk.cyan('사용 가능한 규칙 파일:'));
    mdFiles.forEach(f => console.log(`  ${chalk.green(f)}`));
    return;
  }

  if (options.rule) {
    mdFiles = mdFiles.filter(f => f.toLowerCase().includes(options.rule!.toLowerCase()));
    if (mdFiles.length === 0) {
      console.error(chalk.red(`'${options.rule}'에 해당하는 규칙 파일이 없습니다.`));
      process.exit(1);
    }
  }

  if (mdFiles.length === 0) {
    console.error(chalk.yellow('rules/ 폴더에 .md 파일이 없습니다.'));
    process.exit(1);
  }

  // 규칙 파일 조합
  let rulesContent = '';
  for (const file of mdFiles) {
    const content = fs.readFileSync(path.join(rulesDir, file), 'utf-8');
    rulesContent += `\n### [${file}]\n${content.trim()}\n`;
  }

  // 프로젝트 컨텍스트 수집
  const sections: string[] = [];
  sections.push(`[코딩 규칙 및 가이드라인]\n${rulesContent.trim()}`);

  if (!options.noContext) {
    const { content: contextContent, included } = collectProjectContext(cwd, options.file ?? []);
    if (contextContent) {
      sections.push(`[현재 프로젝트 컨텍스트]\n${contextContent.trim()}`);
      console.log(chalk.gray(`  읽은 파일 (${included.length}개): ${included.join(', ')}`));
    }
  }

  sections.push(`[질문]\n${question}`);

  let prompt = sections.join('\n\n');

  if (options.maxChars && prompt.length > options.maxChars) {
    prompt = prompt.slice(0, options.maxChars) + '\n\n...(컨텍스트 제한으로 생략됨)';
    console.log(chalk.yellow(`전체 내용이 ${options.maxChars}자로 잘렸습니다.`));
  }

  copyToClipboard(prompt);

  console.log(chalk.green('✓ 클립보드에 복사되었습니다.'));
  console.log(chalk.gray(`  적용된 규칙: ${mdFiles.join(', ')}`));
  console.log(chalk.gray(`  전체 길이: ${prompt.length}자`));
  console.log(chalk.gray('\n--- 미리보기 ---'));
  console.log(prompt.slice(0, 500) + (prompt.length > 500 ? chalk.gray('\n...') : ''));
}
