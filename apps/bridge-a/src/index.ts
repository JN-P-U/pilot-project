#!/usr/bin/env node
import { Command } from 'commander';
import { genCommand } from './commands/gen';
import { sqlCommand } from './commands/sql';
import { logCommand } from './commands/log';

const program = new Command();

program
  .name('aidd')
  .description('폐쇄망 AI 개발 도우미 CLI')
  .version('1.0.0');

program
  .command('gen <question>')
  .description('규칙 파일과 질문을 조합하여 클립보드에 복사')
  .option('-r, --rule <name>', '특정 규칙 파일만 사용 (파일명 일부 검색)')
  .option('-m, --max-chars <number>', 'Llama 컨텍스트 제한용 최대 글자 수', parseInt)
  .option('-l, --list', '사용 가능한 규칙 파일 목록 출력')
  .option('--no-context', '프로젝트 컨텍스트 수집 생략')
  .option('-f, --file <path...>', '질문에 포함할 파일 지정 (여러 개 가능)')
  .action((question: string, options) => genCommand(question, options));

program
  .command('sql')
  .description('Mi-Framework 로그에서 ? 파라미터 치환 후 SQL 복원')
  .option('-f, --file <path>', '로그 파일 경로 (미지정 시 stdin)')
  .option('--raw', '색상 없이 텍스트만 출력')
  .action((options) => sqlCommand(options));

program
  .command('log <file>')
  .description('로그 파일 컬러 모니터링 (tail -f 유사)')
  .option('-n, --lines <number>', '시작 시 출력할 마지막 줄 수 (기본: 50)', parseInt)
  .option('-t, --troubleshoot <path>', 'troubleshoot.md 파일 경로')
  .option('-i, --interval <ms>', '폴링 간격 밀리초 (기본: 500)', parseInt)
  .action((file: string, options) => logCommand(file, options));

program.parse(process.argv);
