// The PNG is already prepared before the click, preserving browser user activation.
export async function savePng(blob: Blob, url: string, filename: string): Promise<string> {
  if (typeof File !== "undefined" && typeof navigator.share === "function" && typeof navigator.canShare === "function" && window.matchMedia("(pointer: coarse)").matches) {
    const file = new File([blob], filename, { type: "image/png" });
    let supported = false;
    try { supported = navigator.canShare({ files: [file] }); } catch { /* Use download. */ }
    if (supported) {
      try { await navigator.share({ files: [file] }); return "图片已交给系统处理。"; }
      catch (error) {
        if (error instanceof Error && error.name === "AbortError") return "已取消保存或分享。也可以长按图片保存。";
        return "系统保存未能打开，请长按上方图片保存。";
      }
    }
  }
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return "已准备好 PNG。若没有下载提示，请长按上方图片保存。";
}
