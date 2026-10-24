export const onboardingSteps = [
  { day: 1, title: "New Creators", advice: "Add creator to onboarding chat", legacy: [] },
  { day: 2, title: "Introduction & App", advice: "Introduce myself and send the app", legacy: [13] },
  { day: 3, title: "Live Setup", advice: "Discuss lighting, camera angle, background, audio and internet", legacy: [16] },
  { day: 4, title: "Schedule & Consistency", advice: "Discuss going Live, schedules and consistency", legacy: [17] },
  { day: 5, title: "Rules & Behaviour", advice: "Explain behaviour, rules and avoiding bans", legacy: [] },
  { day: 6, title: "Battles & Networking", advice: "Discuss battles, power-ups and networking", legacy: [28] },
  { day: 7, title: "Mini Goals", advice: "Set small Diamonds and Live hours goals for week 2", legacy: [26] },
  { day: 8, title: "Profile Audit", advice: "Audit profile photo, display name, username and bio", legacy: [24] },
  { day: 9, title: "Content Advice", advice: "Discuss content and posting before going Live", legacy: [25] },
  { day: 10, title: "Check-In", advice: "Check in, ask how they are finding it and answer questions", legacy: [29] },
  { day: 11, title: "Goal Review", advice: "Review their mini goals", legacy: [30] },
  { day: 12, title: "Sign-Off", advice: "Final review and sign-off", legacy: [32] },
] as const;
export type StepProgress = { currentStep?: number; completedSteps?: number[]; stepNotes?: Record<string, string>; checklist: boolean[] };
export function onboardingStep(progress: StepProgress): number {
  if (Number.isInteger(progress.currentStep) && progress.currentStep! >= 1 && progress.currentStep! <= 12) return progress.currentStep!;
  // The new workflow starts everyone at Step 1; old ticks remain historical.
  return 1;
}
export function completeOnboardingStep<T extends StepProgress>(progress: T): T {
  const step = onboardingStep(progress), checklist = [...progress.checklist];
  for (const id of onboardingSteps[step - 1].legacy) checklist[id] = true;
  return { ...progress, checklist, currentStep: Math.min(12, step + 1), completedSteps: [...new Set([...(progress.completedSteps || []), step])] };
}
