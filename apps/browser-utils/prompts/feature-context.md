# Browser Evidence Distribution Feature Prompt

Use this prompt when planning or changing the standalone browser evidence distribution in `packages/browser`.

## Feature Summary

This package provides a dependency-free browser script and sample HTML for generating UI test evidence XLSX files.
It is meant for legacy or non-React projects that can include a plain script and use the global `UITestEvidenceExcel` object.

## Working Prompt

When implementing a feature here:

1. Keep the distribution usable by directly opening `ui-test-evidence.html` or including `ui-test-evidence-excel.js`.
2. Preserve the public global API unless the user explicitly requests a breaking change.
3. Keep payload examples in `packages/browser/README.md` aligned with the implementation.
4. Keep browser capture permissions and secure-context limitations visible in documentation when capture behavior changes.
5. Avoid coupling this package to the Next.js sample app.

## Public API

- `UITestEvidenceExcel.captureTab(options?)`
- `UITestEvidenceExcel.downloadExcel(payload, fileName?)`
- `UITestEvidenceExcel.generateExcel(payload)`
- `UITestEvidenceExcel.makeFileName(payload)`

## Payload Shape

Cases use `imageBase64` for captured image data URLs.
This differs from the React package, where cases use `image`.

## Public Output

- Default filename:
  `MAL_{서비스코드}_AC02(단위테스트케이스결과서)_UT_{화면ID}_{화면명}_V1.0.xlsx`
- Sheet names:
  - `겉표지`
  - `개정이력`
  - `단위테스트케이스`
  - `공통체크리스트`
  - `단위테스트케이스결과증빙`

## User Flow

- User opens the sample HTML or includes the JS file in an existing page.
- User enters evidence metadata and test case details.
- User captures a browser tab through Screen Capture API or provides a data URL.
- User downloads the generated XLSX directly from the browser.
