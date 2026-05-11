export type AdventureTaskStatus = "not_started" | "in_progress" | "completed" | "blocked";

export type AdventureTask = {
  id: string;
  title: string;
  shortDescription: string;
  tool: "cursor" | "claude" | "chatgpt";
  status: AdventureTaskStatus;
  /** 0–100; meaningful when status is in_progress */
  progress: number;
  currentStage: string;
  progressSteps: string[];
  estimatedCompletion: string;
};

export const MOCK_ADVENTURE_TASKS: AdventureTask[] = [
  {
    id: "ns-1",
    title: "Market research analysis",
    shortDescription: "Gather TAM signals and segment notes before synthesis.",
    tool: "cursor",
    status: "not_started",
    progress: 0,
    currentStage: "Queued",
    progressSteps: ["Define scope", "Collect sources", "Draft insights"],
    estimatedCompletion: "Wed · 4:00 PM",
  },
  {
    id: "ns-2",
    title: "Competitor data整理",
    shortDescription: "Normalize pricing pages + feature matrix for 6 rivals.",
    tool: "claude",
    status: "not_started",
    progress: 0,
    currentStage: "Waiting",
    progressSteps: ["Scrape pages", "Normalize table", "Review gaps"],
    estimatedCompletion: "Thu · 11:00 AM",
  },
  {
    id: "ns-3",
    title: "Social media content collection",
    shortDescription: "Save reference posts for tone + visual direction.",
    tool: "chatgpt",
    status: "not_started",
    progress: 0,
    currentStage: "Idle",
    progressSteps: ["Pick channels", "Export samples", "Tag themes"],
    estimatedCompletion: "Fri · 2:30 PM",
  },
  {
    id: "ip-1",
    title: "Blog outline generation",
    shortDescription: "Turn messy bullets into a publishable outline.",
    tool: "chatgpt",
    status: "in_progress",
    progress: 65,
    currentStage: "Structuring sections",
    progressSteps: ["Brainstorm angles", "Outline H2/H3", "Add CTAs"],
    estimatedCompletion: "Today · 6:00 PM",
  },
  {
    id: "ip-2",
    title: "Image material search",
    shortDescription: "Find royalty-safe references for hero + inline art.",
    tool: "cursor",
    status: "in_progress",
    progress: 40,
    currentStage: "Collecting references",
    progressSteps: ["Define moodboard", "Search libraries", "Shortlist"],
    estimatedCompletion: "Today · 8:30 PM",
  },
  {
    id: "ip-3",
    title: "Data analysis processing",
    shortDescription: "Clean CSV + chart anomalies for weekly report.",
    tool: "claude",
    status: "in_progress",
    progress: 75,
    currentStage: "Running checks",
    progressSteps: ["Import data", "Validate columns", "Plot trends"],
    estimatedCompletion: "Tomorrow · 9:00 AM",
  },
  {
    id: "ip-4",
    title: "Copywriting draft",
    shortDescription: "First-pass landing copy aligned to outline v2.",
    tool: "chatgpt",
    status: "in_progress",
    progress: 20,
    currentStage: "Drafting",
    progressSteps: ["Hero", "Feature grid", "FAQ"],
    estimatedCompletion: "Tomorrow · 3:00 PM",
  },
  {
    id: "bk-1",
    title: "Model output validation",
    shortDescription: "Tool returned malformed schema; waiting for rerun.",
    tool: "cursor",
    status: "blocked",
    progress: 55,
    currentStage: "Blocked by schema mismatch",
    progressSteps: ["Run validation", "Check schema", "Retry generation"],
    estimatedCompletion: "Unknown · blocked",
  },
  {
    id: "cp-1",
    title: "Project proposal completed",
    shortDescription: "Signed-off PDF stored in shared drive.",
    tool: "claude",
    status: "completed",
    progress: 100,
    currentStage: "Delivered",
    progressSteps: ["Outline", "Draft", "Review", "Export PDF"],
    estimatedCompletion: "Done · Mon",
  },
  {
    id: "cp-2",
    title: "Logo design completed",
    shortDescription: "Vector pack + monochrome variants delivered.",
    tool: "cursor",
    status: "completed",
    progress: 100,
    currentStage: "Delivered",
    progressSteps: ["Sketches", "Vectorize", "Color tests", "Export"],
    estimatedCompletion: "Done · Tue",
  },
  {
    id: "cp-3",
    title: "Summary draft completed",
    shortDescription: "Exec summary v1 approved by stakeholders.",
    tool: "chatgpt",
    status: "completed",
    progress: 100,
    currentStage: "Delivered",
    progressSteps: ["Notes", "Draft", "Edits", "Approve"],
    estimatedCompletion: "Done · Tue",
  },
  {
    id: "cp-4",
    title: "Marketing strategy completed",
    shortDescription: "Channel mix + KPI table ready for Q3.",
    tool: "cursor",
    status: "completed",
    progress: 100,
    currentStage: "Delivered",
    progressSteps: ["Goals", "Channels", "Budget", "KPIs"],
    estimatedCompletion: "Done · Wed",
  },
];

export function countByStatus(tasks: AdventureTask[]) {
  return tasks.reduce(
    (acc, t) => {
      acc[t.status] += 1;
      return acc;
    },
    { not_started: 0, in_progress: 0, completed: 0, blocked: 0 },
  );
}
