type PaginationProps = {
  page: number;
  totalPages: number;
  basePath: string;
};

// Deljena paginacija za admin liste (offers, review). basePath je putanja
// bez query stringa (npr. "/admin/offers") — dodaje se ?page=N.
export function Pagination({ page, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  const baseBtn =
    "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors";
  const activeBtn =
    "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400";
  const disabledBtn =
    "cursor-not-allowed border-gray-100 text-gray-300 bg-gray-50";

  return (
    <nav
      aria-label="Paginacija"
      className="mt-4 flex items-center justify-center gap-4"
    >
      <a
        href={prevDisabled ? undefined : `${basePath}?page=${page - 1}`}
        aria-disabled={prevDisabled}
        tabIndex={prevDisabled ? -1 : undefined}
        className={`${baseBtn} ${prevDisabled ? disabledBtn : activeBtn}`}
      >
        ← Prethodna
      </a>
      <span className="text-sm text-gray-500">
        Strana <span className="font-semibold text-gray-900">{page}</span> od{" "}
        <span className="font-semibold text-gray-900">{totalPages}</span>
      </span>
      <a
        href={nextDisabled ? undefined : `${basePath}?page=${page + 1}`}
        aria-disabled={nextDisabled}
        tabIndex={nextDisabled ? -1 : undefined}
        className={`${baseBtn} ${nextDisabled ? disabledBtn : activeBtn}`}
      >
        Sledeća →
      </a>
    </nav>
  );
}
