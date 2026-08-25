import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, MapPin, Calendar, Users, Plus, Minus, X, Star,
  Mountain, TreePine, Building2, Landmark, Loader2, ExternalLink,
  Briefcase, TrendingUp, ShieldCheck, Send, CheckCircle2
} from "lucide-react";

// ---------- Static data (destinacije i cene sourced iz realnih srpskih sajtova za smeštaj, avgust 2026) ----------

const ICONS = { Mountain, TreePine, Building2, Landmark };

const GRADIENTS = [
  ["#C9BBFF", "#8F7BE8"],
  ["#AEEBD3", "#4FB89A"],
  ["#FFD6A5", "#F2994A"],
  ["#B9D8FF", "#5B8DEF"],
  ["#FFC1CC", "#E8708A"],
  ["#D6E8B9", "#8FBF5F"],
];

const LISTINGS = [
  { id: 1, title: "Apartman Montana", city: "Beograd", country: "Srbija", price: 35, rating: 4.7, reviews: 128, maxGuests: 3, icon: "Building2", grad: 0, blocked: [{ start: "2026-08-10", end: "2026-08-13" }], sourceUrl: "https://www.pinkapartmani.com/", agency: "Pink Apartmani", updatedHoursAgo: 3, featured: true },
  { id: 2, title: "Apartman Bulevar", city: "Beograd", country: "Srbija", price: 42, rating: 4.6, reviews: 94, maxGuests: 4, icon: "Building2", grad: 1, blocked: [], sourceUrl: "https://www.pinkapartmani.com/", agency: "Pink Apartmani", updatedHoursAgo: 3, featured: false },
  { id: 3, title: "Studio Trg Republike", city: "Beograd", country: "Srbija", price: 30, rating: 4.8, reviews: 201, maxGuests: 2, icon: "Landmark", grad: 2, blocked: [{ start: "2026-08-05", end: "2026-08-07" }], sourceUrl: "https://mojapartmanbeograd.com/apartmani-beograd-jeftino", agency: "Moj Apartman Beograd", updatedHoursAgo: 27, featured: false },
  { id: 4, title: "Studio Apartman Zira 1", city: "Novi Sad", country: "Srbija", price: 28, rating: 4.65, reviews: 76, maxGuests: 2, icon: "Building2", grad: 3, blocked: [], sourceUrl: "https://www.apartmani-u-beogradu.com/prenociste-novi-sad", agency: "Apartmani u Beogradu", updatedHoursAgo: 9, featured: false },
  { id: 5, title: "Dvosoban Apartman Ris 3", city: "Novi Sad", country: "Srbija", price: 39, rating: 4.75, reviews: 112, maxGuests: 4, icon: "Landmark", grad: 4, blocked: [{ start: "2026-08-15", end: "2026-08-18" }], sourceUrl: "https://www.apartmani-u-beogradu.com/prenociste-novi-sad", agency: "Apartmani u Beogradu", updatedHoursAgo: 9, featured: true },
  { id: 6, title: "Apartman Sweet Home Center", city: "Novi Sad", country: "Srbija", price: 45, rating: 4.82, reviews: 89, maxGuests: 5, icon: "Building2", grad: 5, blocked: [], sourceUrl: "https://www.apartmani-u-beogradu.com/prenociste-novi-sad", agency: "Apartmani u Beogradu", updatedHoursAgo: 9, featured: false },
  { id: 7, title: "Apartman Trio", city: "Zlatibor", country: "Srbija", price: 49, rating: 4.7, reviews: 143, maxGuests: 4, icon: "TreePine", grad: 1, blocked: [{ start: "2026-08-20", end: "2026-08-24" }], sourceUrl: "https://www.zlatibor.org/apartmani/", agency: "Zlatibor.org", updatedHoursAgo: 51, featured: false },
  { id: 8, title: "Apartmani Sofija", city: "Zlatibor", country: "Srbija", price: 35, rating: 4.6, reviews: 88, maxGuests: 3, icon: "Mountain", grad: 2, blocked: [], sourceUrl: "https://www.zlatibor.org/apartmani/", agency: "Zlatibor.org", updatedHoursAgo: 51, featured: false },
  { id: 9, title: "Vila Milena i sedam patuljaka", city: "Zlatibor", country: "Srbija", price: 63, rating: 4.9, reviews: 167, maxGuests: 6, icon: "TreePine", grad: 3, blocked: [{ start: "2026-08-01", end: "2026-08-03" }], sourceUrl: "https://zlatibor.rs/apartmani", agency: "Zlatibor.rs", updatedHoursAgo: 5, featured: true },
  { id: 10, title: "LUX Milmari Apartment Selena", city: "Kopaonik", country: "Srbija", price: 35, rating: 4.7, reviews: 61, maxGuests: 4, icon: "Mountain", grad: 4, blocked: [], sourceUrl: "https://www.apartmanivikendice.com/smestaj/kopaonik", agency: "Apartmani i Vikendice", updatedHoursAgo: 14, featured: false },
  { id: 11, title: "Apartman Lucija", city: "Kopaonik", country: "Srbija", price: 80, rating: 4.85, reviews: 54, maxGuests: 7, icon: "Mountain", grad: 5, blocked: [{ start: "2026-08-08", end: "2026-08-12" }], sourceUrl: "https://www.apartmanivikendice.com/smestaj/kopaonik", agency: "Apartmani i Vikendice", updatedHoursAgo: 14, featured: false },
  { id: 12, title: "Kuća Rani mraz", city: "Kopaonik", country: "Srbija", price: 120, rating: 4.92, reviews: 39, maxGuests: 8, icon: "Mountain", grad: 0, blocked: [], sourceUrl: "https://www.apartmanivikendice.com/smestaj/kopaonik", agency: "Apartmani i Vikendice", updatedHoursAgo: 14, featured: false },
];

const DESTINATIONS = Array.from(
  new Set(LISTINGS.map((l) => `${l.city}, ${l.country}`))
);

const todayISO = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const addDays = (iso, n) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const fmtDate = (iso) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("sr-Latn-RS", { month: "short", day: "numeric" }) : "";

function overlaps(blocked, checkIn, checkOut) {
  if (!checkIn || !checkOut) return false;
  const ci = new Date(checkIn), co = new Date(checkOut);
  return blocked.some((b) => {
    const bs = new Date(b.start), be = new Date(b.end);
    return ci < be && co > bs;
  });
}

function pluralGostiju(n) {
  if (n === 1) return "1 gost";
  if (n >= 2 && n <= 4) return `${n} gosta`;
  return `${n} gostiju`;
}
function pluralNoci(n) {
  if (n === 1) return "1 noć";
  if (n >= 2 && n <= 4) return `${n} noći`;
  return `${n} noći`;
}
function pluralSmestaja(n) {
  if (n === 1) return "1 smeštaj odgovara";
  if (n >= 2 && n <= 4) return `${n} smeštaja odgovaraju`;
  return `${n} smeštaja odgovara`;
}
function freshnessLabel(hours) {
  if (hours < 24) return `Ažurirano pre ${hours}h`;
  const days = Math.round(hours / 24);
  return `Ažurirano pre ${days} ${days === 1 ? "dan" : "dana"}`;
}

// ---------- Component ----------

export default function VacancySearch() {
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [openPanel, setOpenPanel] = useState(null); // 'where' | 'dates' | 'guests' | null
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recent, setRecent] = useState([]);
  const [ready, setReady] = useState(false);

  const barRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    function lockX() {
      if (window.scrollX !== 0) window.scrollTo(0, window.scrollY);
    }
    window.addEventListener("scroll", lockX);
    window.addEventListener("resize", lockX);
    lockX();
    return () => {
      window.removeEventListener("scroll", lockX);
      window.removeEventListener("resize", lockX);
    };
  }, []);

  useEffect(() => {
    function onClick(e) {
      if (barRef.current && !barRef.current.contains(e.target)) setOpenPanel(null);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function runSearch(params, { record = true } = {}) {
    setIsLoading(true);
    setOpenPanel(null);
    setTimeout(() => {
      const loc = params.location.trim().toLowerCase();
      const total = params.adults + params.children;
      const filtered = LISTINGS.filter((l) => {
        const locMatch = !loc || `${l.title} ${l.city} ${l.country}`.toLowerCase().includes(loc);
        const guestMatch = total <= l.maxGuests;
        const dateOk = !overlaps(l.blocked, params.checkIn, params.checkOut);
        return locMatch && guestMatch && dateOk;
      }).sort((a, b) => (b.featured === a.featured ? 0 : b.featured ? 1 : -1));
      setResults(filtered);
      setHasSearched(true);
      setIsLoading(false);

      if (record) {
        window.storage.set("vacancy-search:filters", JSON.stringify(params)).catch(() => {});
        if (params.location.trim()) {
          setRecent((prev) => {
            const next = [params.location.trim(), ...prev.filter((r) => r !== params.location.trim())].slice(0, 5);
            window.storage.set("vacancy-search:recent", JSON.stringify(next)).catch(() => {});
            return next;
          });
        }
      }
    }, 420);
  }

  useEffect(() => {
    (async () => {
      try {
        const stored = await window.storage.get("vacancy-search:filters");
        if (stored?.value) {
          const p = JSON.parse(stored.value);
          const today = todayISO();
          if (p.checkIn && p.checkIn < today) p.checkIn = "";
          if (p.checkOut && p.checkOut < today) p.checkOut = "";
          setLocation(p.location || "");
          setCheckIn(p.checkIn || "");
          setCheckOut(p.checkOut || "");
          setAdults(p.adults ?? 1);
          setChildren(p.children ?? 0);
          runSearch(p, { record: false });
        }
      } catch (_) {}
      try {
        const rec = await window.storage.get("vacancy-search:recent");
        if (rec?.value) setRecent(JSON.parse(rec.value));
      } catch (_) {}
      setReady(true);
    })();
  }, []);

  const suggestions = useMemo(() => {
    if (!location.trim()) return [];
    const q = location.trim().toLowerCase();
    return DESTINATIONS.filter((d) => d.toLowerCase().includes(q)).slice(0, 5);
  }, [location]);

  const guestLabel = pluralGostiju(adults + children);
  const nights = checkIn && checkOut ? Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)) : null;

  function handleSubmit() {
    const today = todayISO();
    let ci = checkIn && checkIn < today ? today : checkIn;
    let co = checkOut && checkOut < today ? today : checkOut;
    if (ci && co && co <= ci) co = addDays(ci, 1);
    if (ci !== checkIn) setCheckIn(ci);
    if (co !== checkOut) setCheckOut(co);
    runSearch({ location, checkIn: ci, checkOut: co, adults, children });
  }

  function pickRecent(r) {
    setLocation(r);
    setOpenPanel(null);
    runSearch({ location: r, checkIn, checkOut, adults, children });
  }

  function handleReset() {
    setLocation("");
    setCheckIn("");
    setCheckOut("");
    setAdults(1);
    setChildren(0);
    setOpenPanel(null);
    setResults(null);
    setHasSearched(false);
    window.storage.delete("vacancy-search:filters").catch(() => {});
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: "#1F1B2E", minHeight: "100vh", position: "relative", overflow: "hidden", background: "linear-gradient(160deg, #F6F4FF 0%, #EEF9F4 55%, #FDF6EC 100%)" }}>
      <style>{`
        * { box-sizing: border-box; }
        html, body { overflow-x: hidden; max-width: 100%; width: 100%; position: relative; overscroll-behavior-x: none; }
        @keyframes driftA { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(40px,-30px) scale(1.08);} }
        @keyframes driftB { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(-50px,40px) scale(1.1);} }
        @keyframes driftC { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(30px,30px) scale(0.95);} }
        .blob { position: absolute; border-radius: 9999px; filter: blur(70px); opacity: 0.55; pointer-events: none; }
        @media (prefers-reduced-motion: no-preference) {
          .blobA { animation: driftA 24s ease-in-out infinite; }
          .blobB { animation: driftB 28s ease-in-out infinite; }
          .blobC { animation: driftC 32s ease-in-out infinite; }
        }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
        .focus-ring:focus-visible { outline: 2px solid #5B3EDB; outline-offset: 2px; }
        ::selection { background: #C9BBFF; }

        .search-grid {
          display: grid;
          grid-template-columns: 1fr;
          position: relative;
          z-index: 10;
          max-width: 100%;
        }
        .search-field {
          position: relative;
          min-width: 0;
          max-width: 100%;
          border-top: 1px solid rgba(31,27,46,0.08);
        }
        .search-field:first-child { border-top: none; }
        .search-submit { margin: 4px; }
        @media (min-width: 720px) {
          .search-grid { grid-template-columns: 1fr 1fr 1fr auto; }
          .search-field { border-top: none; border-left: 1px solid rgba(31,27,46,0.08); }
          .search-field:first-child { border-left: none; }
        }

        .popover {
          position: absolute;
          top: calc(100% + 8px);
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 14px 40px -10px rgba(31,27,46,0.25);
          z-index: 100;
          max-width: min(320px, calc(100vw - 48px));
        }

        .b2b-grid { display: grid; grid-template-columns: 1fr; gap: 40px; }
        @media (min-width: 860px) {
          .b2b-grid { grid-template-columns: 1.2fr 1fr; }
        }
      `}</style>

      <div className="blob blobA" style={{ width: 420, height: 420, top: -120, left: -100, background: "#C9BBFF" }} />
      <div className="blob blobB" style={{ width: 380, height: 380, top: 60, right: -140, background: "#AEEBD3" }} />
      <div className="blob blobC" style={{ width: 340, height: 340, bottom: -140, left: "38%", background: "#FFD6A5" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", overflowX: "hidden" }}>
        <header style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 0" }} className="flex items-center justify-between">
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 22, letterSpacing: "-0.02em" }}>
            Slobodno<span style={{ color: "#5B3EDB" }}>.</span>
          </div>
          <div style={{ fontSize: 13, color: "#6B647E" }}>{LISTINGS.length} smeštaja u 4 destinacije</div>
        </header>

        <section style={{ maxWidth: 780, margin: "0 auto", padding: "56px 24px 32px", textAlign: "center" }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.1, letterSpacing: "-0.02em", margin: 0 }}>
            Pronađi smeštaj koji je stvarno slobodan
          </h1>
          <p style={{ marginTop: 12, fontSize: 16, color: "#6B647E" }}>
            Prava dostupnost za tvoje datume, ne "možda".
          </p>
        </section>

        <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 24px" }} ref={barRef}>
          <div
            className="search-grid"
            style={{
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(31,27,46,0.08)",
              borderRadius: 20,
              boxShadow: "0 20px 60px -20px rgba(91,62,219,0.25)",
              padding: 8,
            }}
          >
            <div className="search-field">
              <button
                onClick={() => setOpenPanel(openPanel === "where" ? null : "where")}
                className="focus-ring"
                style={{
                  width: "100%", textAlign: "left", padding: "12px 16px", borderRadius: 14,
                  background: openPanel === "where" ? "#F3F0FF" : "transparent", border: "none", cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: "#8F7BE8", display: "flex", alignItems: "center", gap: 5 }}>
                  <MapPin size={13} /> GDE
                </div>
                <div style={{ fontSize: 14, marginTop: 2, color: location ? "#1F1B2E" : "#9992AC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {location || "Pretraži destinacije"}
                </div>
              </button>
              {openPanel === "where" && (
                <div className="popover" style={{ left: 0, padding: 12, width: "100%" }}>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Grad u Srbiji"
                    className="focus-ring"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(31,27,46,0.12)", fontSize: 14, fontFamily: "inherit" }}
                  />
                  <div style={{ marginTop: 8 }}>
                    {(location.trim() ? suggestions : DESTINATIONS.slice(0, 5)).map((d) => (
                      <div
                        key={d}
                        onClick={() => { setLocation(d.split(",")[0]); setOpenPanel("dates"); }}
                        style={{ padding: "9px 10px", borderRadius: 8, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#F6F4FF")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <MapPin size={14} color="#9992AC" /> {d}
                      </div>
                    ))}
                    {location.trim() && suggestions.length === 0 && (
                      <div style={{ padding: "9px 10px", fontSize: 13, color: "#9992AC" }}>Nema destinacije za "{location}"</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="search-field">
              <button
                onClick={() => setOpenPanel(openPanel === "dates" ? null : "dates")}
                className="focus-ring"
                style={{
                  width: "100%", textAlign: "left", padding: "12px 16px", borderRadius: 14,
                  background: openPanel === "dates" ? "#F3F0FF" : "transparent", border: "none", cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: "#8F7BE8", display: "flex", alignItems: "center", gap: 5 }}>
                  <Calendar size={13} /> DATUMI
                </div>
                <div style={{ fontSize: 14, marginTop: 2, color: checkIn ? "#1F1B2E" : "#9992AC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {checkIn ? `${fmtDate(checkIn)} – ${checkOut ? fmtDate(checkOut) : "?"}` : "Dodaj datume"}
                </div>
              </button>
              {openPanel === "dates" && (
                <div className="popover" style={{ left: 0, padding: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#6B647E" }}>Dolazak</label>
                    <input
                      type="date"
                      min={todayISO()}
                      value={checkIn}
                      onChange={(e) => {
                        const v = e.target.value < todayISO() ? todayISO() : e.target.value;
                        setCheckIn(v);
                        if (checkOut && checkOut <= v) setCheckOut(addDays(v, 1));
                      }}
                      className="focus-ring"
                      style={{ display: "block", marginTop: 4, padding: "9px 10px", borderRadius: 10, border: "1px solid rgba(31,27,46,0.12)", fontSize: 14, fontFamily: "inherit", maxWidth: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#6B647E" }}>Odlazak</label>
                    <input
                      type="date"
                      min={checkIn ? addDays(checkIn, 1) : todayISO()}
                      value={checkOut}
                      onChange={(e) => {
                        const floor = checkIn ? addDays(checkIn, 1) : todayISO();
                        setCheckOut(e.target.value < floor ? floor : e.target.value);
                      }}
                      className="focus-ring"
                      style={{ display: "block", marginTop: 4, padding: "9px 10px", borderRadius: 10, border: "1px solid rgba(31,27,46,0.12)", fontSize: 14, fontFamily: "inherit", maxWidth: "100%" }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="search-field">
              <button
                onClick={() => setOpenPanel(openPanel === "guests" ? null : "guests")}
                className="focus-ring"
                style={{
                  width: "100%", textAlign: "left", padding: "12px 16px", borderRadius: 14,
                  background: openPanel === "guests" ? "#F3F0FF" : "transparent", border: "none", cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: "#8F7BE8", display: "flex", alignItems: "center", gap: 5 }}>
                  <Users size={13} /> GOSTI
                </div>
                <div style={{ fontSize: 14, marginTop: 2 }}>{guestLabel}</div>
              </button>
              {openPanel === "guests" && (
                <div className="popover" style={{ right: 0, padding: 16, width: 220 }}>
                  <Stepper label="Odrasli" sub="13+" value={adults} min={1} max={8} onChange={setAdults} />
                  <div style={{ height: 10 }} />
                  <Stepper label="Deca" sub="Ispod 13" value={children} min={0} max={6} onChange={setChildren} />
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              className="focus-ring search-submit"
              style={{
                background: "#5B3EDB", color: "#fff", border: "none", borderRadius: 14,
                padding: "12px 22px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontSize: 14, fontWeight: 600, cursor: "pointer", width: "100%",
              }}
            >
              <Search size={16} /> <span>Pretraga</span>
            </button>
          </div>

          {(location || checkIn || checkOut || adults > 1 || children > 0 || hasSearched) && (
            <button
              onClick={handleReset}
              className="focus-ring"
              style={{ display: "flex", alignItems: "center", gap: 5, margin: "10px auto 0", fontSize: 12, color: "#6B647E", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
            >
              <X size={13} /> Resetuj pretragu
            </button>
          )}

          {recent.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ fontSize: 12, color: "#9992AC", alignSelf: "center" }}>Nedavno:</span>
              {recent.map((r) => (
                <button
                  key={r}
                  onClick={() => pickRecent(r)}
                  style={{ fontSize: 12, padding: "5px 12px", borderRadius: 999, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(31,27,46,0.1)", cursor: "pointer" }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>
          {isLoading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 18, overflow: "hidden", background: "rgba(255,255,255,0.6)" }}>
                  <div style={{ height: 160, background: "linear-gradient(90deg,#eee,#f5f5f5,#eee)" }} />
                  <div style={{ padding: 14 }}>
                    <div style={{ height: 12, width: "70%", background: "#eee", borderRadius: 6, marginBottom: 8 }} />
                    <div style={{ height: 12, width: "40%", background: "#eee", borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && hasSearched && results && (
            <>
              <div style={{ fontSize: 14, color: "#6B647E", marginBottom: 18 }}>
                {pluralSmestaja(results.length)}
                {nights ? ` \u00b7 ${pluralNoci(nights)}` : ""}
              </div>
              {results.length === 0 ? (
                <EmptyState />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
                  {results.map((l) => <Card key={l.id} listing={l} nights={nights} />)}
                </div>
              )}
            </>
          )}

          {!isLoading && !hasSearched && ready && (
            <>
              <div style={{ fontSize: 14, color: "#6B647E", marginBottom: 18 }}>Popularno trenutno</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
                {LISTINGS.slice(0, 6).map((l) => <Card key={l.id} listing={l} nights={null} />)}
              </div>
            </>
          )}

          <div style={{ marginTop: 32, fontSize: 12, color: "#9992AC", textAlign: "center", maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
            Cene i dostupnost prikazuju izvori označeni uz svaki rezultat i mogu se promeniti. Konačnu cenu i rezervaciju uvek potvrđuje agencija — rezervacija se ne zaključuje na ovoj stranici.
          </div>
        </section>

        <B2BSection />
      </div>
    </div>
  );
}

function B2BSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [count, setCount] = useState("");
  const [sent, setSent] = useState(false);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await window.storage.get("vacancy-search:b2b-leads");
        if (stored?.value) setLeads(JSON.parse(stored.value));
      } catch (_) {}
    })();
  }, []);

  async function submitLead() {
    if (!name.trim() || !email.trim()) return;
    const lead = { name: name.trim(), email: email.trim(), count: count.trim(), ts: Date.now() };
    const next = [lead, ...leads].slice(0, 20);
    setLeads(next);
    window.storage.set("vacancy-search:b2b-leads", JSON.stringify(next)).catch(() => {});
    setSent(true);
    setName(""); setEmail(""); setCount("");
  }

  return (
    <section style={{ borderTop: "1px solid rgba(31,27,46,0.08)", marginTop: 20 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px 80px" }} className="b2b-grid">
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#5B3EDB", background: "#F3F0FF", padding: "5px 12px", borderRadius: 999, marginBottom: 14 }}>
            <Briefcase size={13} /> ZA TURISTIČKE AGENCIJE
          </div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 28, margin: 0, letterSpacing: "-0.01em" }}>
            Napunite slobodne termine, ne prodajte nam ništa
          </h2>
          <p style={{ marginTop: 12, fontSize: 15, color: "#6B647E", lineHeight: 1.6 }}>
            Prosleđujemo vam korisnike koji već traže tačno ono što nudite — vi zadržavate cenu, rezervaciju i klijenta. Ne uzimamo proviziju od aranžmana i ne prikazujemo vaše cene niko drugom bez vaše saglasnosti.
          </p>

          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <Benefit icon={TrendingUp} title="Plaćate samo za posete" text="CPC model — plaćate kad neko klikne na vašu ponudu, ne procenat od prodaje. Prva sezona je besplatna za pilot partnere." />
            <Benefit icon={ShieldCheck} title="Vi ostajete izvor istine" text="Mi nikad ne prodajemo aranžman niti primamo uplatu. Rezervacija se uvek završava kod vas." />
            <Benefit icon={Briefcase} title="Bez tehničkih prepreka" text="Excel tabela je dovoljna za start. API/feed integracija je opciona, ne uslov." />
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: 24, border: "1px solid rgba(31,27,46,0.08)", boxShadow: "0 20px 50px -24px rgba(31,27,46,0.2)", alignSelf: "start" }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <CheckCircle2 size={32} color="#4FB89A" style={{ margin: "0 auto 10px" }} />
              <div style={{ fontWeight: 600, fontSize: 15 }}>Prijava primljena</div>
              <div style={{ fontSize: 13, color: "#6B647E", marginTop: 6 }}>Javljamo se u roku od nekoliko dana.</div>
              <button onClick={() => setSent(false)} style={{ marginTop: 14, fontSize: 12, color: "#5B3EDB", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                Prijavi još jednu agenciju
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Prijavite agenciju za pilot</div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6B647E" }}>Naziv agencije</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="npr. Sunčani Dani Travel"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(31,27,46,0.14)", fontSize: 14, fontFamily: "inherit", marginTop: 4, marginBottom: 12 }}
              />
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6B647E" }}>Email za kontakt</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ime@agencija.rs"
                type="email"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(31,27,46,0.14)", fontSize: 14, fontFamily: "inherit", marginTop: 4, marginBottom: 12 }}
              />
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6B647E" }}>Broj aranžmana/objekata (okvirno)</label>
              <input
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="npr. 20-30"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(31,27,46,0.14)", fontSize: 14, fontFamily: "inherit", marginTop: 4, marginBottom: 16 }}
              />
              <button
                onClick={submitLead}
                disabled={!name.trim() || !email.trim()}
                style={{ width: "100%", background: !name.trim() || !email.trim() ? "#C9BBFF" : "#5B3EDB", color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: !name.trim() || !email.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                Pošalji prijavu <Send size={14} />
              </button>
              <div style={{ fontSize: 11, color: "#9992AC", marginTop: 10, textAlign: "center" }}>
                Prototip — podaci se čuvaju lokalno radi demonstracije, ne šalju se stvarnom timu.
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Benefit({ icon: Icon, title, text }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: "#F3F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} color="#5B3EDB" />
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#6B647E", marginTop: 2, lineHeight: 1.5 }}>{text}</div>
      </div>
    </div>
  );
}

function Stepper({ label, sub, value, min, max, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 12, color: "#9992AC" }}>{sub}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid rgba(31,27,46,0.15)", background: value <= min ? "#F5F5F7" : "#fff", cursor: value <= min ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Minus size={13} />
        </button>
        <span style={{ width: 16, textAlign: "center", fontSize: 14 }}>{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid rgba(31,27,46,0.15)", background: value >= max ? "#F5F5F7" : "#fff", cursor: value >= max ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

function Card({ listing, nights }) {
  const Icon = ICONS[listing.icon];
  const [c1, c2] = GRADIENTS[listing.grad];
  const total = nights ? listing.price * nights : null;

  async function handleVisit() {
    try {
      const key = `vacancy-search:clicks:${listing.id}`;
      const existing = await window.storage.get(key).catch(() => null);
      const count = (existing?.value ? parseInt(existing.value, 10) : 0) + 1;
      window.storage.set(key, String(count)).catch(() => {});
    } catch (_) {}
    window.open(listing.sourceUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ borderRadius: 18, overflow: "hidden", background: "#fff", border: listing.featured ? "1px solid #C9BBFF" : "1px solid rgba(31,27,46,0.06)", boxShadow: listing.featured ? "0 8px 28px -10px rgba(91,62,219,0.35)" : "0 8px 24px -12px rgba(31,27,46,0.15)", position: "relative" }}>
      {listing.featured && (
        <div style={{ position: "absolute", top: 10, left: 10, zIndex: 2, fontSize: 10, fontWeight: 700, letterSpacing: "0.03em", color: "#fff", background: "#5B3EDB", padding: "3px 8px", borderRadius: 999 }}>
          ISTAKNUTO
        </div>
      )}
      <div style={{ height: 150, background: `linear-gradient(135deg, ${c1}, ${c2})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={40} color="#fff" strokeWidth={1.5} />
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{listing.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 13, flexShrink: 0, marginLeft: 8 }}>
            <Star size={12} fill="#F2994A" color="#F2994A" /> {listing.rating}
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#9992AC", marginTop: 2 }}>{listing.city}, {listing.country}</div>
        <div style={{ fontSize: 12, color: "#9992AC", marginTop: 2 }}>Izvor: {listing.agency}</div>
        <div style={{ fontSize: 13, color: "#9992AC", marginTop: 2 }}>Do {listing.maxGuests} gostiju</div>
        <div style={{ marginTop: 10, fontSize: 14 }}>
          <span style={{ fontWeight: 600 }}>{listing.price}€</span> <span style={{ color: "#9992AC" }}>/ noć</span>
          {total && <div style={{ fontSize: 12, color: "#9992AC", marginTop: 2 }}>{total}€ ukupno · {pluralNoci(nights)}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
          <span style={{ fontSize: 11, color: "#9992AC" }}>{freshnessLabel(listing.updatedHoursAgo)}</span>
          {listing.sourceUrl && (
            <button
              onClick={handleVisit}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#fff", fontWeight: 600, background: "#5B3EDB", border: "none", borderRadius: 999, padding: "7px 12px", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Poseti agenciju <ExternalLink size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.6)", borderRadius: 20 }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, marginBottom: 6 }}>Ništa nije slobodno za te datume</div>
      <div style={{ fontSize: 14, color: "#6B647E" }}>Probaj manje gostiju, druge datume ili širu destinaciju.</div>
    </div>
  );
}
