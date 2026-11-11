import {GoldBackdrop} from '@/app/components/GoldSpace';

export default function DataLayout({children}:{children:React.ReactNode}){
 return <div className="gold-stage data-gold-theme"><GoldBackdrop/>{children}</div>;
}
