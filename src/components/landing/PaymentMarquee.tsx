const items = [
  { initials: "OM", name: "Orange Money" },
  { initials: "WA", name: "Wave" },
  { initials: "DJ", name: "Djamo" },
  { initials: "PC", name: "Push CI" },
  { initials: "MO", name: "Moov Money" },
  { initials: "MT", name: "MTN Money" },
];

const Pill = ({ initials, name }: { initials: string; name: string }) => (
  <div className="flex items-center gap-3 px-4 py-2 mx-4 flex-shrink-0">
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-sm"
      style={{
        background: "rgba(124,255,58,0.10)",
        border: "1px solid rgba(124,255,58,0.25)",
        color: "#7CFF3A",
      }}
    >
      {initials}
    </div>
    <span
      className="font-display text-base whitespace-nowrap"
      style={{ color: "rgba(234,251,234,0.55)" }}
    >
      {name}
    </span>
  </div>
);

const PaymentMarquee = () => {
  const loop = [...items, ...items];
  return (
    <section
      className="relative w-full py-10"
      style={{
        background: "#14171C",
        borderTop: "1px solid rgba(124,255,58,0.07)",
        borderBottom: "1px solid rgba(124,255,58,0.07)",
      }}
    >
      <p
        className="text-center text-[11px] font-semibold uppercase mb-6"
        style={{ letterSpacing: "0.22em", color: "rgba(234,251,234,0.4)" }}
      >
        Compatible avec vos moyens de paiement
      </p>

      <div className="relative overflow-hidden group">
        {/* Fondu bords */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10"
          style={{ background: "linear-gradient(to right, #14171C, transparent)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10"
          style={{ background: "linear-gradient(to left, #14171C, transparent)" }}
        />

        <div
          className="flex marquee-track"
          style={{ width: "max-content" }}
        >
          {loop.map((it, i) => (
            <Pill key={`${it.name}-${i}`} initials={it.initials} name={it.name} />
          ))}
        </div>
      </div>

      <style>{`
        .marquee-track {
          animation: marquee-scroll 22s linear infinite;
        }
        .group:hover .marquee-track {
          animation-play-state: paused;
        }
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
};

export default PaymentMarquee;
