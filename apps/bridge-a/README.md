# bridge-a — 폐쇄망 AI 개발 도우미 CLI

폐쇄망 Llama 챗봇을 더 잘 쓰기 위한 CLI 도구.

---

## 이게 왜 필요해?

폐쇄망 Llama는 우리 프로젝트를 모른다. 그냥 질문하면 엉뚱한 답변이 나온다.

`aidd gen`을 쓰면 질문 앞에 이런 내용이 자동으로 붙는다:

- 지금 프로젝트 스택 (Next.js 버전, 의존성 등)
- 폴더/파일 구조
- 팀 코딩 규칙 (Mi-Framework, Next.js 등)

이걸 Llama에 붙여넣으면 우리 프로젝트 기준으로 답변한다.

---

## 기본 사용법

### 1단계: 프로젝트 폴더로 이동

```bash
cd C:\work\my-project
```

### 2단계: 질문 입력

```bash
aidd gen "MyBatis에서 동적 쿼리 짜는 법 알려줘"
```

### 3단계: Llama 챗봇에 붙여넣기 (Ctrl+V)

끝.

---

## 명령어

### `aidd gen` — Llama 프롬프트 생성

현재 폴더의 프로젝트 구조를 읽어 규칙과 함께 프롬프트를 만들어 클립보드에 복사한다.

```bash
# 기본
aidd gen "질문 내용"

# 특정 규칙만 포함 (nextjs.md만 쓰고 싶을 때)
aidd gen "useEffect 언제 써?" -r nextjs

# 특정 파일 내용도 포함 (이 파일 고쳐줘 할 때)
aidd gen "이 컴포넌트 리팩토링해줘" -f src/components/UserTable.tsx

# Llama 컨텍스트가 넘칠 때 글자 수 제한
aidd gen "질문" -m 3000

# 프로젝트 구조 읽기 없이 규칙만
aidd gen "질문" --no-context
```

### `aidd sql` — SQL 복원

Mi-Framework 로그에서 `?`로 표시된 파라미터를 실제 값으로 바꿔준다.

```bash
aidd sql -f C:\logs\app.log
```

```
# 로그
Preparing: SELECT * FROM tb_user WHERE user_id = ? AND status = ?
Parameters: A001(String), Y(String)

# 복원 결과
SELECT * FROM tb_user WHERE user_id = 'A001' AND status = 'Y'
```

### `aidd log` — 로그 컬러 모니터링

로그를 실시간으로 보여주며 ERROR/WARN/INFO 등 레벨별로 색상을 입힌다.
ERROR 발생 시 `troubleshoot.md`에서 해결책을 자동으로 찾아 표시한다.

```bash
aidd log C:\logs\app.log
aidd log C:\logs\app.log -n 200   # 처음에 200줄 출력
```

---

## 설치

### 폐쇄망 Windows (Node.js 없어도 됨)

아래 파일을 통째로 복사해서 가져간다.

```
aidd.exe          ← apps/bridge-a/dist/aidd.exe
config.json
rules/
  nextjs.md
  mi-framework.md
troubleshoot.md
```

`aidd.exe`가 있는 폴더에서 PowerShell/CMD를 열고 실행하거나,
시스템 PATH에 등록하면 어디서든 `aidd` 명령어로 쓸 수 있다.

### 로컬 Mac/Linux (개발용)

```bash
cd apps/bridge-a
npm install
npm run build
npm link            # aidd 명령어 전역 등록
```

```bash
npm unlink -g bridge-a   # 등록 해제
```

---

## 규칙 파일 추가

`rules/` 폴더에 `.md` 파일을 넣으면 `aidd gen`에서 자동으로 인식한다.
팀 컨벤션이나 자주 쓰는 패턴을 정리해서 추가하면 된다.

```bash
aidd gen "" -l   # 현재 등록된 규칙 파일 목록 확인
```

---

## .exe 빌드

```bash
cd apps/bridge-a
npm install
npm run pack:all   # → dist/aidd.exe 생성
```
