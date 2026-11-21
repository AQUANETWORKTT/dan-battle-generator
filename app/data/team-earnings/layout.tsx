import {cookies} from 'next/headers';
import {notFound} from 'next/navigation';
import {SEARCH_COOKIE,searchSessionValid} from '@/lib/creator-api-search/auth';

export default async function EarningsLayout({children}:{children:React.ReactNode}){
 const session=await cookies();
 if(!searchSessionValid(session.get(SEARCH_COOKIE)?.value)||['atlas','events'].includes(process.env.SITE_MODE||''))notFound();
 return children;
}
