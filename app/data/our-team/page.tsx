import Dashboard from '@/app/manager/Portal';
import DataAccessGuard from '@/app/components/DataAccessGuard';
import Link from 'next/link';
import MasterRemindersButton from '@/app/manager/MasterRemindersButton';
export default function Page(){return <DataAccessGuard><main className="manager-wrap"><Link className="review-back" href="/data/menu">← Data Space</Link><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}><h1 className="manager-title data-space-gold-title">Master Portal</h1><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><Link className="manager-button" href="/data/our-team/creators">View Creators →</Link><MasterRemindersButton /></div></div><Dashboard owner hideQuote/></main></DataAccessGuard>;}
