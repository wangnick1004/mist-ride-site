"""順路 晨霧控油化妝水：50 mL 鋁罐袋式 BOV（壓縮空氣）產品級參數化模型。

A 方案（完全噴出）：縱向風琴摺內袋＋袋內全長導流管（外側溝槽、側孔、下端十字開槽），
化妝水 50 mL 約占罐容積 55%，讓用到最後仍有足夠空氣壓力。

用法（無介面執行）：
  /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/build_bov_can.py -- \
      --out public/models/bov-can.glb --preview blender/preview

尺寸單位在程式中以 mm 撰寫，輸出時換算為公尺（glTF 標準）。
正面（印刷主視覺）朝 Blender -Y，輸出後對應 three.js 的 +Z（面向預設相機）。
噴嘴朝正面（-Y），與正面印刷同方向。
暫定尺寸為 50 mL BOV 鋁罐常見規格（Ø35 × 113 mm、1 吋閥門、透明直筒保護蓋），
取得包材廠規格後修改各零件剖面數值即可。

零件節點名稱（網頁端依名稱做組裝動畫，請勿任意更改）：
  can_body, print_front, print_back, bov_bag, liquid, dip_tube, valve_housing, valve_spring,
  valve_stem, stem_gasket, cup_gasket, mounting_cup, actuator, nozzle, overcap
"""

import math
import os
import sys

import bmesh
import bpy
import numpy as np

MM = 0.001
SEG = 160

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default=None):
    return args[args.index(name) + 1] if name in args else default


HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
OUT = os.path.abspath(arg("--out", os.path.join(HERE, "..", "public", "models", "bov-can.glb")))
PREVIEW = arg("--preview")
REFS = arg("--refs")  # 產品參考圖輸出資料夾（淺灰底、高解析度，給 AI 生圖或設計使用）

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


# ================================================================ 幾何工具
def bezier(p0, p1, p2, p3, n):
    out = []
    for i in range(n + 1):
        t = i / n
        a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3
        out.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
                    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    return out


def fillet(pts, r, steps=5, closed=False):
    """把折線的每個轉角換成圓弧（二次貝茲近似），模擬實際成形的圓角。"""
    n = len(pts)
    out = []
    for i in range(n):
        if not closed and (i == 0 or i == n - 1):
            out.append(pts[i])
            continue
        p = pts[i]
        a = pts[(i - 1) % n]
        b = pts[(i + 1) % n]
        la = math.hypot(p[0] - a[0], p[1] - a[1])
        lb = math.hypot(b[0] - p[0], b[1] - p[1])
        if la < 1e-6 or lb < 1e-6:
            continue
        rr = min(r, la * 0.45, lb * 0.45)
        s = (p[0] + (a[0] - p[0]) / la * rr, p[1] + (a[1] - p[1]) / la * rr)
        e = (p[0] + (b[0] - p[0]) / lb * rr, p[1] + (b[1] - p[1]) / lb * rr)
        for k in range(steps + 1):
            t = k / steps
            out.append(((1 - t) ** 2 * s[0] + 2 * (1 - t) * t * p[0] + t * t * e[0],
                        (1 - t) ** 2 * s[1] + 2 * (1 - t) * t * p[1] + t * t * e[1]))
    return out


def offset_polyline(pts, t):
    """開放剖面 (r, z) 沿左法線偏移 t（剖面由下往上走時，左側即內側）。"""
    out = []
    n = len(pts)
    for i in range(n):
        a = pts[max(i - 1, 0)]
        b = pts[min(i + 1, n - 1)]
        dr, dz = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dr, dz) or 1.0
        out.append((max(pts[i][0] - dz / L * t, 0.0), pts[i][1] + dr / L * t))
    return out


def shell_profile(outer, t):
    return outer + list(reversed(offset_polyline(outer, t)))


def finish(obj, sharp_deg=38):
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=2e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    try:
        me.set_sharp_from_angle(angle=math.radians(sharp_deg))
    except Exception:
        pass
    return obj


def new_obj(name, verts, faces, uvs=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    if uvs is not None:
        uvl = me.uv_layers.new(name="UVMap")
        for idx in range(len(me.loops)):
            uvl.data[idx].uv = uvs[idx]
    obj = bpy.data.objects.new(name, me)
    scene.collection.objects.link(obj)
    return obj


def lathe(name, profile, closed=True, seg=SEG, a0=0.0, a1=2 * math.pi,
          radial=None, uv_rect=None, sharp=38):
    """(r, z) 剖面繞 Z 軸旋轉成網格；radial(theta, r, z) 可回傳新的半徑做局部變形。"""
    full = abs((a1 - a0) - 2 * math.pi) < 1e-6
    cols = seg if full else seg + 1
    verts, faces, uvs = [], [], []
    zs = [p[1] for p in profile]
    zmin, zmax = min(zs), max(zs)
    for j in range(cols):
        th = a0 + (a1 - a0) * j / seg
        for (r, z) in profile:
            rr = radial(th, r, z) if radial else r
            verts.append((rr * math.cos(th) * MM, rr * math.sin(th) * MM, z * MM))
    P = len(profile)
    rows = P if closed else P - 1
    for j in range(seg):
        j2 = (j + 1) % cols
        for i in range(rows):
            i2 = (i + 1) % P
            faces.append((j * P + i, j2 * P + i, j2 * P + i2, j * P + i2))
            for (jj, ii) in ((j, i), (j + 1, i), (j + 1, i2), (j, i2)):
                u = jj / seg
                v = (profile[ii][1] - zmin) / ((zmax - zmin) or 1)
                if uv_rect:
                    u0, u1, v0, v1 = uv_rect
                    u, v = u0 + (u1 - u0) * u, v0 + (v1 - v0) * v
                uvs.append((u, v))
    return finish(new_obj(name, verts, faces, uvs), sharp)


def loft(name, sections, cap_start=False, cap_end=False, sharp=50):
    """sections: [(loop[(x, y)], z), ...]，每圈點數相同，依序連成曲面。"""
    verts, faces = [], []
    N = len(sections[0][0])
    for loop, z in sections:
        for (x, y) in loop:
            verts.append((x * MM, y * MM, z * MM))
    for s in range(len(sections) - 1):
        for i in range(N):
            a = s * N + i
            b = s * N + (i + 1) % N
            faces.append((a, b, b + N, a + N))
    if cap_start:
        faces.append(tuple(reversed(range(N))))
    if cap_end:
        base = (len(sections) - 1) * N
        faces.append(tuple(range(base, base + N)))
    return finish(new_obj(name, verts, faces), sharp)


def torus(name, R, r, z, seg=SEG, ring=20):
    prof = [(R + r * math.cos(2 * math.pi * i / ring), z + r * math.sin(2 * math.pi * i / ring))
            for i in range(ring)]
    return lathe(name, prof, closed=True, seg=seg, sharp=80)


def helix_spring(name, R, wire, z0, z1, turns, end_turns=1.0):
    """壓縮彈簧：兩端各一圈並圈（節距＝線徑），中間等節距。"""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = wire * MM
    cu.bevel_resolution = 5
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    n = int(turns * 48)
    sp.points.add(n - 1)
    closed_h = 2 * wire * end_turns
    active = turns - 2 * end_turns
    pitch = (z1 - z0 - 2 * closed_h) / active
    for i in range(n):
        tt = turns * i / (n - 1)
        if tt < end_turns:
            z = z0 + wire + 2 * wire * tt
        elif tt > turns - end_turns:
            z = z1 - wire - 2 * wire * (turns - tt)
        else:
            z = z0 + wire + closed_h + pitch * (tt - end_turns)
        th = 2 * math.pi * tt
        sp.points[i].co = (R * math.cos(th) * MM, R * math.sin(th) * MM, z * MM, 1)
    obj = bpy.data.objects.new(name, cu)
    scene.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    return finish(obj, 80)


def apply_xform(obj, rot=None, loc=None):
    if rot:
        obj.rotation_euler = rot
    if loc:
        obj.location = loc
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.select_set(False)
    return obj


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    o.data.name = name
    o.select_set(False)
    return o


def boolean_cut(obj, cutter):
    mod = obj.modifiers.new("cut", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "EXACT"
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)
    bpy.data.objects.remove(cutter, do_unlink=True)
    return finish(obj)


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ================================================================ 印刷貼圖：圓角遮罩
def masked_label(src, dst, rect, radius):
    """把印刷區外側設為透明，讓沒有印刷的地方露出鋁罐本色。"""
    img = bpy.data.images.load(src)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    u = (np.arange(w) + 0.5) / w
    v = (np.arange(h) + 0.5) / h
    U, V = np.meshgrid(u, v)
    u0, u1, v0, v1 = rect
    cx, cy = (u0 + u1) / 2, (v0 + v1) / 2
    hx, hy = (u1 - u0) / 2 - radius, (v1 - v0) / 2 - radius
    qx = np.abs(U - cx) - hx
    qy = np.abs(V - cy) - hy
    d = np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - radius
    px[..., 3] = np.clip(0.5 - d * w, 0, 1)
    out = bpy.data.images.new(os.path.basename(dst), w, h, alpha=True)
    out.pixels.foreach_set(px.ravel())
    out.filepath_raw = dst
    out.file_format = "PNG"
    out.save()
    bpy.data.images.remove(img)
    return dst


FRONT_RECT = (0.2170, 0.7830, 0.0189, 0.9811)
BACK_RECT = (0.2170, 0.7830, 0.0, 1.0)
front_png = masked_label(os.path.join(ASSETS, "label_front.png"),
                         os.path.join(ASSETS, "label_front_rgba.png"), FRONT_RECT, 0.028)
back_png = masked_label(os.path.join(ASSETS, "label_back.png"),
                        os.path.join(ASSETS, "label_back_rgba.png"), BACK_RECT, 0.028)


# ================================================================ 材質
def hexc(h, a=1.0):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, a)


def set_input(bsdf, names, value):
    for n in names:
        if n in bsdf.inputs:
            bsdf.inputs[n].default_value = value
            return


def material(name, color, metallic=0.0, rough=0.5, transmission=0.0, ior=1.45,
             image=None, aniso=0.0, coat=0.0):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = hexc(color)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = rough
    set_input(bsdf, ["IOR"], ior)
    if transmission:
        set_input(bsdf, ["Transmission Weight", "Transmission"], transmission)
    if aniso:
        set_input(bsdf, ["Anisotropic"], aniso)
    if coat:
        set_input(bsdf, ["Coat Weight", "Clearcoat"], coat)
        set_input(bsdf, ["Coat Roughness", "Clearcoat Roughness"], 0.12)
    if image:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(image)
        tex.interpolation = "Cubic"
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
        for attr, val in (("surface_render_method", "DITHERED"), ("blend_method", "CLIP")):
            if hasattr(m, attr):
                try:
                    setattr(m, attr, val)
                except Exception:
                    pass
    return m


MAT = {
    "can": material("鋁罐_拉絲陽極鼠尾草", "#BCCAC4", metallic=1.0, rough=0.32, aniso=0.6),
    "print_front": material("罐身印刷_正面", "#F5F0E6", rough=0.38, coat=0.5, image=front_png),
    "print_back": material("罐身印刷_背面", "#F5F0E6", rough=0.38, coat=0.5, image=back_png),
    "cup": material("閥門固定蓋_鋁", "#D4D9D7", metallic=1.0, rough=0.2),
    "housing": material("閥門座_PP", "#EEF0EA", rough=0.45, transmission=0.25),
    "spring": material("閥門彈簧_不鏽鋼", "#C6CBCE", metallic=1.0, rough=0.22),
    "stem": material("閥門桿_POM", "#F6F5F0", rough=0.3),
    "rubber": material("橡膠_丁腈", "#232A2A", rough=0.75),
    "actuator": material("噴頭_PP白", "#F4F5F1", rough=0.38),
    "nozzle": material("細霧噴嘴_POM", "#1F5F5B", rough=0.35),
    "overcap": material("保護蓋_透明PET", "#FAFCFB", rough=0.02, transmission=1.0, ior=1.57),
    "bag": material("內袋_PET鋁PP複合膜", "#C9CFD0", metallic=0.85, rough=0.3),
    "liquid": material("化妝水", "#D6EEE7", rough=0.04, transmission=1.0, ior=1.34),
    "tube": material("導流管_PP", "#7FCFC0", rough=0.35, transmission=0.2),
}

PARTS = []


def part(obj, pid, zh, mat_key):
    obj.data.materials.clear()
    obj.data.materials.append(MAT[mat_key])
    obj["part_id"] = pid
    obj["part_zh"] = zh
    PARTS.append(obj)
    return obj


# ================================================================ 1. 鋁罐
# 罐底：外圈底座（站立面）＋向內凹的耐壓圓頂；肩部以貝茲曲線平滑收口到 1 吋罐口
R = 17.5
can_outer = fillet([
    (0.0, 6.4), (5.0, 6.1), (9.4, 5.1), (12.6, 3.6), (14.5, 2.0), (15.5, 0.7), (16.0, 0.0),
    (16.9, 0.2), (17.45, 1.3), (R, 2.6), (R, 97.6),
], 0.7)[:-1] + bezier((R, 97.6), (R, 104.6), (13.0, 106.6), (12.95, 111.8), 18)
can = lathe("can_body", shell_profile(can_outer, 0.42), closed=True)
curl = torus("can_curl", 13.2, 0.95, 112.4)
can = join([can, curl], "can_body")
part(can, "can_body", "鋁罐", "can")

# ================================================================ 2. 罐身印刷（貼合罐壁的圓角印刷區）
front_c = -math.pi / 2
pf = lathe("print_front", [(R + 0.02, 20.0), (R + 0.02, 88.0)], closed=False,
           a0=front_c + math.radians(65), a1=front_c - math.radians(65), seg=110,
           uv_rect=(FRONT_RECT[1], FRONT_RECT[0], FRONT_RECT[2], FRONT_RECT[3]))
part(pf, "print_front", "罐身印刷（正面）", "print_front")
back_c = math.pi / 2
pb = lathe("print_back", [(R + 0.02, 24.0), (R + 0.02, 84.0)], closed=False,
           a0=back_c + math.radians(55), a1=back_c - math.radians(55), seg=96,
           uv_rect=(BACK_RECT[1], BACK_RECT[0], BACK_RECT[2], BACK_RECT[3]))
part(pb, "print_back", "罐身印刷（背面）", "print_back")


# ================================================================ 3. BOV 內袋（縱向風琴摺，A 方案：減少塌陷時形成死角）
# 參考 EP0869908B1：袋子沿長度方向像手風琴一樣收摺，中段保持暢通，不會被亂皺的袋壁包住液體。
BAG_R = 14.6                   # 裝滿時的外接半徑（罐內半徑約 17.1，留空氣層）
BAG_Z0, BAG_Z1 = 6.0, 100.4    # 底封邊上緣、頂部（包住焊接舟）
PLEATS = 12                    # 摺數
PLEAT_DEPTH = 0.075            # 摺痕往內的深度（相對半徑）
NB = 192


def bag_loop(z, shrink=0.0):
    body = smoothstep(BAG_Z0 + 2, 18, z) * (1 - smoothstep(84, 94, z))
    top = smoothstep(84, BAG_Z1, z)
    bottom = smoothstep(BAG_Z0, 15, z)
    r = BAG_R - shrink
    sx = (1 - top) + (3.5 / BAG_R) * top          # 頂部收成扁口，熱封在焊接舟上
    sy = ((1 - top) + (1.5 / BAG_R) * top) * bottom  # 底部壓平成熱封邊
    pts = []
    for i in range(NB):
        u = 2 * math.pi * i / NB
        crease = ((1 + math.cos(PLEATS * u)) / 2) ** 6   # 窄而深的內摺線
        rr = r * (1 - PLEAT_DEPTH * body * crease)
        pts.append((rr * math.cos(u) * sx, rr * math.sin(u) * max(sy, 0.003)))
    return pts


zs = [BAG_Z0 + (BAG_Z1 - BAG_Z0) * i / 110 for i in range(111)]
bag_skin = loft("bov_bag", [(bag_loop(z), z) for z in zs])

# 底部熱封邊（薄片）
bw = BAG_R + 0.8
fin_bottom = loft("fin_bottom", [
    ([(-bw, -0.16), (bw, -0.16), (bw, 0.16), (-bw, 0.16)], 4.6),
    ([(-bw, -0.16), (bw, -0.16), (bw, 0.16), (-bw, 0.16)], BAG_Z0 + 0.2),
], True, True, sharp=30)
bag = join([bag_skin, fin_bottom], "bov_bag")
part(bag, "bov_bag", "鋁塑複合內袋（縱向風琴摺）", "bag")

# ================================================================ 4. 化妝水（內袋內，略小於內袋；50 mL，約占罐容積 55%，留足空氣讓最後幾下仍有壓力）
lz = [BAG_Z0 + 0.8 + (97.0 - BAG_Z0 - 0.8) * i / 80 for i in range(81)]
liquid = loft("liquid", [(bag_loop(z, shrink=0.35), z) for z in lz], True, True)
part(liquid, "liquid", "化妝水 50 mL", "liquid")

# ================================================================ 4b. 全長導流管（A 方案：袋子扭轉或分段塌陷時，液體仍能沿管內外流到閥門）
# 參考 US8196620（袋內與袋等長的導管）、US7730911（導管防止袋子形成口袋）、
# US3989165 / US5147071（袋壁塌陷時仍保持暢通的流道）。
TUBE_RO, TUBE_RI = 1.6, 1.0
TUBE_Z0, TUBE_Z1 = 9.5, 100.2      # 下端離袋底 3.5 mm；上端插進焊接舟底部
tube = lathe("dip_tube", [
    (TUBE_RI, TUBE_Z0), (TUBE_RO, TUBE_Z0), (TUBE_RO, TUBE_Z1), (TUBE_RI, TUBE_Z1),
], closed=True, seg=64, sharp=60)


def box(name, x0, x1, y0, y1, z0, z1, ang=0.0):
    c, s_ = math.cos(ang), math.sin(ang)
    rect = [(x * c - y * s_, x * s_ + y * c) for (x, y) in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))]
    return loft(name, [(rect, z0), (rect, z1)], True, True, sharp=30)


cutters = []
# 管壁外側 4 條縱向溝槽：袋壁貼上來時，溝槽仍是液體的通道
for k in range(4):
    cutters.append(box(f"groove{k}", TUBE_RO - 0.38, TUBE_RO + 0.6, -0.3, 0.3, 12.0, 97.5,
                       ang=math.pi / 2 * k))
# 管壁側孔：與溝槽錯開 45°，上下交錯，讓各段袋子裡的液體都能進管
for i, z in enumerate((18, 32, 46, 60, 74, 88)):
    h = lathe(f"hole{i}", [(0.0, -2.4), (0.42, -2.4), (0.42, 2.4), (0.0, 2.4)], closed=True, seg=20)
    apply_xform(h, rot=(0, math.pi / 2, math.pi / 4 + (math.pi / 2) * (i % 2)), loc=(0, 0, z * MM))
    cutters.append(h)
# 下端十字開槽：管口貼到袋底也不會被封住
cutters.append(box("slot_a", -2.2, 2.2, -0.35, 0.35, TUBE_Z0 - 0.5, TUBE_Z0 + 2.2))
cutters.append(box("slot_b", -2.2, 2.2, -0.35, 0.35, TUBE_Z0 - 0.5, TUBE_Z0 + 2.2, ang=math.pi / 2))
tube = boolean_cut(tube, join(cutters, "tube_cutters"))
part(tube, "dip_tube", "全長導流管（溝槽＋側孔）", "tube")

# ================================================================ 5. 閥門座（含底部焊接舟，內袋熱封在舟上）
housing_body = lathe("valve_housing", fillet([
    (0.0, 104.6), (1.3, 104.6), (1.3, 105.2), (3.3, 105.4), (3.3, 107.0), (3.0, 107.3),
    (3.0, 107.9), (3.3, 108.2), (3.3, 112.2), (4.1, 112.4), (4.1, 113.2), (2.4, 113.2),
    (2.4, 106.2), (0.6, 105.6), (0.0, 105.6),
], 0.25, closed=False), closed=True)
boat_secs = []
for i in range(13):
    z = 99.4 + 5.4 * i / 12
    rib = 1 + 0.08 * (1 if (i % 3 == 1) else 0)
    loop = []
    for k in range(48):
        u = 2 * math.pi * k / 48
        s = math.sin(u)
        loop.append((3.4 * rib * math.cos(u), 1.35 * rib * s * (0.6 + 0.4 * abs(s))))
    boat_secs.append((loop, z))
boat = loft("boat", boat_secs, True, True, sharp=40)
housing = join([housing_body, boat], "valve_housing")
part(housing, "valve_housing", "閥門座（含焊接舟）", "housing")

# ================================================================ 6. 閥門彈簧（不鏽鋼，兩端並圈）
spring = helix_spring("valve_spring", 1.95, 0.2, 106.2, 111.6, 7.0)
part(spring, "valve_spring", "閥門彈簧", "spring")

# ================================================================ 7. 閥門桿（座緣、導桿、軸向流道、側面進液孔）
stem = lathe("valve_stem", fillet([
    (0.0, 108.4), (0.95, 108.4), (0.95, 111.6), (2.2, 111.6), (2.2, 112.3), (1.55, 112.7),
    (1.55, 118.0), (1.25, 118.4), (0.55, 118.4), (0.55, 113.6), (0.0, 113.6),
], 0.15), closed=True, seg=96)
hole = lathe("orifice_cut", [(0.0, -0.2), (0.32, -0.2), (0.32, 2.4), (0.0, 2.4)], closed=True, seg=24)
apply_xform(hole, rot=(0, math.pi / 2, 0), loc=(0, 0, 113.95 * MM))
stem = boolean_cut(stem, hole)
part(stem, "valve_stem", "閥門桿", "stem")

# ================================================================ 8. 閥門桿橡膠墊圈
gasket = lathe("stem_gasket", fillet([(1.5, 113.5), (3.9, 113.5), (3.9, 114.3), (1.5, 114.3)],
                                     0.18, closed=True), closed=True, seg=96)
part(gasket, "stem_gasket", "閥門桿橡膠墊圈", "rubber")

# ================================================================ 9. 罐口密封墊
seal = lathe("cup_gasket", fillet([(12.3, 113.3), (14.1, 113.3), (14.1, 113.75), (12.3, 113.75)],
                                  0.15, closed=True), closed=True)
part(seal, "cup_gasket", "罐口密封墊", "rubber")


# ================================================================ 10. 閥門固定蓋（1 吋，台座壓接、裙邊包住罐口捲邊）
def crimp(th, r, z):
    if 107.6 < z < 112.6 and 7.0 < r < 8.2:
        lobe = max(0.0, math.cos(6 * th)) ** 10
        return r - 0.45 * lobe * smoothstep(107.6, 109, z) * (1 - smoothstep(111.4, 112.6, z))
    return r


cup_outer = fillet([
    (1.7, 114.6), (6.6, 114.6), (7.6, 113.8), (7.75, 107.4), (8.6, 106.4), (10.0, 106.6),
    (11.4, 108.9), (12.2, 111.9), (12.9, 113.6), (13.8, 114.15), (14.55, 113.6), (14.75, 112.6),
    (14.75, 111.3),
], 0.45)
cup = lathe("mounting_cup", shell_profile(list(reversed(cup_outer)), 0.4), closed=True, radial=crimp)
part(cup, "mounting_cup", "閥門固定蓋", "cup")

# ================================================================ 11. 噴頭（白色寬裙座、凹面指壓區、正面噴嘴座）
act_outer = fillet([(14.45, 110.7), (14.55, 111.3), (14.55, 115.2)], 0.4)[:-1] + \
    bezier((14.55, 115.2), (14.55, 118.4), (8.7, 117.6), (8.7, 120.2), 10) + \
    fillet([(8.7, 120.2), (8.7, 127.2), (8.5, 128.8), (7.2, 129.45), (4.2, 129.05), (0.0, 128.85)],
           0.9)[1:]
act_shell = lathe("actuator", shell_profile(act_outer, 0.75), closed=True)
snap = torus("act_snap", 13.85, 0.28, 111.5, ring=12)
socket = lathe("act_socket", fillet([(2.6, 117.3), (2.6, 128.4), (1.62, 128.4), (1.62, 117.3)],
                                    0.2, closed=True), closed=True, seg=64)
boss = lathe("act_boss", fillet([
    (0.0, 7.6), (2.75, 7.6), (2.75, 9.15), (2.35, 9.65), (1.72, 9.7), (1.72, 9.25), (0.0, 9.25),
], 0.25), closed=True, seg=64)
apply_xform(boss, rot=(math.pi / 2, 0, 0), loc=(0, 0, 125.0 * MM))
act = join([act_shell, snap, socket, boss], "actuator")
part(act, "actuator", "噴頭", "actuator")

# ================================================================ 12. 細霧噴嘴（嵌入式，中心錐形凹孔）
noz = lathe("nozzle", fillet([
    (0.0, 9.28), (1.68, 9.28), (1.68, 9.78), (1.25, 9.86), (0.42, 9.86), (0.18, 9.62), (0.0, 9.62),
], 0.08), closed=True, seg=64)
apply_xform(noz, rot=(math.pi / 2, 0, 0), loc=(0, 0, 125.0 * MM))
part(noz, "nozzle", "細霧噴嘴", "nozzle")

# ================================================================ 13. 透明保護蓋（脫模斜度、頂部微拱、內側卡扣環）
cap_outer = fillet([
    (15.45, 109.8), (15.45, 110.6), (15.22, 131.4), (14.6, 133.3), (7.0, 133.68), (0.0, 133.78),
], 1.4)
cap = lathe("overcap", shell_profile(cap_outer, -0.9), closed=True)
cap_snap = torus("cap_snap", 14.5, 0.3, 110.9, ring=12)
cap = join([cap, cap_snap], "overcap")
part(cap, "overcap", "透明保護蓋", "overcap")

# ================================================================ 輸出 GLB
bpy.ops.object.select_all(action="DESELECT")
for o in PARTS:
    o.select_set(True)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    use_selection=True,
    export_extras=True,
    export_yup=True,
    export_apply=True,
    export_image_format="AUTO",
)
tris = sum(len(o.data.polygons) for o in PARTS)
print(f"[bov] exported {OUT} ({os.path.getsize(OUT) / 1024:.0f} KB, {tris} faces, {len(PARTS)} parts)")

# ================================================================ 預覽渲染（Cycles）
if PREVIEW or REFS:
    from mathutils import Vector

    if PREVIEW:
        os.makedirs(PREVIEW, exist_ok=True)
    world = bpy.data.worlds.new("world")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = hexc("#EEF1EC")
    bg.inputs["Strength"].default_value = 0.6

    def light(name, loc, energy, size, color="#FFFFFF"):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy = energy
        ld.size = size
        ld.color = hexc(color)[:3]
        lo = bpy.data.objects.new(name, ld)
        lo.location = loc
        scene.collection.objects.link(lo)
        d = -Vector(loc).normalized()
        lo.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()

    light("key", (-0.25, -0.3, 0.3), 3.0, 0.3)
    light("rim", (0.3, 0.25, 0.22), 2.5, 0.3, "#DFF2EC")
    light("fill", (0.35, -0.3, 0.05), 1.2, 0.5)

    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    cam.data.lens = 85
    scene.collection.objects.link(cam)
    scene.camera = cam

    scene.render.engine = "CYCLES"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for dev in prefs.devices:
            dev.use = True
        scene.cycles.device = "GPU"
    except Exception:
        scene.cycles.device = "CPU"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 12
    scene.cycles.transmission_bounces = 12
    scene.render.resolution_x = 720
    scene.render.resolution_y = 960
    try:
        scene.view_settings.view_transform = "AgX"
    except TypeError:
        scene.view_settings.view_transform = "Filmic"

    def shoot(fname, target, dist, cam_dir, lens=85, out_dir=None):
        cam.data.lens = lens
        d = Vector(cam_dir).normalized()
        cam.location = Vector(target) - d * dist
        cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(out_dir or PREVIEW, fname)
        bpy.ops.render.render(write_still=True)
        print(f"[bov] rendered {scene.render.filepath}")

    if REFS:
        # 淺灰底產品參考圖：使用中的樣子（拿掉透明蓋），以及蓋上蓋子的完整外觀
        os.makedirs(REFS, exist_ok=True)
        # 淺灰背景：白色噴頭與米白印刷才看得出輪廓
        bg.inputs["Color"].default_value = hexc("#E3E7E5")
        bg.inputs["Strength"].default_value = 0.5
        scene.cycles.samples = 128
        scene.render.resolution_x = 1600
        scene.render.resolution_y = 2400
        cap_obj = next(o for o in PARTS if o.name == "overcap")
        hidden_inside = ("bov_bag", "liquid")
        for o in PARTS:
            o.hide_render = o.name in hidden_inside
        cap_obj.hide_render = True
        # 1. 正面（印刷主視覺），無蓋
        shoot("01_正面_無蓋.png", (0, 0, 0.064), 0.5, (0.0, 1.0, -0.06), out_dir=REFS)
        # 2. 使用角度：噴嘴朝畫面右側（噴向臉），可看到部分正面印刷
        shoot("02_使用角度_噴嘴朝右.png", (0, 0, 0.064), 0.5, (1.0, 0.55, -0.06), out_dir=REFS)
        # 3. 噴頭與噴嘴特寫
        scene.render.resolution_x = 2000
        scene.render.resolution_y = 2000
        shoot("03_噴頭特寫.png", (0, -0.004, 0.12), 0.16, (0.55, 1.0, -0.3), out_dir=REFS)
        # 4. 蓋上透明蓋的完整外觀
        scene.render.resolution_x = 1600
        scene.render.resolution_y = 2400
        cap_obj.hide_render = False
        shoot("04_完整外觀_含透明蓋.png", (0, 0, 0.068), 0.52, (0.3, 1.0, -0.1), out_dir=REFS)
        for o in PARTS:
            o.hide_render = False

    only = arg("--only", "assembled,exploded,valve").split(",") if PREVIEW else []
    if "assembled" in only:
        shoot("assembled.png", (0, 0, 0.068), 0.44, (0.35, 1.0, -0.18))
    # 爆炸圖：零件沿 Z 軸分開，內袋側移、噴嘴往前拉出
    lift = {"can_body": 0, "print_front": 0, "print_back": 0, "bov_bag": 0, "liquid": 0, "dip_tube": 16,
            "valve_housing": 16, "valve_spring": 28, "valve_stem": 38, "stem_gasket": 50,
            "cup_gasket": 56, "mounting_cup": 62, "actuator": 80, "nozzle": 80, "overcap": 118}
    for o in PARTS:
        o.location.z += lift[o.name] * MM
        if o.name in ("bov_bag", "liquid"):
            o.location.x += 42 * MM
        if o.name == "nozzle":
            o.location.y -= 8 * MM
    if "exploded" in only:
        shoot("exploded.png", (0.012, 0, 0.12), 0.8, (0.3, 1.0, -0.12))
    if "valve" in only:
        for o in PARTS:
            o.hide_render = o.name in ("can_body", "print_front", "print_back", "bov_bag", "liquid", "overcap", "dip_tube")
        shoot("valve_detail.png", (0, 0, 0.16), 0.2, (0.45, 1.0, -0.35))
