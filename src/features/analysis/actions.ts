"use server";

import { revalidatePath } from "next/cache";

import { analysisRequestSchema } from "@/features/analysis/schemas";
import { runAction } from "@/server/actions";
import { analyzeResume, deleteAnalysis } from "@/server/services/analysis";
import { requireUser } from "@/server/session";

export async function analyzeResumeAction(values: unknown) {
  return runAction(async () => {
    const user = await requireUser();
    const input = analysisRequestSchema.parse(values);
    const analysis = await analyzeResume(user.id, input);
    revalidatePath("/resumes/analyze");
    return { id: analysis.id };
  });
}

export async function deleteAnalysisAction(id: string) {
  return runAction(async () => {
    const user = await requireUser();
    await deleteAnalysis(user.id, id);
    revalidatePath("/resumes/analyze");
    return undefined;
  });
}
