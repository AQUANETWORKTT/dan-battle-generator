import Dashboard from '@/app/manager/Portal';
import DataAccessGuard from '@/app/components/DataAccessGuard';
import Link from 'next/link';
export default function Page(){return <DataAccessGuard><main className="manager-wrap"><Link className="review-back" href="/data/our-team">← Master Portal</Link><Dashboard owner creators hideQuote/></main></DataAccessGuard>;}
