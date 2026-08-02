# 브라우저용 테스트 증빙 엑셀 사용법

`ui-test-evidence-excel.js`는 별도 라이브러리 없이 브라우저에서 단위테스트 결과 증빙 XLSX를 생성합니다.  
샘플 화면은 `ui-test-evidence.html`입니다.

## 파일 구성

- `ui-test-evidence-excel.js`: 브라우저용 XLSX 생성/다운로드/탭 화면 캡처 스크립트
- `ui-test-evidence.html`: 바로 실행 가능한 샘플 화면
- `README.md`: 사용법

## 바로 실행

1. `browser/` 폴더의 `ui-test-evidence.html`을 브라우저에서 엽니다.
2. 파일 정보와 테스트 케이스를 입력합니다.
3. 케이스의 `탭 화면 캡처` 버튼을 누르고 브라우저 공유 창에서 캡처할 브라우저 탭을 선택합니다.
4. 필요한 경우 썸네일이나 `미리보기` 버튼을 눌러 증빙 이미지를 확인합니다.
5. `엑셀 다운로드` 버튼을 누릅니다.

기존 화면에 반입할 때는 `ui-test-evidence-excel.js`만 포함하면 됩니다.

## 기존 화면에 붙이는 방법

HTML에서 `ui-test-evidence-excel.js`를 먼저 불러옵니다.

```html
<script src="./ui-test-evidence-excel.js"></script>
```

이후 전역 객체 `UITestEvidenceExcel`을 사용합니다.

```html
<button type="button" id="downloadEvidence">엑셀 다운로드</button>

<script src="./ui-test-evidence-excel.js"></script>
<script>
  document.getElementById("downloadEvidence").addEventListener("click", function () {
    UITestEvidenceExcel.downloadExcel({
      serviceCode: "CHC",
      screenId: "UserRegister",
      screenName: "사용자 등록",
      author: "홍길동",
      capturedAt: "2026-05-03",
      bizCategory: "회원관리",
      level1: "사용자",
      level2: "등록",
      level3: "입력",
      level4: "저장",
      cases: [
        {
          caseNumber: 1,
          imageBase64: "data:image/png;base64,...",
          testItem: "필수값 저장",
          testContent: "이름/이메일 입력 후 저장 버튼 클릭",
          expectedResult: "성공 메시지 표시 및 목록 반영",
          programId: "USR_REG_01",
          verifyMethod: "탭 화면 캡처"
        }
      ]
    });
  });
</script>
```

## 제공 API

### `UITestEvidenceExcel.captureTab(options?)`

브라우저의 Screen Capture API로 선택한 브라우저 탭 화면을 캡처하고 PNG data URL을 반환합니다.  
사용자가 브라우저 공유 창에서 캡처할 탭을 직접 선택해야 합니다.

```js
UITestEvidenceExcel.captureTab({ maxWidth: 1600 }).then(function (imageBase64) {
  caseItem.imageBase64 = imageBase64;
});
```

옵션:

- `maxWidth`: 캡처 이미지 최대 너비
- `maxHeight`: 캡처 이미지 최대 높이
- `type`: 이미지 타입. 기본값은 `image/png`
- `quality`: JPEG/WebP 계열 저장 품질
- `video`: `getDisplayMedia`에 넘길 video 제약 조건. 기본값은 탭 화면 캡처 힌트인 `{ cursor: "always", displaySurface: "browser" }`입니다.
- `selfBrowserSurface`: 현재 샘플 탭을 공유 대상에서 제외할지 여부. 기본값은 `"exclude"`입니다.
- `surfaceSwitching`: 브라우저 탭 전환 공유를 허용할지 여부. 기본값은 `"include"`입니다.

### `UITestEvidenceExcel.downloadExcel(payload, fileName?)`

XLSX를 생성하고 브라우저 다운로드를 실행합니다.

- `payload`: 엑셀 생성 데이터
- `fileName`: 선택값. 없으면 `MAL_{서비스코드}_AC02(단위테스트케이스결과서)_UT_{화면ID}_{화면명}_V1.0.xlsx` 형식으로 생성합니다.
- 반환값: 생성된 XLSX `Uint8Array`를 담은 `Promise`
- 엑셀에 들어가는 작성일/개정일자는 `YYYY-MM-DD`로 정규화됩니다.

### `UITestEvidenceExcel.generateExcel(payload)`

다운로드 없이 XLSX 바이트만 생성합니다.

```js
UITestEvidenceExcel.generateExcel(payload).then(function (bytes) {
  var blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  console.log(blob.size);
});
```

### `UITestEvidenceExcel.makeFileName(payload)`

기본 다운로드 파일명을 미리 확인할 때 사용합니다.

```js
var name = UITestEvidenceExcel.makeFileName({
  serviceCode: "CHC",
  screenId: "UserRegister",
  screenName: "사용자 등록"
});
```

## Payload 형식

```js
{
  serviceCode: "CHC",
  screenId: "UserRegister",
  screenName: "사용자 등록",
  author: "홍길동",
  capturedAt: "2026-05-03",
  bizCategory: "회원관리",
  level1: "사용자",
  level2: "등록",
  level3: "입력",
  level4: "저장",
  cases: [
    {
      caseNumber: 1,
      imageBase64: "data:image/png;base64,...",
      testItem: "필수값 저장",
      testContent: "이름/이메일 입력 후 저장 버튼 클릭",
      expectedResult: "성공 메시지 표시 및 목록 반영",
      programId: "USR_REG_01",
      verifyMethod: "탭 화면 캡처"
    }
  ]
}
```

## 탭 캡처 이미지 입력

`imageBase64`에는 탭 화면 캡처 결과인 PNG data URL을 넣습니다.

```js
UITestEvidenceExcel.captureTab({ maxWidth: 1600 }).then(function (imageBase64) {
  caseItem.imageBase64 = imageBase64;
});
```

`ui-test-evidence.html` 샘플은 케이스마다 `탭 화면 캡처`와 `미리보기` 버튼을 제공합니다. `탭 화면 캡처` 버튼을 누르면 브라우저가 공유 선택 창을 띄우고, 선택된 브라우저 탭의 첫 프레임을 해당 케이스 증빙 이미지로 저장합니다. 미리보기 모달은 썸네일이나 `미리보기` 버튼을 클릭했을 때만 열립니다.

## 생성되는 시트

- `겉표지`
- `개정이력`
- `단위테스트케이스`
- `공통체크리스트`
- `단위테스트케이스결과증빙`

## 주의사항

- `ui-test-evidence-excel.js`는 외부 라이브러리를 사용하지 않습니다.
- 브라우저 API인 `Blob`, `URL.createObjectURL`, `TextEncoder`, `atob`, `navigator.mediaDevices.getDisplayMedia`를 사용합니다.
- 탭 화면 캡처는 브라우저 보안 정책상 사용자가 캡처할 탭을 직접 선택해야 합니다.
- 일부 브라우저에서는 탭 화면 캡처가 `https://`, `localhost`, 또는 신뢰 가능한 로컬 파일 환경에서만 동작합니다.
- 이미지가 크거나 케이스가 많으면 생성 파일 크기와 처리 시간이 늘어날 수 있습니다.
- XLSX는 브라우저에서 직접 생성되므로 서버 업로드 없이 동작합니다.
