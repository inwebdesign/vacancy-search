import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatDateRange,
  formatGuests,
  joinMeta,
  formatTime,
  genitivePhrase,
  formatNights,
  formatUnitCount,
  formatAgencyCount,
} from "./format";

describe("formatPrice", () => {
  it("ceo broj bez decimala, razmak pre simbola", () => {
    expect(formatPrice(186)).toBe("186 €");
    expect(formatPrice(0)).toBe("0 €");
  });

  it("decimale (npr. izvedena cena po osobi) se prikazuju, ne odsecaju", () => {
    expect(formatPrice(43.75)).toBe("43,75 €");
  });

  it("razdvajanje hiljada srpskim separatorom", () => {
    expect(formatPrice(1234)).toBe("1.234 €");
  });
});

describe("formatDateRange", () => {
  it("prva strana bez godine, druga sa godinom i tačkom (mockup primer)", () => {
    expect(formatDateRange("2026-07-12", "2026-07-22")).toBe("12.07 — 22.07.2026.");
  });

  it("popunjava vodeće nule iz ISO formata", () => {
    expect(formatDateRange("2026-01-05", "2026-02-09")).toBe("05.01 — 09.02.2026.");
  });
});

describe("formatGuests", () => {
  it("mockup primer: 2 odrasle · 1 dete", () => {
    expect(formatGuests({ adults: 2, children: 1 })).toBe("2 odrasle · 1 dete");
  });

  it("bez dece se ne prikazuje deo za decu", () => {
    expect(formatGuests({ adults: 2 })).toBe("2 odrasle");
    expect(formatGuests({ adults: 1, children: 0 })).toBe("1 odrasla");
  });

  it("srpska množina za odrasle: 1/11 jednina-oblik, 2-4 (ne 12-14) malo, ostalo puno", () => {
    expect(formatGuests({ adults: 1 })).toBe("1 odrasla");
    expect(formatGuests({ adults: 2 })).toBe("2 odrasle");
    expect(formatGuests({ adults: 3 })).toBe("3 odrasle");
    expect(formatGuests({ adults: 4 })).toBe("4 odrasle");
    expect(formatGuests({ adults: 5 })).toBe("5 odraslih");
    expect(formatGuests({ adults: 11 })).toBe("11 odraslih");
    expect(formatGuests({ adults: 12 })).toBe("12 odraslih");
    expect(formatGuests({ adults: 14 })).toBe("14 odraslih");
    expect(formatGuests({ adults: 21 })).toBe("21 odrasla");
    expect(formatGuests({ adults: 22 })).toBe("22 odrasle");
  });

  it("srpska množina za decu ima drugačije oblike od odraslih", () => {
    expect(formatGuests({ adults: 1, children: 1 })).toBe("1 odrasla · 1 dete");
    expect(formatGuests({ adults: 1, children: 2 })).toBe("1 odrasla · 2 deteta");
    expect(formatGuests({ adults: 1, children: 5 })).toBe("1 odrasla · 5 dece");
    expect(formatGuests({ adults: 1, children: 11 })).toBe("1 odrasla · 11 dece");
  });
});

describe("joinMeta", () => {
  it("spaja sa srednjom tačkom, ne zapetom", () => {
    expect(joinMeta(["10 noćenja", "200 m do plaže", "klima"])).toBe(
      "10 noćenja · 200 m do plaže · klima",
    );
  });

  it("izbacuje prazne delove", () => {
    expect(joinMeta(["a", "", "b"])).toBe("a · b");
  });

  it("jedan element bez separatora", () => {
    expect(joinMeta(["samo jedno"])).toBe("samo jedno");
  });
});

describe("genitivePhrase", () => {
  it("1 -> jednina genitiva (bag koji je otkriven na pravom podatku: 1 agencija)", () => {
    expect(genitivePhrase(1, "turističke agencije", "turističkih agencija")).toBe(
      "1 turističke agencije",
    );
  });

  it("bilo koji broj osim 1 -> množina genitiva, uključujući 0", () => {
    expect(genitivePhrase(38, "turističke agencije", "turističkih agencija")).toBe(
      "38 turističkih agencija",
    );
    expect(genitivePhrase(0, "turističke agencije", "turističkih agencija")).toBe(
      "0 turističkih agencija",
    );
    expect(genitivePhrase(21, "turističke agencije", "turističkih agencija")).toBe(
      "21 turističkih agencija",
    );
  });
});

describe("formatNights", () => {
  it("mockup primer: 10 noćenja (12.07 -> 22.07)", () => {
    expect(formatNights("2026-07-12", "2026-07-22")).toBe("10 noćenja");
  });

  it("1 noćenje jednina, 2-4 i 5+ isti oblik 'noćenja'", () => {
    expect(formatNights("2026-07-12", "2026-07-13")).toBe("1 noćenje");
    expect(formatNights("2026-07-12", "2026-07-15")).toBe("3 noćenja");
    expect(formatNights("2026-07-12", "2026-07-19")).toBe("7 noćenja");
  });

  it("prelazak preko meseca/godine računa se ispravno", () => {
    expect(formatNights("2026-12-28", "2027-01-04")).toBe("7 noćenja");
  });
});

describe("formatUnitCount / formatAgencyCount", () => {
  it("isti obrazac množine kao adults (1 / 2-4 / 5+), različite osnove reči", () => {
    expect(formatUnitCount(1)).toBe("1 jedinica");
    expect(formatUnitCount(2)).toBe("2 jedinice");
    expect(formatUnitCount(5)).toBe("5 jedinica");
    expect(formatAgencyCount(1)).toBe("1 agencija");
    expect(formatAgencyCount(2)).toBe("2 agencije");
    expect(formatAgencyCount(5)).toBe("5 agencija");
  });
});

describe("formatTime", () => {
  it("HH:MM po beogradskoj zoni, 24-časovni format", () => {
    expect(formatTime(new Date("2026-09-20T06:40:00Z"))).toBe("08:40");
  });

  it("dopunjava vodeću nulu", () => {
    expect(formatTime(new Date("2026-09-20T05:05:00Z"))).toBe("07:05");
  });
});
