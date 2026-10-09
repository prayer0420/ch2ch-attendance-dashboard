/** Rasterize Google's PDF without OCR, transcription, or a replacement layout. */
export async function sheetPdfToPng(pdf: ArrayBuffer): Promise<Blob> {
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const task = getDocument({ data: pdf, enableXfa: false });
  const pages: HTMLCanvasElement[] = [];
  try {
    const documentPdf = await task.promise;
    if (documentPdf.numPages > 8) throw new Error("시트가 8쪽을 넘습니다. PDF로 저장하거나 시트 인쇄 범위를 확인해 주세요.");
    let pixels = 0;
    for (let index = 1; index <= documentPdf.numPages; index += 1) {
      const page = await documentPdf.getPage(index);
      const viewport = page.getViewport({ scale: 2000 / page.getViewport({ scale: 1 }).width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      pixels += canvas.width * canvas.height;
      if (pixels > 24_000_000) throw new Error("한 장 이미지로 만들기에는 내용이 너무 깁니다. PDF 저장을 이용해 주세요.");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("이미지 변환 화면을 만들지 못했습니다.");
      await page.render({ canvas, canvasContext: context, viewport, background: "white" }).promise;
      const cropped = cropSheetWhitespace(canvas);
      canvas.width = canvas.height = 0;
      if (cropped) pages.push(cropped);
      page.cleanup();
    }
    if (!pages.length) throw new Error("시트 이미지에 표시할 내용이 없습니다.");
    const result = document.createElement("canvas");
    result.width = Math.max(...pages.map((page) => page.width)) + 32;
    result.height = pages.reduce((height, page) => height + page.height, 32);
    const context = result.getContext("2d");
    if (!context) throw new Error("이미지를 합치지 못했습니다.");
    context.fillStyle = "white";
    context.fillRect(0, 0, result.width, result.height);
    let top = 16;
    for (const page of pages) { context.drawImage(page, 16, top); top += page.height; }
    try {
      return await new Promise<Blob>((resolve, reject) => result.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("PNG 저장에 실패했습니다. PDF 저장을 이용해 주세요.")), "image/png"));
    } finally { result.width = result.height = 0; }
  } finally {
    for (const page of pages) page.width = page.height = 0;
    await task.destroy();
  }
}

// Only remove pure outside whitespace; preserve every border, text, and fill.
export function cropSheetWhitespace(canvas: HTMLCanvasElement): HTMLCanvasElement | null {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("시트 이미지 영역을 확인하지 못했습니다.");
  const { width, height } = canvas;
  const { data } = context.getImageData(0, 0, width, height);
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (data[offset + 3] && (data[offset] < 250 || data[offset + 1] < 250 || data[offset + 2] < 250)) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left) return null;
  const cropped = document.createElement("canvas");
  cropped.width = right - left + 1;
  cropped.height = bottom - top + 1;
  const croppedContext = cropped.getContext("2d");
  if (!croppedContext) throw new Error("시트 이미지 영역을 만들지 못했습니다.");
  croppedContext.drawImage(canvas, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
  return cropped;
}
