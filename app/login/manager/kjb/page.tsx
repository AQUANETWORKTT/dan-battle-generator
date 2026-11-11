import {redirect} from 'next/navigation';
import {KJB_PREVIEW_ACCESS} from '@/lib/manager-portal-mode';
import KjbLogin from './KjbLogin';
export default function Page(){if(!KJB_PREVIEW_ACCESS)redirect('/login/manager');return <KjbLogin/>;}
