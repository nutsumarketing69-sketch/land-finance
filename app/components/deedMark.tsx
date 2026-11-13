export function deedMark(size: number) {
  const pad = Math.round(size * 0.16);
  const sheet = size - pad * 2;
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#022c22",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: sheet,
          height: Math.round(sheet * 0.86),
          background: "#f6e2b3",
          borderRadius: Math.round(size * 0.08),
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: Math.round(size * 0.08),
        }}
      >
        <div
          style={{
            width: "100%",
            height: Math.round(sheet * 0.28),
            background: "#059669",
            borderRadius: Math.round(size * 0.04),
          }}
        />
      </div>
    </div>
  );
}
