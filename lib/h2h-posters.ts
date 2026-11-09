export type H2HMatchup = { id: string; line: number; name1: string; name2: string; name3?: string; name4?: string; minutes: number };
export type H2HPoster = {
  id: string; date: string; manager: string; name1: string; name2: string;
  time: string; image1: string; image2: string;
  name3?: string; name4?: string; image3?: string; image4?: string;
};
export type H2HTiming = { fillMissing: boolean; start: string; interval: number };

export function h2hMinutes(raw: string): number | null {
  const match = raw.trim().match(/^(\d{1,2})(?::([0-5]\d))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  if (match[3]) {
    if (hour < 1 || hour > 12) return null;
    hour = hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  } else if (hour > 23) return null;
  return hour * 60 + Number(match[2] || 0);
}

export function h2hTime(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 1440) throw Error('Choose a time within the selected day.');
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour % 12 || 12}${minute ? ':' + String(minute).padStart(2, '0') : ''}${hour >= 12 ? 'PM' : 'AM'}`;
}

export function h2hInputTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function h2hDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? 'TH' : (['TH','ST','ND','RD'][day % 10] || 'TH');
  return `${date.toLocaleDateString('en-GB',{weekday:'long',timeZone:'UTC'})} ${day}${suffix} ${date.toLocaleDateString('en-GB',{month:'long',timeZone:'UTC'})}`.toUpperCase();
}

function username(raw: string): string {
  const link = raw.trim().match(/^https?:\/\/(?:www\.)?tiktok\.com\/@([^/?#]+)(?:[/?#].*)?$/i);
  const value = (link ? link[1] : raw.trim()).replace(/^@/, '');
  return /^[a-zA-Z0-9._]{1,24}$/.test(value) ? value : '';
}

export function parseH2H(text: string, timing: H2HTiming) {
  const rows: H2HMatchup[] = [], errors: string[] = [];
  let matchIndex = 0;
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim().replace(/\*\*/g, '');
    if (!line || /^[|\s:\-]+$/.test(line)) return;
    let parts = line.includes('|') ? line.replace(/^\|/, '').replace(/\|$/, '').split('|') : line.includes('\t') ? line.split('\t') : line.includes(',') ? line.split(',') : line.split(/\s+/);
    parts = parts.map(part => part.trim().replace(/^"|"$/g,''));
    if (parts.length === 4 && /^(AM|PM)$/i.test(parts[1])) parts.splice(0,2,parts[0] + parts[1]);
    if (parts.length === 4 && /^(AM|PM)$/i.test(parts[3])) parts.splice(2,2,parts[2] + parts[3]);
    if (parts.length >= 2 && /^(time|start time|creator ?1|username ?1|creator ?a)$/i.test(parts[0])) return;
    const rowIndex = matchIndex++;
    let first = '', second = '', time = '';
    if (parts.length === 2) [first,second] = parts;
    else if (parts.length === 3 && h2hMinutes(parts[0]) !== null) [time,first,second] = parts;
    else if (parts.length === 3 && h2hMinutes(parts[2]) !== null) [first,second,time] = parts;
    else if (parts.length === 3 && !parts[0]) [,first,second] = parts;
    else if (parts.length === 3 && !parts[2]) [first,second] = parts;
    else { errors.push(`Line ${index+1}: use Time, Creator 1, Creator 2 (or two usernames with interval timing).`); return; }
    const name1 = username(first), name2 = username(second);
    if (!name1 || !name2) { errors.push(`Line ${index+1}: check both usernames; spelling, dots and underscores are kept exactly.`); return; }
    let minutes = time ? h2hMinutes(time) : null;
    if (!time && timing.fillMissing) {
      const start = h2hMinutes(timing.start);
      if (start !== null && Number.isInteger(timing.interval) && timing.interval >= 1 && timing.interval <= 1440) minutes = start + rowIndex * timing.interval;
    }
    if (minutes === null || minutes >= 1440) { errors.push(`Line ${index+1}: add a valid time or a start time and interval; times cannot roll into the next day.`); return; }
    rows.push({id:`h2h-row-${index+1}`,line:index+1,name1,name2,minutes});
  });
  return {rows, errors};
}

export function validateH2H(rows: H2HMatchup[]) {
  const errors: string[] = [], warnings: string[] = [], seen = new Set<string>(), creators = new Map<string, number[]>();
  for (const row of rows) {
    const names = [row.name1.toLowerCase(),row.name2.toLowerCase()];
    if (names[0] === names[1]) errors.push(`Line ${row.line}: a creator cannot face themselves.`);
    const key = names.slice().sort().join('|') + '|' + row.minutes;
    if (seen.has(key)) errors.push(`Line ${row.line}: duplicate matchup at ${h2hTime(row.minutes)} (including reversed pairs).`);
    seen.add(key);
    for (const name of names) creators.set(name,[...(creators.get(name) || []),row.line]);
  }
  for (const [name, lines] of creators) if (lines.length > 1) warnings.push(`${name} appears on lines ${lines.join(', ')}. Check this is intentional.`);
  return {errors, warnings};
}

export function h2hPosters(rows: H2HMatchup[], iso: string, images: Record<string,string>): H2HPoster[] {
  const date = h2hDate(iso);
  if (!date) throw Error('Choose a valid event date.');
  const validation = validateH2H(rows);
  if (validation.errors.length) throw Error(validation.errors.join('\n'));
  return rows.flatMap(row => {
    const battle: H2HPoster = {id:row.id+'-a', manager:'H2H',date,time:h2hTime(row.minutes),name1:row.name1.toUpperCase(),name2:row.name2.toUpperCase(),image1:images[row.name1.toLowerCase()] || '',image2:images[row.name2.toLowerCase()] || ''};
    return [battle,{...battle,id:row.id+'-b',name1:battle.name2,name2:battle.name1,image1:battle.image2,image2:battle.image1}];
  });
}

export function h2hFilename(battle: H2HPoster, index: number) {
  return `${String(index+1).padStart(3,'0')}-${battle.name1}-vs-${battle.name2}-${battle.date}-${battle.time}.png`.replace(/[^a-zA-Z0-9._-]/g,'-');
}

export const H2H_EXAMPLE = `8:00 PM\tdens2511\tItsriverlea
8:05 PM\tpenii1722\tdad.of.286
8:10 PM\tsmilie848\thannakingwoodward
8:15 PM\tmelissaah1997\tbalmyhercules94
8:20 PM\tcrazyredbullqueen\tx_cj_tokens_x
8:25 PM\tcourtsxox33\tmracreator0
8:30 PM\tSallytuffery69\ttommyj927
8:35 PM\tcrazy_jess5\talfie.434
8:40 PM\trobinsspiritscrafts\tdeaks89
8:45 PM\trichied1982\tgemmaabyrne
8:50 PM\tamyleigh207\tfreddie.toll1
8:55 PM\tmynameisjeff1241\tmattzboy
9:00 PM\tliv_mc3\tleahcooper203
9:05 PM\thollyshepherd7\txemzfirstclassx
9:10 PM\tellysiapaige.h\tchunk_0777
9:15 PM\tcraigbowdenjr\tsherrie1994`;
