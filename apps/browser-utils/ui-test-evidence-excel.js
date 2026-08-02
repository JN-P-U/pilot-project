(function (global) {
  "use strict";

  var XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  var IMG_ROW_HEIGHT_PT = 20;
  var IMG_COL_WIDTH = 18;
  var IMG_COL_PX = 7.5;
  var PT_TO_PX = 96 / 72;

  var CHECKLIST_ITEMS = [
    ["UI", "화면 load시 최상단 및 입력항목에서 Focus 되는가?"],
    ["UI", "필수 입력항목이 입력안내가 표시되는가?"],
    ["UI", "Enable, Disable 처리가 올바르게 동작하는가?"],
    ["UI", "상태에 따라 버튼, 입력, 표시 처리가 올바르게 되는가?"],
    ["화면", "검색 조건이 올바르게 동작하는가?"],
    ["화면", "페이징 처리가 올바르게 동작하는가?"],
    ["화면", "정렬 기능이 올바르게 동작하는가?"],
    ["입력", "필수 입력값 검증이 올바르게 동작하는가?"],
    ["입력", "입력 type(숫자, 문자, 날짜 등)이 올바르게 동작하는가?"],
    ["입력", "최대 입력길이 제한이 올바르게 동작하는가?"],
    ["보고서 출력", "출력 버튼 클릭시 올바르게 동작하는가?"],
    ["레이아웃", "화면 해상도에 따른 레이아웃이 올바른가?"],
    ["레이아웃", "오류 발생시 오류메시지가 올바르게 표시되는가?"]
  ];

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function dateOnly(value) {
    if (!value) return today();
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value.getFullYear() + "-" + pad(value.getMonth() + 1) + "-" + pad(value.getDate());
    }

    var text = String(value);
    var match = text.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (match) return match[1] + "-" + pad(match[2]) + "-" + pad(match[3]);

    var parsed = new Date(text);
    if (!isNaN(parsed.getTime())) {
      return parsed.getFullYear() + "-" + pad(parsed.getMonth() + 1) + "-" + pad(parsed.getDate());
    }
    return today();
  }

  function captureScreen(options) {
    options = options || {};
    if (!global.navigator || !global.navigator.mediaDevices || !global.navigator.mediaDevices.getDisplayMedia) {
      return Promise.reject(new Error("이 브라우저에서는 탭 화면 캡처를 지원하지 않습니다."));
    }
    if (!global.document) {
      return Promise.reject(new Error("탭 화면 캡처는 브라우저에서만 사용할 수 있습니다."));
    }

    return getDisplayMediaWithFallback(options).then(function (stream) {
      return new Promise(function (resolve, reject) {
        var video = global.document.createElement("video");

        function stop() {
          stream.getTracks().forEach(function (track) { track.stop(); });
          video.srcObject = null;
        }

        video.muted = true;
        video.playsInline = true;
        video.onloadedmetadata = function () {
          video.play().then(function () {
            global.requestAnimationFrame(function () {
              try {
                var canvas = global.document.createElement("canvas");
                var size = fitCaptureSize(
                  video.videoWidth || 1,
                  video.videoHeight || 1,
                  options.maxWidth,
                  options.maxHeight
                );
                canvas.width = size.w;
                canvas.height = size.h;
                canvas.getContext("2d").drawImage(video, 0, 0, size.w, size.h);
                stop();
                resolve(canvas.toDataURL(options.type || "image/png", options.quality || 0.92));
              } catch (e) {
                stop();
                reject(e);
              }
            });
          }).catch(function (e) {
            stop();
            reject(e);
          });
        };
        video.onerror = function () {
          stop();
          reject(new Error("탭 화면 캡처 영상을 읽을 수 없습니다."));
        };
        video.srcObject = stream;
      });
    });
  }

  function getDisplayMediaWithFallback(options) {
    var mediaDevices = global.navigator.mediaDevices;
    var preferred = {
      video: options.video || { cursor: "always", displaySurface: "browser" },
      audio: false
    };

    if (!options.video) {
      preferred.selfBrowserSurface = options.selfBrowserSurface || "exclude";
      preferred.surfaceSwitching = options.surfaceSwitching || "include";
    }

    return mediaDevices.getDisplayMedia(preferred).catch(function (error) {
      if (options.video || !isCaptureConstraintError(error)) throw error;
      return mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });
    });
  }

  function isCaptureConstraintError(error) {
    var name = error && error.name;
    var message = String((error && error.message) || "");
    return (
      name === "TypeError" ||
      name === "OverconstrainedError" ||
      /displaySurface|selfBrowserSurface|surfaceSwitching|constraint/i.test(message)
    );
  }

  function fitCaptureSize(width, height, maxWidth, maxHeight) {
    var scale = 1;
    if (maxWidth && width > maxWidth) scale = Math.min(scale, maxWidth / width);
    if (maxHeight && height > maxHeight) scale = Math.min(scale, maxHeight / height);
    return {
      w: Math.max(1, Math.round(width * scale)),
      h: Math.max(1, Math.round(height * scale))
    };
  }

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cleanSheetName(name) {
    return String(name).replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet";
  }

  function colName(n) {
    var s = "";
    while (n > 0) {
      var m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  function cellRef(row, col) {
    return colName(col) + row;
  }

  function textCell(row, col, value, style) {
    return '<c r="' + cellRef(row, col) + '"' + (style ? ' s="' + style + '"' : "") +
      ' t="inlineStr"><is><t xml:space="preserve">' + esc(value) + "</t></is></c>";
  }

  function numCell(row, col, value, style) {
    return '<c r="' + cellRef(row, col) + '"' + (style ? ' s="' + style + '"' : "") +
      '><v>' + Number(value || 0) + "</v></c>";
  }

  function emptyCell(row, col, style) {
    return '<c r="' + cellRef(row, col) + '"' + (style ? ' s="' + style + '"' : "") + "/>";
  }

  function rowXml(num, cells, height) {
    return '<row r="' + num + '"' + (height ? ' ht="' + height + '" customHeight="1"' : "") + ">" +
      cells.join("") + "</row>";
  }

  function mergeXml(merges) {
    if (!merges.length) return "";
    return '<mergeCells count="' + merges.length + '">' +
      merges.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join("") +
      "</mergeCells>";
  }

  function colsXml(widths) {
    return "<cols>" + widths.map(function (w, i) {
      return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
    }).join("") + "</cols>";
  }

  function sheetXml(widths, rows, merges, drawingsRelId) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      colsXml(widths) +
      '<sheetData>' + rows.join("") + "</sheetData>" +
      mergeXml(merges || []) +
      (drawingsRelId ? '<drawing r:id="' + drawingsRelId + '"/>' : "") +
      "</worksheet>";
  }

  function coverSheet(body) {
    var rows = [];
    var merges = ["A1:B1"];
    rows.push(rowXml(1, [textCell(1, 1, "단위테스트케이스 결과서", 4)], 44));
    [
      ["서비스코드", body.serviceCode],
      ["화면ID", body.screenId],
      ["화면명", body.screenName],
      ["작성일", body.capturedAt],
      ["문서버전", "V1.0"]
    ].forEach(function (r, i) {
      var n = i + 2;
      rows.push(rowXml(n, [textCell(n, 1, r[0], 2), textCell(n, 2, r[1], 1)], 24));
    });
    return sheetXml([20, 45], rows, merges);
  }

  function revisionSheet(body) {
    var rows = [];
    rows.push(rowXml(1, ["버전", "개정일자", "개정내용", "개정자"].map(function (h, i) {
      return textCell(1, i + 1, h, 2);
    }), 22));
    rows.push(rowXml(2, [
      textCell(2, 1, "V1.0", 1),
      textCell(2, 2, body.capturedAt, 1),
      textCell(2, 3, "최초 작성", 1),
      textCell(2, 4, "", 1)
    ], 20));
    return sheetXml([12, 20, 55, 15], rows, []);
  }

  function testCaseSheet(body) {
    var widths = [12, 20, 35, 20, 25, 22, 22, 15, 10, 14, 12, 18];
    var rows = [];
    var merges = ["B2:D2", "F2:J2", "A3:I3", "J3:L3"];
    var metaLabels = ["업무분류", "Level1", "Level2", "Level3", "Level4", "작성자"];
    var metaValues = [body.bizCategory, body.level1, body.level2, body.level3, body.level4, body.author];
    var cells1 = [];
    for (var i = 0; i < 6; i++) {
      cells1.push(textCell(1, i * 2 + 1, metaLabels[i], 2));
      cells1.push(textCell(1, i * 2 + 2, metaValues[i], 1));
    }
    rows.push(rowXml(1, cells1, 22));
    rows.push(rowXml(2, [
      textCell(2, 1, "단위테스트ID", 2),
      textCell(2, 2, "UT_" + (body.screenId || ""), 1),
      textCell(2, 5, "단위테스트명", 2),
      textCell(2, 6, body.screenName, 1),
      textCell(2, 11, "작성일", 2),
      textCell(2, 12, body.capturedAt, 1)
    ], 22));
    rows.push(rowXml(3, [textCell(3, 1, "단위테스트 케이스", 5), textCell(3, 10, "단위테스트 결과", 4)], 22));
    rows.push(rowXml(4, [
      "케이스번호", "테스트항목", "테스트내용", "테스트데이터", "예상결과", "프로그램ID",
      "결과확인방법", "비고", "", "수행결과", "증빙여부", "증빙제외사유"
    ].map(function (h, idx) { return textCell(4, idx + 1, h, 2); }), 22));
    (body.cases || []).forEach(function (tc, idx) {
      var n = idx + 5;
      rows.push(rowXml(n, [
        textCell(n, 1, pad(tc.caseNumber || idx + 1), 3),
        textCell(n, 2, tc.testItem, 1),
        textCell(n, 3, tc.testContent, 1),
        textCell(n, 4, "", 1),
        textCell(n, 5, tc.expectedResult, 1),
        textCell(n, 6, tc.programId, 1),
        textCell(n, 7, tc.verifyMethod, 1),
        textCell(n, 8, "", 1),
        textCell(n, 9, "", 1),
        textCell(n, 10, "성공", 6),
        textCell(n, 11, "Y", 1),
        textCell(n, 12, "", 1)
      ], 20));
    });
    return sheetXml(widths, rows, merges);
  }

  function checklistSheet() {
    var rows = [];
    var merges = ["A1:C1"];
    rows.push(rowXml(1, [textCell(1, 1, "공통 체크리스트", 4)], 28));
    rows.push(rowXml(2, ["프로그램 유형", "공통 체크 항목", "Y/N/NA"].map(function (h, i) {
      return textCell(2, i + 1, h, 2);
    }), 22));
    var current = "";
    var start = 3;
    CHECKLIST_ITEMS.forEach(function (item, i) {
      var row = i + 3;
      if (item[0] !== current) {
        if (current && start < row - 1) merges.push("A" + start + ":A" + (row - 1));
        current = item[0];
        start = row;
      }
      rows.push(rowXml(row, [
        textCell(row, 1, row === start ? item[0] : "", 3),
        textCell(row, 2, item[1], 1),
        textCell(row, 3, "NA", 3)
      ], 18));
    });
    if (current && start < CHECKLIST_ITEMS.length + 2) merges.push("A" + start + ":A" + (CHECKLIST_ITEMS.length + 2));
    return sheetXml([18, 60, 10], rows, merges);
  }

  function stripDataUrl(dataUrl) {
    var src = String(dataUrl || "");
    var match = src.match(/^data:image\/(png|jpeg|jpg);base64,/i);
    return {
      ext: match && match[1].toLowerCase() === "png" ? "png" : "jpeg",
      base64: src.replace(/^data:image\/(png|jpeg|jpg);base64,/i, "").replace(/\s/g, "")
    };
  }

  function base64ToBytes(base64) {
    var bin = atob(base64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function imageSize(img) {
    var b = img.bytes;
    if (img.ext === "png" && b.length > 24) {
      return {
        w: (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19],
        h: (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]
      };
    }
    if (img.ext === "jpeg") {
      var p = 2;
      while (p + 9 < b.length) {
        if (b[p] !== 0xff) break;
        var marker = b[p + 1];
        var len = (b[p + 2] << 8) + b[p + 3];
        if (marker >= 0xc0 && marker <= 0xc3) {
          return { h: (b[p + 5] << 8) + b[p + 6], w: (b[p + 7] << 8) + b[p + 8] };
        }
        p += 2 + len;
      }
    }
    return { w: 1000, h: 700 };
  }

  function evidenceSheet(body, images) {
    var widths = [14, IMG_COL_WIDTH, IMG_COL_WIDTH, IMG_COL_WIDTH, IMG_COL_WIDTH, IMG_COL_WIDTH, IMG_COL_WIDTH, IMG_COL_WIDTH, IMG_COL_WIDTH];
    var rows = [];
    var merges = ["A1:I1", "B2:I2"];
    rows.push(rowXml(1, [textCell(1, 1, "단위테스트 결과 증빙", 4)], 28));
    rows.push(rowXml(2, [textCell(2, 1, "케이스번호", 2), textCell(2, 2, "테스트 결과 증빙", 2)], 22));
    var areaWidth = 8 * IMG_COL_WIDTH * IMG_COL_PX;
    var currentRow = 3;
    (body.cases || []).forEach(function (tc, idx) {
      var size = imageSize(images[idx]);
      var imgHeight = areaWidth * (size.h / Math.max(size.w, 1));
      var numRows = Math.max(10, Math.ceil(imgHeight / (IMG_ROW_HEIGHT_PT * PT_TO_PX)));
      var endRow = currentRow + numRows - 1;
      merges.push("A" + currentRow + ":A" + endRow);
      for (var r = currentRow; r <= endRow; r++) {
        var cells = r === currentRow ? [textCell(r, 1, pad(tc.caseNumber || idx + 1), 7)] : [];
        for (var c = 2; c <= 9; c++) {
          var style = evidenceBorderStyle(r === currentRow, r === endRow, c === 2, c === 9);
          if (style) cells.push(emptyCell(r, c, style));
        }
        rows.push(rowXml(r, cells, IMG_ROW_HEIGHT_PT));
      }
      currentRow = endRow + 1;
    });
    return sheetXml(widths, rows, merges, body.cases && body.cases.length ? "rId1" : "");
  }

  function evidenceBorderStyle(isTop, isBottom, isLeft, isRight) {
    if (isTop && isLeft) return 12;
    if (isTop && isRight) return 13;
    if (isBottom && isLeft) return 14;
    if (isBottom && isRight) return 15;
    if (isTop) return 8;
    if (isBottom) return 9;
    if (isLeft) return 10;
    if (isRight) return 11;
    return 0;
  }

  function drawingXml(body, images) {
    if (!body.cases || !body.cases.length) return "";
    var areaWidth = 8 * IMG_COL_WIDTH * IMG_COL_PX;
    var currentRow = 3;
    var anchors = [];
    body.cases.forEach(function (tc, idx) {
      var size = imageSize(images[idx]);
      var imgHeight = areaWidth * (size.h / Math.max(size.w, 1));
      var numRows = Math.max(10, Math.ceil(imgHeight / (IMG_ROW_HEIGHT_PT * PT_TO_PX)));
      var endRow = currentRow + numRows - 1;
      anchors.push('<xdr:twoCellAnchor editAs="oneCell">' +
        "<xdr:from><xdr:col>1</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>" + (currentRow - 1) + "</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>" +
        "<xdr:to><xdr:col>9</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>" + endRow + "</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>" +
        '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="' + (idx + 1) + '" name="Evidence ' + (idx + 1) + '"/><xdr:cNvPicPr/></xdr:nvPicPr>' +
        '<xdr:blipFill><a:blip r:embed="rId' + (idx + 1) + '"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>' +
        '<xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>');
      currentRow = endRow + 1;
    });
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" ' +
      'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      anchors.join("") + "</xdr:wsDr>";
  }

  function drawingRels(images) {
    return relsXml(images.map(function (img, i) {
      return {
        id: "rId" + (i + 1),
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
        target: "../media/image" + (i + 1) + "." + img.ext
      };
    }));
  }

  function workbookXml(sheets) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      sheets.map(function (s, i) {
        return '<sheet name="' + esc(cleanSheetName(s)) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
      }).join("") +
      "</sheets></workbook>";
  }

  function relsXml(rels) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      rels.map(function (r) {
        return '<Relationship Id="' + r.id + '" Type="' + r.type + '" Target="' + r.target + '"/>';
      }).join("") +
      "</Relationships>";
  }

  function workbookRels(count) {
    var rels = [];
    for (var i = 1; i <= count; i++) {
      rels.push({
        id: "rId" + i,
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
        target: "worksheets/sheet" + i + ".xml"
      });
    }
    rels.push({
      id: "rId" + (count + 1),
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
      target: "styles.xml"
    });
    return relsXml(rels);
  }

  function rootRels() {
    return relsXml([{
      id: "rId1",
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
      target: "xl/workbook.xml"
    }]);
  }

  function sheet5Rels() {
    return relsXml([{
      id: "rId1",
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
      target: "../drawings/drawing1.xml"
    }]);
  }

  function contentTypes(images) {
    var hasPng = images.some(function (i) { return i.ext === "png"; });
    var hasJpeg = images.some(function (i) { return i.ext === "jpeg"; });
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      (hasPng ? '<Default Extension="png" ContentType="image/png"/>' : "") +
      (hasJpeg ? '<Default Extension="jpeg" ContentType="image/jpeg"/>' : "") +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet5.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      (images.length ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : "") +
      "</Types>";
  }

  function stylesXml() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="5">' +
      '<font><sz val="11"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="10"/><color rgb="FF1E3A5F"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="13"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FF15803D"/><name val="Calibri"/></font>' +
      '</fonts><fills count="4">' +
      '<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFE8F0FE"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/></patternFill></fill>' +
      '</fills><borders count="10"><border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border>' +
      '<border><left/><right/><top style="thin"/><bottom/><diagonal/></border>' +
      '<border><left/><right/><top/><bottom style="thin"/><diagonal/></border>' +
      '<border><left style="thin"/><right/><top/><bottom/><diagonal/></border>' +
      '<border><left/><right style="thin"/><top/><bottom/><diagonal/></border>' +
      '<border><left style="thin"/><right/><top style="thin"/><bottom/><diagonal/></border>' +
      '<border><left/><right style="thin"/><top style="thin"/><bottom/><diagonal/></border>' +
      '<border><left style="thin"/><right/><top/><bottom style="thin"/><diagonal/></border>' +
      '<border><left/><right style="thin"/><top/><bottom style="thin"/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="16">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1"/>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="3" xfId="0" applyBorder="1"/>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="4" xfId="0" applyBorder="1"/>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="5" xfId="0" applyBorder="1"/>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="6" xfId="0" applyBorder="1"/>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="7" xfId="0" applyBorder="1"/>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="8" xfId="0" applyBorder="1"/>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="9" xfId="0" applyBorder="1"/>' +
      '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  }

  var crcTable = null;
  function makeCrcTable() {
    var table = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  }

  function crc32(bytes) {
    crcTable = crcTable || makeCrcTable();
    var crc = 0 ^ -1;
    for (var i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
    return (crc ^ -1) >>> 0;
  }

  function u16(n) {
    return new Uint8Array([n & 255, (n >>> 8) & 255]);
  }

  function u32(n) {
    return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
  }

  function utf8(s) {
    return new TextEncoder().encode(s);
  }

  function concat(parts) {
    var len = parts.reduce(function (sum, p) { return sum + p.length; }, 0);
    var out = new Uint8Array(len);
    var off = 0;
    parts.forEach(function (p) { out.set(p, off); off += p.length; });
    return out;
  }

  function dosDateTime(date) {
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
      date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
  }

  function zip(files) {
    var local = [];
    var central = [];
    var offset = 0;
    var dt = dosDateTime(new Date());
    files.forEach(function (f) {
      var name = utf8(f.name);
      var data = typeof f.data === "string" ? utf8(f.data) : f.data;
      var crc = crc32(data);
      var header = concat([
        u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(dt.time), u16(dt.date),
        u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name
      ]);
      local.push(header, data);
      central.push(concat([
        u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(dt.time), u16(dt.date),
        u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0),
        u16(0), u16(0), u32(0), u32(offset), name
      ]));
      offset += header.length + data.length;
    });
    var centralBytes = concat(central);
    var end = concat([
      u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
      u32(centralBytes.length), u32(offset), u16(0)
    ]);
    return concat(local.concat([centralBytes, end]));
  }

  function normalizeBody(input) {
    var body = input || {};
    body.capturedAt = dateOnly(body.capturedAt);
    body.cases = (body.cases || []).map(function (c, idx) {
      return {
        caseNumber: c.caseNumber || idx + 1,
        imageBase64: c.imageBase64 || c.image || "",
        testItem: c.testItem || "",
        testContent: c.testContent || "",
        expectedResult: c.expectedResult || "",
        programId: c.programId || body.screenId || "",
        verifyMethod: c.verifyMethod || ""
      };
    });
    return body;
  }

  function buildFiles(input) {
    var body = normalizeBody(input);
    var images = body.cases.map(function (tc) {
      var img = stripDataUrl(tc.imageBase64);
      img.bytes = base64ToBytes(img.base64);
      return img;
    });
    var sheets = ["겉표지", "개정이력", "단위테스트케이스", "공통체크리스트", "단위테스트케이스결과증빙"];
    var files = [
      { name: "[Content_Types].xml", data: contentTypes(images) },
      { name: "_rels/.rels", data: rootRels() },
      { name: "xl/workbook.xml", data: workbookXml(sheets) },
      { name: "xl/_rels/workbook.xml.rels", data: workbookRels(sheets.length) },
      { name: "xl/styles.xml", data: stylesXml() },
      { name: "xl/worksheets/sheet1.xml", data: coverSheet(body) },
      { name: "xl/worksheets/sheet2.xml", data: revisionSheet(body) },
      { name: "xl/worksheets/sheet3.xml", data: testCaseSheet(body) },
      { name: "xl/worksheets/sheet4.xml", data: checklistSheet() },
      { name: "xl/worksheets/sheet5.xml", data: evidenceSheet(body, images) }
    ];
    if (images.length) {
      files.push({ name: "xl/worksheets/_rels/sheet5.xml.rels", data: sheet5Rels() });
      files.push({ name: "xl/drawings/drawing1.xml", data: drawingXml(body, images) });
      files.push({ name: "xl/drawings/_rels/drawing1.xml.rels", data: drawingRels(images) });
      images.forEach(function (img, i) {
        files.push({ name: "xl/media/image" + (i + 1) + "." + img.ext, data: img.bytes });
      });
    }
    return files;
  }

  function generateExcel(input) {
    return Promise.resolve(zip(buildFiles(input)));
  }

  function makeFileName(body) {
    return "MAL_" + (body.serviceCode || "서비스코드") +
      "_AC02(단위테스트케이스결과서)_UT_" + (body.screenId || "화면ID") +
      "_" + (body.screenName || "화면명") + "_V1.0.xlsx";
  }

  function downloadExcel(input, fileName) {
    var body = normalizeBody(input);
    return generateExcel(body).then(function (bytes) {
      var blob = new Blob([bytes], { type: XLSX_MIME });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = fileName || makeFileName(body);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return bytes;
    });
  }

  global.UITestEvidenceExcel = {
    captureTab: captureScreen,
    captureScreen: captureScreen,
    generateExcel: generateExcel,
    downloadExcel: downloadExcel,
    makeFileName: makeFileName
  };
})(typeof window !== "undefined" ? window : this);
