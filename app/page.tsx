import dynamic from "next/dynamic";

const VenueLayout3D = dynamic(() => import("@/components/VenueLayout3D"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(ellipse at top, #16191f 0%, #0a0c10 60%, #050608 100%)",
        color: "#ffd58a",
        fontFamily:
          "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        letterSpacing: 2,
        textTransform: "uppercase",
        fontSize: 13,
      }}
    >
      Loading venue…
    </div>
  ),
});

export default function Page() {
  return (
    <main style={{ width: "100vw", height: "100dvh" }}>
      <VenueLayout3D />
    </main>
  );
}
