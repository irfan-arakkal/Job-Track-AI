import "server-only";

import { extractText, getDocumentProxy } from "unpdf";

/** Every PDF file starts with these bytes ("%PDF-"). Checked so a renamed .exe isn't accepted. */
export function hasPdfSignature(bytes: Uint8Array) {
  const signature = [0x25, 0x50, 0x44, 0x46, 0x2d];
  return signature.every((byte, index) => bytes[index] === byte);
}

const MAX_TEXT_LENGTH = 100_000;

/**
 * Extracts the plain text of a PDF (used later by AI analysis). Throws if the file can't be
 * parsed, which also catches corrupted or fake PDFs. Long text is truncated.
 */
export async function extractPdfText(bytes: Uint8Array) {
  // pdf.js takes ownership of the buffer it receives, so give it a copy.
  const document = await getDocumentProxy(new Uint8Array(bytes));
  const { text, totalPages } = await extractText(document, { mergePages: true });
  const normalized = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text: normalized.slice(0, MAX_TEXT_LENGTH), pages: totalPages };
}
