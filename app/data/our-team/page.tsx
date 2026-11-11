import Dashboard from '@/app/manager/Portal';
import DataAccessGuard from '@/app/components/DataAccessGuard';
import Link from 'next/link';
export default function Page(){return <DataAccessGuard><main className="manager-wrap"><Link className="review-back" href="/data/menu">← Data Space</Link><h1 className="manager-title data-space-gold-title">Our Team Management</h1><Dashboard owner hideQuote/></main></DataAccessGuard>;}
