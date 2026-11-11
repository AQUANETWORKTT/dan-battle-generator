import {MANAGER_POSTER_ONLY,MANAGER_POSTER_COOKIE,fullManagerAccess} from '@/lib/manager-portal-mode';
import {POSTER_COOKIE,posterSessionValid} from '@/lib/poster-generator-auth';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {accountForSession,MANAGER_COOKIE} from '@/lib/manager-portal';
import {PortalShell} from './Portal';
export const dynamic='force-dynamic';
export const metadata={title:'First Class · Manager Portal'};
export default async function ManagerLayout({children}:{children:React.ReactNode}){const jar=await cookies();let account=null;try{account=await accountForSession(jar.get(MANAGER_COOKIE)?.value);}catch{}if(fullManagerAccess(account))return <PortalShell name={account!.display_name} fullAccess>{children}</PortalShell>;if(MANAGER_POSTER_ONLY&&posterSessionValid(jar.get(POSTER_COOKIE)?.value))return <PortalShell>{children}</PortalShell>;if(!account&&MANAGER_POSTER_ONLY){try{account=await accountForSession(jar.get(MANAGER_POSTER_COOKIE)?.value);}catch{}}if(!account)redirect('/login/manager');return <PortalShell name={account.display_name}>{children}</PortalShell>;}
