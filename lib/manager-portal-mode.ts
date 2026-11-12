// The separate poster button is poster-only; signed-in managers still have full access.
export const MANAGER_POSTER_ONLY=true;
export const MANAGER_POSTER_COOKIE='first-class-manager-posters-only';
export const KJB_PREVIEW_ACCESS=false;
export const MANAGER_RESOURCES_ENABLED=false;
export function fullManagerAccess(account:{manager_key:string}|null|undefined){return !!account;}
