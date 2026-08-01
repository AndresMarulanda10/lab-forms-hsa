import "client-only";

const EXPORT_WIDTH_PX = 1120;

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
    `width: ${EXPORT_WIDTH_PX}px`,
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
    const options = {
      margin: 5,
      filename,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
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
