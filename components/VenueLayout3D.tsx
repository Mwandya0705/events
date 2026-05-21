"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Html,
  Text,
  ContactShadows,
  RoundedBox,
  Float,
  SoftShadows,
} from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

/* =========================================================================
   VENUE GEOMETRY  ·  follows the user-supplied sketch
   ------------------------------------------------------
   Coordinates: +X = east, +Z = south, origin = center of main hall floor.

     N (−Z)
       ┌─────────────────────────────┐
       │  ┌─────────┐                │
       │  │ NW      │                │   ← Stage on EAST wall
       │  │ LOUNGE  │                │═════
       │  └─────────┘                │═S═══
       │ ╱╱╱                         │═T═══
       │ ╱ COUNTER                   │═G═══
       │ ╱╱╱                         │═════
       │                             │
       └─[ENTRANCE]─┬──┬─────┬──┬────┘
                   │  │     │  │
                   │S1│     │S2│   ← South bays
                   └──┘     └──┘
     S (+Z)
   ========================================================================= */

const VENUE_W = 52; // east-west (scaled up for ~150 guests)
const VENUE_D = 62; // north-south
const WALL_H = 6;

// NW lounge dimensions
const LOUNGE_W = 20;
const LOUNGE_D = 17;
const LOUNGE_CX = -VENUE_W / 2 + LOUNGE_W / 2;
const LOUNGE_CZ = -VENUE_D / 2 + LOUNGE_D / 2;

// Counter (long bar) on west wall
const COUNTER_W = 4;
const COUNTER_D = 22;
const COUNTER_CX = -VENUE_W / 2 + COUNTER_W / 2 + 0.5;
const COUNTER_CZ = -VENUE_D / 2 + LOUNGE_D + 1 + COUNTER_D / 2;

// Stage on east wall (long, vertical)
const STAGE_W = 5;        // depth into the room (x extent)
const STAGE_D = 22;       // height along z
const STAGE_CX = VENUE_W / 2 - STAGE_W / 2 - 0.4;
const STAGE_CZ = -8;      // north of center to leave audience room

// South protruding bays
const BAY_W = 11;
const BAY_D = 7;
const BAY1_CX = -10;
const BAY2_CX = 11;
const BAY_CZ = VENUE_D / 2 + BAY_D / 2;

// Entrance position (SW corner)
const ENTRANCE_CX = -VENUE_W / 2 + 7;
const ENTRANCE_CZ = VENUE_D / 2 - 0.3;

const THEME = {
  floor: "#e9e4dc",
  floorAccent: "#cdb37a",
  carpet: "#7a1f2b",
  wall: "#1c1f25",
  loungeWall: "#2a2d34",
  trim: "#c9a86a",
  stage: "#0e1116",
  led: "#1a2540",
  ledGlow: "#5aa7ff",
  table: "#1a1a1d",
  tablecloth: "#f6f1e7",
  chair: "#222428",
  partner: "#ffffff",
  partnerAccent: "#c9a86a",
  plant: "#2f6b3a",
  pot: "#2a2a2a",
  signage: "#0f1115",
  vip: "#3a1620",
  warm: "#ffb86b",
  counter: "#1a1c20",
  counterTop: "#c9a86a",
};

/* ----------------------------- Floor label ----------------------------- */
function FloorLabel({
  position,
  text,
  size = 0.6,
  color = "#0c0e12",
  bg = "rgba(255,255,255,0.92)",
  width,
}: {
  position: [number, number, number];
  text: string;
  size?: number;
  color?: string;
  bg?: string;
  width?: number;
}) {
  return (
    <Html
      position={position}
      center
      distanceFactor={14}
      transform={false}
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          padding: "6px 12px",
          borderRadius: 999,
          background: bg,
          color,
          fontFamily:
            "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          fontWeight: 700,
          fontSize: 12 * (size / 0.6),
          letterSpacing: 0.4,
          whiteSpace: "nowrap",
          boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          border: "1px solid rgba(0,0,0,0.06)",
          minWidth: width,
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </Html>
  );
}

/* ------------------------------ Venue shell ------------------------------ */
function VenueShell() {
  return (
    <group>
      {/* Outer dark ground */}
      <mesh receiveShadow rotation-x={-Math.PI / 2} position-y={-0.02}>
        <planeGeometry args={[140, 160]} />
        <meshStandardMaterial color="#1a1c20" roughness={1} />
      </mesh>

      {/* Main floor */}
      <mesh receiveShadow rotation-x={-Math.PI / 2} position-y={0}>
        <planeGeometry args={[VENUE_W, VENUE_D]} />
        <meshStandardMaterial color={THEME.floor} roughness={0.55} />
      </mesh>

      {/* Bay floors (south protrusions) */}
      {[
        [BAY1_CX, BAY_CZ] as const,
        [BAY2_CX, BAY_CZ] as const,
      ].map(([cx, cz], i) => (
        <mesh
          key={i}
          receiveShadow
          rotation-x={-Math.PI / 2}
          position={[cx, 0, cz]}
        >
          <planeGeometry args={[BAY_W, BAY_D]} />
          <meshStandardMaterial color={THEME.floor} roughness={0.55} />
        </mesh>
      ))}

      {/* Floor accent runway from stage going west into audience */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, STAGE_CZ]}>
        <planeGeometry args={[VENUE_W - 8, 4]} />
        <meshStandardMaterial color={THEME.carpet} roughness={0.85} />
      </mesh>

      {/* ---------- Outer walls (with cutouts handled by piecing) ---------- */}

      {/* North wall (full) */}
      <mesh
        position={[0, WALL_H / 2, -VENUE_D / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[VENUE_W, WALL_H, 0.4]} />
        <meshStandardMaterial color={THEME.wall} roughness={0.6} />
      </mesh>

      {/* South wall — broken into 3 segments around the two bay openings */}
      {/* West segment (from west wall to bay1) */}
      <mesh
        position={[
          (-VENUE_W / 2 + (BAY1_CX - BAY_W / 2)) / 2,
          WALL_H / 2,
          VENUE_D / 2,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            BAY1_CX - BAY_W / 2 - -VENUE_W / 2,
            WALL_H,
            0.4,
          ]}
        />
        <meshStandardMaterial color={THEME.wall} roughness={0.6} />
      </mesh>
      {/* Middle segment (between the two bays) */}
      <mesh
        position={[
          (BAY1_CX + BAY_W / 2 + BAY2_CX - BAY_W / 2) / 2,
          WALL_H / 2,
          VENUE_D / 2,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            BAY2_CX - BAY_W / 2 - (BAY1_CX + BAY_W / 2),
            WALL_H,
            0.4,
          ]}
        />
        <meshStandardMaterial color={THEME.wall} roughness={0.6} />
      </mesh>
      {/* East segment (from bay2 to east wall) */}
      <mesh
        position={[
          (BAY2_CX + BAY_W / 2 + VENUE_W / 2) / 2,
          WALL_H / 2,
          VENUE_D / 2,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            VENUE_W / 2 - (BAY2_CX + BAY_W / 2),
            WALL_H,
            0.4,
          ]}
        />
        <meshStandardMaterial color={THEME.wall} roughness={0.6} />
      </mesh>

      {/* East wall */}
      <mesh
        position={[VENUE_W / 2, WALL_H / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.4, WALL_H, VENUE_D]} />
        <meshStandardMaterial color={THEME.wall} roughness={0.6} />
      </mesh>

      {/* West wall — broken to leave entrance opening near SW */}
      {/* North part of west wall */}
      <mesh
        position={[-VENUE_W / 2, WALL_H / 2, -2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.4, WALL_H, VENUE_D - 12]} />
        <meshStandardMaterial color={THEME.wall} roughness={0.6} />
      </mesh>
      {/* South stub (between entrance opening and SW corner) */}
      <mesh
        position={[-VENUE_W / 2, WALL_H / 2, VENUE_D / 2 - 1.5]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.4, WALL_H, 3]} />
        <meshStandardMaterial color={THEME.wall} roughness={0.6} />
      </mesh>

      {/* South-bay walls (3 sides per bay) */}
      {[BAY1_CX, BAY2_CX].map((cx, i) => (
        <group key={i}>
          {/* west wall of bay */}
          <mesh
            position={[cx - BAY_W / 2, WALL_H / 2, BAY_CZ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.4, WALL_H, BAY_D]} />
            <meshStandardMaterial color={THEME.wall} roughness={0.6} />
          </mesh>
          {/* east wall of bay */}
          <mesh
            position={[cx + BAY_W / 2, WALL_H / 2, BAY_CZ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.4, WALL_H, BAY_D]} />
            <meshStandardMaterial color={THEME.wall} roughness={0.6} />
          </mesh>
          {/* south wall of bay */}
          <mesh
            position={[cx, WALL_H / 2, BAY_CZ + BAY_D / 2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[BAY_W, WALL_H, 0.4]} />
            <meshStandardMaterial color={THEME.wall} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* ---------- NW Lounge enclosure (internal walls) ---------- */}
      {/* South wall of lounge */}
      <mesh
        position={[LOUNGE_CX, WALL_H / 2 - 1.5, LOUNGE_CZ + LOUNGE_D / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[LOUNGE_W, WALL_H - 3, 0.3]} />
        <meshStandardMaterial
          color={THEME.loungeWall}
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>
      {/* East wall of lounge */}
      <mesh
        position={[LOUNGE_CX + LOUNGE_W / 2, WALL_H / 2 - 1.5, LOUNGE_CZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.3, WALL_H - 3, LOUNGE_D]} />
        <meshStandardMaterial
          color={THEME.loungeWall}
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>
      {/* Gold trim on top of lounge walls */}
      <mesh
        position={[
          LOUNGE_CX + LOUNGE_W / 2,
          WALL_H / 2 + 1.5 - 0.1,
          LOUNGE_CZ,
        ]}
      >
        <boxGeometry args={[0.4, 0.08, LOUNGE_D]} />
        <meshStandardMaterial color={THEME.trim} metalness={0.9} />
      </mesh>
      <mesh
        position={[
          LOUNGE_CX,
          WALL_H / 2 + 1.5 - 0.1,
          LOUNGE_CZ + LOUNGE_D / 2,
        ]}
      >
        <boxGeometry args={[LOUNGE_W, 0.08, 0.4]} />
        <meshStandardMaterial color={THEME.trim} metalness={0.9} />
      </mesh>

      {/* Lounge floor with darker carpet */}
      <mesh rotation-x={-Math.PI / 2} position={[LOUNGE_CX, 0.013, LOUNGE_CZ]}>
        <planeGeometry args={[LOUNGE_W - 0.3, LOUNGE_D - 0.3]} />
        <meshStandardMaterial color="#2a1218" roughness={0.85} />
      </mesh>

      {/* Top gold trim on perimeter walls */}
      {[
        [0, WALL_H, -VENUE_D / 2, VENUE_W, 0.12, 0.5] as const,
        [VENUE_W / 2, WALL_H, 0, 0.5, 0.12, VENUE_D] as const,
        [-VENUE_W / 2, WALL_H, 0, 0.5, 0.12, VENUE_D] as const,
      ].map((p, i) => (
        <mesh key={i} position={[p[0], p[1], p[2]]}>
          <boxGeometry args={[p[3], p[4], p[5]]} />
          <meshStandardMaterial color={THEME.trim} metalness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------- Main stage ------------------------------- */
function MainStage() {
  const stageH = 0.6;

  return (
    <group position={[STAGE_CX, 0, STAGE_CZ]}>
      {/* Deck */}
      <RoundedBox
        args={[STAGE_W, stageH, STAGE_D]}
        radius={0.05}
        smoothness={4}
        position={[0, stageH / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={THEME.stage} roughness={0.4} />
      </RoundedBox>
      {/* Gold strip on stage edge (audience-facing = west = −X) */}
      <mesh position={[-STAGE_W / 2 - 0.01, stageH / 2, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[STAGE_D, 0.12]} />
        <meshStandardMaterial color={THEME.trim} metalness={0.9} />
      </mesh>

      {/* LED screen backdrop along east wall */}
      <group position={[STAGE_W / 2 - 0.2, 3.4, 0]} rotation-y={-Math.PI / 2}>
        <mesh castShadow>
          <boxGeometry args={[15, 4.8, 0.2]} />
          <meshStandardMaterial color="#05070a" />
        </mesh>
        <mesh position={[0, 0, 0.12]}>
          <planeGeometry args={[14.2, 4.2]} />
          <meshStandardMaterial
            color={THEME.led}
            emissive={THEME.ledGlow}
            emissiveIntensity={1.2}
          />
        </mesh>
        <Text
          position={[0, 0.5, 0.14]}
          fontSize={0.8}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          EXPATS NETWORKING SUMMIT
        </Text>
        <Text
          position={[0, -0.7, 0.14]}
          fontSize={0.32}
          color="#9ccaff"
          anchorX="center"
          anchorY="middle"
        >
          2026 · PARTNER EXHIBITION
        </Text>
      </group>

      {/* Podium near south end of stage */}
      <group position={[0, stageH, STAGE_D / 2 - 2]} rotation-y={-Math.PI / 2}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 1.1, 0.7]} />
          <meshStandardMaterial color="#0b0d10" />
        </mesh>
        <mesh position={[0, 0.65, 0.36]}>
          <boxGeometry args={[0.7, 0.05, 0.05]} />
          <meshStandardMaterial color={THEME.trim} metalness={0.9} />
        </mesh>
        <mesh position={[0, 1.0, 0.2]} rotation-x={-0.3}>
          <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.7} />
        </mesh>
      </group>

      {/* Truss + spot lights above stage running N-S */}
      <group position={[0, 5.4, 0]}>
        <mesh>
          <boxGeometry args={[0.15, 0.15, STAGE_D - 2]} />
          <meshStandardMaterial color="#222" metalness={0.7} />
        </mesh>
        {[-7, -3.5, 0, 3.5, 7].map((z) => (
          <group key={z} position={[0, -0.4, z]}>
            <mesh>
              <cylinderGeometry args={[0.18, 0.22, 0.4, 12]} />
              <meshStandardMaterial color="#111" metalness={0.6} />
            </mesh>
            <pointLight
              position={[-1, -0.5, 0]}
              color={THEME.warm}
              intensity={2.5}
              distance={10}
              decay={2}
            />
            <mesh position={[-0.3, -0.25, 0]} rotation-z={Math.PI / 2}>
              <coneGeometry args={[1.6, 3.0, 24, 1, true]} />
              <meshStandardMaterial
                color={THEME.warm}
                transparent
                opacity={0.08}
                emissive={THEME.warm}
                emissiveIntensity={0.5}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Stage label on floor in front (west of stage) */}
      <FloorLabel
        position={[-STAGE_W / 2 - 1.4, 0.05, 0]}
        text="MAIN STAGE"
        size={0.9}
        bg="rgba(15,17,21,0.92)"
        color="#ffd58a"
        width={180}
      />
    </group>
  );
}

/* --------------------------- Chair primitive --------------------------- */
function Chair({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  return (
    <group position={position} rotation-y={rotation}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.5, 0.08, 0.5]} />
        <meshStandardMaterial color={THEME.chair} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.85, -0.22]} castShadow>
        <boxGeometry args={[0.5, 0.7, 0.06]} />
        <meshStandardMaterial color={THEME.chair} roughness={0.6} />
      </mesh>
      {[
        [-0.22, 0, -0.22],
        [0.22, 0, -0.22],
        [-0.22, 0, 0.22],
        [0.22, 0, 0.22],
      ].map((p, k) => (
        <mesh key={k} position={[p[0], 0.22, p[2]]}>
          <boxGeometry args={[0.05, 0.45, 0.05]} />
          <meshStandardMaterial color="#0b0b0d" />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------------- Long banquet table + chairs ---------------------- */
function LongTable({
  position,
  length = 11,
  width = 1.2,
  seatsPerSide = 11,
  rotation = 0,
}: {
  position: [number, number, number];
  length?: number;
  width?: number;
  seatsPerSide?: number;
  rotation?: number;
}) {
  const seatStep = length / seatsPerSide;
  const chairXs = useMemo(
    () =>
      Array.from(
        { length: seatsPerSide },
        (_, i) => -length / 2 + seatStep / 2 + i * seatStep
      ),
    [length, seatsPerSide, seatStep]
  );

  return (
    <group position={position} rotation-y={rotation}>
      {/* Tablecloth drape */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, 0.78, width]} />
        <meshStandardMaterial color={THEME.tablecloth} roughness={0.9} />
      </mesh>
      {/* Table top */}
      <mesh position={[0, 0.81, 0]} receiveShadow>
        <boxGeometry args={[length + 0.04, 0.04, width + 0.04]} />
        <meshStandardMaterial color={THEME.table} roughness={0.5} />
      </mesh>
      {/* Gold runner down the center */}
      <mesh position={[0, 0.835, 0]}>
        <boxGeometry args={[length - 0.6, 0.01, 0.35]} />
        <meshStandardMaterial color={THEME.trim} metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Centerpieces (candles + glass) every ~3m */}
      {Array.from({ length: Math.max(3, Math.floor(length / 3)) }).map((_, i, arr) => {
        const t = (i + 1) / (arr.length + 1);
        const cx = -length / 2 + t * length;
        return (
          <group key={i}>
            <mesh position={[cx, 0.88, 0]}>
              <cylinderGeometry args={[0.08, 0.12, 0.14, 14]} />
              <meshStandardMaterial color={THEME.trim} metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[cx, 1.0, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.12, 12]} />
              <meshStandardMaterial color="#fff7d6" emissive="#ffd58a" emissiveIntensity={0.6} />
            </mesh>
            <pointLight
              position={[cx, 1.1, 0]}
              color="#ffd58a"
              intensity={0.45}
              distance={3}
              decay={2}
            />
          </group>
        );
      })}
      {/* Chairs on +Z side (facing −Z) */}
      {chairXs.map((cx, i) => (
        <Chair
          key={`pz-${i}`}
          position={[cx, 0, width / 2 + 0.55]}
          rotation={Math.PI}
        />
      ))}
      {/* Chairs on −Z side (facing +Z) */}
      {chairXs.map((cx, i) => (
        <Chair
          key={`nz-${i}`}
          position={[cx, 0, -width / 2 - 0.55]}
          rotation={0}
        />
      ))}
    </group>
  );
}

/* --------------------------- Round table + chairs --------------------------- */
function RoundTable({
  position,
  seats = 6,
  rotation = 0,
}: {
  position: [number, number, number];
  seats?: number;
  rotation?: number;
}) {
  const tableR = 0.85;
  const chairR = tableR + 0.55;
  const chairs = useMemo(
    () => Array.from({ length: seats }, (_, i) => (i / seats) * Math.PI * 2),
    [seats]
  );

  return (
    <group position={position} rotation-y={rotation}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[tableR, tableR + 0.05, 0.78, 32]} />
        <meshStandardMaterial color={THEME.tablecloth} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.79, 0]}>
        <cylinderGeometry args={[tableR + 0.02, tableR + 0.02, 0.04, 32]} />
        <meshStandardMaterial color={THEME.table} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.86, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.14, 16]} />
        <meshStandardMaterial color={THEME.trim} metalness={0.8} roughness={0.3} />
      </mesh>
      <pointLight
        position={[0, 1.0, 0]}
        color="#ffd58a"
        intensity={0.35}
        distance={2.2}
        decay={2}
      />

      {chairs.map((a, i) => {
        const x = Math.cos(a) * chairR;
        const z = Math.sin(a) * chairR;
        return (
          <Chair
            key={i}
            position={[x, 0, z]}
            rotation={-a + Math.PI / 2}
          />
        );
      })}
    </group>
  );
}

/* ------------------------------ Partner booth ------------------------------ */
function PartnerBooth({
  position,
  rotation = 0,
  label,
  accent = THEME.partnerAccent,
  onHover,
  size = "M",
}: {
  position: [number, number, number];
  rotation?: number;
  label: string;
  accent?: string;
  onHover?: (h: boolean) => void;
  size?: "S" | "M" | "L";
}) {
  const dims = size === "L" ? { w: 4.4, d: 2.6 } : size === "S" ? { w: 2.8, d: 1.8 } : { w: 3.4, d: 2.2 };
  const { w, d } = dims;
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      rotation-y={rotation}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover?.(true);
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover?.(false);
      }}
    >
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial color="#16181c" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.55, -d / 2 + 0.35]} castShadow receiveShadow>
        <boxGeometry args={[w - 0.4, 1.0, 0.6]} />
        <meshStandardMaterial
          color={hovered ? "#ffffff" : THEME.partner}
          roughness={0.5}
        />
      </mesh>
      <mesh position={[0, 1.06, -d / 2 + 0.35]}>
        <boxGeometry args={[w - 0.3, 0.05, 0.7]} />
        <meshStandardMaterial color={accent} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.55, -d / 2 + 0.05]} castShadow>
        <boxGeometry args={[w, 2.6, 0.1]} />
        <meshStandardMaterial color="#0f1115" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.7, -d / 2 + 0.11]}>
        <planeGeometry args={[w - 0.4, 1.8]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={hovered ? 0.7 : 0.25}
          roughness={0.4}
          metalness={0.5}
        />
      </mesh>
      <Text
        position={[0, 1.85, -d / 2 + 0.13]}
        fontSize={size === "L" ? 0.5 : 0.42}
        color="#0c0e12"
        anchorX="center"
        anchorY="middle"
        maxWidth={w - 0.6}
        textAlign="center"
      >
        {label.toUpperCase()}
      </Text>
      <Text
        position={[0, 1.3, -d / 2 + 0.13]}
        fontSize={0.18}
        color="#0c0e12"
        anchorX="center"
        anchorY="middle"
      >
        EXHIBITION SPACE
      </Text>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - 0.05), 1.5, -d / 2 + 0.1]}>
          <boxGeometry args={[0.1, 3, 0.1]} />
          <meshStandardMaterial color={accent} metalness={0.7} />
        </mesh>
      ))}
      <pointLight
        position={[0, 2.6, 0]}
        color="#fff1d6"
        intensity={hovered ? 1.4 : 0.7}
        distance={5}
        decay={2}
      />
      <FloorLabel
        position={[0, 0.06, d / 2 + 0.5]}
        text={label}
        size={0.55}
        bg={hovered ? accent : "rgba(255,255,255,0.95)"}
        color="#0c0e12"
      />
    </group>
  );
}

/* ------------------------------- Plant ------------------------------- */
function Plant({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.34, 0.5, 16]} />
        <meshStandardMaterial color={THEME.pot} roughness={0.7} />
      </mesh>
      {[
        [0, 0.85, 0, 0.55],
        [0.18, 1.05, 0.05, 0.42],
        [-0.16, 1.0, -0.08, 0.46],
        [0.05, 1.25, -0.04, 0.34],
      ].map((p, i) => (
        <mesh key={i} position={[p[0], p[1], p[2]]} castShadow>
          <sphereGeometry args={[p[3], 12, 10]} />
          <meshStandardMaterial color={THEME.plant} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/* --------------------------------- Person --------------------------------- */
function Person({
  position,
  color = "#3a3f4b",
  bobSpeed = 0,
  bobAmp = 0,
}: {
  position: [number, number, number];
  color?: string;
  bobSpeed?: number;
  bobAmp?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const base = position[1];
  useFrame((state) => {
    if (!ref.current || bobSpeed === 0) return;
    ref.current.position.y =
      base + Math.sin(state.clock.elapsedTime * bobSpeed) * bobAmp;
  });
  return (
    <group ref={ref} position={position}>
      <mesh position={[-0.08, 0.45, 0]} castShadow>
        <boxGeometry args={[0.14, 0.9, 0.16]} />
        <meshStandardMaterial color="#1a1c20" />
      </mesh>
      <mesh position={[0.08, 0.45, 0]} castShadow>
        <boxGeometry args={[0.14, 0.9, 0.16]} />
        <meshStandardMaterial color="#1a1c20" />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.42, 0.7, 0.24]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.72, 0]} castShadow>
        <sphereGeometry args={[0.17, 16, 16]} />
        <meshStandardMaterial color="#c89b7a" roughness={0.7} />
      </mesh>
    </group>
  );
}

/* ------------------ Long counter / bar along west wall ------------------ */
function WestCounter() {
  return (
    <group position={[COUNTER_CX, 0, COUNTER_CZ]}>
      {/* Counter body */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[COUNTER_W, 1.1, COUNTER_D]} />
        <meshStandardMaterial color={THEME.counter} roughness={0.4} />
      </mesh>
      {/* Counter top */}
      <mesh position={[0, 1.13, 0]}>
        <boxGeometry args={[COUNTER_W + 0.1, 0.08, COUNTER_D + 0.1]} />
        <meshStandardMaterial color={THEME.counterTop} metalness={0.8} />
      </mesh>
      {/* Diagonal stripe pattern on counter face (audience-facing east side) */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            COUNTER_W / 2 + 0.005,
            0.55,
            -COUNTER_D / 2 + 1 + i * 1.6,
          ]}
          rotation-y={Math.PI / 2}
          rotation-z={Math.PI / 4}
        >
          <planeGeometry args={[1.0, 0.18]} />
          <meshStandardMaterial color={THEME.trim} metalness={0.5} />
        </mesh>
      ))}
      {/* Backsplash / branding wall behind counter */}
      <mesh position={[-COUNTER_W / 2 - 0.05, 2.2, 0]}>
        <boxGeometry args={[0.05, 3.0, COUNTER_D - 1]} />
        <meshStandardMaterial color="#0f1115" />
      </mesh>
      {/* Bottles + tableware on counter (sparse) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            (i % 2 ? -0.4 : 0.4),
            1.45,
            -COUNTER_D / 2 + 1 + i * 1.9,
          ]}
          castShadow
        >
          <cylinderGeometry args={[0.08, 0.08, 0.5, 12]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? "#7a1f2b" : i % 3 === 1 ? "#cba27a" : "#3a5a7a"}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
      <Text
        position={[-COUNTER_W / 2 - 0.025, 2.8, 0]}
        rotation-y={Math.PI / 2}
        fontSize={0.42}
        color={THEME.trim}
        anchorX="center"
        anchorY="middle"
      >
        REFRESHMENTS · CATERING · BAR
      </Text>
      <FloorLabel
        position={[COUNTER_W / 2 + 1.2, 0.06, 0]}
        text="COUNTER / BAR"
        size={0.7}
        bg="rgba(15,17,21,0.92)"
        color="#ffd58a"
      />
    </group>
  );
}

/* --------------------- NW Lounge (premium / VIP) --------------------- */
function NWLounge() {
  return (
    <group position={[LOUNGE_CX, 0, LOUNGE_CZ]}>
      {/* Lounge label hanging over the room */}
      <Float speed={1} rotationIntensity={0.04} floatIntensity={0.25}>
        <group position={[0, 4.5, 0]}>
          <mesh>
            <boxGeometry args={[6, 0.8, 0.08]} />
            <meshStandardMaterial color={THEME.signage} />
          </mesh>
          <Text
            position={[0, 0, 0.05]}
            fontSize={0.35}
            color={THEME.trim}
            anchorX="center"
            anchorY="middle"
          >
            VIP LOUNGE
          </Text>
        </group>
      </Float>

      {/* Lounge sofas — L-shape arrangement around a coffee table */}
      {/* Sofa A: north side */}
      <mesh position={[-3.5, 0.4, -3]} castShadow>
        <boxGeometry args={[5, 0.8, 1.4]} />
        <meshStandardMaterial color="#7a1f2b" roughness={0.85} />
      </mesh>
      <mesh position={[-3.5, 1.0, -3.55]} castShadow>
        <boxGeometry args={[5, 0.5, 0.3]} />
        <meshStandardMaterial color="#7a1f2b" roughness={0.85} />
      </mesh>
      {/* Sofa B: east side */}
      <mesh position={[2.5, 0.4, 0]} castShadow>
        <boxGeometry args={[1.4, 0.8, 5]} />
        <meshStandardMaterial color="#7a1f2b" roughness={0.85} />
      </mesh>
      <mesh position={[3.05, 1.0, 0]} castShadow>
        <boxGeometry args={[0.3, 0.5, 5]} />
        <meshStandardMaterial color="#7a1f2b" roughness={0.85} />
      </mesh>
      {/* Coffee table */}
      <mesh position={[-1, 0.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.9, 0.95, 0.5, 24]} />
        <meshStandardMaterial color="#0d0f12" roughness={0.4} />
      </mesh>
      <mesh position={[-1, 0.61, 0]}>
        <cylinderGeometry args={[0.95, 0.95, 0.04, 24]} />
        <meshStandardMaterial color={THEME.trim} metalness={0.8} />
      </mesh>
      {/* Centerpiece glow */}
      <pointLight
        position={[-1, 1.1, 0]}
        intensity={0.6}
        color="#ffd58a"
        distance={4}
        decay={2}
      />

      {/* Lounge guests */}
      <Person position={[-3.5, 0.05, -2.2]} color="#3a4a5a" />
      <Person position={[-1.5, 0.05, -2.2]} color="#5a3a3a" />
      <Person position={[1.5, 0.05, 0]} color="#4a3a5a" />
      <Person position={[1.5, 0.05, 2]} color="#3a5a4a" />

      {/* Decor plants in lounge corners */}
      <Plant position={[-7, 0, -6]} scale={1.2} />
      <Plant position={[6, 0, 5.5]} scale={1.1} />

      <FloorLabel
        position={[-1, 0.07, 5.5]}
        text="VIP / PARTNERS LOUNGE"
        size={0.65}
        bg="rgba(58,22,32,0.95)"
        color="#ffd58a"
      />
    </group>
  );
}

/* ------------- South protruding bays (premium booth alcoves) ------------- */
function SouthBay({
  cx,
  label,
  partnerLabels,
  accents,
  onHoverChange,
}: {
  cx: number;
  label: string;
  partnerLabels: string[];
  accents: string[];
  onHoverChange?: (l: string | null) => void;
}) {
  return (
    <group position={[cx, 0, BAY_CZ]}>
      {/* Two booths per bay, side by side facing into the main hall (−Z) */}
      {partnerLabels.map((p, i) => {
        const x = (i - (partnerLabels.length - 1) / 2) * 3.6;
        return (
          <PartnerBooth
            key={p}
            position={[x, 0, BAY_D / 2 - 0.8]}
            rotation={Math.PI}
            label={p}
            accent={accents[i]}
            onHover={(h) => onHoverChange?.(h ? p : null)}
            size="S"
          />
        );
      })}
      {/* Bay banner */}
      <Float speed={1} rotationIntensity={0.03} floatIntensity={0.2}>
        <group position={[0, 4.2, 0]}>
          <mesh>
            <boxGeometry args={[5, 0.6, 0.08]} />
            <meshStandardMaterial color={THEME.signage} />
          </mesh>
          <Text
            position={[0, 0, 0.05]}
            fontSize={0.25}
            color={THEME.trim}
            anchorX="center"
          >
            {label}
          </Text>
        </group>
      </Float>
    </group>
  );
}

/* ------------------------------- Entrance ------------------------------- */
function EntranceArea() {
  return (
    <group>
      {/* Carpet at entrance (SW) */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[ENTRANCE_CX, 0.012, ENTRANCE_CZ - 3]}
      >
        <planeGeometry args={[7, 6]} />
        <meshStandardMaterial color={THEME.carpet} roughness={0.85} />
      </mesh>
      {/* Entrance arch */}
      <group position={[ENTRANCE_CX, 0, ENTRANCE_CZ]}>
        <mesh position={[-3.2, 1.5, 0]} castShadow>
          <boxGeometry args={[0.3, 3, 0.4]} />
          <meshStandardMaterial color={THEME.trim} metalness={0.9} />
        </mesh>
        <mesh position={[3.2, 1.5, 0]} castShadow>
          <boxGeometry args={[0.3, 3, 0.4]} />
          <meshStandardMaterial color={THEME.trim} metalness={0.9} />
        </mesh>
        <mesh position={[0, 3.1, 0]} castShadow>
          <boxGeometry args={[6.8, 0.3, 0.4]} />
          <meshStandardMaterial color={THEME.trim} metalness={0.9} />
        </mesh>
        <Text
          position={[0, 3.1, 0.22]}
          fontSize={0.32}
          color="#0c0e12"
          anchorX="center"
          anchorY="middle"
        >
          WELCOME
        </Text>
      </group>

      <FloorLabel
        position={[ENTRANCE_CX, 0.05, ENTRANCE_CZ - 1.5]}
        text="MAIN ENTRANCE"
        size={0.85}
        bg="rgba(15,17,21,0.92)"
        color="#ffd58a"
        width={200}
      />

      {/* Registration desk just inside entrance */}
      <group position={[ENTRANCE_CX, 0, ENTRANCE_CZ - 4.5]}>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[5, 1.1, 1]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.13, 0]}>
          <boxGeometry args={[5.1, 0.08, 1.1]} />
          <meshStandardMaterial color={THEME.trim} metalness={0.7} />
        </mesh>
        <mesh position={[0, 1.9, -0.4]}>
          <boxGeometry args={[3, 0.7, 0.05]} />
          <meshStandardMaterial color={THEME.trim} emissive={THEME.trim} emissiveIntensity={0.2} />
        </mesh>
        <Text
          position={[0, 1.9, -0.36]}
          fontSize={0.28}
          color="#0c0e12"
          anchorX="center"
        >
          CHECK-IN
        </Text>
        <Person position={[-1.5, 0, 1.2]} color="#5a4a3a" />
        <Person position={[0, 0, 1.2]} color="#3a4a5a" />
        <Person position={[1.5, 0, 1.2]} color="#5a3a3a" />
        <FloorLabel
          position={[0, 0.06, 1.7]}
          text="REGISTRATION / CHECK-IN"
          size={0.6}
          bg="rgba(255,255,255,0.95)"
          color="#0c0e12"
        />
      </group>
    </group>
  );
}

/* -------------------------- Audience tables --------------------------
   Mix of banquet long tables (high-density seating) + cocktail round
   tables (networking pockets).  Targets ~150 seated capacity.
   - 4 long tables × 22 chairs (11 per side) = 88
   - 8 round tables × 6 chairs              = 48
   - Lounge sofas + bay seating + standing  ≈ rest of 150
-------------------------------------------------------------------- */
function AudienceTables() {
  // Long banquet tables — oriented east-west, parallel rows running south
  const longTables: {
    p: [number, number, number];
    rot: number;
    length: number;
    seatsPerSide: number;
  }[] = [
    { p: [-1, 0, STAGE_CZ + 7], rot: 0, length: 12, seatsPerSide: 12 },
    { p: [-1, 0, STAGE_CZ + 12.5], rot: 0, length: 12, seatsPerSide: 12 },
    { p: [-1, 0, STAGE_CZ + 18], rot: 0, length: 12, seatsPerSide: 12 },
    { p: [-1, 0, STAGE_CZ + 23.5], rot: 0, length: 12, seatsPerSide: 12 },
  ];

  // Round cocktail tables — clustered around the perimeter of the long-table block
  const roundTables: { p: [number, number, number]; seats: number }[] = [
    // East side (between long tables and stage area), 2
    { p: [9, 0, STAGE_CZ + 9], seats: 6 },
    { p: [9, 0, STAGE_CZ + 17], seats: 6 },
    // West side (between long tables and counter), 2
    { p: [-11, 0, STAGE_CZ + 9], seats: 6 },
    { p: [-11, 0, STAGE_CZ + 17], seats: 6 },
    // South of long tables (between the two bays), 2
    { p: [-6, 0, VENUE_D / 2 - 5], seats: 6 },
    { p: [4, 0, VENUE_D / 2 - 5], seats: 6 },
    // Near lounge exit, 2 cocktail rounds
    { p: [-10, 0, STAGE_CZ + 1], seats: 5 },
    { p: [10, 0, STAGE_CZ + 1], seats: 5 },
  ];

  return (
    <group>
      {longTables.map((t, i) => (
        <LongTable
          key={`L-${i}`}
          position={t.p}
          rotation={t.rot}
          length={t.length}
          seatsPerSide={t.seatsPerSide}
        />
      ))}
      {roundTables.map((t, i) => (
        <RoundTable
          key={`R-${i}`}
          position={t.p}
          seats={t.seats}
          rotation={(i * 0.7) % (Math.PI * 2)}
        />
      ))}
    </group>
  );
}

/* ----------------------- 13 partner booths placement -----------------------
   Reference sketch: stage on east wall, counter on west wall,
   lounge in NW corner, two bays on south wall.
   So booths go along: north wall (east of lounge), east wall (north + south
   of stage), the two south-protruding bays, and south wall between bays. */
function PartnerBooths({
  onHoverChange,
}: {
  onHoverChange?: (label: string | null) => void;
}) {
  const accents = [
    "#c9a86a", "#7aa6c9", "#c97aa6", "#7ac9a6", "#c97a7a",
    "#a67ac9", "#c9b87a", "#7ac0c9", "#c98a7a", "#8ac97a",
    "#7a8ac9", "#c97abf", "#c9c47a",
  ];

  // 4 booths along north wall (east of lounge), facing south
  const northZ = -VENUE_D / 2 + 2.4;
  const northXs = [-3, 2, 7, 12.5];
  const northBooths = northXs.map((x, i) => ({
    pos: [x, 0, northZ] as [number, number, number],
    rot: 0, // back wall facing north (-Z); booth opening to +Z (south, into hall)
    label: `Partner ${i + 1}`,
    accent: accents[i],
    size: "M" as const,
  }));

  // 2 booths along east wall north of stage, facing west
  const eastBoothX = VENUE_W / 2 - 2.5;
  const eastNorthZs = [-19, -14];
  const eastNorthBooths = eastNorthZs.map((z, i) => ({
    pos: [eastBoothX, 0, z] as [number, number, number],
    rot: -Math.PI / 2,
    label: `Partner ${5 + i}`,
    accent: accents[4 + i],
    size: "M" as const,
  }));

  // 2 booths along east wall south of stage, facing west
  const eastSouthZs = [10, 15];
  const eastSouthBooths = eastSouthZs.map((z, i) => ({
    pos: [eastBoothX, 0, z] as [number, number, number],
    rot: -Math.PI / 2,
    label: `Partner ${7 + i}`,
    accent: accents[6 + i],
    size: "M" as const,
  }));

  // 1 booth on south wall between the two bays, facing north
  const midSouthBooth = {
    pos: [0, 0, VENUE_D / 2 - 2.5] as [number, number, number],
    rot: Math.PI,
    label: "Partner 9",
    accent: accents[8],
    size: "M" as const,
  };

  return (
    <group>
      {[...northBooths, ...eastNorthBooths, ...eastSouthBooths, midSouthBooth].map(
        (b, i) => (
          <PartnerBooth
            key={i}
            position={b.pos}
            rotation={b.rot}
            label={b.label}
            accent={b.accent}
            size={b.size}
            onHover={(h) => onHoverChange?.(h ? b.label : null)}
          />
        )
      )}

      {/* 4 booths in the two south bays (2 per bay) */}
      <SouthBay
        cx={BAY1_CX}
        label="WEST BAY · PREMIUM"
        partnerLabels={["Partner 10", "Partner 11"]}
        accents={[accents[9], accents[10]]}
        onHoverChange={onHoverChange}
      />
      <SouthBay
        cx={BAY2_CX}
        label="EAST BAY · PREMIUM"
        partnerLabels={["Partner 12", "Partner 13"]}
        accents={[accents[11], accents[12]]}
        onHoverChange={onHoverChange}
      />
    </group>
  );
}

/* --------------------------- Emergency exit sign --------------------------- */
function EmergencyExit({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  return (
    <group position={position} rotation-y={rotation}>
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[1.6, 2.4, 0.15]} />
        <meshStandardMaterial color="#0aa64a" emissive="#0aa64a" emissiveIntensity={0.5} />
      </mesh>
      <Text
        position={[0, 1.2, 0.09]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        EXIT
      </Text>
      <Text
        position={[0, 0.6, 0.09]}
        fontSize={0.16}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        ←  EMERGENCY  →
      </Text>
    </group>
  );
}

/* --------------------------- Directional signage --------------------------- */
function DirectionalSign({
  position,
  rotation = 0,
  lines,
}: {
  position: [number, number, number];
  rotation?: number;
  lines: string[];
}) {
  return (
    <group position={position} rotation-y={rotation}>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 2.8, 12]} />
        <meshStandardMaterial color="#222" metalness={0.5} />
      </mesh>
      {lines.map((line, i) => (
        <group key={i} position={[0.5, 2.6 - i * 0.35, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.6, 0.3, 0.04]} />
            <meshStandardMaterial color={THEME.signage} />
          </mesh>
          <Text
            position={[0, 0, 0.025]}
            fontSize={0.14}
            color={THEME.trim}
            anchorX="center"
            anchorY="middle"
          >
            {line}
          </Text>
        </group>
      ))}
    </group>
  );
}

/* ---------------------------- Hanging overhead label ---------------------------- */
function HangingLabel({
  position,
  text,
}: {
  position: [number, number, number];
  text: string;
}) {
  return (
    <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.3}>
      <group position={position}>
        <mesh>
          <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh position={[0, -1, 0]} castShadow>
          <boxGeometry args={[3, 0.7, 0.06]} />
          <meshStandardMaterial color={THEME.signage} roughness={0.5} />
        </mesh>
        <Text
          position={[0, -1, 0.04]}
          fontSize={0.22}
          color={THEME.trim}
          anchorX="center"
          anchorY="middle"
        >
          {text}
        </Text>
      </group>
    </Float>
  );
}

/* ---------------------------- Decor distribution ---------------------------- */
function Decor() {
  const plantSpots: [number, number, number][] = [
    [-VENUE_W / 2 + 1.2, 0, 0],
    [VENUE_W / 2 - 4, 0, -VENUE_D / 2 + 1.5],
    [VENUE_W / 2 - 4, 0, VENUE_D / 2 - 1.5],
    [-2, 0, STAGE_CZ + 3],
    [10, 0, STAGE_CZ + 3],
    [-10, 0, STAGE_CZ + 3],
    [0, 0, VENUE_D / 2 - 5],
    [BAY1_CX, 0, BAY_CZ - BAY_D / 2 - 0.6],
    [BAY2_CX, 0, BAY_CZ - BAY_D / 2 - 0.6],
    [LOUNGE_CX + LOUNGE_W / 2 + 1.5, 0, LOUNGE_CZ],
  ];
  return (
    <group>
      {plantSpots.map((p, i) => (
        <Plant key={i} position={p} scale={1 + (i % 3) * 0.15} />
      ))}
    </group>
  );
}

/* ------------------------------- Crowd ------------------------------- */
function Crowd() {
  const people = useMemo(() => {
    const arr: { pos: [number, number, number]; color: string; bobSpeed: number; bobAmp: number }[] = [];
    const rng = (seed: number) => {
      let s = seed;
      return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    };
    const rand = rng(11);
    const palette = ["#3a3f4b", "#5a4a3a", "#7a1f2b", "#c9a86a", "#1f3a5a", "#444", "#2c4a3a", "#4a2c3a"];
    // Mingling guests in the aisles and standing zones — kept sparse since
    // most of the 150 are already seated at the long/round tables.
    for (let i = 0; i < 32; i++) {
      // Wider distribution across the larger venue, avoiding the long-table block
      const sides = i % 4;
      let x: number, z: number;
      if (sides === 0) {
        // east aisle
        x = 13 + rand() * 5;
        z = STAGE_CZ + 4 + rand() * 22;
      } else if (sides === 1) {
        // west aisle
        x = -17 + rand() * 4;
        z = STAGE_CZ + 4 + rand() * 22;
      } else if (sides === 2) {
        // south of long tables
        x = -14 + rand() * 28;
        z = VENUE_D / 2 - 8 + rand() * 5;
      } else {
        // near runway / stage approach
        x = -6 + rand() * 14;
        z = STAGE_CZ + 2 + rand() * 3;
      }
      arr.push({
        pos: [x, 0, z],
        color: palette[Math.floor(rand() * palette.length)],
        bobSpeed: 1.2 + rand() * 1.4,
        bobAmp: 0.02 + rand() * 0.04,
      });
    }
    return arr;
  }, []);
  return (
    <group>
      {people.map((p, i) => (
        <Person
          key={i}
          position={p.pos}
          color={p.color}
          bobSpeed={p.bobSpeed}
          bobAmp={p.bobAmp}
        />
      ))}
    </group>
  );
}

/* ------------------------------- Scene root ------------------------------- */
function Scene({
  view,
  onHoverPartner,
}: {
  view: "iso" | "top" | "stage";
  onHoverPartner: (label: string | null) => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // One-shot camera presets — applied only when the user clicks a view button.
  // OrbitControls owns the camera the rest of the time.
  const camTargets: Record<
    typeof view,
    { pos: [number, number, number]; look: [number, number, number] }
  > = {
    iso: { pos: [-44, 48, 56], look: [4, 0, 4] },
    top: { pos: [0, 88, 0.001], look: [0, 0, 0] },
    stage: { pos: [-16, 7, STAGE_CZ], look: [STAGE_CX, 3, STAGE_CZ] },
  };

  useEffect(() => {
    if (!controlsRef.current) return;
    const t = camTargets[view];
    camera.position.set(...t.pos);
    controlsRef.current.target.set(...t.look);
    controlsRef.current.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  return (
    <>
      <color attach="background" args={["#0a0c10"]} />
      <fog attach="fog" args={["#0a0c10", 80, 220]} />

      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#fff1d6", "#1a1c20", 0.4]} />
      <directionalLight
        position={[20, 40, 25]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={0.1}
        shadow-camera-far={120}
      />
      <pointLight
        position={[STAGE_CX - 3, 8, STAGE_CZ]}
        intensity={1.2}
        color={THEME.warm}
        distance={30}
      />

      <Suspense fallback={null}>
        <SoftShadows size={25} samples={10} focus={0.5} />
        <VenueShell />
        <MainStage />
        <WestCounter />
        <NWLounge />
        <AudienceTables />
        <PartnerBooths onHoverChange={onHoverPartner} />
        <EntranceArea />
        <Decor />
        <Crowd />

        {/* Emergency exits — at corners + bays */}
        <EmergencyExit
          position={[-VENUE_W / 2 + 0.25, 0, -VENUE_D / 2 + 4]}
          rotation={Math.PI / 2}
        />
        <EmergencyExit
          position={[VENUE_W / 2 - 0.25, 0, -VENUE_D / 2 + 4]}
          rotation={-Math.PI / 2}
        />
        <EmergencyExit
          position={[BAY1_CX, 0, BAY_CZ + BAY_D / 2 - 0.3]}
          rotation={Math.PI}
        />
        <EmergencyExit
          position={[BAY2_CX, 0, BAY_CZ + BAY_D / 2 - 0.3]}
          rotation={Math.PI}
        />

        {/* Directional sign near entrance */}
        <DirectionalSign
          position={[ENTRANCE_CX + 5, 0, ENTRANCE_CZ - 3]}
          lines={["→ MAIN STAGE", "→ PARTNERS", "↑ VIP LOUNGE", "↓ BAR / CATERING"]}
        />

        {/* Overhead labels */}
        <HangingLabel position={[2, 6, -VENUE_D / 2 + 6]} text="PARTNERS 1-4" />
        <HangingLabel position={[VENUE_W / 2 - 6, 6, -15]} text="PARTNERS 5-6" />
        <HangingLabel position={[VENUE_W / 2 - 6, 6, 12]} text="PARTNERS 7-8" />
        <HangingLabel position={[0, 6, 8]} text="NETWORKING ZONE" />

        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.5}
          scale={120}
          blur={2.4}
          far={20}
        />
        <Environment preset="warehouse" />
      </Suspense>

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={10}
        maxDistance={140}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

/* ----------------------------- Public component ----------------------------- */
export default function VenueLayout3D() {
  const [view, setView] = useState<"iso" | "top" | "stage">("iso");
  const [hoveredPartner, setHoveredPartner] = useState<string | null>(null);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "100dvh",
        background: "radial-gradient(ellipse at top, #16191f 0%, #0a0c10 60%, #050608 100%)",
        overflow: "hidden",
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 42, position: [-44, 48, 56], near: 0.1, far: 600 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene view={view} onHoverPartner={setHoveredPartner} />
      </Canvas>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "clamp(12px, 2vw, 24px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
          pointerEvents: "none",
          fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          color: "#f6f1e7",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <div style={{ fontSize: "clamp(11px, 1.2vw, 13px)", letterSpacing: 2, opacity: 0.7, textTransform: "uppercase" }}>
            Globo Expats · 2026
          </div>
          <div style={{ fontSize: "clamp(18px, 2.4vw, 28px)", fontWeight: 700, letterSpacing: 0.4, marginTop: 2 }}>
            Networking & Exhibition Venue
          </div>
          <div style={{ fontSize: "clamp(11px, 1.1vw, 13px)", opacity: 0.7, marginTop: 2 }}>
            150 Guests · 4 Banquet Tables · 8 Cocktail Rounds · Stage East · Bar West · VIP Lounge NW · 13 Partner Booths
          </div>
        </div>

        <div
          style={{
            pointerEvents: "auto",
            display: "flex",
            gap: 6,
            background: "rgba(15,17,21,0.7)",
            padding: 6,
            borderRadius: 999,
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(201,168,106,0.25)",
          }}
        >
          {(["iso", "top", "stage"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                appearance: "none",
                border: "none",
                cursor: "pointer",
                padding: "8px 14px",
                borderRadius: 999,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: "uppercase",
                fontWeight: 700,
                color: view === v ? "#0c0e12" : "#f6f1e7",
                background: view === v ? "linear-gradient(135deg,#ffd58a,#c9a86a)" : "transparent",
                transition: "all .2s",
              }}
            >
              {v === "iso" ? "Isometric" : v === "top" ? "Top-Down" : "Stage"}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "clamp(12px, 2vw, 24px)",
          left: "clamp(12px, 2vw, 24px)",
          padding: "12px 16px",
          background: "rgba(15,17,21,0.78)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(201,168,106,0.25)",
          borderRadius: 14,
          color: "#f6f1e7",
          fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          fontSize: 11,
          letterSpacing: 0.4,
          maxWidth: "min(90vw, 320px)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 8, color: "#ffd58a" }}>
          Legend
        </div>
        {[
          ["Main Stage (East Wall)", "#ffd58a"],
          ["Partner Booths (1–13)", "#c9a86a"],
          ["Long Banquet Tables ×4 (88 seats)", "#f6f1e7"],
          ["Round Cocktail Tables ×8 (48 seats)", "#cdb37a"],
          ["VIP Lounge (NW)", "#7a1f2b"],
          ["Bar / Counter (West)", "#cba27a"],
          ["South Bays", "#7aa6c9"],
          ["Emergency Exits", "#0aa64a"],
        ].map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: color, boxShadow: `0 0 8px ${color}66` }} />
            <span>{label}</span>
          </div>
        ))}
        <div style={{ marginTop: 10, opacity: 0.6, fontSize: 10 }}>
          Drag to orbit · Scroll to zoom · Hover booths to highlight
        </div>
      </div>

      {hoveredPartner && (
        <div
          style={{
            position: "absolute",
            bottom: "clamp(12px, 2vw, 24px)",
            right: "clamp(12px, 2vw, 24px)",
            padding: "14px 18px",
            background: "rgba(15,17,21,0.85)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(201,168,106,0.4)",
            borderRadius: 14,
            color: "#f6f1e7",
            fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            pointerEvents: "none",
            minWidth: 220,
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: 1.6, color: "#ffd58a", textTransform: "uppercase", fontWeight: 700 }}>
            Exhibition Space
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{hoveredPartner}</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
            Branded counter · Backlit panel · Spotlight
          </div>
        </div>
      )}
    </div>
  );
}
