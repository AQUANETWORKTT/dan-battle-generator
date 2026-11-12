import {hasFullManagerAccess} from '@/lib/manager-portal-access';
import {redirect} from 'next/navigation';
import {MANAGER_POSTER_ONLY,MANAGER_RESOURCES_ENABLED} from '@/lib/manager-portal-mode';
import ResourceLibrary from '../ResourceLibrary';
export default async function Resources(){if(!MANAGER_RESOURCES_ENABLED)redirect('/manager');if(MANAGER_POSTER_ONLY&&!await hasFullManagerAccess())redirect('/manager/posters');return <section><h1 className="manager-title">Resources</h1><ResourceLibrary/></section>;}
