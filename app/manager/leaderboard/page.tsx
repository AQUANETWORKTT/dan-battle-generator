import {hasFullManagerAccess} from '@/lib/manager-portal-access';
import {redirect} from 'next/navigation';
import {MANAGER_POSTER_ONLY} from '@/lib/manager-portal-mode';
import LeaderboardClient from '@/app/recruitment-leaderboard/LeaderboardClient';
import Link from 'next/link';
export default async function Page(){if(MANAGER_POSTER_ONLY&&!await hasFullManagerAccess())redirect('/manager/posters');return <><Link className="review-back" href="/manager">← Manager home</Link><LeaderboardClient portal/></>;}
