export const KYRAN_ASH_KEY = "firstclassagencykyranash";
export const KYRAN_ASH_SAVED_KEY = "firstclassagencykyranashoutlookcom";
const aliases = new Set(["firstclassagencykyran", "firstclassagencyash", "ashwalbridgeaolcom", "ashwalbridge", KYRAN_ASH_KEY]);
export function recruitmentManagerIdentity(raw:string):string {
 const key=raw.trim().toLowerCase().replace(/[^a-z0-9]/g, "").replace(/(outlook|gmail|mail)com$/, "");
 return aliases.has(key)?KYRAN_ASH_KEY:key;
}
