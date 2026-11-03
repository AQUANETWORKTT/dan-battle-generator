import Leaderboard from './Leaderboard';
const title="I'm a Streamer, Get Me OUTTA Here! | Star Leaderboard";
const description='The official First Class jungle star leaderboard. Find your stars, your team and your place in the jungle.';
const image={url:'https://firstclassagency.space/star-tracker/star-leaderboard-share-square-v1.jpg',width:1254,height:1254,type:'image/jpeg',alt:"First Class Agency — I'm a Streamer, Get Me OUTTA Here! — Star Leaderboard"};
export const metadata={title,description,openGraph:{title,description,type:'website',url:'https://firstclassagency.space/star-leaderboard',images:[image]},twitter:{card:'summary' as const,title,description,images:[image.url]}};
export default function StarLeaderboard(){return <Leaderboard/>;}
