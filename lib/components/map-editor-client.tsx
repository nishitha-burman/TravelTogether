"use client";

import dynamic from "next/dynamic";

export const MapEditor = dynamic(
  () => import("./map-editor").then((m) => m.MapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] rounded-md border border-slate-200 bg-slate-50" />
    )
  }
);
