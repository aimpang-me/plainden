export const ogSize = { width: 1200, height: 630 };

export function OgImage({ title, description }: { title: string; description: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#ffffff",
        color: "#111111",
        padding: "80px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 28, color: "#1d4ed8" }}>plainden</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 64, lineHeight: 1.1 }}>{title}</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 28, color: "#555555" }}>{description}</div>
      </div>
    </div>
  );
}
