import { FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumeCard } from "@/features/resumes/components/resume-card";
import { ResumeUpload } from "@/features/resumes/components/resume-upload";
import { listResumes } from "@/server/services/resumes";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Resumes" };

export default async function ResumesPage() {
  const user = await requireUser();
  const resumes = await listResumes(user.id);

  return (
    <>
      <PageHeader
        title="Resumes"
        description="Keep every version in one place. Your primary resume is used by default for AI analysis."
        actions={
          <Button asChild variant="outline">
            <Link href="/resumes/analyze">
              <Sparkles /> Analyse with AI
            </Link>
          </Button>
        }
      />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Upload a resume</h2>
            </CardTitle>
            <CardDescription>
              PDF only, up to 5 MB. Files are private to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResumeUpload />
          </CardContent>
        </Card>
        {resumes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No resumes yet"
            description="Upload your first resume above. It becomes your primary resume automatically."
          />
        ) : (
          <section aria-labelledby="your-resumes">
            <h2 id="your-resumes" className="text-muted-foreground mb-3 text-sm font-semibold">
              Your resumes ({resumes.length})
            </h2>
            <ul className="grid gap-3">
              {resumes.map((resume) => (
                <ResumeCard key={resume.id} resume={resume} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
