import 'server-only';
import {cookies} from 'next/headers';
import {accountForSession,MANAGER_COOKIE} from './manager-portal';
import {fullManagerAccess} from './manager-portal-mode';
export async function hasFullManagerAccess(){return fullManagerAccess(await accountForSession((await cookies()).get(MANAGER_COOKIE)?.value));}
