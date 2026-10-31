"use client";
// The enclosing server layout and every Atlas API handler validate the signed
// Atlas session; this replaces First Class's browser-only Data Space guard.
export default function AtlasGuard({ children }: { children: React.ReactNode }) { return children; }
