import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import Shell from './Shell';
import {SEARCH_COOKIE,searchSessionValid} from '@/lib/creator-api-search/auth';
import {databaseConfigured} from '@/lib/creator-api-search/db';
export const metadata={title:'Creator API Search · First Class Data Space'};
export default async function Layout({children}:{children:React.ReactNode}){const session=await cookies();if(session.get('first-class-space-auth')?.value!=='true'||(databaseConfigured()&&!searchSessionValid(session.get(SEARCH_COOKIE)?.value)))redirect('/login/leadership');return <Shell>{children}</Shell>;}
