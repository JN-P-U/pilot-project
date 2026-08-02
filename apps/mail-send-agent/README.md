# mail-send-agent

프로젝트 폴더를 ZIP으로 압축해 Gmail로 전송하는 브라우저 단독 실행 툴.

## 실행 방법

**Mac / Linux**
```bash
./start.sh
```

**Windows**
```bat
start.bat
```

브라우저에서 아래 주소로 접속:

```
http://localhost:3000/mail-send-agent.html
```

> **주의:** 반드시 `http://localhost:3000`으로 접속해야 Google OAuth 인증이 정상 동작합니다.  
> 파일을 직접 열거나(`file://`) 다른 포트를 사용하면 인증이 차단됩니다.

## Google OAuth 설정 (최초 1회)

1. [Google Cloud Console](https://console.cloud.google.com) 에서 프로젝트 생성
2. **APIs & Services → 라이브러리** → Gmail API 활성화
3. **APIs & Services → 사용자 인증 정보** → OAuth 2.0 클라이언트 ID 생성 (웹 애플리케이션)
   - 승인된 JavaScript 원본: `http://localhost:3000`
   - 승인된 리디렉션 URI: (비워두기)
4. **APIs & Services → OAuth 인증 센터 → 데이터 액세스** → 테스트 사용자에 본인 Gmail 추가
5. 발급된 클라이언트 ID를 앱 화면의 입력란에 붙여넣고 **Gmail 인증** 클릭

## 기술 스택

- Gmail API (Google Identity Services — Token Client)
- JSZip (CDN)
- 순수 HTML/CSS/JavaScript
