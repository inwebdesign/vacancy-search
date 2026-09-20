import { describe, it, expect, beforeAll } from "vitest";
import { searchOffers, type PublicOffer } from "./search";
import { PAGE_SIZE, type SearchParams } from "./params";
import { createPublicClient } from "@/lib/supabase/public";

// Integracioni testovi: gađaju pravu dev bazu preko anon ključa (kao i RLS
// provere u projektu). Model-based: povuku SVE ponude jednom, pa proveravaju
// da svaki SQL filter vraća tačno isto što bi vratio običan JS filter nad
// istim podacima — ne zavise od konkretnih vrednosti u bazi, samo traže da
// u bazi ima objavljenih ponuda.

const ALL_TIME = "2000-01-01"; // isključuje filter "prošli polazak" za potrebe testa
const P = (over: Partial<SearchParams> = {}): SearchParams => ({ page: 1, ...over });

async function fetchAll(
  params: Partial<SearchParams> = {},
  today = ALL_TIME,
): Promise<{ all: PublicOffer[]; total: number }> {
  const first = await searchOffers(P(params), { today });
  const all = [...first.offers];
  for (let page = 2; page <= first.totalPages; page++) {
    all.push(...(await searchOffers(P({ ...params, page }), { today })).offers);
  }
  return { all, total: first.total };
}

let ALL: PublicOffer[];
beforeAll(async () => {
  ALL = (await fetchAll()).all;
  expect(ALL.length, "u bazi mora biti objavljenih ponuda").toBeGreaterThan(0);
});

describe("oblik rezultata", () => {
  it("vraća samo javna polja i uvek izvor (ime agencije)", () => {
    expect(Object.keys(ALL[0]).sort()).toEqual(
      [
        "agencija",
        "azurirano",
        "cenaEur",
        "cenaPoOsobi",
        "cenaTip",
        "datumPolaska",
        "datumPovratka",
        "destinacija",
        "dostupnoMesta",
        "id",
        "maxGostiju",
        "naziv",
      ].sort(),
    );
    for (const o of ALL) expect(typeof o.agencija).toBe("string");
  });

  it("izvedena cena po osobi je tačna za oba tipa cene", () => {
    for (const o of ALL) {
      expect(["po_osobi", "po_jedinici"]).toContain(o.cenaTip);
      const expected =
        o.cenaTip === "po_jedinici"
          ? Math.round((o.cenaEur / Math.max(o.maxGostiju, 1)) * 100) / 100
          : o.cenaEur;
      expect(o.cenaPoOsobi).toBeCloseTo(expected, 2);
    }
  });

  it("brojevi su brojevi, datumi YYYY-MM-DD", () => {
    for (const o of ALL) {
      expect(typeof o.cenaEur).toBe("number");
      expect(typeof o.cenaPoOsobi).toBe("number");
      expect(typeof o.maxGostiju).toBe("number");
      expect(o.datumPolaska).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(o.datumPovratka).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("redosled i paginacija", () => {
  it("najjeftinije prvo po ceni PO OSOBI, stabilno (isti iznos → po id) kroz sve strane", () => {
    for (let i = 1; i < ALL.length; i++) {
      const a = ALL[i - 1];
      const b = ALL[i];
      expect(a.cenaPoOsobi <= b.cenaPoOsobi).toBe(true);
      if (a.cenaPoOsobi === b.cenaPoOsobi) expect(a.id < b.id).toBe(true);
    }
  });

  it("strane se ne preklapaju, total i totalPages su tačni", async () => {
    const first = await searchOffers(P(), { today: ALL_TIME });
    expect(first.pageSize).toBe(PAGE_SIZE);
    expect(first.total).toBe(ALL.length);
    expect(first.totalPages).toBe(Math.max(1, Math.ceil(ALL.length / PAGE_SIZE)));
    expect(first.offers.length).toBe(Math.min(PAGE_SIZE, ALL.length));
    expect(new Set(ALL.map((o) => o.id)).size).toBe(ALL.length);
  });

  it("strana posle poslednje je prazna, ali total ostaje", async () => {
    const r = await searchOffers(P({ page: 400 }), { today: ALL_TIME });
    expect(r.offers).toEqual([]);
    expect(r.total).toBe(ALL.length);
  });
});

describe("destinacija", () => {
  it("sadrži tekst, bez obzira na velika/mala slova (ne samo početak reči)", async () => {
    const q = ALL[0].destinacija.slice(1, 4).toUpperCase();
    const expected = ALL.filter((o) => o.destinacija.toLowerCase().includes(q.toLowerCase()));
    expect(expected.length).toBeGreaterThan(0);
    const { all, total } = await fetchAll({ destinacija: q });
    expect(total).toBe(expected.length);
    expect(all.map((o) => o.id).sort()).toEqual(expected.map((o) => o.id).sort());
  });

  it("nema poklapanja → 0 rezultata", async () => {
    expect((await searchOffers(P({ destinacija: "zzzqqq" }), { today: ALL_TIME })).total).toBe(0);
  });

  it("% i _ se tretiraju doslovno, ne kao džokeri", async () => {
    for (const ch of ["%", "_"]) {
      const expected = ALL.filter((o) => o.destinacija.includes(ch)).length;
      const r = await searchOffers(P({ destinacija: ch }), { today: ALL_TIME });
      expect(r.total).toBe(expected);
    }
  });

  it("navodnik, zagrade i zarez u unosu ne kvare upit", async () => {
    const r = await searchOffers(P({ destinacija: `a"b),c(d` }), { today: ALL_TIME });
    expect(r.total).toBe(0);
  });
});

describe("naziv apartmana", () => {
  it("sadrži tekst, bez obzira na velika/mala slova, nezavisno od destinacije", async () => {
    const q = ALL[0].naziv.slice(2, 7).toUpperCase();
    const expected = ALL.filter((o) => o.naziv.toLowerCase().includes(q.toLowerCase()));
    expect(expected.length).toBeGreaterThan(0);
    const { all, total } = await fetchAll({ naziv: q });
    expect(total).toBe(expected.length);
    expect(all.map((o) => o.id).sort()).toEqual(expected.map((o) => o.id).sort());
  });

  it("naziv + destinacija su AND", async () => {
    const o = ALL[0];
    const nq = o.naziv.slice(0, 4);
    const dq = o.destinacija.slice(0, 3);
    const expected = ALL.filter(
      (x) =>
        x.naziv.toLowerCase().includes(nq.toLowerCase()) &&
        x.destinacija.toLowerCase().includes(dq.toLowerCase()),
    );
    const r = await searchOffers(P({ naziv: nq, destinacija: dq }), { today: ALL_TIME });
    expect(r.total).toBe(expected.length);
  });

  it("nema poklapanja, doslovni %/_ i navodnici ne kvare upit", async () => {
    expect((await searchOffers(P({ naziv: "zzzqqq" }), { today: ALL_TIME })).total).toBe(0);
    for (const ch of ["%", "_", `a"b),c(d`]) {
      const expected = ALL.filter((o) => o.naziv.includes(ch)).length;
      expect((await searchOffers(P({ naziv: ch }), { today: ALL_TIME })).total).toBe(expected);
    }
  });
});

describe("tip cene (po osobi / za jedinicu)", () => {
  it("filter vraća samo traženi tip, tačno isto kao JS filter", async () => {
    for (const tip of ["po_osobi", "po_jedinici"] as const) {
      const expected = ALL.filter((o) => o.cenaTip === tip);
      const { all, total } = await fetchAll({ cenaTip: tip });
      expect(total, tip).toBe(expected.length);
      for (const o of all) expect(o.cenaTip).toBe(tip);
    }
  });

  it("dva tipa zajedno čine ceo skup (nema izgubljenih ni dupliranih)", async () => {
    const a = (await searchOffers(P({ cenaTip: "po_osobi" }), { today: ALL_TIME })).total;
    const b = (await searchOffers(P({ cenaTip: "po_jedinici" }), { today: ALL_TIME })).total;
    expect(a + b).toBe(ALL.length);
  });

  it("kombinacija sa ostalim filterima", async () => {
    const tip = ALL[0].cenaTip;
    const expected = ALL.filter((o) => o.cenaTip === tip && o.maxGostiju >= 2);
    const r = await searchOffers(P({ cenaTip: tip, brojGostiju: 2 }), { today: ALL_TIME });
    expect(r.total).toBe(expected.length);
  });
});

describe("datumi (preklapanje perioda)", () => {
  const overlap = (od?: string, doo?: string) => (o: PublicOffer) =>
    (doo === undefined || o.datumPolaska <= doo) && (od === undefined || o.datumPovratka >= od);

  it("period koji poklapa dan polaska jedne ponude je pogađa", async () => {
    const od = ALL[0].datumPolaska;
    const expected = ALL.filter(overlap(od, od));
    expect(expected.map((o) => o.id)).toContain(ALL[0].id);
    const r = await searchOffers(P({ datumOd: od, datumDo: od }), { today: ALL_TIME });
    expect(r.total).toBe(expected.length);
  });

  it("samo datumOd, samo datumDo, i oba — isto kao JS filter", async () => {
    const sorted = [...ALL].sort((a, b) => a.datumPolaska.localeCompare(b.datumPolaska));
    const mid = sorted[Math.floor(sorted.length / 2)];
    const cases: Array<[string | undefined, string | undefined]> = [
      [mid.datumPolaska, undefined],
      [undefined, mid.datumPolaska],
      [sorted[0].datumPolaska, mid.datumPovratka],
      ["2999-01-01", undefined],
      [undefined, "1999-01-01"],
    ];
    for (const [od, doo] of cases) {
      const r = await searchOffers(P({ datumOd: od, datumDo: doo }), { today: ALL_TIME });
      expect(r.total, `od=${od} do=${doo}`).toBe(ALL.filter(overlap(od, doo)).length);
    }
  });
});

describe("broj gostiju", () => {
  it("ponuda mora da prima bar toliko gostiju", async () => {
    for (const n of [1, 2, 3, 4, 8, 30]) {
      const r = await searchOffers(P({ brojGostiju: n }), { today: ALL_TIME });
      expect(r.total, `gostiju=${n}`).toBe(ALL.filter((o) => o.maxGostiju >= n).length);
    }
  });
});

describe("prošli polasci i rasprodato", () => {
  it("polasci pre 'danas' se ne prikazuju", async () => {
    const sorted = [...ALL].sort((a, b) => a.datumPolaska.localeCompare(b.datumPolaska));
    const today = sorted[Math.floor(sorted.length / 2)].datumPolaska;
    const { all } = await fetchAll({}, today);
    expect(all.length).toBe(ALL.filter((o) => o.datumPolaska >= today).length);
    for (const o of all) expect(o.datumPolaska >= today).toBe(true);
    expect((await searchOffers(P(), { today: "2999-01-01" })).total).toBe(0);
  });

  it("rasprodate (dostupno_mesta = 0) nikad ne stižu do posetioca", () => {
    for (const o of ALL) expect(o.dostupnoMesta).not.toBe(0);
  });
});

describe("kombinovani filteri", () => {
  it("destinacija + datumi + gosti zajedno", async () => {
    const o = ALL[0];
    const q = o.destinacija.slice(0, 3);
    const expected = ALL.filter(
      (x) =>
        x.destinacija.toLowerCase().includes(q.toLowerCase()) &&
        x.datumPolaska <= o.datumPovratka &&
        x.datumPovratka >= o.datumPolaska &&
        x.maxGostiju >= 2,
    );
    const r = await searchOffers(
      P({ destinacija: q, datumOd: o.datumPolaska, datumDo: o.datumPovratka, brojGostiju: 2 }),
      { today: ALL_TIME },
    );
    expect(r.total).toBe(expected.length);
  });
});

// Ugovor sa migracijama (Korak 1 i Korak 2 plana): baza, ne kod, brani
// interne podatke. Ako neko doda kolonu u grant ili vrati SELECT *, pada ovde.
describe("ugovor sa bazom (RLS + column grant za anon)", () => {
  const sb = createPublicClient();

  it("anon vidi samo objavljene ponude", async () => {
    const { data, error } = await sb.from("offers").select("status");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    for (const r of data!) expect(r.status).toBe("published");
  });

  it("nove javne kolone (cena_tip, cena_po_osobi) su čitljive, filtriranje i sortiranje po njima radi", async () => {
    const { error } = await sb
      .from("offers")
      .select("cena_tip, cena_po_osobi")
      .eq("cena_tip", "po_jedinici")
      .order("cena_po_osobi")
      .limit(1);
    expect(error).toBeNull();
  });

  it.each(["upload_id", "confidence_score", "published_at", "created_at", "kontakt_url", "*"])(
    "offers.%s je zaključano (42501)",
    async (col) => {
      const { error } = await sb.from("offers").select(col).limit(1);
      expect(error?.code).toBe("42501");
    },
  );

  it("filtriranje po skrivenoj koloni ne može da služi za pogađanje vrednosti", async () => {
    const { error } = await sb.from("offers").select("id").ilike("kontakt_url", "%a%").limit(1);
    expect(error?.code).toBe("42501");
  });

  it.each(["pib", "cpc_cena", "mesecni_budzet_klikova", "kontakt", "*"])(
    "agencies.%s je zaključano (42501)",
    async (col) => {
      const { error } = await sb.from("agencies").select(col).limit(1);
      expect(error?.code).toBe("42501");
    },
  );

  it("uploads i clicks su prazni za anon", async () => {
    for (const table of ["uploads", "clicks"]) {
      const { count } = await sb.from(table).select("id", { count: "exact", head: true });
      expect(count, table).toBe(0);
    }
  });
});
