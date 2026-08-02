# file-transfer

브라우저에서 단독 실행되는 **대용량 로그 기반 파일 이행 매핑 툴**입니다.

## 실행

별도 서버나 설치 없이 `apps/file-transfer/file-transfer.html`을 브라우저에서 열면 됩니다.

Tailwind CSS는 CDN 방식으로 불러옵니다. 파일 처리 로직은 `index.html` 내부 `<script>`에 포함되어 있으며 외부 JavaScript 라이브러리 없이 Vanilla JS만 사용합니다.

## 핵심 기능

- Drag & Drop 파일 업로드
- `File.slice()` 기반 10MB 청크 처리
- `TextDecoder` 스트리밍 디코딩
- NFS 원본 경로 접두사 → Object Storage To-Be 경로 접두사 매핑
- DELL Object Storage 경로 제약 조건 검증
- 선택 Regex 기반 추가 매핑/치환
- 포함/제외 Regex 제약 조건
- 지정한 행 수(Line Count) 기준 로그 스플리팅
- 정상 매핑 데이터와 불가 목록 분리
- 최대 처리 용량, 최대 처리 행 수, 빈 행 제외 설정
- 진행률, 읽은 용량, 처리 행 수, 정상/불가 건수, 출력 용량, 출력 파일 수 표시
- 정상 매핑/불가 목록 미리보기
- Mapping Report CSV 다운로드
- Error List TXT 다운로드
- 정상 매핑 TXT/LOG 다운로드

## 메모리 관리 구조

- 전체 파일을 `readAsText()`로 읽지 않습니다.
- 입력 파일은 `10MB` 단위로 `file.slice(start, end)` 처리합니다.
- 각 청크는 `arrayBuffer()`로 읽은 뒤 `TextDecoder.decode(..., { stream: true })`로 디코딩합니다.
- 줄 경계가 청크 사이에서 끊길 수 있으므로 `\n` 기준으로 분리하고 마지막 미완성 줄만 `tail` 변수에 보관합니다.
- 처리가 끝난 청크의 `Blob`, `ArrayBuffer`, 문자열, 라인 배열 참조는 즉시 `null` 처리합니다.
- 출력은 라인별 `Array.push()`로 누적하지 않고, 일정 크기의 텍스트 버퍼를 `Blob`에 이어 붙이는 방식으로 만듭니다.
- 생성된 결과 `Blob`은 다운로드 전까지 메모리에 남으며, 다운로드 완료 후 즉시 참조를 해제합니다. 재다운로드가 필요하면 처리를 다시 실행하세요.

## 로그 스플리팅

로그 파일의 각 행은 NFS 파일 경로라고 가정합니다.

`분할 행 수(Line Count)`에 숫자를 입력하면 정상 매핑 파일을 해당 행 수 기준으로 나눕니다. Mapping Report CSV와 Error List TXT는 분할되지 않습니다.

예시:

- 입력 파일: `nfs-path.log`
- 분할 행 수: `100000`
- 출력 파일: `nfs-path.mapped.part0001.log`, `nfs-path.mapped.part0002.log`, ...

분할 행 수를 비우면 단일 결과 파일로 생성됩니다.

- 출력 파일: `nfs-path.mapped.log`

브라우저 정책에 따라 여러 파일 다운로드 시 허용 여부를 묻는 안내가 표시될 수 있습니다.

## 매핑 규칙

로그 파일의 각 행은 NFS 파일 경로라고 가정합니다.

`원본 경로 접두사(NFS)`와 `To-Be 경로 접두사(Object Storage)`를 함께 입력하면 각 행의 접두사를 치환합니다.

예시:

- 원본 경로 접두사: `/nfs/old/`
- To-Be 경로 접두사: `my-bucket/new/`

결과:

```txt
before: /nfs/old/2026/05/file.pdf
after : my-bucket/new/2026/05/file.pdf
```

추가 Regex 패턴과 추가 치환식을 입력하면 접두사 매핑 이후 각 행에 대해 `line.replace(regex, replacement)`를 수행합니다.

예시:

- Regex 패턴: `userId=(\d+)`
- 치환식: `memberId=$1`

결과:

```txt
before: 2026-05-05 userId=123 login
after : 2026-05-05 memberId=123 login
```

## DELL Object Storage 검증

매핑된 To-Be 경로는 아래 조건으로 검증합니다.

- 경로 비어 있음 여부
- 금지 특수문자 포함 여부: `\`, `*`, `?`, `"`, `<`, `>`, `|`, `#`, `%`
- 전체 경로 길이 1,024자 초과 여부
- 공백 또는 제어 문자 포함 여부

처리된 모든 행은 Mapping Report CSV에 기록됩니다 (Status: `Success` / `Fail`, 실패 시 사유 포함).

검증을 통과한 행은 정상 매핑 파일(`.mapped.log`)로 출력합니다.

검증에 실패한 행은 Error List TXT에 원본 경로만 한 줄씩 별도로 기록합니다.

CSV 컬럼:

- `Original_NFS_Path`
- `Target_Object_Storage_Key`
- `Status`
- `Error_Reason`

불가 목록은 Error List TXT로 별도 생성하며, 이관 불가능한 원본 파일 경로만 한 줄씩 기록합니다.

예시:

- 정상 파일: `migration_test.mapped.part0001.log`
- Mapping Report: `migration_test.mapping-report.csv`
- Error List: `migration_test.error-list.txt`

## 제약 조건

- 청크 크기: 10MB 고정
- 최대 처리 용량(MB): 비우면 전체 파일 처리
- 최대 처리 행 수: 비우면 제한 없음
- 분할 행 수(Line Count): 비우면 단일 파일, 입력하면 해당 행 수마다 파일 분할
- 빈 행 제외: 체크 시 빈 행은 출력하지 않음
- 포함 Regex: 매칭되는 행만 처리
- 제외 Regex: 매칭되는 행은 출력하지 않음

## 파일 구성

- `file-transfer.html`: UI와 스트리밍 처리/매핑/검증/CSV/TXT 다운로드 로직이 모두 포함된 단독 실행 파일
- `file-transfer.js`: 이전 분리형 구현 파일이며 현재 `index.html`에서는 참조하지 않습니다.
- `gen-test-log.js`: 로컬 테스트용 100MB 로그 파일 생성기

## 테스트 로그 생성

`gen-test-log.js`는 Node.js에서 실행하며, 실행한 디렉터리에 `migration_test.log` 파일을 생성합니다.

```bash
node gen-test-log.js
```

생성 내용:

- 파일 크기: 약 100MB
- 포함 경로 예시: `/nfs/nas01/fin_data/2024/03/15/abc123.pdf`
- 약 5%: 금지 특수문자(`*`, `?` 등) 포함 — 검증 실패 케이스
- 약 1%: 경로 길이 1,024자 초과 — 검증 실패 케이스
