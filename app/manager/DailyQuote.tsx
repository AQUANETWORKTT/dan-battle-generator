'use client';
import {useEffect,useState} from 'react';
import './portal.css';
import {dailyQuote} from '@/lib/daily-quotes';
export default function DailyQuote({loading,seed=0}:{loading:boolean;seed?:number}){const [quote,setQuote]=useState<string>(()=>dailyQuote(new Date(),seed));useEffect(()=>{setQuote(dailyQuote(new Date(),seed));const timer=setInterval(()=>setQuote(dailyQuote(new Date(),seed)),60000);return()=>clearInterval(timer);},[seed]);return <header className="portal-daily-quote"><blockquote>“{quote}”</blockquote>{loading&&<div className="manager-loading-creators" role="status" aria-live="polite"><span aria-hidden="true"/>Loading data…</div>}</header>;}

