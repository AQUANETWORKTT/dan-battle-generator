import DataAccessGuard from '@/app/components/DataAccessGuard';
import ResourceLibrary from '@/app/manager/ResourceLibrary';
import '@/app/manager/portal.css';
import Link from 'next/link';
export default function Page(){return <DataAccessGuard><main className="manager-wrap"><Link className="review-back" href="/data/menu">← Data Space</Link><h1 className="manager-title">Portal Resources</h1><ResourceLibrary owner/></main></DataAccessGuard>;}
