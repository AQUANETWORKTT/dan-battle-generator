export function chatProfileColour(days:number|null,previousDiamonds:number){
 if(days===null)return {key:'unknown',label:'Join date unavailable'};
 if(days<15)return {key:'new',label:'Light blue · under 15 days'};
 if(previousDiamonds>=500000)return {key:'gold',label:'Gold · 500,000+ last month'};
 if(previousDiamonds>=100000)return {key:'silver',label:'Silver · 100k–499,999 last month'};
 return {key:'bronze',label:'Bronze · below 100k last month'};
}
