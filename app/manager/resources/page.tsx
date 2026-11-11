import {hasFullManagerAccess} from '@/lib/manager-portal-access';
import {redirect} from 'next/navigation';
import {MANAGER_POSTER_ONLY} from '@/lib/manager-portal-mode';
const sections=[
 {title:'WhatsApp',items:['Welcome messages','Check-in messages','Group chat guidance','Profile pictures']},
 {title:'Onboarding',items:['New creator checklist','First LIVE setup','App introduction','Sign-off messages']},
 {title:'Battles',items:['Battle preparation','Match formats','Power-ups','Networking']},
 {title:'Graphics',items:['Agency branding','Event graphics','Campaign graphics']},
 {title:'LIVE support',items:['Rules and avoiding bans','Consistency and routines','Content ideas','Technical support']},
 {title:'Creator growth',items:['Goal setting','Graduation guidance','Mature creator guidance','Maintaining and ranking up']},
 {title:'Useful links',items:['Agency contacts','Help and support','Reference guides']},
];
export default async function Resources(){if(MANAGER_POSTER_ONLY&&!await hasFullManagerAccess())redirect('/manager/posters');return <section><h1 className="manager-title">Resources</h1><div className="resource-sections">{sections.map(section=><article className="manager-card" key={section.title}><h2>{section.title}</h2><div className="resource-topics">{section.items.map(item=><span key={item}>{item}</span>)}</div>{section.title==='WhatsApp'?<div className="resource-profile-downloads">{['blue','bronze','silver','gold'].map(colour=><a key={colour} href={'/branding/chat-profiles/'+colour+'.png'} download={'First-Class-'+colour+'.png'}><img src={'/branding/chat-profiles/'+colour+'.png'} alt={colour+' profile picture'}/><span>Download {colour}</span></a>)}</div>:<p className="manager-muted">Resources coming soon.</p>}</article>)}</div></section>;}
