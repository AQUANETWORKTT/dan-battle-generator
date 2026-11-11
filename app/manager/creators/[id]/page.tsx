import {hasFullManagerAccess} from '@/lib/manager-portal-access';
import {redirect} from 'next/navigation';
import {MANAGER_POSTER_ONLY} from '@/lib/manager-portal-mode';
import CreatorReview from '../../CreatorReview';
export default async function Page({params}:{params:Promise<{id:string}>}){if(MANAGER_POSTER_ONLY&&!await hasFullManagerAccess())redirect('/manager/posters');return <CreatorReview id={(await params).id}/>;}
