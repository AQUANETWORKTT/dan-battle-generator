'use client';
import {createContext,useContext,useEffect,useState,useRef,type ReactNode} from 'react';
import './master-notes.css';
type Note={text:string;revision:string;updatedAt:string};
type NotesContext={notes:Record<string,Note>;ready:boolean;reload:()=>Promise<void>;save:(id:string,text:string)=>Promise<void>};
const Context=createContext<NotesContext|null>(null);
export function MasterNotesProvider({children}:{children:ReactNode}){
 const [notes,setNotes]=useState<Record<string,Note>>({}),[ready,setReady]=useState(false),[error,setError]=useState('');
 async function load(){setError('');try{const response=await fetch('/api/data/master-creator-notes',{cache:'no-store'}),body=await response.json();if(!response.ok)throw Error(body.error);setNotes(body.notes);setReady(true);}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void load();},[]);
 async function save(id:string,text:string){const response=await fetch('/api/data/master-creator-notes',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({creatorId:id,text,revision:notes[id]?.revision||null})}),body=await response.json();if(!response.ok)throw Error(body.error);setNotes(current=>({...current,[id]:body.note}));}
 return <Context.Provider value={{notes,ready,reload:load,save}}>{error&&<div className="master-notes-error" role="alert">{error} <button onClick={()=>void load()}>Reload notes</button></div>}{children}</Context.Provider>;
}
export default function MasterCreatorNotes({creatorId,username}:{creatorId:string;username:string}){
 const context=useContext(Context);
 // Manager pages have no owner provider: no fields, note data or requests.
 if(!context)return null;
 return <Editor key={creatorId} creatorId={creatorId} username={username} context={context}/>;
}
function Editor({creatorId,username,context}:{creatorId:string;username:string;context:NotesContext}){
 const field=useRef<HTMLTextAreaElement>(null);
 const record=context.notes[creatorId],[text,setText]=useState(record?.text||''),[dirty,setDirty]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!dirty)setText(record?.text||'');},[record?.text,dirty]);
 useEffect(()=>{const element=field.current;if(element){element.style.height='auto';element.style.height=Math.max(76,element.scrollHeight)+'px';}},[text,context.ready]);
 async function save(){if(!dirty||saving||!context.ready)return;setSaving(true);setError('');try{await context.save(creatorId,text);setDirty(false);}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
 return <section className="master-creator-notes" aria-label={'Master notes for @'+username}><header><label htmlFor={'master-note-'+creatorId}>Master notes</label><span>{saving?'Saving…':dirty?'Unsaved changes':record?'Saved':'Owner only'}</span></header><textarea ref={field} id={'master-note-'+creatorId} value={text} maxLength={10000} rows={3} disabled={!context.ready||saving} placeholder={context.ready?'Add private notes about this creator…':'Loading master notes…'} onChange={e=>{setText(e.target.value);setDirty(true);}} onBlur={()=>void save()}/><footer>{error&&<><p role="alert">{error}</p><button onClick={()=>void context.reload()}>Reload notes</button></>}<button disabled={!dirty||saving||!context.ready} onClick={()=>void save()}>{saving?'Saving…':'Save notes'}</button></footer></section>;
}
