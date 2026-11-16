"use client";
/* three.js 物件（材質、幾何、剪裁平面）必須在 useFrame 每一幀直接修改，這是 React Three Fiber 的標準做法，
   不會觸發 React 重新渲染，因此對本檔停用 React Compiler 的不可變規則。 */
/* eslint-disable react-hooks/immutability */

import { Environment, Lightformer, useGLTF, useProgress } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { ALL_PARTS, STEPS, easeInOut, easeOutCubic, stepT } from "@/lib/assembly";

const MODEL_URL = "/models/bov-can.glb";
const DROP = 0.14; // 零件從上方落下的距離（公尺）
const CAN_R = 0.0176;

// 這些零件在組裝過程中會被剖開（正面半邊切掉），罐身合上時恢復完整
const CLIPPED = new Set(["can_body", "print_front", "print_back", "bov_bag"]);

// 固定種子的亂數：粒子分布每次載入都一致，也符合 render 階段需為純函式的要求
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STEP_OF_PART: Record<string, (typeof STEPS)[number]> = {};
for (const s of STEPS) for (const p of s.parts) STEP_OF_PART[p] = s;

function Model({ progress }: { progress: MutableRefObject<number> }) {
  const { scene } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const localPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), []);
  const worldPlane = useMemo(() => new THREE.Plane(), []);

  const nodes = useMemo(() => {
    const map: Record<string, THREE.Object3D> = {};
    scene.traverse((o) => {
      if (ALL_PARTS.includes(o.name)) {
        map[o.name] = o;
        // 壓縮後的模型把頂點量化還原寫在節點位移上，動畫只能在原始位置上加偏移
        o.userData.restY = o.position.y;
      }
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats as THREE.MeshPhysicalMaterial[]) {
        if (CLIPPED.has(o.name) || CLIPPED.has(o.parent?.name ?? "")) {
          m.clippingPlanes = [worldPlane];
          m.clipShadows = true;
          m.side = THREE.DoubleSide;
        }
        if (o.name === "liquid" || o.parent?.name === "liquid") {
          m.thickness = 0.008;
          m.attenuationColor = new THREE.Color("#CDEDE4");
          m.attenuationDistance = 0.25;
          m.roughness = 0.08;
        }
        if (o.name === "overcap" || o.parent?.name === "overcap") {
          m.thickness = 0.0008;
          m.roughness = 0.03;
        }
        // 印刷區：圓角外為透明，露出鋁罐本色
        if (o.name.startsWith("print_") || o.parent?.name.startsWith("print_")) {
          m.alphaTest = 0.5;
          m.transparent = false;
        }
        const isCan = o.name === "can_body" || o.parent?.name === "can_body";
        if (isCan) {
          // 拉絲（各向異性）效果在沒有切線資料時會過亮，網頁端改用一般粗糙度呈現霧面鋁
          m.anisotropy = 0;
          m.roughness = 0.34;
        }
        m.envMapIntensity = isCan ? 1.15 : 1.1;
      }
    });
    return map;
  }, [scene, worldPlane]);

  // 壓縮空氣：內袋與罐壁之間的粒子
  const air = useMemo(() => {
    const rand = rng(7);
    const pts: number[] = [];
    let guard = 0;
    while (pts.length < 520 * 3 && guard++ < 20000) {
      const a = rand() * Math.PI * 2;
      const r = 0.0122 + rand() * 0.0048;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if ((x / 0.0166) ** 2 + (z / 0.0142) ** 2 < 1) continue; // 內袋（枕形袋＋熱封邊）所在
      pts.push(x, 0.004 + rand() * 0.094, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  const airMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#5FAF9F",
        size: 0.0009,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        clippingPlanes: [worldPlane],
      }),
    [worldPlane],
  );

  // 噴霧粒子：從噴嘴朝正面 (+Z) 噴出
  const SPRAY_N = 900;
  const spray = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(SPRAY_N * 3), 3));
    const rand = rng(11);
    const dirs = new Float32Array(SPRAY_N * 3);
    for (let i = 0; i < SPRAY_N; i++) {
      const a = rand() * Math.PI * 2;
      const s = Math.sqrt(rand()) * 0.36;
      dirs[i * 3] = Math.cos(a) * s;
      dirs[i * 3 + 1] = Math.sin(a) * s * 0.8 + 0.04;
      dirs[i * 3 + 2] = 1;
    }
    return { g, dirs, seed: Array.from({ length: SPRAY_N }, () => rand()) };
  }, []);
  const sprayMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#7FBFB3",
        size: 0.0026,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => () => {
    air.dispose();
    airMat.dispose();
    spray.g.dispose();
    sprayMat.dispose();
  }, [air, airMat, spray, sprayMat]);

  useFrame((state, dt) => {
    const p = progress.current;
    const g = group.current;
    if (!g) return;

    // 整體姿態：組裝時 3/4 角度看剖面 → 合上時轉正面 → 噴霧時轉側面讓霧往右噴 → 蓋上後轉回正面
    const front = -0.12;
    const side = 1.05;
    const closeT = easeInOut(stepT(p, "close"));
    const sprayIn = easeInOut(Math.min(1, stepT(p, "spray") * 2.5));
    const capT = easeInOut(Math.min(1, stepT(p, "cap") * 2));
    let target = -0.45 + (front + 0.45) * closeT;
    target += (side - front) * sprayIn * (1 - capT);
    if (p >= 0.99) spin.current += dt * 0.35;
    else spin.current *= Math.max(0, 1 - dt * 3);
    target += spin.current;
    g.rotation.y += (target - g.rotation.y) * Math.min(1, dt * 5);

    // 剖面：罐身合上時，切面往前推到罐外
    const close = easeInOut(stepT(p, "close"));
    localPlane.constant = close * (CAN_R + 0.004);
    g.updateMatrixWorld();
    worldPlane.copy(localPlane).applyMatrix4(g.matrixWorld);

    // 零件依序落下就位
    for (const [name, obj] of Object.entries(nodes)) {
      const s = STEP_OF_PART[name];
      if (!s) continue;
      if (s.key === "close") {
        obj.visible = p >= s.start;
        obj.position.y = obj.userData.restY;
        continue;
      }
      const t = (p - s.start) / (s.end - s.start);
      obj.visible = t > 0;
      const e = easeOutCubic(Math.min(1, Math.max(0, t)));
      obj.position.y = obj.userData.restY + (1 - e) * DROP;
    }

    // 噴頭在噴霧步驟往下壓一下
    const sprayT = stepT(p, "spray");
    const press = sprayT > 0 && sprayT < 1 ? Math.sin(Math.min(1, sprayT * 3) * Math.PI) * 0.0018 : 0;
    for (const n of ["actuator", "nozzle", "valve_stem"]) {
      if (nodes[n] && p > 0.8) nodes[n].position.y = nodes[n].userData.restY - press;
    }

    // 壓縮空氣
    const airT = stepT(p, "air");
    airMat.opacity = 0.85 * easeOutCubic(airT) * (1 - close);

    // 噴霧
    const sprayOn = p > 0.8 && p < 0.92;
    sprayMat.opacity = sprayOn ? Math.min(1, sprayT * 4) * 0.9 : 0;
    if (sprayOn) {
      const pos = spray.g.attributes.position as THREE.BufferAttribute;
      const tt = state.clock.elapsedTime;
      for (let i = 0; i < SPRAY_N; i++) {
        const ph = (tt * 0.9 + spray.seed[i]) % 1;
        const d = ph * 0.16;
        pos.setXYZ(
          i,
          spray.dirs[i * 3] * d,
          0.125 + spray.dirs[i * 3 + 1] * d - ph * ph * 0.01,
          0.0099 + spray.dirs[i * 3 + 2] * d,
        );
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <group ref={group} rotation={[0, -0.45, 0]}>
      <primitive object={scene} />
      <points geometry={air} material={airMat} />
      <points geometry={spray.g} material={sprayMat} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);

function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div
      role="status"
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        color: "var(--ink-soft)",
        fontSize: "0.95rem",
        pointerEvents: "none",
      }}
    >
      3D 模型載入中… {Math.round(progress)}%
    </div>
  );
}

export default function CanScene({ progress }: { progress: MutableRefObject<number> }) {
  return (
    <>
    <LoadingOverlay />
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 28, position: [0.06, 0.11, 0.335], near: 0.01, far: 5 }}
      gl={{ antialias: true, localClippingEnabled: true, toneMapping: THREE.ACESFilmicToneMapping }}
      onCreated={({ camera }) => camera.lookAt(0, 0.075, 0)}
      aria-label="順路晨霧控油化妝水 3D 組裝示意"
      role="img"
    >
      <color attach="background" args={["#EAF0EC"]} />
      <hemisphereLight args={["#ffffff", "#dfe8e3", 0.9]} />
      <directionalLight position={[0.3, 0.6, 0.5]} intensity={1.2} />
      <Suspense fallback={null}>
        <Model progress={progress} />
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={4} position={[0, 1.2, 1.2]} scale={[3, 1.2, 1]} />
          <Lightformer form="rect" intensity={3} color="#E6F4EF" position={[-1.5, 0.4, 0.2]} rotation-y={Math.PI / 2} scale={[2.5, 2, 1]} />
          <Lightformer form="rect" intensity={2.4} position={[1.5, 0.3, -0.4]} rotation-y={-Math.PI / 2} scale={[2.5, 2, 1]} />
          <Lightformer form="ring" intensity={1.6} color="#F5F0E6" position={[0, -0.8, 1]} scale={1.2} />
        </Environment>
      </Suspense>
    </Canvas>
    </>
  );
}
