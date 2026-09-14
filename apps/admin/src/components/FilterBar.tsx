type StatusOption = { value: string; label: string };
type AgencyOption = { id: string; naziv: string };

type FilterBarProps = {
  basePath: string;
  q?: string;
  status?: string;
  statusOptions?: StatusOption[];
  agencyId?: string;
  agencies?: AgencyOption[];
};

// Deljena traka za pretragu/filtere (offers, review). Obično <form> — GET
// navigacija, bez JS-a. Namerno nema hidden "page" polje: submit uvek vodi
// na stranu 1 (nova pretraga, stari broj strane više nije relevantan).
export function FilterBar({
  basePath,
  q,
  status,
  statusOptions,
  agencyId,
  agencies,
}: FilterBarProps) {
  const hasActiveFilter = Boolean(q || status || agencyId);

  return (
    <form
      method="get"
      action={basePath}
      className="mt-3 flex flex-wrap items-end gap-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="q" className="text-xs font-medium text-gray-600">
          Pretraga (naziv, destinacija)
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="npr. Vila Estia, Paralia…"
          className="w-64 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>

      {statusOptions && (
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-xs font-medium text-gray-600">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">Svi</option>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {agencies && (
        <div className="flex flex-col gap-1">
          <label htmlFor="agency" className="text-xs font-medium text-gray-600">
            Agencija
          </label>
          <select
            id="agency"
            name="agency"
            defaultValue={agencyId ?? ""}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">Sve</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.naziv}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="submit"
        className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
      >
        Filtriraj
      </button>
      {hasActiveFilter && (
        <a
          href={basePath}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Resetuj
        </a>
      )}
    </form>
  );
}
