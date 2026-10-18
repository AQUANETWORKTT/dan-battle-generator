export function onboardingDayNumber(start: string, today: string): number {
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const todayTime = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(todayTime)) return 0;
  return Math.max(0, Math.floor((todayTime - startTime) / 86400000) + 1);
}

export function londonToday(): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
