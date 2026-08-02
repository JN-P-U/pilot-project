import fs from 'fs';
import chalk from 'chalk';
import { copyToClipboard } from '../utils/clipboard';

interface SqlOptions {
  file?: string;
  raw?: boolean;
}

interface RestoredQuery {
  sql: string;
  template: string; // ? 그대로인 원본 (중복 감지용)
  lineNo: number;
}

interface AnalysisResult {
  queries: RestoredQuery[];
  n1Suspects: Array<{ template: string; count: number; sample: string }>;
  fullScanSuspects: string[];
  selectStarList: string[];
  slowQueries: Array<{ sql: string; ms: number }>;
}

export function sqlCommand(options: SqlOptions): void {
  let input: string;

  if (options.file) {
    if (!fs.existsSync(options.file)) {
      console.error(chalk.red(`파일을 찾을 수 없습니다: ${options.file}`));
      process.exit(1);
    }
    input = fs.readFileSync(options.file, 'utf-8');
  } else if (!process.stdin.isTTY) {
    input = fs.readFileSync(0, 'utf-8');
  } else {
    console.error(chalk.red('로그 파일 경로를 지정하거나 stdin으로 입력하세요.'));
    console.error(chalk.gray('예: aidd sql -f app.log'));
    process.exit(1);
  }

  const queries = extractQueries(input);

  if (queries.length === 0) {
    console.log(chalk.yellow('Preparing/Parameters 패턴을 찾지 못했습니다.'));
    return;
  }

  const result = analyze(queries, input);
  printReport(result, options.raw ?? false);

  try {
    copyToClipboard(buildClipboardText(result));
    console.log(chalk.green('\n✓ 분석 결과가 클립보드에 복사되었습니다.'));
  } catch {
    /* 클립보드 실패 무시 */
  }
}

// ── 쿼리 추출 ────────────────────────────────────────────

function extractQueries(log: string): RestoredQuery[] {
  const lines = log.split(/\r?\n/);
  const results: RestoredQuery[] = [];

  for (let i = 0; i < lines.length; i++) {
    const prepMatch = lines[i].match(/Preparing:\s*(.+)/);
    if (!prepMatch) continue;

    const template = prepMatch[1].trim();
    let paramsStr = '';

    for (let j = i + 1; j < Math.min(i + 11, lines.length); j++) {
      const paramMatch = lines[j].match(/Parameters:\s*(.*)/);
      if (paramMatch) { paramsStr = paramMatch[1].trim(); break; }
    }

    results.push({
      sql: replacePlaceholders(template, paramsStr),
      template,
      lineNo: i + 1,
    });
  }

  return results;
}

// ── 분석 ─────────────────────────────────────────────────

function analyze(queries: RestoredQuery[], rawLog: string): AnalysisResult {
  // N+1 감지: 같은 템플릿이 3회 이상 반복
  const templateCount = new Map<string, number>();
  for (const q of queries) {
    const key = normalizeTemplate(q.template);
    templateCount.set(key, (templateCount.get(key) ?? 0) + 1);
  }
  const n1Suspects = [...templateCount.entries()]
    .filter(([, cnt]) => cnt >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([template, count]) => ({
      template,
      count,
      sample: queries.find(q => normalizeTemplate(q.template) === template)!.sql,
    }));

  // SELECT * 감지
  const selectStarSet = new Set<string>();
  for (const q of queries) {
    if (/SELECT\s+\*/i.test(q.sql)) selectStarSet.add(q.sql.slice(0, 120));
  }

  // WHERE 절 없는 쿼리 (풀스캔 의심)
  const fullScanSet = new Set<string>();
  for (const q of queries) {
    if (/^\s*SELECT\b/i.test(q.sql) && !/\bWHERE\b/i.test(q.sql) && !/\bLIMIT\b/i.test(q.sql)) {
      fullScanSet.add(q.sql.slice(0, 120));
    }
  }

  // 느린 쿼리 감지 (로그에 ms 정보 있을 경우)
  const slowQueries: Array<{ sql: string; ms: number }> = [];
  const timeRegex = /(\d+)\s*ms/i;
  const lines = rawLog.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const prepMatch = lines[i].match(/Preparing:\s*(.+)/);
    if (!prepMatch) continue;
    // 전후 5줄에서 ms 탐색
    for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 8); j++) {
      const msMatch = lines[j].match(timeRegex);
      if (msMatch) {
        const ms = parseInt(msMatch[1], 10);
        if (ms >= 500) {
          const q = queries.find(q => q.lineNo === i + 1);
          if (q) slowQueries.push({ sql: q.sql.slice(0, 120), ms });
        }
        break;
      }
    }
  }

  return {
    queries,
    n1Suspects,
    fullScanSuspects: [...fullScanSet],
    selectStarList: [...selectStarSet],
    slowQueries,
  };
}

function normalizeTemplate(t: string): string {
  // 값 차이 무시하고 구조만 비교 (공백 정규화)
  return t.replace(/\s+/g, ' ').trim().toUpperCase();
}

// ── 출력 ─────────────────────────────────────────────────

function printReport(r: AnalysisResult, raw: boolean): void {
  const unique = new Set(r.queries.map(q => normalizeTemplate(q.template))).size;

  console.log(chalk.bold('\n=== SQL 분석 결과 ===\n'));
  console.log(`총 실행 쿼리: ${chalk.white.bold(r.queries.length)}개   고유 쿼리: ${chalk.white.bold(unique)}개`);

  // N+1
  if (r.n1Suspects.length > 0) {
    console.log(chalk.red.bold(`\n⚠️  N+1 의심 (${r.n1Suspects.length}건)`));
    for (const s of r.n1Suspects) {
      console.log(chalk.red(`  ${s.count}회 반복 → ${s.sample.slice(0, 100)}`));
      console.log(chalk.gray('  └ 루프 내 반복 호출 가능성. JOIN 또는 IN 절로 개선을 권장합니다.\n'));
    }
  }

  // 풀스캔
  if (r.fullScanSuspects.length > 0) {
    console.log(chalk.yellow.bold(`⚠️  풀스캔 의심 — WHERE 절 없음 (${r.fullScanSuspects.length}건)`));
    for (const s of r.fullScanSuspects) {
      console.log(chalk.yellow(`  ${s}`));
    }
    console.log();
  }

  // SELECT *
  if (r.selectStarList.length > 0) {
    console.log(chalk.yellow.bold(`⚠️  SELECT * 사용 (${r.selectStarList.length}건)`));
    for (const s of r.selectStarList) {
      console.log(chalk.yellow(`  ${s}`));
    }
    console.log();
  }

  // 느린 쿼리
  if (r.slowQueries.length > 0) {
    console.log(chalk.red.bold(`⚠️  느린 쿼리 500ms 이상 (${r.slowQueries.length}건)`));
    for (const s of r.slowQueries) {
      console.log(chalk.red(`  ${s.ms}ms → ${s.sql}`));
    }
    console.log();
  }

  if (r.n1Suspects.length === 0 && r.fullScanSuspects.length === 0 &&
      r.selectStarList.length === 0 && r.slowQueries.length === 0) {
    console.log(chalk.green('\n✅ 특이사항 없음'));
  }

  // 복원된 SQL 목록
  if (!raw) {
    console.log(chalk.gray(`\n--- 복원된 SQL (${r.queries.length}개) ---`));
    r.queries.forEach((q, i) => {
      console.log(chalk.gray(`[${i + 1}] line ${q.lineNo}`));
      console.log(chalk.white(q.sql));
    });
  }
}

function buildClipboardText(r: AnalysisResult): string {
  const lines: string[] = ['=== SQL 분석 결과 ===', ''];
  const unique = new Set(r.queries.map(q => normalizeTemplate(q.template))).size;
  lines.push(`총 실행: ${r.queries.length}개 / 고유: ${unique}개`, '');

  if (r.n1Suspects.length > 0) {
    lines.push(`[N+1 의심 - ${r.n1Suspects.length}건]`);
    r.n1Suspects.forEach(s => lines.push(`  ${s.count}회: ${s.sample}`));
    lines.push('');
  }
  if (r.fullScanSuspects.length > 0) {
    lines.push(`[풀스캔 의심 - ${r.fullScanSuspects.length}건]`);
    r.fullScanSuspects.forEach(s => lines.push(`  ${s}`));
    lines.push('');
  }
  if (r.selectStarList.length > 0) {
    lines.push(`[SELECT * - ${r.selectStarList.length}건]`);
    r.selectStarList.forEach(s => lines.push(`  ${s}`));
    lines.push('');
  }
  if (r.slowQueries.length > 0) {
    lines.push(`[느린 쿼리 500ms+ - ${r.slowQueries.length}건]`);
    r.slowQueries.forEach(s => lines.push(`  ${s.ms}ms: ${s.sql}`));
    lines.push('');
  }
  lines.push('[복원된 SQL]');
  r.queries.forEach((q, i) => lines.push(`[${i + 1}] ${q.sql}`));

  return lines.join('\n');
}

// ── SQL 복원 유틸 ─────────────────────────────────────────

interface Param { value: string; type: string; }
const NUMERIC_TYPES = new Set(['Integer','Long','Double','Float','BigDecimal','Short','Byte','int','long','double','float']);

function replacePlaceholders(sql: string, paramsStr: string): string {
  if (!paramsStr) return sql;
  const params = parseParams(paramsStr);
  let idx = 0;
  return sql.replace(/\?/g, () => idx < params.length ? formatValue(params[idx++]) : '?');
}

function parseParams(s: string): Param[] {
  const result: Param[] = [];
  const re = /(.+?)\(([A-Za-z]+)\)(?:,\s*|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) result.push({ value: m[1].trim(), type: m[2] });
  if (result.length === 0) return s.split(',').map(p => ({ value: p.trim(), type: '' }));
  return result;
}

function formatValue(p: Param): string {
  if (p.value === 'null') return 'NULL';
  if (p.type ? NUMERIC_TYPES.has(p.type) : /^-?\d+(\.\d+)?$/.test(p.value)) return p.value;
  return `'${p.value.replace(/'/g, "''")}'`;
}
