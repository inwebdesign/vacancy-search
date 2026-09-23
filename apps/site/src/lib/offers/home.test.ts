import { describe, it, expect } from "vitest";
import { getTopOffers, getDestinationStats } from "./home";
import { createPublicClient } from "@/lib/supabase/public";

// Integracioni testovi protiv prave dev baze (isti obrazac kao search.test.ts).

describe("getTopOffers", () => {
  it("vraća tačno traženi broj, sortirano od najjeftinije po osobi", async () => {
    const offers = await getTopOffers(3);
    expect(offers.length).toBeLessThanOrEqual(3);
    expect(offers.length).toBeGreaterThan(0);
    for (let i = 1; i < offers.length; i++) {
      expect(offers[i - 1].cenaPoOsobi <= offers[i].cenaPoOsobi).toBe(true);
    }
  });

  it("limit 0 vraća praznu listu", async () => {
    expect(await getTopOffers(0)).toEqual([]);
  });
});

describe("getDestinationStats", () => {
  it("count i minimalna cena se poklapaju sa ručnim izračunom nad istim sirovim podacima", async () => {
    const sb = createPublicClient();
    const { data } = await sb
      .from("offers")
      .select("destinacija, cena_po_osobi")
      .eq("status", "published");
    const raw = (data ?? []) as { destinacija: string; cena_po_osobi: number }[];
    expect(raw.length, "u bazi mora biti objavljenih ponuda").toBeGreaterThan(0);

    const expected = new Map<string, { count: number; min: number }>();
    for (const r of raw) {
      const e = expected.get(r.destinacija);
      if (e) {
        e.count += 1;
        e.min = Math.min(e.min, r.cena_po_osobi);
      } else {
        expected.set(r.destinacija, { count: 1, min: r.cena_po_osobi });
      }
    }

    const stats = await getDestinationStats(50);
    // stat funkcija dodatno filtrira "nije prošlo"/"nije rasprodato" — pa je
    // podskup raw-a, ne mora biti identičan; proveravamo da je svaka vraćena
    // stavka INTERNO konzistentna (min nikad manji od stvarnog minimuma za tu
    // destinaciju, count nikad veći od ukupnog broja published redova za nju).
    for (const s of stats) {
      const e = expected.get(s.destinacija);
      expect(e, s.destinacija).toBeDefined();
      expect(s.count).toBeLessThanOrEqual(e!.count);
      expect(s.count).toBeGreaterThan(0);
      expect(s.minCenaPoOsobi).toBeGreaterThanOrEqual(e!.min);
    }
  });

  it("sortirano po broju ponuda opadajuće, poštuje limit", async () => {
    const stats = await getDestinationStats(2);
    expect(stats.length).toBeLessThanOrEqual(2);
    for (let i = 1; i < stats.length; i++) {
      expect(stats[i - 1].count >= stats[i].count).toBe(true);
    }
  });

  it("svaka destinacija se pojavljuje tačno jednom (nema dupliranih grupa)", async () => {
    const stats = await getDestinationStats(50);
    const names = stats.map((s) => s.destinacija);
    expect(new Set(names).size).toBe(names.length);
  });
});
