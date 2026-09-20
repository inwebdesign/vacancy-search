import { describe, it, expect } from "vitest";
import {
  parseSearchParams,
  escapeLike,
  todayInBelgrade,
  PAGE_SIZE,
} from "./params";

describe("parseSearchParams", () => {
  it("prazan ulaz daje podrazumevane vrednosti", () => {
    expect(parseSearchParams({})).toEqual({
      destinacija: undefined,
      naziv: undefined,
      cenaTip: undefined,
      datumOd: undefined,
      datumDo: undefined,
      brojGostiju: undefined,
      page: 1,
    });
  });

  it("destinacija: trim, sažimanje razmaka, izbacivanje *, prazno → undefined", () => {
    expect(parseSearchParams({ destinacija: "  Tasos   Limenas " }).destinacija).toBe("Tasos Limenas");
    expect(parseSearchParams({ destinacija: "Par*alia" }).destinacija).toBe("Paralia");
    expect(parseSearchParams({ destinacija: "   " }).destinacija).toBeUndefined();
    expect(parseSearchParams({ destinacija: "***" }).destinacija).toBeUndefined();
  });

  it("naziv: isto čišćenje kao destinacija", () => {
    expect(parseSearchParams({ naziv: "  Vila   Estia " }).naziv).toBe("Vila Estia");
    expect(parseSearchParams({ naziv: "Est*ia" }).naziv).toBe("Estia");
    expect(parseSearchParams({ naziv: "   " }).naziv).toBeUndefined();
    expect(parseSearchParams({ naziv: "b".repeat(300) }).naziv).toHaveLength(100);
    // destinacija i naziv su nezavisni filteri
    expect(parseSearchParams({ destinacija: "Paralia", naziv: "Estia" })).toMatchObject({
      destinacija: "Paralia",
      naziv: "Estia",
    });
  });

  it("cenaTip: samo tačne vrednosti, sve ostalo se izbacuje", () => {
    expect(parseSearchParams({ cenaTip: "po_osobi" }).cenaTip).toBe("po_osobi");
    expect(parseSearchParams({ cenaTip: "po_jedinici" }).cenaTip).toBe("po_jedinici");
    for (const bad of ["", "po osobi", "PO_OSOBI", "sve", "1", "po_osobi;drop"]) {
      expect(parseSearchParams({ cenaTip: bad }).cenaTip).toBeUndefined();
    }
  });

  it("destinacija: ograničena dužina (100)", () => {
    const d = parseSearchParams({ destinacija: "a".repeat(500) }).destinacija;
    expect(d).toHaveLength(100);
  });

  it("uzima prvu vrednost kad param stigne više puta", () => {
    expect(parseSearchParams({ destinacija: ["Paralia", "Tasos"], brojGostiju: ["2", "5"] })).toMatchObject({
      destinacija: "Paralia",
      brojGostiju: 2,
    });
  });

  it("datumi: važeći prolaze, nevažeći i nepostojeći se izbacuju", () => {
    const p = parseSearchParams({ datumOd: "2026-08-01", datumDo: "2026-08-10" });
    expect(p.datumOd).toBe("2026-08-01");
    expect(p.datumDo).toBe("2026-08-10");
    expect(parseSearchParams({ datumOd: "01.08.2026" }).datumOd).toBeUndefined();
    expect(parseSearchParams({ datumOd: "2026-02-31" }).datumOd).toBeUndefined();
    expect(parseSearchParams({ datumOd: "2026-13-01" }).datumOd).toBeUndefined();
    expect(parseSearchParams({ datumOd: "'; DROP TABLE offers;--" }).datumOd).toBeUndefined();
  });

  it("datumi: zamenjeni redosled se ispravlja, jedan datum ostaje sam", () => {
    const p = parseSearchParams({ datumOd: "2026-08-10", datumDo: "2026-08-01" });
    expect(p).toMatchObject({ datumOd: "2026-08-01", datumDo: "2026-08-10" });
    expect(parseSearchParams({ datumDo: "2026-08-10" })).toMatchObject({
      datumOd: undefined,
      datumDo: "2026-08-10",
    });
  });

  it("brojGostiju: samo ceo broj 1–30", () => {
    expect(parseSearchParams({ brojGostiju: "3" }).brojGostiju).toBe(3);
    expect(parseSearchParams({ brojGostiju: "30" }).brojGostiju).toBe(30);
    for (const bad of ["0", "-1", "31", "2.5", "abc", "", "1e2"]) {
      expect(parseSearchParams({ brojGostiju: bad }).brojGostiju).toBeUndefined();
    }
  });

  it("page: ceo broj 1–500, inače 1", () => {
    expect(parseSearchParams({ page: "2" }).page).toBe(2);
    expect(parseSearchParams({ page: "500" }).page).toBe(500);
    for (const bad of ["0", "-3", "501", "abc", "1.5", ""]) {
      expect(parseSearchParams({ page: bad }).page).toBe(1);
    }
  });

  it("PAGE_SIZE je 20", () => {
    expect(PAGE_SIZE).toBe(20);
  });
});

describe("escapeLike", () => {
  it("escape-uje %, _ i \\", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
    expect(escapeLike("Paralia")).toBe("Paralia");
  });
});

describe("todayInBelgrade", () => {
  it("koristi srpsku vremensku zonu, ne UTC (leto, UTC+2)", () => {
    expect(todayInBelgrade(new Date("2026-09-20T23:30:00Z"))).toBe("2026-09-21");
    expect(todayInBelgrade(new Date("2026-09-20T12:00:00Z"))).toBe("2026-09-20");
  });
  it("zima (UTC+1)", () => {
    expect(todayInBelgrade(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
    expect(todayInBelgrade(new Date("2026-01-15T22:30:00Z"))).toBe("2026-01-15");
  });
});
