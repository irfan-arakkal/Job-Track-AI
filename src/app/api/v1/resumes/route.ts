import { RESUME_MAX_BYTES } from "@/lib/resumes";
import { AppError } from "@/server/errors";
import { withAuth } from "@/server/http";
import { checkRateLimit } from "@/server/rate-limit";
import { listResumes, uploadResume } from "@/server/services/resumes";

export const GET = withAuth(async ({ user }) => Response.json(await listResumes(user.id)));

/**
 * POST /api/v1/resumes — multipart/form-data with `file` (PDF ≤ 5 MB) and optional `label`.
 * Responses: 201 created · 413 too large · 415 not a PDF · 422 unreadable/limit · 429 rate limited.
 */
export const POST = withAuth(async ({ request, user }) => {
  await checkRateLimit(`upload:${user.id}`, 10, 60 * 60 * 1000); // 10 uploads per hour

  // Reject obviously oversized bodies before reading them into memory.
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > RESUME_MAX_BYTES + 64 * 1024) {
    throw new AppError("The file is larger than 5 MB.", "VALIDATION_ERROR", 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new AppError("Send the file as multipart/form-data.", "VALIDATION_ERROR", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new AppError("Choose a PDF file to upload.", "VALIDATION_ERROR", 400);
  }
  const label = form.get("label");

  const resume = await uploadResume(user.id, {
    fileName: file.name,
    mimeType: file.type,
    bytes: new Uint8Array(await file.arrayBuffer()),
    label: typeof label === "string" ? label : null,
  });
  return Response.json(resume, { status: 201 });
});
