import { lmsService } from "@/services/lmsService";

/** Extract a clean material title from a file name (PDF or video). */
export function cleanFileNameToTitle(fileName: string): string {
  const withoutExt = fileName.replace(/\.(pdf|mp4|webm|mov|mkv)$/i, "").trim();
  const withSpaces = withoutExt
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return withSpaces.replace(/\b\w/g, (c) => c.toUpperCase()) || fileName;
}

/** Ensure we have a File for upload (FormData/API often expect File; Blob is supported by converting). */
export function toFile(file: File | Blob, defaultName: string): File {
  return file instanceof File
    ? file
    : new File([file], defaultName, {
        type: file.type || "application/octet-stream",
      });
}

/** Fetch material title from YouTube or normal URL via backend (avoids CORS). */
export async function fetchMaterialTitleFromUrl(
  url: string
): Promise<string | null> {
  try {
    const fn = (
      lmsService as { getMaterialTitle?: (u: string) => Promise<string | null> }
    ).getMaterialTitle;
    return fn ? await fn.call(lmsService, url) : null;
  } catch {
    return null;
  }
}

/** Extract raw File/Blob from AntD Upload value or internal state. */
export function extractRawFile(val: any): File | Blob | null {
  if (!val) return null;
  if (val instanceof File || val instanceof Blob) return val;
  if (Array.isArray(val) && val.length > 0) {
    const first = val[0];
    return (first && (first.originFileObj || first)) || null;
  }
  if (
    val.fileList &&
    Array.isArray(val.fileList) &&
    val.fileList.length > 0
  ) {
    const first = val.fileList[0];
    return (first && (first.originFileObj || first)) || null;
  }
  if (val.file) return val.file.originFileObj || val.file;
  return null;
}
