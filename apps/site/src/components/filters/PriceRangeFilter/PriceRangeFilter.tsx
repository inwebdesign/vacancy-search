"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { buildSearchUrl } from "@/lib/offers/query";
import styles from "./PriceRangeFilter.module.css";

export interface PriceRangeFilterProps {
  label: string;
  paramOd: string;
  paramDo: string;
  defaultOd?: number;
  defaultDo?: number;
}

// Skill (Filter, odeljak "Nema slajdera"): dva numerička polja + kompaktno
// OK dugme koje primenjuje uneti opseg — traka pretrage se ne menja dok se
// ne potvrdi. Unos je lokalno stanje do OK-a; posle toga stanje živi u URL-u.
export function PriceRangeFilter({
  label,
  paramOd,
  paramDo,
  defaultOd,
  defaultDo,
}: PriceRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [od, setOd] = useState(defaultOd?.toString() ?? "");
  const [doo, setDoo] = useState(defaultDo?.toString() ?? "");

  // Komponenta ne remontira se između navigacija na istoj ruti (samo se query
  // menja), pa lokalni unos ne bi sam pratio spolja primenjen filter — npr.
  // "Poništi sve" menja URL, ali bi polja ostala da pokazuju stari unos bez
  // ovoga.
  useEffect(() => {
    setOd(defaultOd?.toString() ?? "");
    setDoo(defaultDo?.toString() ?? "");
  }, [defaultOd, defaultDo]);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildSearchUrl(pathname, searchParams, { [paramOd]: od, [paramDo]: doo }));
  }

  return (
    <form className={styles.group} onSubmit={apply}>
      <p className={styles.label}>{label}</p>
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>od</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={od}
            onChange={(e) => setOd(e.target.value)}
            placeholder="unesite"
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>do</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={doo}
            onChange={(e) => setDoo(e.target.value)}
            placeholder="unesite"
            className={styles.input}
          />
        </label>
        <button type="submit" className={styles.ok}>
          OK
        </button>
      </div>
    </form>
  );
}
