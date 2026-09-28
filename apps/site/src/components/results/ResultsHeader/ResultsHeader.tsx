import { formatDateRange, formatUnitCount, formatGuestCount, joinMeta } from "@/lib/format";
import styles from "./ResultsHeader.module.css";

export interface ResultsHeaderProps {
  destinacija?: string;
  datumOd?: string;
  datumDo?: string;
  brojGostiju?: number;
  total: number;
}

// Mock ima "kod N agencija" u podnaslovu — to bi tražilo poseban upit koji
// ništa ne dodaje osim ukrasa (broj se ionako vidi po kartici, nema
// grupisanja); namerno izostavljeno, ne izmišljeno.
export function ResultsHeader({
  destinacija,
  datumOd,
  datumDo,
  brojGostiju,
  total,
}: ResultsHeaderProps) {
  const title = destinacija ? `Apartmani · ${destinacija}` : "Svi apartmani";
  const subtitleParts = [formatUnitCount(total)];
  if (brojGostiju) subtitleParts.push(formatGuestCount(brojGostiju));

  return (
    <div>
      <h1 className={styles.title}>
        {title}
        {datumOd && datumDo && ` · ${formatDateRange(datumOd, datumDo)}`}
      </h1>
      <p className={styles.subtitle}>{joinMeta(subtitleParts)}</p>
    </div>
  );
}
