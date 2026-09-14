"use client";

import { useState, useTransition } from "react";
import { toggleOfferPause, updateOfferCapacity } from "./actions";

const OFFER_STATUS_LABEL: Record<string, string> = {
  pending_review: "Čeka pregled",
  published: "Objavljeno",
  paused: "Pauzirano",
  rejected: "Odbijeno",
  expired: "Isteklo",
};

export function OfferStatusControl({
  offerId,
  status,
  dostupnoMesta,
}: {
  offerId: string;
  status: string;
  dostupnoMesta: number | null;
}) {
  const [localStatus, setLocalStatus] = useState(status);
  const [mesta, setMesta] = useState(
    dostupnoMesta === null ? "" : String(dostupnoMesta),
  );
  const [pending, startTransition] = useTransition();

  // Pauza/reaktivacija ima smisla samo za već objavljene ponude — sve ostalo
  // (pending_review/rejected/expired) i dalje ide isključivo kroz review queue.
  const canToggle = localStatus === "published" || localStatus === "paused";

  function toggle() {
    const action = localStatus === "published" ? "pause" : "resume";
    startTransition(async () => {
      const result = await toggleOfferPause(offerId, action);
      if (result?.error) {
        alert(result.error);
        return;
      }
      setLocalStatus(action === "pause" ? "paused" : "published");
    });
  }

  function saveMesta() {
    const trimmed = mesta.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    startTransition(async () => {
      const result = await updateOfferCapacity(offerId, parsed);
      if (result?.error) alert(result.error);
    });
  }

  if (!canToggle) {
    return (
      <span className="text-sm text-gray-600">
        {OFFER_STATUS_LABEL[localStatus] ?? localStatus}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={
          localStatus === "paused"
            ? "rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
            : "rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
        }
      >
        {OFFER_STATUS_LABEL[localStatus]}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={toggle}
        className="rounded border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {localStatus === "published" ? "Pauziraj" : "Objavi"}
      </button>
      <input
        type="number"
        min={0}
        step={1}
        value={mesta}
        onChange={(e) => setMesta(e.target.value)}
        onBlur={saveMesta}
        placeholder="mesta"
        disabled={pending}
        title="Dostupno mesta"
        className="w-16 rounded border border-gray-300 px-1.5 py-0.5 text-xs disabled:opacity-50"
      />
    </div>
  );
}
