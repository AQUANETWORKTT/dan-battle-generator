"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DataAccessGuard from "../../components/DataAccessGuard";

type Avatar = { username: string; imageUrl: string };

function readImage(file: File, done: (imageUrl: string) => void) {
  if (!file.type.startsWith("image/")) return;
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const longestSide = 480;
    const scale = Math.min(1, longestSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    done(canvas.toDataURL("image/jpeg", 0.82));
  };
  image.onerror = () => { URL.revokeObjectURL(url); };
  image.src = url;
}

function normalizeUsername(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

export default function FallbackPicturesPage() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [username, setUsername] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [creatorList, setCreatorList] = useState("");
  const [message, setMessage] = useState("Loading fallbacks...");

  useEffect(() => {
    fetch("/api/data-analysis/fallback-avatars", { cache: "no-store" }).then((r) => r.json()).then((data) => {
      setAvatars(data.avatars || []); setMessage("");
    }).catch(() => setMessage("Could not load fallback pictures."));
  }, []);

  async function save(next: Avatar[]) {
    setAvatars(next);
    const response = await fetch("/api/data-analysis/fallback-avatars", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatars: next }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Could not save.");
    setAvatars(data.avatars || next);
    setMessage("Saved.");
  }

  function addCreator() {
    const clean = normalizeUsername(username);
    if (!clean) return setMessage("Add a username first.");
    const existing = avatars.find((item) => item.username === clean);
    setUsername(""); setImageUrl("");
    void save([...avatars.filter((item) => item.username !== clean), { username: clean, imageUrl: imageUrl || existing?.imageUrl || "" }]);
  }

  function addCreatorList() {
    const usernames = Array.from(new Set(
      creatorList.split(/[\s,]+/).map(normalizeUsername).filter(Boolean)
    ));
    if (!usernames.length) return setMessage("Paste at least one creator username.");
    const existingNames = new Set(avatars.map((avatar) => avatar.username));
    const additions = usernames.filter((item) => !existingNames.has(item)).map((item) => ({ username: item, imageUrl: "" }));
    setCreatorList("");
    if (!additions.length) return setMessage("Those creators are already in the fallback list.");
    void save([...avatars, ...additions]);
  }

  function setCreatorPicture(creator: string, file?: File) {
    if (!file?.type.startsWith("image/")) return setMessage("Please use an image file.");
    readImage(file, (nextImage) => void save(avatars.map((item) => item.username === creator ? { ...item, imageUrl: nextImage } : item)));
  }

  function removeAllFallbackPictures() {
    if (!avatars.length) return setMessage("There are no fallback pictures to remove.");
    if (!window.confirm("Remove every queued and saved fallback picture? Picture Check can add new missing creators again later.")) return;
    void save([]);
  }

  const needsPicture = avatars.filter((avatar) => !avatar.imageUrl);
  const readyPictures = avatars.filter((avatar) => avatar.imageUrl);

  return <DataAccessGuard><main className="min-h-screen bg-[#080806] px-5 py-8 text-white sm:px-8"><div className="mx-auto max-w-4xl">
    <Link href="/data/menu" className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">← Data Space</Link>
    <p className="mt-12 text-xs font-black uppercase tracking-[0.3em] text-sky-200/75">Creator assets</p>
    <h1 className="mt-4 font-[family-name:var(--font-norwester)] text-5xl uppercase sm:text-6xl">Fallback <span className="text-yellow-300">Pictures</span></h1>
    <p className="mt-4 text-white/60">Add a creator now and their photo later. Picture Check automatically puts any missing creators in the queue below.</p>
    <button type="button" onClick={removeAllFallbackPictures} disabled={!avatars.length} className="mt-5 rounded-xl border border-red-300/45 bg-red-300/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-100 hover:bg-red-300/20 disabled:cursor-not-allowed disabled:opacity-40">Remove all fallback pictures</button>
    <section className="mt-10 rounded-3xl border border-sky-300/20 bg-white/[0.04] p-5">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Creator username" className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white"/><label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) readImage(file, setImageUrl); }} className="cursor-pointer rounded-xl border border-dashed border-sky-300/40 bg-black/40 px-4 py-3 text-center text-sm text-sky-100">{imageUrl ? "Picture selected — click or drop to replace" : "Choose or drop picture (optional)"}<input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) readImage(file, setImageUrl); }}/></label><button type="button" onClick={addCreator} className="rounded-xl bg-yellow-300 px-5 py-3 text-xs font-black uppercase text-black">Submit creator</button></div>
      <div className="mt-5 rounded-2xl border border-dashed border-sky-300/30 bg-sky-300/5 p-4"><label className="block text-xs font-black uppercase tracking-widest text-sky-100">Paste creator list</label><p className="mt-1 text-sm text-white/55">Paste usernames separated by commas, spaces, or new lines to add everyone to the queue.</p><textarea value={creatorList} onChange={(e) => setCreatorList(e.target.value)} placeholder={"emily17mc\\nsoulbeliever5"} rows={4} className="mt-3 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white"/><button type="button" onClick={addCreatorList} className="mt-3 rounded-xl bg-sky-300 px-5 py-3 text-xs font-black uppercase text-black">Add pasted creators</button></div>
      {message ? <p className="mt-4 text-sm text-yellow-100">{message}</p> : null}
      {needsPicture.length ? <div className="mt-8"><h2 className="text-lg font-black uppercase tracking-widest text-rose-200">Needs a picture</h2><p className="mt-1 text-sm text-white/55">Added by Picture Check or saved without an image. Click or drop a photo onto the matching creator.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{needsPicture.map((avatar) => <label key={avatar.username} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setCreatorPicture(avatar.username, e.dataTransfer.files[0]); }} className="flex cursor-pointer items-center gap-4 rounded-2xl border border-rose-300/25 bg-rose-300/10 p-3"><div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-rose-200/50 text-xl">+</div><span className="flex-1 font-black">@{avatar.username}<span className="mt-1 block text-xs font-normal text-rose-100/70">Click or drop picture</span><a href={`https://www.tiktok.com/@${encodeURIComponent(avatar.username)}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="mt-2 inline-block text-xs font-black text-sky-200 underline underline-offset-2">Open TikTok profile</a></span><input type="file" accept="image/*" className="hidden" onChange={(e) => setCreatorPicture(avatar.username, e.target.files?.[0])}/><button type="button" onClick={(e) => { e.preventDefault(); void save(avatars.filter((item) => item.username !== avatar.username)); }} className="text-xs font-black text-red-200">REMOVE</button></label>)}</div></div> : null}
      <div className="mt-8"><h2 className="text-lg font-black uppercase tracking-widest text-green-200">Pictures ready</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{readyPictures.map((avatar) => <div key={avatar.username} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-3"><img src={avatar.imageUrl} alt="" className="h-14 w-14 rounded-full object-cover"/><span className="flex-1 font-black">@{avatar.username}</span><button type="button" onClick={() => void save(avatars.filter((item) => item.username !== avatar.username))} className="text-xs font-black text-red-300">REMOVE</button></div>)}</div></div>
    </section>
  </div></main></DataAccessGuard>;
}
