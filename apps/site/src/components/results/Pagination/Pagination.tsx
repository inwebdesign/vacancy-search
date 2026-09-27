import Link from "next/link";
import clsx from "clsx";
import { formatUnitCount } from "@/lib/format";
import styles from "./Pagination.module.css";

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  basePath: string;
  /** Query string trenutne pretrage BEZ "page" ključa (npr. "destinacija=Tasos"). */
  queryWithoutPage: string;
}

const WINDOW = 5;

function hrefFor(basePath: string, queryWithoutPage: string, page: number): string {
  const params = new URLSearchParams(queryWithoutPage);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

// URL-owned paginacija (skill): obični <Link>-ovi, ne router.push, deljivo i
// SEO-vidljivo. Prozor od najviše WINDOW brojeva oko trenutne strane.
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  basePath,
  queryWithoutPage,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const half = Math.floor(WINDOW / 2);
  let start = Math.max(1, page - half);
  const end = Math.min(totalPages, start + WINDOW - 1);
  start = Math.max(1, end - WINDOW + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className={styles.wrap} aria-label="Paginacija rezultata">
      <div className={styles.pages}>
        {pages.map((p) => (
          <Link
            key={p}
            href={hrefFor(basePath, queryWithoutPage, p)}
            className={clsx(styles.page, p === page && styles.pageActive)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </Link>
        ))}
        {page < totalPages && (
          <Link href={hrefFor(basePath, queryWithoutPage, page + 1)} className={styles.page}>
            Sledeća →
          </Link>
        )}
      </div>
      <p className={styles.summary}>
        Prikazano {from}—{to} od {formatUnitCount(total)}
      </p>
    </nav>
  );
}
