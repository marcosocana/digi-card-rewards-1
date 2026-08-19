import QRCode from "qrcode";

export const qrPngDataUrl = (text: string, color = "#3B2415") =>
  QRCode.toDataURL(text, { width: 900, margin: 2, color: { dark: color, light: "#FFFFFF" } });

export const qrSvgString = (text: string, color = "#3B2415") =>
  QRCode.toString(text, { type: "svg", margin: 2, color: { dark: color, light: "#FFFFFF" } });

export const downloadDataUrl = (dataUrl: string, filename: string) => {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
};

export const downloadText = (content: string, filename: string, mime = "image/svg+xml") => {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
