import Directory from './Directory';
import {managerViewAllowed} from '@/lib/available-creators-auth';
export const metadata={title:'marcys available creators portal💼',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function Page({searchParams}:{searchParams:Promise<{access?:string}>}){const {access}=await searchParams;if(!managerViewAllowed(access||null))return <main className="min-h-screen bg-[#080806] p-10 text-white"><h1 className="text-3xl font-bold">Available Creators</h1><p className="mt-4">Ask your team leader for a current manager link. Links last 30 days.</p></main>;return <Directory access={access}/>;}
