import CreatorReview from '@/app/manager/CreatorReview';
export default async function Page({params}:{params:Promise<{id:string}>}){return <main className="manager-wrap"><CreatorReview owner id={(await params).id}/></main>;}
