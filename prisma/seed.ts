/**
 * Demo data: one account with a realistic job search, so the dashboard, analytics and AI
 * features have something to show. Run with `pnpm db:seed`. Safe to re-run: it deletes the demo
 * user first (cascading to all of their data) and recreates everything.
 *
 * Dates are relative to "now", so the demo always has recent activity and upcoming interviews.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

import {
  type ApplicationStatus,
  type InterviewStatus,
  type InterviewType,
  PrismaClient,
  type WorkMode,
} from "../src/generated/prisma/client";

export const DEMO_EMAIL = "demo@jobtrack.dev";
export const DEMO_PASSWORD = "demo-password-123";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
  // Seeding a known password into production would create an account anyone can log in to.
  console.error("Refusing to seed in production (set ALLOW_PRODUCTION_SEED=true to override).");
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysFromNow = (n: number, hour = 10) => {
  const date = new Date(Date.now() + n * DAY);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
};

const companies = [
  {
    name: "Northwind Labs",
    industry: "Developer Tools",
    location: "Berlin, DE",
    website: "https://northwind.example",
  },
  {
    name: "Brightpath Health",
    industry: "HealthTech",
    location: "Remote",
    website: "https://brightpath.example",
  },
  {
    name: "Cobalt Finance",
    industry: "FinTech",
    location: "London, UK",
    website: "https://cobalt.example",
  },
  {
    name: "Lumen Retail",
    industry: "E-commerce",
    location: "Dubai, AE",
    website: "https://lumen.example",
  },
  {
    name: "Orbit Analytics",
    industry: "Data & AI",
    location: "Bengaluru, IN",
    website: "https://orbit.example",
  },
  {
    name: "Greenleaf Energy",
    industry: "Climate",
    location: "Amsterdam, NL",
    website: "https://greenleaf.example",
  },
  {
    name: "Pixel & Co",
    industry: "Design Agency",
    location: "Remote",
    website: "https://pixelco.example",
  },
  {
    name: "Atlas Logistics",
    industry: "Logistics",
    location: "Kochi, IN",
    website: "https://atlas.example",
  },
] as const;

type CompanyName = (typeof companies)[number]["name"];

type SeedApplication = {
  company: CompanyName;
  jobTitle: string;
  location: string;
  workMode: WorkMode;
  salary?: [number, number, string];
  /** Path through the pipeline, each step with "days after applying". */
  path: [ApplicationStatus, number][];
  appliedDaysAgo: number | null;
  notes?: string[];
  interviews?: { type: InterviewType; at: Date; status: InterviewStatus; interviewer?: string }[];
};

const applications: SeedApplication[] = [
  {
    company: "Northwind Labs",
    jobTitle: "Full-Stack Engineer",
    location: "Berlin, DE",
    workMode: "HYBRID",
    salary: [65000, 80000, "EUR"],
    appliedDaysAgo: 34,
    path: [
      ["APPLIED", 0],
      ["SCREENING", 4],
      ["INTERVIEW", 9],
      ["OFFER", 25],
    ],
    notes: ["Referral from a former colleague.", "Offer received — deadline to respond in 5 days."],
    interviews: [
      {
        type: "PHONE_SCREEN",
        at: daysAgo(29),
        status: "COMPLETED",
        interviewer: "Maria (Recruiter)",
      },
      {
        type: "TECHNICAL",
        at: daysAgo(22),
        status: "COMPLETED",
        interviewer: "Jonas (Staff Engineer)",
      },
      { type: "FINAL", at: daysAgo(12), status: "COMPLETED", interviewer: "CTO" },
    ],
  },
  {
    company: "Brightpath Health",
    jobTitle: "Frontend Developer (React)",
    location: "Remote",
    workMode: "REMOTE",
    salary: [70000, 90000, "USD"],
    appliedDaysAgo: 18,
    path: [
      ["APPLIED", 0],
      ["SCREENING", 3],
      ["INTERVIEW", 8],
    ],
    notes: ["Take-home assignment: build a small patient dashboard."],
    interviews: [
      { type: "PHONE_SCREEN", at: daysAgo(14), status: "COMPLETED", interviewer: "Priya (Talent)" },
      {
        type: "TECHNICAL",
        at: daysFromNow(1, 14),
        status: "SCHEDULED",
        interviewer: "Alex (Frontend Lead)",
      },
    ],
  },
  {
    company: "Cobalt Finance",
    jobTitle: "Backend Engineer (Node.js)",
    location: "London, UK",
    workMode: "HYBRID",
    salary: [60000, 75000, "GBP"],
    appliedDaysAgo: 12,
    path: [
      ["APPLIED", 0],
      ["INTERVIEW", 6],
    ],
    interviews: [
      {
        type: "SYSTEM_DESIGN",
        at: daysFromNow(3, 11),
        status: "SCHEDULED",
        interviewer: "Sam (Principal Engineer)",
      },
    ],
  },
  {
    company: "Orbit Analytics",
    jobTitle: "Software Engineer, AI Platform",
    location: "Bengaluru, IN",
    workMode: "ONSITE",
    salary: [2400000, 3200000, "INR"],
    appliedDaysAgo: 9,
    path: [
      ["APPLIED", 0],
      ["SCREENING", 5],
    ],
    notes: ["Recruiter asked for notice period and expected CTC."],
    interviews: [
      { type: "BEHAVIORAL", at: daysFromNow(6, 9), status: "SCHEDULED", interviewer: "Neha (HR)" },
    ],
  },
  {
    company: "Lumen Retail",
    jobTitle: "Full-Stack Developer",
    location: "Dubai, AE",
    workMode: "ONSITE",
    appliedDaysAgo: 41,
    path: [
      ["APPLIED", 0],
      ["REJECTED", 15],
    ],
    notes: ["Rejected after CV review — role required 5+ years of Java."],
  },
  {
    company: "Greenleaf Energy",
    jobTitle: "Junior Software Engineer",
    location: "Amsterdam, NL",
    workMode: "HYBRID",
    salary: [45000, 55000, "EUR"],
    appliedDaysAgo: 52,
    path: [
      ["APPLIED", 0],
      ["SCREENING", 6],
      ["INTERVIEW", 12],
      ["REJECTED", 20],
    ],
    interviews: [
      { type: "TECHNICAL", at: daysAgo(40), status: "COMPLETED", interviewer: "Team lead" },
    ],
    notes: ["Feedback: strong frontend, wanted more testing experience."],
  },
  {
    company: "Pixel & Co",
    jobTitle: "React Developer",
    location: "Remote",
    workMode: "REMOTE",
    appliedDaysAgo: 10,
    path: [["APPLIED", 0]],
  },
  {
    company: "Atlas Logistics",
    jobTitle: "Software Developer",
    location: "Kochi, IN",
    workMode: "ONSITE",
    appliedDaysAgo: 16,
    path: [["APPLIED", 0]],
    notes: ["Applied through the careers page. No response yet — follow up?"],
  },
  {
    company: "Cobalt Finance",
    jobTitle: "Graduate Developer",
    location: "London, UK",
    workMode: "ONSITE",
    appliedDaysAgo: 75,
    path: [
      ["APPLIED", 0],
      ["REJECTED", 30],
    ],
  },
  {
    company: "Orbit Analytics",
    jobTitle: "Data Engineer",
    location: "Remote",
    workMode: "REMOTE",
    appliedDaysAgo: 64,
    path: [
      ["APPLIED", 0],
      ["SCREENING", 10],
      ["REJECTED", 18],
    ],
  },
  {
    company: "Brightpath Health",
    jobTitle: "Software Engineer, Patient Apps",
    location: "Remote",
    workMode: "REMOTE",
    salary: [80000, 100000, "USD"],
    appliedDaysAgo: 95,
    path: [
      ["APPLIED", 0],
      ["SCREENING", 7],
      ["INTERVIEW", 14],
      ["OFFER", 30],
      ["ACCEPTED", 33],
    ],
    notes: ["Accepted, then the role was frozen — kept here for the record."],
  },
  {
    company: "Northwind Labs",
    jobTitle: "Developer Advocate",
    location: "Berlin, DE",
    workMode: "HYBRID",
    appliedDaysAgo: 3,
    path: [["APPLIED", 0]],
  },
  {
    company: "Greenleaf Energy",
    jobTitle: "Platform Engineer",
    location: "Amsterdam, NL",
    workMode: "HYBRID",
    appliedDaysAgo: null,
    path: [["WISHLIST", 0]],
    notes: ["Waiting for the referral before applying."],
  },
  {
    company: "Pixel & Co",
    jobTitle: "Design Engineer",
    location: "Remote",
    workMode: "REMOTE",
    appliedDaysAgo: null,
    path: [["WISHLIST", 0]],
  },
];

async function main() {
  console.log(`Seeding demo account ${DEMO_EMAIL} ...`);

  // Re-runnable: removing the user cascades to all of their companies, applications, etc.
  await db.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await db.user.create({
    data: {
      id: "demo-user",
      name: "Demo User",
      email: DEMO_EMAIL,
      emailVerified: true,
      timezone: "Asia/Kolkata",
      // Same shape Better Auth creates on sign-up, so the demo can log in through the normal form.
      accounts: {
        create: {
          id: "demo-account",
          accountId: "demo-user",
          providerId: "credential",
          password: await hashPassword(DEMO_PASSWORD),
        },
      },
    },
  });

  const companyIds = new Map<CompanyName, string>();
  for (const company of companies) {
    const created = await db.company.create({ data: { ...company, userId: user.id } });
    companyIds.set(company.name, created.id);
  }

  for (const app of applications) {
    const appliedAt = app.appliedDaysAgo === null ? null : daysAgo(app.appliedDaysAgo);
    const base = appliedAt ?? daysAgo(5);
    const at = (offset: number) => new Date(base.getTime() + offset * DAY);
    const finalStatus = app.path[app.path.length - 1][0];
    const lastChange = at(app.path[app.path.length - 1][1]);

    await db.application.create({
      data: {
        userId: user.id,
        companyId: companyIds.get(app.company)!,
        jobTitle: app.jobTitle,
        jobUrl: `https://jobs.example/${encodeURIComponent(app.jobTitle.toLowerCase().replace(/\W+/g, "-"))}`,
        location: app.location,
        workMode: app.workMode,
        salaryMin: app.salary?.[0],
        salaryMax: app.salary?.[1],
        salaryCurrency: app.salary?.[2],
        status: finalStatus,
        appliedAt,
        createdAt: base,
        updatedAt: lastChange,
        statusChanges: {
          create: app.path.map(([status, offset], index) => ({
            fromStatus: index === 0 ? null : app.path[index - 1][0],
            toStatus: status,
            changedAt: at(offset),
          })),
        },
        notes: {
          // No userId here: the composite relation copies it from the parent application,
          // so a note can never belong to a different user than its application.
          create: (app.notes ?? []).map((content, index) => ({
            content,
            createdAt: at(index + 1),
          })),
        },
        interviews: {
          create: (app.interviews ?? []).map((interview) => ({
            type: interview.type,
            status: interview.status,
            scheduledAt: interview.at,
            durationMinutes: interview.type === "PHONE_SCREEN" ? 30 : 60,
            interviewerName: interview.interviewer,
            meetingUrl: "https://meet.example/demo",
          })),
        },
      },
    });
  }

  const [applicationCount, interviewCount, noteCount] = await Promise.all([
    db.application.count({ where: { userId: user.id } }),
    db.interview.count({ where: { userId: user.id } }),
    db.note.count({ where: { userId: user.id } }),
  ]);
  console.log(
    `Done: ${companies.length} companies, ${applicationCount} applications, ${interviewCount} interviews, ${noteCount} notes.`,
  );
  console.log(`Log in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
