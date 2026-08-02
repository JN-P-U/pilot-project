# Role: Senior Tooling Engineer / DX Specialist
# Goal: Build a "Closed-Network AIDD Helper CLI" (Node.js)

나는 현재 외부망과 단절된 폐쇄망 환경의 프로젝트 PL이야. 우리 팀의 생산성을 높이기 위해 내일 반입할 유틸리티 도구를 만들고 싶어. 이 프롬프트를 바탕으로 즉시 실행 가능한 소스 코드와 패키징 스크립트를 작성해줘.

## 1. 환경 및 제약 사항
- 운영 환경: Windows 10/11 (WSL2 및 PowerShell 환경)
- 개발 환경: VS Code (Cursor 사용 불가), 사내 Llama 2 기반 챗봇(성능 낮음)
- 배포 방식: Node.js 기반 단일 실행 파일(.exe)로 반입 (의존성 설치 불가 환경)
- 타겟 스택: Java(Spring Boot 기반 Mi-Framework), Next.js (App Router, OSMU 구조)

## 2. 주요 기능 (CLI 명령어 구성)

### 기능 A: 프롬프트 인젝터 (`aidd gen`)
- 특정 폴더(`rules/`) 내의 마크다운 가이드라인을 읽어 사용자의 질문과 합쳐주는 기능
- 실행 예: `aidd gen "사용자 질문"` -> (rules/nextjs.md + 질문)을 조합하여 클립보드에 복사
- Llama 2의 컨텍스트 제한을 고려해 핵심 규칙만 필터링하는 옵션 포함

### 기능 B: Mi-Framework SQL 복원기 (`aidd sql`)
- Mi-Framework 로그 파일에서 `?`로 표시된 Prepared Statement와 하단의 파라미터 값(Parameters: [val1, val2...])을 매핑
- 실제 실행 가능한 형태의 SQL 쿼리로 복원하여 출력 및 클립보드 복사

### 기능 C: 로그 컬러 테일러 (`aidd log`)
- `tail -f` 처럼 로그를 읽되, 특정 키워드(ERROR, WARN, MiFramework-Specific-Log)에 색상을 입혀 가독성 증대
- 에러 발생 시 미리 정의된 `troubleshoot.md`에서 해결책이 있는지 자동 검색하여 제안

## 3. 기술적 요구사항 (Implementation)
- Language: TypeScript/JavaScript (Node.js)
- Bundling: `vercel/ncc` 또는 `pkg`를 사용하여 `node_modules` 없이 실행되는 단일 `.exe` 생성
- UI: `commander` 또는 `yargs`를 사용한 깔끔한 CLI 인터페이스
- External Config: 실행 파일과 같은 경로의 `config.json` 및 `rules/` 폴더를 참조하도록 설계

## 4. 최종 출력물
1. `index.ts` (모든 로직이 포함된 메인 코드)
2. `package.json` (필요한 라이브러리 및 빌드 스크립트 포함)
3. `rules/example.md` (Next.js 및 Mi-Framework 규칙 예시 파일)
4. 단일 실행 파일로 빌드하기 위한 가이드 (CLI 명령어 포함)