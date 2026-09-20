import { describe, it, expect } from "vitest";
import { parseCenaTip, CENA_TIP_LABEL } from "./cena-tip";

describe("parseCenaTip", () => {
  it("tačne vrednosti iz baze/AI odgovora", () => {
    expect(parseCenaTip("po_osobi")).toBe("po_osobi");
    expect(parseCenaTip("po_jedinici")).toBe("po_jedinici");
  });

  it("slobodan tekst iz fajlova (razmaci, velika slova, dijakritici, engleski)", () => {
    for (const v of ["Po osobi", "PO OSOBI", "cena po osobi", "per person", "po glavi"]) {
      expect(parseCenaTip(v), v).toBe("po_osobi");
    }
    for (const v of [
      "Po jedinici",
      "cena za smeštajnu jedinicu",
      "cena za smestajnu jedinicu",
      "unit",
      "po apartmanu",
      "za objekat",
    ]) {
      expect(parseCenaTip(v), v).toBe("po_jedinici");
    }
  });

  it("prazno, nepoznato i dvosmisleno → null (ne pogađa se)", () => {
    for (const v of ["", "   ", "abc", "cena", "po osobi u jedinici", null, undefined, 5]) {
      expect(parseCenaTip(v), String(v)).toBeNull();
    }
  });

  it("svaka vrednost ima prikazni naziv", () => {
    expect(CENA_TIP_LABEL.po_osobi).toBe("po osobi");
    expect(CENA_TIP_LABEL.po_jedinici).toBe("za jedinicu");
  });
});
