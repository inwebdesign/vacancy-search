import { describe, it, expect } from "vitest";
import { parseCsv } from "./parse";

const HEAD = "naziv_aranzmana,destinacija,datum_polaska,datum_povratka,cena_po_osobi_eur,max_gostiju,dostupno_mesta,kontakt_url";
const ROW = (naziv: string, extra = "") =>
  `${naziv},Paralia,2026-08-17,2026-08-28,247,2,5,https://a.rs/x${extra}`;
const csv = (lines: string[]) => Buffer.from(lines.join("\n"), "utf-8");

describe("parseCsv — tip cene", () => {
  it("bez kolone cena_tip sve su cene po osobi (brief template: cena_po_osobi_eur)", async () => {
    const r = await parseCsv(csv([HEAD, ROW("A"), ROW("B")]));
    expect(r.missingColumns).toEqual([]);
    expect(r.rows.map((x) => x.cenaTip)).toEqual(["po_osobi", "po_osobi"]);
  });

  it("opciona kolona cena_tip se čita (različiti nazivi kolone i slobodan tekst)", async () => {
    for (const col of ["cena_tip", "Tip cene", "vrsta_cene"]) {
      const r = await parseCsv(
        csv([`${HEAD},${col}`, ROW("A", ",po_osobi"), ROW("B", ",Po jedinici"), ROW("C", ",cena za smeštajnu jedinicu")]),
      );
      expect(r.rows.map((x) => x.cenaTip), col).toEqual(["po_osobi", "po_jedinici", "po_jedinici"]);
      expect(r.skippedRows).toBe(0);
    }
  });

  it("prazna ćelija u koloni cena_tip = po osobi", async () => {
    const r = await parseCsv(csv([`${HEAD},cena_tip`, ROW("A", ",")]));
    expect(r.rows[0].cenaTip).toBe("po_osobi");
  });

  it("nejasna vrednost → red se preskače (CSV se objavljuje bez review-a), ostali prolaze", async () => {
    const r = await parseCsv(csv([`${HEAD},cena_tip`, ROW("A", ",negde"), ROW("B", ",po_jedinici")]));
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].naziv).toBe("B");
    expect(r.skippedRows).toBe(1);
  });

  it("cena_tip nije obavezna kolona — njeno odsustvo se ne prijavljuje kao nedostajuća", async () => {
    const r = await parseCsv(csv([HEAD, ROW("A")]));
    expect(r.missingColumns).not.toContain("cenaTip");
  });
});
