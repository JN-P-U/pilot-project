import { spawnSync } from 'child_process';

export function copyToClipboard(text: string): void {
  if (process.platform === 'win32') {
    // clip.exe는 UTF-16 LE + BOM 필요 (한글 깨짐 방지)
    const buf = Buffer.concat([
      Buffer.from('﻿', 'utf16le'),
      Buffer.from(text, 'utf16le'),
    ]);
    const result = spawnSync('clip', [], { input: buf });
    if (result.error) throw new Error(`클립보드 복사 실패: ${result.error.message}`);
  } else if (process.platform === 'darwin') {
    const result = spawnSync('pbcopy', [], { input: text, encoding: 'utf8' });
    if (result.error) throw new Error(`클립보드 복사 실패: ${result.error.message}`);
  } else {
    const xclip = spawnSync('xclip', ['-selection', 'clipboard'], { input: text, encoding: 'utf8' });
    if (xclip.error) {
      const xsel = spawnSync('xsel', ['--clipboard', '--input'], { input: text, encoding: 'utf8' });
      if (xsel.error) throw new Error('xclip 또는 xsel이 필요합니다.');
    }
  }
}
