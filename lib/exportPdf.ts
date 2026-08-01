import "client-only";

const A4_LANDSCAPE_WIDTH_MM = 297;
const A4_LANDSCAPE_HEIGHT_MM = 210;

function waitForImages(element: HTMLElement): Promise<void[]> {
  return Promise.all(
    Array.from(element.querySelectorAll("img")).map((image) => {
      if (image.complete) return Promise.resolve();

      return new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function buildPdfFilename(parts: Array<string | null | undefined>): string {
  const slug = parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join("-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "registro"}.pdf`;
}

export async function downloadElementAsPdf(element: HTMLElement, filename: string): Promise<void> {
  const exportContainer = document.createElement("div");
  const clone = element.cloneNode(true) as HTMLElement;

  clone.classList.remove("print-only");
  exportContainer.setAttribute("aria-hidden", "true");
  exportContainer.style.cssText = [
    "position: fixed",
    "left: -100000px",
    "top: 0",
    `width: ${A4_LANDSCAPE_WIDTH_MM}mm`,
    `height: ${A4_LANDSCAPE_HEIGHT_MM}mm`,
    "background: white",
    "pointer-events: none",
  ].join(";");
  exportContainer.appendChild(clone);
  document.body.appendChild(exportContainer);

  try {
    await document.fonts.ready;
    await waitForImages(clone);
    await waitForLayout();

    const { default: html2pdf } = await import("html2pdf.js");
    // Avoid html2pdf rounding an exact A4 canvas onto a blank trailing page.
    const captureHeight = clone.clientHeight - 1;
    const options = {
      margin: 0,
      filename,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: clone.scrollWidth,
        height: captureHeight,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.clientHeight,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "landscape" as const,
      },
      pagebreak: {
        mode: ["css", "legacy"],
        avoid: ["section", ".break-inside-avoid"],
      },
    };

    await html2pdf().set(options).from(clone).save();
  } finally {
    exportContainer.remove();
  }
}
