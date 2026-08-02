# File Transfer Feature Prompt

Use this prompt when planning or changing the `apps/file-transfer` utility.

## Feature Summary

`apps/file-transfer` is a standalone browser tool for mapping large NFS path logs to Object Storage target keys.
It is designed to open directly as `file-transfer.html` without a build step or server.

## Working Prompt

When implementing a feature here:

1. Treat each input line as an NFS source path unless the user explicitly changes the input model.
2. Preserve large-file safety before adding UI convenience.
3. Keep processing resumable/cancellable from the user's perspective.
4. Keep output semantics stable:
   - mapped result files contain successful mapped paths.
   - mapping report CSV contains original path, target path, status, and failure reason.
   - error list TXT contains only original paths that failed validation.
5. If mapping, validation, splitting, output naming, or limits change, update `apps/file-transfer/README.md`.

## User Flow

- User opens `file-transfer.html` in a browser.
- User selects or drops a large log file.
- User configures NFS prefix, Object Storage prefix, optional Regex replacement, include/exclude filters, limits, chunk unit, and part list.
- User can count total lines before processing.
- User starts processing and monitors progress, counts, output size, and file count.
- User may cancel processing.
- User downloads mapping report, error list, and mapped output files.

## Processing Model

- Read files in chunks using `File.slice()`.
- Decode chunks with `TextDecoder.decode(..., { stream: true })`.
- Carry incomplete lines between chunks with a tail buffer.
- Keep previews bounded.
- Flush output text into Blob parts instead of retaining all output lines.

## Validation Model

Mapped Object Storage paths are validated for:

- empty path
- forbidden characters
- path length over the configured limit
- whitespace or control characters when that validation is enabled by the current implementation

## Outputs

- Mapping Report CSV includes a BOM for Excel compatibility.
- Error List TXT is separate from the mapping report.
- Split mapped output files use part numbering when line/chunk splitting is configured.
