import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {STAR_COOKIE,starSessionValid} from '@/lib/star-tracker-auth';
import Tracker from './Tracker';
export const metadata={title:"I'm a Streamer, Get Me OUTTA Here! – Star Tracker"};
export default async function StarTrackerPage(){
 if(!starSessionValid((await cookies()).get(STAR_COOKIE)?.value))redirect('/login/streamer');
 return <Tracker/>;
}
