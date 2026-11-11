import {hasFullManagerAccess} from '@/lib/manager-portal-access';
import {redirect} from 'next/navigation';
import {MANAGER_POSTER_ONLY} from '@/lib/manager-portal-mode';
import Dashboard from '../Portal';
export default async function Page(){if(MANAGER_POSTER_ONLY&&!await hasFullManagerAccess())redirect('/manager/posters');return <Dashboard creators/>;}
