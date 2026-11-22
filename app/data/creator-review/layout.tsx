import {cookies} from 'next/headers';
import {notFound} from 'next/navigation';
import {SEARCH_COOKIE,searchSessionValid} from '@/lib/creator-api-search/auth';
import {MasterNotesProvider} from '../our-team/MasterCreatorNotes';
export default async function Layout({children}:{children:React.ReactNode}){
 if(!searchSessionValid((await cookies()).get(SEARCH_COOKIE)?.value))notFound();
 return <MasterNotesProvider>{children}</MasterNotesProvider>;
}
