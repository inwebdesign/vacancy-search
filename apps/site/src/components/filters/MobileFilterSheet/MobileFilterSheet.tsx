"use client";

import { useEffect, useState } from "react";
import { formatUnitCount } from "@/lib/format";
import styles from "./MobileFilterSheet.module.css";

export interface MobileFilterSheetProps {
  activeFilterCount: number;
  resultCount: number;
  children: React.ReactNode;
}

// Mock 2c (spomenut u README-u, nije priložen): "rail postaje bottom sheet
// otvoren iz dugmeta 'Filter' sa žutom count pilulom, sa fiksnim footer-om
// 'Prikaži N rezultata'". Ovde je isti sadržaj (children = FilterRail-ove
// grupe) renderovan JEDNOM — na desktopu (≥1101px) CSS ga vraća u običan
// inline prikaz bez obzira na `open`, na mobilnom je sakriven dok se ne
// otvori dugme. Filteri se i dalje primenjuju odmah (kao na desktopu, bez
// odloženog "primeni" koraka) — dugme "Prikaži N rezultata" zato samo
// zatvara sheet, rezultati ispod su već ažurni.
export function MobileFilterSheet({
  activeFilterCount,
  resultCount,
  children,
}: MobileFilterSheetProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        Filter
        {activeFilterCount > 0 && <span className={styles.pill}>{activeFilterCount}</span>}
      </button>

      <div className={styles.overlay} data-open={open || undefined}>
        <button
          type="button"
          aria-label="Zatvori filter"
          className={styles.backdrop}
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
        />
        <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Filter">
          <div className={styles.handle} aria-hidden="true" />
          <div className={styles.sheetBody}>{children}</div>
          <div className={styles.sheetFooter}>
            <button type="button" className={styles.apply} onClick={() => setOpen(false)}>
              Prikaži {formatUnitCount(resultCount)}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
