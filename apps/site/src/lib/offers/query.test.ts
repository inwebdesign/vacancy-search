import { describe, it, expect } from "vitest";
import { buildSearchUrl } from "./query";

describe("buildSearchUrl", () => {
  it("dodaje nov parametar i vraća na prvu stranu", () => {
    const current = new URLSearchParams("destinacija=Tasos&page=3");
    const url = buildSearchUrl("/pretraga", current, { cenaOd: "100" });
    expect(url).toBe("/pretraga?destinacija=Tasos&cenaOd=100");
  });

  it("prazna/undefined vrednost briše parametar", () => {
    const current = new URLSearchParams("destinacija=Tasos&cenaOd=100");
    const url = buildSearchUrl("/pretraga", current, { cenaOd: undefined });
    expect(url).toBe("/pretraga?destinacija=Tasos");
  });

  it("niz vrednosti se spaja zarezom", () => {
    const current = new URLSearchParams();
    const url = buildSearchUrl("/pretraga", current, { agencija: ["a", "b"] });
    expect(url).toBe("/pretraga?agencija=a%2Cb");
  });

  it("prazan niz briše parametar", () => {
    const current = new URLSearchParams("agencija=a%2Cb");
    const url = buildSearchUrl("/pretraga", current, { agencija: [] });
    expect(url).toBe("/pretraga");
  });

  it("eksplicitna izmena page se poštuje (paginacija ne resetuje samu sebe)", () => {
    const current = new URLSearchParams("destinacija=Tasos&page=1");
    const url = buildSearchUrl("/pretraga", current, { page: "3" });
    expect(url).toBe("/pretraga?destinacija=Tasos&page=3");
  });

  it("bez preostalih parametara vraća golu putanju", () => {
    const current = new URLSearchParams("cenaOd=100");
    const url = buildSearchUrl("/pretraga", current, { cenaOd: undefined });
    expect(url).toBe("/pretraga");
  });
});
