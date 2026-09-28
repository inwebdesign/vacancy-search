"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Checkbox } from "@/components/ui/Checkbox";
import { buildSearchUrl } from "@/lib/offers/query";
import type { AgencyFacet } from "@/lib/offers/search";
import styles from "./AgencyFilter.module.css";

export interface AgencyFilterProps {
  facets: AgencyFacet[];
  selected: string[];
}

const VISIBLE_DEFAULT = 5;

// Checkbox primenjuje odmah (za razliku od cenovnog opsega, nema OK dugmeta
// — skill: samo range grupe traže potvrdu). Pretraga unutar liste je čisto
// klijentska (ne menja URL/rezultate), filtrira već učitane facete.
export function AgencyFilter({ facets, selected }: AgencyFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? facets.filter((f) => f.naziv.toLowerCase().includes(q)) : facets;
  }, [facets, query]);

  const visible = expanded || query ? filtered : filtered.slice(0, VISIBLE_DEFAULT);

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    router.push(buildSearchUrl(pathname, searchParams, { agencija: next }));
  }

  if (facets.length === 0) return null;

  return (
    <div className={styles.group}>
      <p className={styles.label}>Agencija</p>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="pretraži agenciju"
        className={styles.search}
      />
      <div className={styles.list}>
        {visible.map((f) => (
          <Checkbox
            key={f.id}
            label={f.naziv}
            trailing={f.count}
            checked={selected.includes(f.id)}
            onChange={() => toggle(f.id)}
          />
        ))}
        {visible.length === 0 && <p className={styles.empty}>Nema poklapanja.</p>}
      </div>
      {!expanded && !query && filtered.length > VISIBLE_DEFAULT && (
        <button type="button" className={styles.more} onClick={() => setExpanded(true)}>
          Prikaži svih {filtered.length} →
        </button>
      )}
    </div>
  );
}
