import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import BattleGenerator from '../generator/BattleGenerator';
import {POSTER_COOKIE,posterSessionValid} from '@/lib/poster-generator-auth';
export const metadata={title:'First Class · Manager Poster Generator'};
export default async function PosterGeneratorPage(){
  if(!posterSessionValid((await cookies()).get(POSTER_COOKIE)?.value))redirect('/login/poster-generator');
  return <BattleGenerator generationOnly/>;
}
