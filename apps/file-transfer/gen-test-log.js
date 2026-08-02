/**
 * 테스트용 대용량 로그 파일 생성기 (Node.js 전용)
 * 실행 방법: node gen-test-log.js
 */
const fs = require('fs');
const path = require('path');

const fileName = 'migration_test.log';
const targetSizeMB = 100;
const targetSizeBytes = targetSizeMB * 1024 * 1024;

// 스크립트가 위치한 폴더(__dirname)에 파일 생성
const filePath = path.join(__dirname, fileName);

const extensions = ['.pdf', '.xls', '.xlsx', '.ppt', '.pptx', '.doc', '.docx', '.png', '.jpg'];
const basePaths = [
  '/nfs/nas01/fin_data/',
  '/nfs/nas02/archive/web/',
  '/nfs/user_upload/temp/',
  '/nfs/backup/legacy/'
];
const specialChars = ['*', '?', '"', '<', '>', '|', '#', '%'];

console.log(`🚀 테스트 파일 생성을 시작합니다...`);
console.log(`📍 저장 위치: ${filePath}`);

const writeStream = fs.createWriteStream(filePath);
let currentSize = 0;

writeStream.on('error', (err) => {
  console.error(`\n파일 쓰기 오류: ${err.message}`);
  process.exit(1);
});

writeStream.on('finish', () => {
  console.log(`\n✅ 생성 완료!`);
  console.log(`📏 최종 용량: ${(currentSize / (1024 * 1024)).toFixed(2)} MB`);
});

function randomDate() {
  const year = Math.floor(Math.random() * (2026 - 2020 + 1)) + 2020;
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  const hour = String(Math.floor(Math.random() * 24)).padStart(2, '0');
  const min = String(Math.floor(Math.random() * 60)).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${min}`;
}

function generateLine() {
  const base = basePaths[Math.floor(Math.random() * basePaths.length)];
  const year = Math.floor(Math.random() * (2026 - 2010 + 1)) + 2010;
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  const ext = extensions[Math.floor(Math.random() * extensions.length)];

  let filenameStr = Math.random().toString(36).substring(2, 15);

  // 에러 검증용: 5% 확률로 특수문자 삽입
  if (Math.random() < 0.05) {
    filenameStr += specialChars[Math.floor(Math.random() * specialChars.length)];
  }

  // 에러 검증용: 1% 확률로 비정상적으로 긴 경로 생성
  if (Math.random() < 0.01) {
    filenameStr = 'long_path_violation_' + 'a'.repeat(500);
  }

  const logTime = randomDate();
  const filePath = `${base}${year}/${month}/${day}/${filenameStr}${ext}`;
  return `${logTime} ${filePath}\n`;
}

function write() {
  let ok = true;
  while (currentSize < targetSizeBytes && ok) {
    const line = generateLine();
    const buffer = Buffer.from(line, 'utf-8');
    currentSize += buffer.length;
    ok = writeStream.write(buffer);
  }
  
  if (currentSize < targetSizeBytes) {
    // 버퍼가 찰 경우 잠시 대기했다가 이어서 작성
    writeStream.once('drain', write);
  } else {
    writeStream.end();
  }
}

write();
