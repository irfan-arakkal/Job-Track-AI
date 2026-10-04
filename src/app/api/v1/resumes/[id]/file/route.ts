import { withAuth } from "@/server/http";
import { getResumeForDownload } from "@/server/services/resumes";

/**
 * GET /api/v1/resumes/:id/file — streams the PDF to its owner only.
 * There is no public URL for any resume: every download passes this ownership check.
 */
export const GET = withAuth<RouteContext<"/api/v1/resumes/[id]/file">>(
  async ({ request, user, context }) => {
    const { id } = await context.params;
    const resume = await getResumeForDownload(user.id, id);
    const download = new URL(request.url).searchParams.get("download") === "1";
    // RFC 5987 encoding keeps non-ASCII names working and prevents header injection.
    const encodedName = encodeURIComponent(resume.originalFileName);

    return new Response(Buffer.from(resume.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(resume.bytes.byteLength),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodedName}`,
        // Private data: never cache in shared caches, and don't let the browser guess the type.
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        // (No CSP `sandbox` here: it stops Chrome's built-in PDF viewer from rendering the file.
        // The browser's PDF viewer is already isolated, and nosniff stops HTML being "guessed".)
      },
    });
  },
);
