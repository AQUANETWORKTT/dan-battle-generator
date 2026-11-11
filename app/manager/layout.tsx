import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {accountForSession,MANAGER_COOKIE} from '@/lib/manager-portal';
import {PortalShell} from './Portal';
export const dynamic='force-dynamic';
export const metadata={title:'First Class · Manager Portal'};
export default async function ManagerLayout({children}:{children:React.ReactNode}){let account=null;try{account=await accountForSession((await cookies()).get(MANAGER_COOKIE)?.value);}catch{}if(!account)redirect('/login/manager');return <PortalShell name={account.display_name}>{children}</PortalShell>;}
