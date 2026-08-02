(function () {
  "use strict";

  var CHUNK_SIZE_BYTES = 10 * 1024 * 1024;
  var PREVIEW_LIMIT = 32 * 1024;
  var OUTPUT_FLUSH_CHARS = 512 * 1024;
  var DOWNLOAD_DELAY_MS = 250;
  var TEXT_MIME_TYPE = "text/plain;charset=utf-8";
  var INVALID_HEADER = "originalPath\tmappedPath\treason\n";

  var selectedFile = null;
  var resultFiles = [];
  var cancelRequested = false;
  var isProcessing = false;

  var elements = {};

  document.addEventListener("DOMContentLoaded", function () {
    bindElements();
    bindEvents();
    resetProgress();
  });

  function bindElements() {
    [
      "fileInput", "dropZone", "fileStatus", "metaName", "metaSize", "metaDate",
      "nfsPrefix", "objectPrefix", "regexPattern", "replacement", "flagIgnoreCase", "flagMultiline",
      "includePattern", "excludePattern", "maxMegabytes", "maxLines", "splitLineCount", "skipEmpty",
      "progressBar", "progressText", "readBytes", "lineCount", "validCount", "invalidCount",
      "outputBytes", "outputFiles", "message", "startBtn", "cancelBtn", "downloadBtn",
      "preview", "invalidPreview"
    ].forEach(function (id) {
      elements[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    elements.fileInput.addEventListener("change", function (event) {
      setFile(event.target.files && event.target.files[0]);
    });

    ["dragenter", "dragover"].forEach(function (name) {
      elements.dropZone.addEventListener(name, function (event) {
        event.preventDefault();
        elements.dropZone.classList.add("border-blue-500", "bg-blue-50");
      });
    });

    ["dragleave", "drop"].forEach(function (name) {
      elements.dropZone.addEventListener(name, function (event) {
        event.preventDefault();
        elements.dropZone.classList.remove("border-blue-500", "bg-blue-50");
      });
    });

    elements.dropZone.addEventListener("drop", function (event) {
      setFile(event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]);
    });

    elements.startBtn.addEventListener("click", startProcessing);
    elements.cancelBtn.addEventListener("click", function () {
      cancelRequested = true;
      setMessage("처리 중단 요청됨. 현재 청크 처리 후 멈춥니다.");
    });
    elements.downloadBtn.addEventListener("click", downloadResult);
  }

  function setFile(file) {
    selectedFile = file || null;
    resultFiles = [];
    elements.downloadBtn.disabled = true;
    resetProgress();

    if (!selectedFile) {
      elements.fileStatus.textContent = "파일 없음";
      elements.metaName.textContent = "-";
      elements.metaSize.textContent = "-";
      elements.metaDate.textContent = "-";
      elements.startBtn.disabled = true;
      return;
    }

    elements.fileStatus.textContent = "파일 선택됨";
    elements.metaName.textContent = selectedFile.name;
    elements.metaSize.textContent = formatBytes(selectedFile.size);
    elements.metaDate.textContent = selectedFile.lastModified ? formatDate(selectedFile.lastModified) : "-";
    elements.startBtn.disabled = false;
    setMessage("파일을 선택했습니다. NFS/Object Storage 접두사와 제약 조건을 확인한 뒤 처리를 시작하세요.");
  }

  async function startProcessing() {
    if (!selectedFile || isProcessing) return;

    var config;
    try {
      config = buildConfig();
    } catch (error) {
      setMessage(error.message, true);
      return;
    }

    isProcessing = true;
    cancelRequested = false;
    resultFiles = [];
    elements.startBtn.disabled = true;
    elements.cancelBtn.disabled = false;
    elements.downloadBtn.disabled = true;
    resetProgress();
    setMessage("10MB 청크 단위로 읽고, NFS 경로를 Object Storage 경로로 검증/분류합니다.");

    try {
      var result = await processFile(selectedFile, config);
      resultFiles = result.files;

      if (resultFiles.length) {
        elements.downloadBtn.disabled = false;
        setMessage("처리가 완료되었습니다. 정상 " + result.stats.validLines + "건, 불가 " + result.stats.invalidLines + "건으로 분리했습니다.");
      } else {
        setMessage("출력할 행이 없습니다. 포함/제외 조건을 확인하세요.", true);
      }
    } catch (error) {
      if (error && error.code === "CANCELLED") {
        setMessage("처리가 중단되었습니다.");
      } else {
        setMessage((error && error.message) || "처리 중 오류가 발생했습니다.", true);
      }
    } finally {
      isProcessing = false;
      elements.startBtn.disabled = !selectedFile;
      elements.cancelBtn.disabled = true;
    }
  }

  function buildConfig() {
    var flags = "g";
    var nfsPrefix = elements.nfsPrefix.value.trim();
    var objectPrefix = elements.objectPrefix.value.trim();

    if ((nfsPrefix && !objectPrefix) || (!nfsPrefix && objectPrefix)) {
      throw new Error("원본 경로 접두사와 To-Be 경로 접두사는 함께 입력하세요.");
    }

    if (elements.flagIgnoreCase.checked) flags += "i";
    if (elements.flagMultiline.checked) flags += "m";

    var mappingRegex = null;
    if (elements.regexPattern.value.trim()) {
      mappingRegex = compileRegex(elements.regexPattern.value.trim(), flags, "추가 Regex");
    }

    var includeRegex = null;
    if (elements.includePattern.value.trim()) {
      includeRegex = compileRegex(elements.includePattern.value.trim(), flags.replace("g", ""), "포함 Regex");
    }

    var excludeRegex = null;
    if (elements.excludePattern.value.trim()) {
      excludeRegex = compileRegex(elements.excludePattern.value.trim(), flags.replace("g", ""), "제외 Regex");
    }

    return {
      nfsPrefix: nfsPrefix,
      objectPrefix: objectPrefix,
      usePrefixMapping: !!(nfsPrefix && objectPrefix),
      mappingRegex: mappingRegex,
      replacement: elements.replacement.value,
      includeRegex: includeRegex,
      excludeRegex: excludeRegex,
      skipEmpty: elements.skipEmpty.checked,
      maxBytes: parseOptionalLimit(elements.maxMegabytes.value, 1024 * 1024),
      maxLines: parseOptionalLimit(elements.maxLines.value, 1),
      splitLineCount: parseOptionalPositiveInteger(elements.splitLineCount.value, "분할 행 수")
    };
  }

  function compileRegex(pattern, flags, label) {
    try {
      return new RegExp(pattern, flags);
    } catch (error) {
      throw new Error(label + "가 올바르지 않습니다: " + error.message);
    }
  }

  function parseOptionalLimit(value, unit) {
    if (!String(value || "").trim()) return 0;
    var parsed = Number(value);
    if (!isFinite(parsed) || parsed < 0) return 0;
    return Math.floor(parsed * unit);
  }

  function parseOptionalPositiveInteger(value, label) {
    if (!String(value || "").trim()) return 0;
    var parsed = Number(value);
    if (!isFinite(parsed) || parsed < 1) {
      throw new Error(label + "는 1 이상의 숫자로 입력하세요.");
    }
    return Math.floor(parsed);
  }

  async function processFile(file, config) {
    var decoder = new TextDecoder("utf-8");
    var encoder = new TextEncoder();
    var outputs = {
      valid: createOutputState(file.name, config, "valid"),
      invalid: createOutputState(file.name, config, "invalid")
    };
    var offset = 0;
    var totalBytes = config.maxBytes ? Math.min(file.size, config.maxBytes) : file.size;
    var tail = "";
    var stats = {
      readBytes: 0,
      readLines: 0,
      validLines: 0,
      invalidLines: 0,
      outputBytes: 0,
      fileCount: 0,
      previewText: "",
      invalidPreviewText: ""
    };

    while (offset < totalBytes) {
      if (cancelRequested) throwCancelled();

      var end = Math.min(offset + CHUNK_SIZE_BYTES, totalBytes);
      var sourceBlob = file.slice(offset, end);
      var buffer = await sourceBlob.arrayBuffer();
      var text = decoder.decode(buffer, { stream: end < totalBytes });
      var split = splitDecodedText(tail + text);

      tail = split.tail;
      writeMappedLines(split.lines, config, encoder, outputs, stats);
      offset = end;
      stats.readBytes = offset;
      updateProgress(stats, totalBytes);

      sourceBlob = null;
      buffer = null;
      text = null;
      split = null;

      if (config.maxLines && stats.readLines >= config.maxLines) break;
      await nextFrame();
    }

    var rest = decoder.decode();
    if (rest) tail += rest;
    if (tail && (!config.maxLines || stats.readLines < config.maxLines)) {
      writeMappedLines([tail], config, encoder, outputs, stats);
    }

    finalizeOutputs(outputs, encoder, stats);
    updateProgress(stats, totalBytes || stats.readBytes || 1);
    return { files: collectResultFiles(outputs), stats: stats };
  }

  function splitDecodedText(text) {
    var lines = text.split("\n");
    var tail = lines.pop();
    return { lines: lines, tail: tail };
  }

  function writeMappedLines(lines, config, encoder, outputs, stats) {
    for (var i = 0; i < lines.length; i += 1) {
      if (config.maxLines && stats.readLines >= config.maxLines) return;

      var rawLine = lines[i];
      var original = stripCarriageReturn(rawLine);
      stats.readLines += 1;

      if (config.skipEmpty && !original.trim()) continue;
      if (config.includeRegex && !testLine(config.includeRegex, original)) continue;
      if (config.excludeRegex && testLine(config.excludeRegex, original)) continue;

      var result = mapAndValidateLine(original, config);

      if (result.reason) {
        appendOutputLine(makeInvalidLine(result.original, result.mapped, result.reason), encoder, outputs.invalid, stats);
        stats.invalidLines += 1;
      } else {
        appendOutputLine(result.mapped, encoder, outputs.valid, stats);
        stats.validLines += 1;
      }

      if (outputs.valid.splitLineCount && outputs.valid.currentLineCount >= outputs.valid.splitLineCount) {
        finalizeCurrentSplit(outputs.valid, encoder, stats);
      }
      if (outputs.invalid.splitLineCount && outputs.invalid.currentLineCount >= outputs.invalid.splitLineCount) {
        finalizeCurrentSplit(outputs.invalid, encoder, stats);
      }
    }
  }

  function stripCarriageReturn(line) {
    if (line && line.charAt(line.length - 1) === "\r") {
      return line.slice(0, -1);
    }
    return line;
  }

  function mapAndValidateLine(original, config) {
    var mapped = original;
    var reason = "";

    if (config.usePrefixMapping) {
      if (original.indexOf(config.nfsPrefix) !== 0) {
        reason = addReason(reason, "원본 경로 접두사 불일치");
      } else {
        mapped = replacePrefix(original, config.nfsPrefix, config.objectPrefix);
      }
    }

    if (config.mappingRegex) {
      config.mappingRegex.lastIndex = 0;
      mapped = mapped.replace(config.mappingRegex, config.replacement);
    }

    reason = addReason(reason, validateObjectPath(mapped));
    return { original: original, mapped: mapped, reason: reason };
  }

  function replacePrefix(value, fromPrefix, toPrefix) {
    var rest = value.slice(fromPrefix.length);
    if (toPrefix && rest && toPrefix.charAt(toPrefix.length - 1) === "/" && rest.charAt(0) === "/") {
      rest = rest.slice(1);
    } else if (toPrefix && rest && toPrefix.charAt(toPrefix.length - 1) !== "/" && rest.charAt(0) !== "/") {
      rest = "/" + rest;
    }
    return toPrefix + rest;
  }

  function validateObjectPath(path) {
    var reason = "";

    if (!path) {
      reason = addReason(reason, "경로 비어 있음");
    }
    if (/[\\*?"<>|#%]/.test(path)) {
      reason = addReason(reason, "금지 특수문자 포함(\\, *, ?, \", <, >, |, #, %)");
    }
    if (path.length > 1024) {
      reason = addReason(reason, "전체 경로 길이 1,024자 초과");
    }
    if (/[\s\u0000-\u001F\u007F]/.test(path)) {
      reason = addReason(reason, "공백 또는 제어 문자 포함");
    }

    return reason;
  }

  function addReason(current, reason) {
    if (!reason) return current || "";
    if (!current) return reason;
    return current + "; " + reason;
  }

  function makeInvalidLine(original, mapped, reason) {
    return sanitizeTsv(original) + "\t" + sanitizeTsv(mapped) + "\t" + sanitizeTsv(reason);
  }

  function sanitizeTsv(value) {
    return String(value == null ? "" : value).replace(/[\t\r\n]/g, " ");
  }

  function testLine(regex, line) {
    regex.lastIndex = 0;
    return regex.test(line);
  }

  function createOutputState(fileName, config, kind) {
    return {
      kind: kind,
      sourceName: fileName || "result.log",
      splitLineCount: config.splitLineCount,
      hasMapping: config.usePrefixMapping || !!config.mappingRegex,
      files: [],
      currentBlob: null,
      currentText: "",
      currentLineCount: 0,
      currentBytes: 0,
      splitIndex: 0,
      header: kind === "invalid" ? INVALID_HEADER : ""
    };
  }

  function appendOutputLine(line, encoder, output, stats) {
    var text;

    ensureOutputHeader(output);
    text = line + "\n";
    output.currentText += text;
    output.currentLineCount += 1;
    appendPreview(text, output, stats);

    if (output.currentText.length >= OUTPUT_FLUSH_CHARS) {
      flushCurrentText(output, encoder, stats);
    }
  }

  function ensureOutputHeader(output) {
    if (output.header && !output.currentLineCount && !output.currentText && !output.currentBlob) {
      output.currentText = output.header;
      appendPreview(output.header, output, null);
    }
  }

  function appendPreview(text, output, stats) {
    if (output.kind === "invalid") {
      appendTextPreview(text, "invalidPreviewText", elements.invalidPreview, stats);
    } else {
      appendTextPreview(text, "previewText", elements.preview, stats);
    }
  }

  function appendTextPreview(text, key, element, stats) {
    if (!stats) return;
    if (stats[key].length < PREVIEW_LIMIT) {
      stats[key] += text.slice(0, PREVIEW_LIMIT - stats[key].length);
      element.textContent = stats[key];
    }
  }

  function flushCurrentText(output, encoder, stats) {
    if (!output.currentText) return;

    var bytes = encoder.encode(output.currentText);
    output.currentBlob = output.currentBlob ?
      new Blob([output.currentBlob, bytes], { type: TEXT_MIME_TYPE }) :
      new Blob([bytes], { type: TEXT_MIME_TYPE });
    output.currentBytes += bytes.byteLength;
    stats.outputBytes += bytes.byteLength;
    output.currentText = "";
    bytes = null;
  }

  function finalizeCurrentSplit(output, encoder, stats) {
    flushCurrentText(output, encoder, stats);
    if (!output.currentBlob || !output.currentLineCount) return;

    output.splitIndex += 1;
    output.files[output.files.length] = {
      name: makeOutputFileName(output, output.splitIndex),
      blob: output.currentBlob,
      lineCount: output.currentLineCount,
      bytes: output.currentBytes,
      kind: output.kind
    };
    stats.fileCount += 1;

    output.currentBlob = null;
    output.currentText = "";
    output.currentLineCount = 0;
    output.currentBytes = 0;
  }

  function finalizeOutputs(outputs, encoder, stats) {
    finalizeCurrentSplit(outputs.valid, encoder, stats);
    finalizeCurrentSplit(outputs.invalid, encoder, stats);
  }

  function collectResultFiles(outputs) {
    var files = [];
    appendFiles(files, outputs.valid.files);
    appendFiles(files, outputs.invalid.files);
    return files;
  }

  function appendFiles(target, source) {
    for (var i = 0; i < source.length; i += 1) {
      target[target.length] = source[i];
    }
  }

  function updateProgress(stats, totalBytes) {
    var percent = totalBytes ? Math.min(100, Math.round((stats.readBytes / totalBytes) * 100)) : 0;
    elements.progressBar.style.width = percent + "%";
    elements.progressText.textContent = percent + "%";
    elements.readBytes.textContent = formatBytes(stats.readBytes);
    elements.lineCount.textContent = String(stats.readLines);
    elements.validCount.textContent = String(stats.validLines);
    elements.invalidCount.textContent = String(stats.invalidLines);
    elements.outputBytes.textContent = formatBytes(stats.outputBytes);
    elements.outputFiles.textContent = String(stats.fileCount);
  }

  function resetProgress() {
    elements.progressBar && (elements.progressBar.style.width = "0%");
    elements.progressText && (elements.progressText.textContent = "0%");
    elements.readBytes && (elements.readBytes.textContent = "0 B");
    elements.lineCount && (elements.lineCount.textContent = "0");
    elements.validCount && (elements.validCount.textContent = "0");
    elements.invalidCount && (elements.invalidCount.textContent = "0");
    elements.outputBytes && (elements.outputBytes.textContent = "0 B");
    elements.outputFiles && (elements.outputFiles.textContent = "0");
    elements.preview && (elements.preview.textContent = "");
    elements.invalidPreview && (elements.invalidPreview.textContent = "");
    elements.message && (elements.message.textContent = "");
  }

  async function downloadResult() {
    if (!resultFiles.length) return;

    elements.downloadBtn.disabled = true;
    setMessage(resultFiles.length + "개 결과 파일 다운로드를 요청합니다.");

    for (var i = 0; i < resultFiles.length; i += 1) {
      triggerDownload(resultFiles[i].blob, resultFiles[i].name);
    }

    elements.downloadBtn.disabled = false;
    setMessage(resultFiles.length + "개 결과 파일 다운로드 요청을 완료했습니다.");
  }

  function triggerDownload(blob, fileName) {
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName || "mapped-result.log";
    anchor.target = "_blank";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function makeOutputFileName(output, index) {
    var parsed = splitFileName(output.sourceName || "result.log");
    var suffix = output.kind === "invalid" ? ".invalid" : (output.hasMapping ? ".mapped" : ".valid");
    var ext = output.kind === "invalid" ? ".tsv" : parsed.ext;

    if (output.splitLineCount) {
      suffix += ".part" + padNumber(index, 4);
    }

    return parsed.base + suffix + ext;
  }

  function splitFileName(name) {
    var dot = name.lastIndexOf(".");
    if (dot <= 0) return { base: name, ext: ".log" };
    return { base: name.slice(0, dot), ext: name.slice(dot) };
  }

  function padNumber(value, size) {
    var text = String(value);
    while (text.length < size) text = "0" + text;
    return text;
  }

  function setMessage(message, isError) {
    elements.message.textContent = message || "";
    elements.message.className = "mt-4 min-h-6 text-sm " + (isError ? "text-red-600" : "text-slate-600");
  }

  function throwCancelled() {
    var error = new Error("cancelled");
    error.code = "CANCELLED";
    throw error;
  }

  function nextFrame() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () { resolve(); });
    });
  }

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve(); }, ms);
    });
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    var units = ["B", "KB", "MB", "GB", "TB"];
    var value = bytes;
    var unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return (unit === 0 ? value : value.toFixed(2)) + " " + units[unit];
  }

  function formatDate(timestamp) {
    var date = new Date(timestamp);
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }
})();
