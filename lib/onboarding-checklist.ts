// Existing checklist positions are retained so saved progress remains valid.
export const onboardingSections: { title: string; tasks: readonly (readonly [number, string])[] }[] = [
  { title: "Week 1 · Welcome & foundations", tasks: [
    [23, "Onboarding call notes sent to chat"], [24, "Profile audit completed"],
    [13, "First Class app sent"], [16, "LIVE setup reviewed"], [25, "Content reviewed"],
    [17, "LIVE schedule spoken about"], [18, "LIVE reviewed"],
    [20, "Week 1 check-in & feedback completed"],
  ] },
  { title: "Week 2 · Development & level up", tasks: [
    [26, "Mini goals set"], [27, "LIVE progress review completed"],
    [28, "Growth & community covered"], [29, "Creator check-in"],
    [30, "Review mini goals"], [31, "Final LIVE/content review completed"],
    [32, "14-day review & feedback completed"],
  ] },
] as const;
export const ONBOARDING_CHECKLIST_LENGTH = 34;
