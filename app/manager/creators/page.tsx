import {redirect} from 'next/navigation';
import {MANAGER_POSTER_ONLY} from '@/lib/manager-portal-mode';
import Dashboard from '../Portal';
export default function Page(){if(MANAGER_POSTER_ONLY)redirect('/manager/posters');return <Dashboard creators/>;}
