import * as upload from "./import";
import * as query from "./data-query";
import * as status from "./upload-status";
import * as daily from "./daily-stats";
import * as lookup from "./creator-lookup";
import * as mature from "./mature-month-totals";
import * as incremental from "./incremental";
import * as notepad from "./notepad";
import * as strikes from "./strikes";
import * as excluded from "./excluded";
import * as fallbacks from "./fallbacks";
import * as managers from "./managers";
export const atlasHandlers: Record<string, Partial<Record<"GET"|"POST"|"PUT"|"DELETE", (request: Request) => Promise<Response>>>> = {
  "data-query":query,
  "data-analysis/import":upload, "data-analysis/upload-status":status,
  "data-analysis/daily-stats":daily, "daily-stats":daily,
  "data-analysis/creator-lookup":lookup, "data/mature-creators/month-totals":mature,
  "data/incremental-tracking":incremental, "data/notepad":notepad,
  "manager-strikes":strikes, "data-analysis/excluded-creators":excluded,
  "data-analysis/fallback-avatars":fallbacks, "data-analysis/manager-assignments":managers,
  "data-analysis/manager-sources":{GET:managers.sources},
};
