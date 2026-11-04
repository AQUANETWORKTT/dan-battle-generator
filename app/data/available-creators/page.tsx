import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {SEARCH_COOKIE,searchSessionValid} from '@/lib/creator-api-search/auth';
import DataAccessGuard from '@/app/components/DataAccessGuard';
import Directory from '@/app/available-creators/Directory';
export const metadata={title:'Available Creators · First Class Data Space',robots:{index:false,follow:false}};
export default async function Page(){const session=await cookies();if(session.get('first-class-space-auth')?.value!=='true'||!searchSessionValid(session.get(SEARCH_COOKIE)?.value))redirect('/login/leadership');return <DataAccessGuard><Directory admin/></DataAccessGuard>;}
