# UI 테스트 결과 증빙 자동화 도구 (UI Test Evidence Generator)

이 프로젝트는 웹 브라우저 화면을 캡처하고, 이를 기반으로 **단위 테스트 결과 증빙용 엑셀(XLSX) 파일을 클라이언트 사이드에서 직접 생성**하는 도구입니다. 

기존처럼 무거운 엑셀 라이브러리(`exceljs`, `xlsx` 등)나 서버 사이드 렌더링에 의존하지 않고, **순수 브라우저 네이티브 API만으로 동작(Zero-Dependency)**하도록 경량화 및 최적화되어 있습니다.

---

## ✨ 주요 특징

- **Zero Dependency**: 외부 라이브러리 없이 ZIP 압축 및 Office Open XML 규격을 직접 구현하여 엑셀 파일을 생성합니다.
- **클라이언트 사이드 동작**: 서버 통신 없이 브라우저 내에서 즉시 엑셀 파일을 만들어 다운로드하므로 빠르고 안전합니다.
- **다양한 환경 지원**: 
  - **React / Next.js**: 모던 웹 환경을 위한 컴포넌트(`EvidenceModal.tsx`) 제공
  - **Vanilla JS**: 레거시 환경을 위한 순수 스크립트(`browser/ui-test-evidence-excel.js`) 제공
- **브라우저 네이티브 캡처**: `navigator.mediaDevices.getDisplayMedia`를 활용하여 탭 화면을 고화질로 캡처합니다.

---

## 🚀 시작하기 (로컬 테스트)

```bash
npm install
npm run dev
```
브라우저에서 `http://localhost:3000`에 접속하여 기능을 테스트해볼 수 있습니다.

---

## 📦 다른 프로젝트에 적용하기

이 도구는 두 가지 환경(React/Next.js 및 순수 HTML/JS) 모두에 쉽게 이식할 수 있습니다.

### 방법 1. React / Next.js 프로젝트에 적용하기

`app/ui-test/` 폴더 내의 파일들을 대상 프로젝트로 복사합니다.

**필요한 파일:**
- `generate-excel.ts`: 핵심 엑셀 생성 로직 (의존성 없음)
- `EvidenceModal.tsx`: 사용자 입력 및 캡처를 관리하는 모달 UI
- `evidence.module.css`: 모달 스타일링

**적용 방법:**
별도의 `npm install`이나 `next.config.ts` 설정이 **필요 없습니다.** (이전 버전의 `exceljs`나 `html-to-image`는 더 이상 사용하지 않습니다.)
원하는 페이지나 레이아웃에서 `EvidenceModal` 컴포넌트를 렌더링하여 사용하면 됩니다.

### 방법 2. 순수 HTML / 레거시 프로젝트에 적용하기

React 환경이 아닌 경우, `browser/` 폴더에 있는 스크립트를 사용합니다.

**적용 방법:**
HTML 파일에 스크립트를 포함시키고 전역 객체 `UITestEvidenceExcel`을 호출합니다. 상세한 사용법은 `browser/README.md`를 참고하세요.

```html
<!-- 스크립트 로드 -->
<script src="./ui-test-evidence-excel.js"></script>

<script>
  // 엑셀 다운로드 실행 예시
  UITestEvidenceExcel.downloadExcel({
    serviceCode: "CHC",
    screenId: "UserRegister",
    screenName: "사용자 등록",
    author: "홍길동",
    cases: [
      {
        caseNumber: 1,
        imageBase64: "data:image/png;base64,...", // UITestEvidenceExcel.captureTab() 으로 얻은 이미지
        testItem: "필수값 저장",
        testContent: "이름/이메일 입력 후 저장 버튼 클릭",
        expectedResult: "성공 메시지 표시 및 목록 반영",
        programId: "USR_REG_01",
        verifyMethod: "탭 화면 캡처"
      }
    ]
  });
</script>
```

---

## 📄 생성되는 엑셀 파일 구조

**파일명 형식:**  
`MAL_{서비스코드}_AC02(단위테스트케이스결과서)_UT_{화면ID}_{화면명}_V1.0.xlsx`

**포함되는 시트:**
1. **겉표지**: 서비스코드, 화면ID, 화면명, 작성일 등 기본 정보
2. **개정이력**: 문서 버전 및 개정 기록 (기본 V1.0)
3. **단위테스트케이스**: 입력한 테스트 케이스 목록 (테스트항목, 내용, 예상결과 등)
4. **공통체크리스트**: UI, 화면, 입력, 레이아웃 관련 기본 점검 항목
5. **단위테스트케이스결과증빙**: 케이스별 캡처 이미지가 엑셀 셀 크기에 맞춰 자동 삽입됨

---

## 💡 사용 팁 및 주의사항

- **화면 캡처 권한**: 브라우저 보안 정책상 화면 캡처(`getDisplayMedia`)는 사용자의 명시적인 동의(공유할 탭 선택)가 필요합니다.
- **HTTPS / Localhost 필수**: 화면 캡처 API는 보안 컨텍스트(`https://` 또는 `localhost`)에서만 동작합니다.
- **대용량 처리**: 캡처 이미지가 많거나 해상도가 매우 높은 경우, 클라이언트 브라우저의 메모리 한계로 인해 엑셀 생성 시간이 길어질 수 있습니다. 적절한 해상도로 캡처하는 것을 권장합니다.
