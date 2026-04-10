export default function MovieLoading() {
  return (
    <div className="fade-up" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Hero skeleton */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: "var(--bg-card)", minHeight: 280,
      }}>
        <div style={{
          maxWidth: 900, margin: "0 auto",
          padding: "44px 28px 52px",
          display: "flex", gap: 32, alignItems: "flex-end",
        }}>
          {/* Poster skeleton */}
          <div className="skeleton" style={{
            width: 160, aspectRatio: "2/3", borderRadius: 12, flexShrink: 0,
          }} />
          {/* Info skeleton */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="skeleton" style={{ width: "35%", height: 14, borderRadius: 4 }} />
            <div className="skeleton" style={{ width: "60%", height: 28, borderRadius: 6 }} />
            <div className="skeleton" style={{ width: "45%", height: 16, borderRadius: 4 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <div className="skeleton" style={{ width: 60, height: 12, borderRadius: 3 }} />
              <div className="skeleton" style={{ width: 60, height: 12, borderRadius: 3 }} />
              <div className="skeleton" style={{ width: 60, height: 12, borderRadius: 3 }} />
            </div>
          </div>
        </div>
      </div>
      {/* Content skeleton */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 28px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          <div className="skeleton" style={{ width: 80, height: 36, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: 80, height: 36, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: 80, height: 36, borderRadius: 6 }} />
        </div>
        <div className="skeleton" style={{ width: "100%", height: 120, borderRadius: 14, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: "100%", height: 80, borderRadius: 14, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: "70%", height: 60, borderRadius: 14 }} />
      </div>
    </div>
  );
}
