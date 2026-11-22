"use client";
/* three.js 物件需在 useFrame 中直接修改（R3F 標準做法），對本檔停用 React Compiler 的不可變規則。 */
/* eslint-disable react-hooks/immutability */

import { Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

const MODEL_URL = "/models/bov-can.glb";

// 拆解時每個零件往上（y）或往旁邊（x）移動的距離（公尺）
const EXPLODE: Record<string, [number, number]> = {
  overcap: [0, 0.115],
  actuator: [0, 0.085],
  nozzle: [0, 0.085],
  stem_gasket: [0, 0.066],
  valve_stem: [0, 0.056],
  mounting_cup: [0, 0.046],
  cup_gasket: [0, 0.04],
  valve_spring: [0, 0.03],
  valve_housing: [0, 0.018],
  bov_bag: [0.045, 0],
  liquid: [0.045, 0],
  dip_tube: [-0.04, 0.006],
};
const SHELL = new Set(["can_body", "print_front", "print_back", "overcap"]);
const PART_NAMES = new Set([
  "can_body", "print_front", "print_back", "bov_bag", "liquid", "dip_tube", "valve_housing", "valve_spring",
  "valve_stem", "stem_gasket", "cup_gasket", "mounting_cup", "actuator", "nozzle", "overcap",
]);

/** 往上找到所屬零件的名稱 */
function ownerOf(o: THREE.Object3D | null): string {
  while (o) {
    if (PART_NAMES.has(o.name)) return o.name;
    o = o.parent;
  }
  return "";
}

export interface PlayState {
  explode: number; // 0 ~ 1
  xray: boolean;
  cap: boolean;
  color: string;
  selected: string | null;
  sprayAt: number; // 最近一次按噴頭的時間（performance.now）
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Model({
  state,
  onPick,
  onSpray,
}: {
  state: MutableRefObject<PlayState>;
  onPick: (name: string | null) => void;
  onSpray: () => void;
}) {
  const gltf = useGLTF(MODEL_URL);

  // 複製一份場景與材質，避免影響上方組裝動畫使用的同一份模型（例如剖面設定）
  const { scene, parts, canMats } = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const parts: Record<string, THREE.Object3D> = {};
    const canMats: THREE.MeshPhysicalMaterial[] = [];
    scene.traverse((o) => {
      if (PART_NAMES.has(o.name)) parts[o.name] = o;
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
        const c = (m as THREE.MeshPhysicalMaterial).clone();
        c.clippingPlanes = null;
        c.side = THREE.FrontSide;
        c.userData.baseOpacity = c.opacity;
        c.userData.baseTransparent = c.transparent;
        return c;
      });
      mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
      const owner = ownerOf(o);
      mesh.userData.owner = owner;
      if (owner === "can_body") {
        for (const m of mats) {
          (m as THREE.MeshPhysicalMaterial).anisotropy = 0;
          (m as THREE.MeshPhysicalMaterial).roughness = 0.34;
          canMats.push(m as THREE.MeshPhysicalMaterial);
        }
      }
      if (owner.startsWith("print_")) for (const m of mats) m.alphaTest = 0.5;
    });
    for (const [name, o] of Object.entries(parts)) {
      o.userData.rest = o.position.clone();
      o.userData.name = name;
    }
    // 導流管只有 3 mm 粗，手指很難點中：套一個看不見、較粗的點擊範圍，跟著導流管一起移動
    const tube = parts.dip_tube;
    if (tube) {
      scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(tube);
      const size = box.getSize(new THREE.Vector3());
      const hit = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, size.y, 12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
      );
      hit.position.copy(box.getCenter(new THREE.Vector3()));
      hit.userData.owner = "dip_tube";
      (hit.material as THREE.Material).userData = { baseOpacity: 0, baseTransparent: true };
      tube.attach(hit);
    }
    return { scene, parts, canMats };
  }, [gltf.scene]);

  // 噴霧粒子
  const N = 600;
  const spray = useMemo(() => {
    const rand = rng(5);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    const dirs = Array.from({ length: N }, () => {
      const a = rand() * Math.PI * 2;
      const s = Math.sqrt(rand()) * 0.34;
      return [Math.cos(a) * s, Math.sin(a) * s * 0.8 + 0.05, 1, rand()] as const;
    });
    const mat = new THREE.PointsMaterial({ color: "#7FBFB3", size: 0.0024, transparent: true, opacity: 0, depthWrite: false });
    return { g, dirs, mat };
  }, []);
  useEffect(() => () => {
    spray.g.dispose();
    spray.mat.dispose();
  }, [spray]);

  const colorRef = useRef(new THREE.Color());

  useFrame(() => {
    const s = state.current;
    const now = performance.now();
    const pressT = (now - s.sprayAt) / 1000; // 按下後經過秒數
    const press = pressT >= 0 && pressT < 0.35 ? Math.sin((pressT / 0.35) * Math.PI) * 0.002 : 0;

    for (const [name, o] of Object.entries(parts)) {
      const rest = o.userData.rest as THREE.Vector3;
      const [ex, ey] = EXPLODE[name] ?? [0, 0];
      const pressDown = name === "actuator" || name === "nozzle" || name === "valve_stem" ? press : 0;
      o.position.set(rest.x + ex * s.explode, rest.y + ey * s.explode - pressDown, rest.z);
      o.visible = name === "overcap" ? s.cap : true;
    }

    // 透視模式：外殼變半透明，看得到內部
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const owner = mesh.userData.owner as string;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const selected = s.selected === owner;
      for (const m of mats as THREE.MeshPhysicalMaterial[]) {
        const shell = SHELL.has(owner);
        const ghost = s.xray && shell;
        m.transparent = ghost || (m.userData.baseTransparent as boolean);
        m.opacity = ghost ? 0.16 : (m.userData.baseOpacity as number);
        m.depthWrite = !ghost;
        if ("emissive" in m) {
          // 被點選的零件以品牌綠色脈動發光，清楚標示點到了哪一個
          const pulse = 0.55 + 0.25 * Math.sin(now / 180);
          m.emissive.set(selected ? "#2fbfa8" : "#000000");
          m.emissiveIntensity = selected ? pulse : 0;
        }
      }
    });

    colorRef.current.set(s.color);
    for (const m of canMats) m.color.lerp(colorRef.current, 0.15);

    // 噴霧：按下後 1.2 秒內噴出
    const on = pressT >= 0 && pressT < 1.2;
    spray.mat.opacity = on ? Math.min(1, (1.2 - pressT) * 2) * 0.85 : 0;
    if (on) {
      const nozzle = parts.nozzle;
      const base = nozzle ? new THREE.Vector3(0, 0.125, 0.0099).add(new THREE.Vector3(0, nozzle.position.y - (nozzle.userData.rest as THREE.Vector3).y, 0)) : new THREE.Vector3(0, 0.125, 0.01);
      const pos = spray.g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < N; i++) {
        const [dx, dy, dz, seed] = spray.dirs[i];
        const ph = Math.max(0, Math.min(1, pressT * 1.4 - seed * 0.4));
        const d = ph * 0.16;
        pos.setXYZ(i, base.x + dx * d, base.y + dy * d - ph * ph * 0.01, base.z + dz * d);
      }
      pos.needsUpdate = true;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const owner = (e.object.userData.owner as string) ?? null;
    if (owner === "actuator" || owner === "nozzle") onSpray();
    onPick(owner);
  };

  return (
    <group onClick={handleClick} onPointerMissed={() => onPick(null)}>
      <primitive object={scene} />
      <points geometry={spray.g} material={spray.mat} />
    </group>
  );
}

export default function PlayScene({
  state,
  onPick,
  onSpray,
}: {
  state: MutableRefObject<PlayState>;
  onPick: (name: string | null) => void;
  onSpray: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 30, position: [0.12, 0.13, 0.36], near: 0.01, far: 5 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      aria-label="可旋轉、拆解的機不可失化妝水噴罐 3D 模型"
      role="img"
    >
      <color attach="background" args={["#EAF0EC"]} />
      <hemisphereLight args={["#ffffff", "#dfe8e3", 0.9]} />
      <directionalLight position={[0.3, 0.6, 0.5]} intensity={1.2} />
      <Suspense fallback={null}>
        <Model state={state} onPick={onPick} onSpray={onSpray} />
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={4} position={[0, 1.2, 1.2]} scale={[3, 1.2, 1]} />
          <Lightformer form="rect" intensity={3} color="#E6F4EF" position={[-1.5, 0.4, 0.2]} rotation-y={Math.PI / 2} scale={[2.5, 2, 1]} />
          <Lightformer form="rect" intensity={2.4} position={[1.5, 0.3, -0.4]} rotation-y={-Math.PI / 2} scale={[2.5, 2, 1]} />
        </Environment>
      </Suspense>
      <OrbitControls
        target={[0, 0.075, 0]}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI - 0.3}
        autoRotate
        autoRotateSpeed={0.6}
        makeDefault
      />
    </Canvas>
  );
}
