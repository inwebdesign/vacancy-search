import { describe, it, expect } from "vitest";
import { normalizeExtractedOffers } from "./pdf-extract";

const base = {
  naziv: "Vila Estia, Paralia — 1/2 STD, autobuski prevoz",
  destinacija: "Paralia",
  datum_polaska: "2026-08-17",
  datum_povratka: "2026-08-28",
  cena_eur: 247,
  max_gostiju: 2,
  uncertain: false,
};

describe("normalizeExtractedOffers", () => {
  it("prosleđuje cena_tip i ne označava sigurnu ponudu kao nesigurnu", () => {
    const [a, b] = normalizeExtractedOffers([
      { ...base, cena_tip: "po_osobi" },
      { ...base, cena_tip: "po_jedinici", cena_eur: 468 },
    ]);
    expect(a).toMatchObject({ cenaTip: "po_osobi", uncertain: false, cenaEur: 247 });
    expect(b).toMatchObject({ cenaTip: "po_jedinici", uncertain: false, cenaEur: 468 });
  });

  it("model piše slobodnim tekstom — ipak se prepoznaje", () => {
    const [o] = normalizeExtractedOffers([{ ...base, cena_tip: "po jedinici" }]);
    expect(o.cenaTip).toBe("po_jedinici");
    expect(o.uncertain).toBe(false);
  });

  it("nedostajući ili nejasan cena_tip → ponuda ostaje, ali ide u review (uncertain)", () => {
    for (const cena_tip of [undefined, "", "nepoznato", 7, null]) {
      const [o] = normalizeExtractedOffers([{ ...base, cena_tip }]);
      expect(o, String(cena_tip)).toBeDefined();
      expect(o.uncertain).toBe(true);
      expect(o.cenaTip).toBe("po_osobi");
    }
  });

  it("uncertain koji vrati model ostaje uncertain i uz jasan tip", () => {
    const [o] = normalizeExtractedOffers([{ ...base, cena_tip: "po_osobi", uncertain: true }]);
    expect(o.uncertain).toBe(true);
  });

  it("nevažeći redovi se izbacuju (datum, cena, prazan naziv, ne-objekat)", () => {
    const out = normalizeExtractedOffers([
      { ...base, cena_tip: "po_osobi" },
      { ...base, datum_polaska: "17.08.2026", cena_tip: "po_osobi" },
      { ...base, cena_eur: "abc", cena_tip: "po_osobi" },
      { ...base, naziv: "  ", cena_tip: "po_osobi" },
      null,
      "tekst",
    ]);
    expect(out).toHaveLength(1);
  });
});
