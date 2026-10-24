"use client";
export type Stats = { diamonds:number; hours:number; liveDays:number; matches:number };
export type Creator = Stats & { id:string; username:string; manager:string; group:string; days:number; joinedDate:string; startDate?:string; notes?:string; stepNotes?:Record<string,string>; handoverNotes?:string; checklist:boolean[]; weekly:Stats; daily:(Stats & {date:string})[]; reportStart:string; reportEnd:string };
export { default } from "./StepTracker";
