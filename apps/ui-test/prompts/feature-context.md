# UI Test Evidence Feature Prompt

Use this prompt when planning or changing the `apps/ui-test` UI test evidence feature.

## Feature Summary

This app demonstrates and packages a browser-based unit-test evidence generator.
Users capture the current UI state, add test case metadata, and download an XLSX evidence document.

The app has two related surfaces:

- `apps/ui-test/app`: Next.js sample/admin-style UI.
- `apps/ui-test/test-evidence`: reusable React package exported as `@ui-test/react`.

## Working Prompt

When implementing a feature here:

1. Identify whether the change belongs to the sample app, the reusable React package, or the XLSX generator.
2. Preserve the current separation:
   - `EvidenceFloat` owns capture and case state.
   - `EvidenceModal` owns metadata input, case editing, and download.
   - `generate-excel.ts` owns XLSX bytes and filename generation.
3. Keep browser-only behavior in client components, event handlers, or dynamic imports.
4. Keep Korean UI copy consistent with the existing evidence workflow.
5. If the public payload, generated workbook, filename, or screen metadata behavior changes, update README/test expectations.

## User Flow

- User opens the sample Next.js app.
- Floating evidence button starts capture or reopens the current case list.
- First capture creates case 1 and opens the evidence modal.
- User edits service code, screen ID/name, author, business category, levels, and case fields.
- User may add more captures, delete cases, start a new test, or download XLSX.
- Download completion clears the in-progress evidence state.

## Public Output

- Default filename:
  `MAL_{서비스코드}_AC02(단위테스트케이스결과서)_UT_{화면ID}_{화면명}_V1.0.xlsx`
- Sheet names:
  - `겉표지`
  - `개정이력`
  - `단위테스트케이스`
  - `공통체크리스트`
  - `단위테스트케이스결과증빙`

## Notes

- `useEvidenceScreen(screenId, screenName)` is used by screens/popups that need to override captured screen metadata.
- React package case images use the `image` data URL field.
- Do not confuse this with the standalone browser distribution in `packages/browser`, which uses `imageBase64`.
