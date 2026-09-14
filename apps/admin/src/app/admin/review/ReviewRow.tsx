"use client";

import { useState, useTransition } from "react";
import { reviewOffer } from "./actions";

type Offer = {
  id: string;
  naziv: string;
  destinacija: string;
  datum_polaska: string;
  datum_povratka: string;
  cena_eur: number;
  max_gostiju: number;
  dostupno_mesta: number | null;
  kontakt_url: string;
  confidence_score: number | null;
  agencyName: string | null;
};

type Fields = {
  naziv: string;
  destinacija: string;
  datum_polaska: string;
  datum_povratka: string;
  cena_eur: string;
  max_gostiju: string;
  dostupno_mesta: string;
  kontakt_url: string;
};

export function ReviewRow({ offer }: { offer: Offer }) {
  const [fields, setFields] = useState<Fields>({
    naziv: offer.naziv,
    destinacija: offer.destinacija,
    datum_polaska: offer.datum_polaska,
    datum_povratka: offer.datum_povratka,
    cena_eur: String(offer.cena_eur),
    max_gostiju: String(offer.max_gostiju),
    dostupno_mesta: offer.dostupno_mesta === null ? "" : String(offer.dostupno_mesta),
    kontakt_url: offer.kontakt_url,
  });
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function submit(decision: "approve" | "reject" | "save") {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.set(k, v));

    startTransition(async () => {
      const result = await reviewOffer(offer.id, decision, null, fd);
      if (result?.error) {
        alert(result.error);
        return;
      }
      if (decision !== "save") setDone(true);
    });
  }

  function field(name: keyof Fields, type = "text", placeholder?: string) {
    return (
      <input
        type={type}
        value={fields[name]}
        placeholder={placeholder}
        onChange={(e) => setFields((f) => ({ ...f, [name]: e.target.value }))}
        disabled={pending || done}
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
      />
    );
  }

  if (done) return null;

  return (
    <tr className="border-b border-gray-100 align-top">
      <td className="py-2 pr-2 text-gray-500">{offer.agencyName ?? "—"}</td>
      <td className="py-2 pr-2">{field("naziv")}</td>
      <td className="py-2 pr-2">{field("destinacija")}</td>
      <td className="py-2 pr-2">{field("datum_polaska", "date")}</td>
      <td className="py-2 pr-2">{field("datum_povratka", "date")}</td>
      <td className="w-20 py-2 pr-2">{field("cena_eur", "number")}</td>
      <td className="w-16 py-2 pr-2">{field("max_gostiju", "number")}</td>
      <td className="w-16 py-2 pr-2">
        {field("dostupno_mesta", "number", "nepoznato")}
      </td>
      <td className="py-2 pr-2">{field("kontakt_url", "url")}</td>
      <td className="py-2 pr-2 text-gray-500">
        {offer.confidence_score ?? "—"}
      </td>
      <td className="py-2 pr-2">
        <div className="flex gap-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => submit("save")}
            className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
          >
            Sačuvaj
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => submit("approve")}
            className="rounded bg-gray-900 px-2 py-1 text-xs text-white disabled:opacity-50"
          >
            Odobri
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => submit("reject")}
            className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
          >
            Odbij
          </button>
        </div>
      </td>
    </tr>
  );
}
