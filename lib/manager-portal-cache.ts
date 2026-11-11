import 'server-only';
import {invalidateLocalPortal} from './local-portal-snapshot';
import {revalidateTag} from 'next/cache';
export const PORTAL_DATA_TAG='first-class-portal-data';
export function invalidatePortalData(){invalidateLocalPortal();revalidateTag(PORTAL_DATA_TAG,{expire:0});}
