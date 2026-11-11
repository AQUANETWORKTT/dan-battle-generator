export const DEFAULT_AGENCY_TARGET=56706633;
export const INCREMENTAL_LEVELS=[2,3,4,5,7,8,9,10,11,12,13,14,15] as const;
export function parseAgencyTarget(input:string){
 const value=input.trim().replace(/[\s,]/g,'').toLowerCase();
 if(!/^\d+(?:\.\d+)?[km]?$/.test(value))return null;
 const total=Number(value.replace(/[km]$/,''))*(value.endsWith('m')?1000000:value.endsWith('k')?1000:1);
 return Number.isSafeInteger(total)&&total>0&&total<=1000000000000?total:null;
}
export function incrementalTargets(target:number,daysInMonth:number,day:number){
 return INCREMENTAL_LEVELS.map((level,index)=>{const completion=70+index*5;return {label:`${level}% TARGET`,level,completion,monthlyTotal:Math.max(1,Math.round(target*completion/100)),dayTarget:Math.max(1,Math.round(target*completion/100/daysInMonth*day))};});
}
export function incrementalPrediction(actual:number,rows:ReturnType<typeof incrementalTargets>){
 return rows.reduce((reached,row)=>actual>=row.dayTarget?row.level:reached,0);
}
