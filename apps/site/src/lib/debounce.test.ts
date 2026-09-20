import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { debounce, SEARCH_DEBOUNCE_MS } from "./debounce";

describe("debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("ne poziva odmah, nego tek posle pauze", () => {
    const fn = vi.fn();
    const d = debounce(fn, 300);
    d("a");
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith("a");
  });

  it("brzo kucanje (7 slova) daje JEDAN poziv, sa poslednjom vrednošću", () => {
    const fn = vi.fn();
    const d = debounce(fn, 300);
    for (const c of ["p", "pa", "par", "para", "paral", "parali", "paralia"]) {
      d(c);
      vi.advanceTimersByTime(100); // manje od pauze — tajmer se stalno resetuje
    }
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith("paralia");
  });

  it("odvojene serije kucanja daju odvojene pozive", () => {
    const fn = vi.fn();
    const d = debounce(fn, 300);
    d("a");
    vi.advanceTimersByTime(300);
    d("b");
    vi.advanceTimersByTime(300);
    expect(fn.mock.calls).toEqual([["a"], ["b"]]);
  });

  it("cancel prekida čekajući poziv", () => {
    const fn = vi.fn();
    const d = debounce(fn, 300);
    d("a");
    d.cancel();
    vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
  });

  it("podrazumevana pauza za pretragu je 300ms", () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(300);
  });
});
