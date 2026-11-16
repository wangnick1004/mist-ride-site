// 捲動組裝的時間軸：progress 0 → 1 對應整段捲動。
// parts 對應 public/models/bov-can.glb 裡的節點名稱（由 blender/build_bov_can.py 產生）。

export type StepKey =
  | "can"
  | "bag"
  | "housing"
  | "spring"
  | "stem"
  | "cup"
  | "air"
  | "actuator"
  | "close"
  | "spray"
  | "cap";

export interface AssemblyStep {
  key: StepKey;
  parts: string[];
  start: number;
  end: number;
  index: string;
  title: string;
  material: string;
  body: string;
}

export const STEPS: AssemblyStep[] = [
  {
    key: "can",
    parts: ["can_body"],
    start: 0.0,
    end: 0.08,
    index: "01",
    title: "鋁罐",
    material: "一體成形鋁｜Ø35 × 113 mm",
    body: "整支罐子由一塊鋁擠壓成形，沒有接縫。罐底向內凹，用來承受罐內壓力。鋁罐用完可以回收。",
  },
  {
    key: "bag",
    parts: ["bov_bag", "liquid"],
    start: 0.08,
    end: 0.2,
    index: "02",
    title: "鋁塑複合內袋＋化妝水",
    material: "PET／鋁／PP 三層複合膜",
    body: "化妝水裝在這個軟袋裡，不直接接觸罐壁，也不接觸壓縮空氣。袋子的鋁層可以擋光，保護怕光的綠茶萃取。",
  },
  {
    key: "housing",
    parts: ["valve_housing"],
    start: 0.2,
    end: 0.28,
    index: "03",
    title: "閥門座",
    material: "PP",
    body: "內袋的開口焊在閥門座上，兩者出廠前就連成一體。化妝水從這裡進入閥門。",
  },
  {
    key: "spring",
    parts: ["valve_spring"],
    start: 0.28,
    end: 0.35,
    index: "04",
    title: "閥門彈簧",
    material: "不鏽鋼",
    body: "平常把閥門桿往上頂、讓閥門保持關閉。手指一鬆，彈簧就讓噴霧立刻停住。",
  },
  {
    key: "stem",
    parts: ["valve_stem", "stem_gasket"],
    start: 0.35,
    end: 0.43,
    index: "05",
    title: "閥門桿＋橡膠墊圈",
    material: "POM 閥門桿｜丁腈橡膠墊圈",
    body: "閥門桿側面有一個小孔，平常被橡膠墊圈封住。往下壓時小孔離開墊圈，化妝水才會流進閥門桿。",
  },
  {
    key: "cup",
    parts: ["cup_gasket", "mounting_cup"],
    start: 0.43,
    end: 0.52,
    index: "06",
    title: "閥門固定蓋＋罐口密封墊",
    material: "1 吋鋁製固定蓋｜橡膠密封墊",
    body: "固定蓋壓接在罐口捲邊上，中間夾著密封墊，把整組閥門鎖在罐子上，讓罐內的壓力不會漏掉。",
  },
  {
    key: "air",
    parts: [],
    start: 0.52,
    end: 0.62,
    index: "07",
    title: "充入壓縮空氣",
    material: "壓縮空氣（不含碳氫拋射劑）",
    body: "空氣從固定蓋下方充進內袋外圍，壓力包住內袋。化妝水和空氣中間始終隔著內袋，配方裡不用加入拋射劑。",
  },
  {
    key: "actuator",
    parts: ["actuator", "nozzle"],
    start: 0.62,
    end: 0.71,
    index: "08",
    title: "噴頭＋細霧噴嘴",
    material: "PP 噴頭｜細霧噴嘴",
    body: "噴頭套在閥門桿上，噴嘴和罐身正面朝同一個方向。噴嘴內的細小流道把化妝水打散成細霧。",
  },
  {
    key: "close",
    parts: ["print_front", "print_back"],
    start: 0.71,
    end: 0.8,
    index: "09",
    title: "罐身印刷",
    material: "直接印刷在鋁罐上",
    body: "正面是品牌與品名，背面是使用方式和注意事項：加壓容器請勿放在 50 °C 以上的地方，也不要放在機車坐墊下。",
  },
  {
    key: "spray",
    parts: [],
    start: 0.8,
    end: 0.9,
    index: "10",
    title: "輕壓，一陣晨霧",
    material: "可倒置使用",
    body: "往下輕壓噴頭，罐內壓力把內袋往內擠，化妝水就從噴嘴噴出細霧。倒著拿、斜著拿都能噴，出門前單手就能完成。",
  },
  {
    key: "cap",
    parts: ["overcap"],
    start: 0.9,
    end: 0.98,
    index: "11",
    title: "透明保護蓋",
    material: "透明 PET",
    body: "蓋上就能防止在包包裡被誤壓。蓋子是透明的，不用打開也看得到噴嘴朝哪個方向。",
  },
];

export const ALL_PARTS = STEPS.flatMap((s) => s.parts);

export function stepAt(progress: number): number {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (progress >= STEPS[i].start) return i;
  }
  return 0;
}

export function stepT(progress: number, key: StepKey): number {
  const s = STEPS.find((x) => x.key === key)!;
  return Math.min(1, Math.max(0, (progress - s.start) / (s.end - s.start)));
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
