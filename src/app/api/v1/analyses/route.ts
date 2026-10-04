import { analysisRequestSchema } from "@/features/analysis/schemas";
import { readJson, withAuth } from "@/server/http";
import { analyzeResume, listAnalyses } from "@/server/services/analysis";

// AI calls can take a while; allow up to 2 minutes on serverless hosts.
export const maxDuration = 120;

export const GET = withAuth(async ({ user }) => Response.json(await listAnalyses(user.id)));

/**
 * POST /api/v1/analyses — { resumeId?, applicationId?, jobTitle?, jobDescription? }
 * 201 created · 404 resume/application not yours · 422 invalid input · 429 daily limit or AI busy
 * · 502 bad AI answer · 503 AI unavailable/not configured · 504 AI timeout.
 */
export const POST = withAuth(async ({ request, user }) => {
  const input = analysisRequestSchema.parse(await readJson(request));
  const analysis = await analyzeResume(user.id, input);
  return Response.json(analysis, {
    status: 201,
    headers: { Location: `/api/v1/analyses/${analysis.id}` },
  });
});
