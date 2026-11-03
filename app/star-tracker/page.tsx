import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {starAccess} from '@/lib/star-tracker-auth';
import Tracker from './Tracker';
export const metadata={title:"I'm a Streamer, Get Me Out of Here! – Star Tracker"};
export default async function StarTrackerPage(){
 if(!starAccess(await cookies()))redirect('/login/onboarding?next=/star-tracker');
 return <Tracker/>;
}
