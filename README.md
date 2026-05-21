# Globo Expats — 3D Venue Layout

Hyper-realistic Three.js / React Three Fiber visualization of the
networking & exhibition venue, designed as a drop-in component for a
Next.js + TypeScript app.

## Run the standalone demo

```bash
cd venue-3d
npm install
npm run dev
# open http://localhost:3000
```

## Drop into your existing Next.js app

1. Copy `components/VenueLayout3D.tsx` into your project's
   `components/` (or wherever you keep client components).
2. Install the runtime deps:

   ```bash
   npm i three @react-three/fiber @react-three/drei
   npm i -D @types/three
   ```

3. Render it from any client page. The component is fully self-contained
   and responsive (uses `100dvh` + `clamp()` HUD typography):

   ```tsx
   "use client";
   import dynamic from "next/dynamic";

   const VenueLayout3D = dynamic(
     () => import("@/components/VenueLayout3D"),
     { ssr: false }
   );

   export default function Page() {
     return (
       <main style={{ width: "100vw", height: "100dvh" }}>
         <VenueLayout3D />
       </main>
     );
   }
   ```

   `ssr: false` is required — Three.js touches `window` on import.

## What's in the scene

| Element               | Details                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------- |
| **Main Stage**        | LED backdrop with event title, podium + mic, lighting truss with 5 warm spots, carpet runway |
| **VIP Section**       | Dedicated burgundy carpet directly in front of stage, velvet rope posts                 |
| **Partner Booths**    | 13 branded booths — 6 left wall, 6 right wall, 1 near entrance; floor + back-panel labels |
| **Round Tables**      | ~11 tables with 5–6 chairs each, centerpieces with subtle warm glow                     |
| **Entrance**          | Gold-trimmed arch, "WELCOME" sign, carpet runway, floor label                           |
| **Registration**      | Check-in counter with staff figures, lit signage                                        |
| **Catering**          | Bar counter with bottles and backsplash signage                                         |
| **Photo Wall**        | Hashtag-branded social media wall                                                       |
| **Emergency Exits**   | 4 illuminated green EXIT signs on side walls                                            |
| **Directional Signs** | Multi-line wayfinding signage in the entrance lobby                                     |
| **Overhead Labels**   | Floating hanging signs (PARTNERS 1-6, PARTNERS 7-12, NETWORKING ZONE)                  |
| **Decor**             | 10 potted plants distributed around perimeter and aisles                                |
| **Crowd**             | 28 procedurally placed human figures (gently bobbing) for scale                         |
| **HUD**               | View switcher (Isometric / Top-Down / Stage), legend, hover panel for booth highlight   |

## Interaction

- **Drag** to orbit
- **Scroll / pinch** to zoom
- **Hover** a partner booth → it brightens and a hover panel appears
- **View buttons** smoothly transition the camera between perspectives

## Responsive

- Canvas fills `100dvh` / `100%` of its container — works as a full page
  or embedded panel.
- HUD typography uses `clamp()` so it scales on phones, tablets, and
  desktops.
- `dpr={[1, 2]}` caps the device pixel ratio so retina displays don't
  tank framerate.
- `touch-action: none` on the canvas prevents page-pan from fighting
  orbit gestures on mobile.

## Layout reference

Booth and stage positions follow the user-supplied
`venue_layout_sketch.pdf`: stage at the short wall opposite the
entrance, booths lining the long walls, audience tables filling the
center with a clear carpet aisle, and refreshments / photo wall at the
two front corners near the entrance.

## File map

```
venue-3d/
├── app/
│   ├── globals.css         # base CSS + mobile tweaks
│   ├── layout.tsx          # Next.js root layout
│   └── page.tsx            # dynamic import wrapper (SSR-disabled)
├── components/
│   └── VenueLayout3D.tsx   # the entire scene (drop-in)
├── next.config.mjs
├── package.json
├── README.md
└── tsconfig.json
```
