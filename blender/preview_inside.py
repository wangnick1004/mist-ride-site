"""內部構造檢查用：隱藏罐身與蓋子，看內袋摺痕、導流管與閥門。"""
import bpy, math, sys
from mathutils import Vector
args = sys.argv[sys.argv.index("--") + 1:]
src, out = args[0], args[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene
for o in sc.objects:
    if o.name.startswith(("can_body", "print_", "overcap")):
        o.hide_render = True
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.9, 0.92, 0.9, 1)
for n, loc, e in (("k", (-0.25, -0.3, 0.3), 3), ("r", (0.3, 0.25, 0.2), 2.5), ("f", (0.3, -0.3, 0.05), 1.5)):
    ld = bpy.data.lights.new(n, "AREA"); ld.energy = e; ld.size = 0.3
    lo = bpy.data.objects.new(n, ld); lo.location = loc; sc.collection.objects.link(lo)
    lo.rotation_euler = (-Vector(loc)).to_track_quat("-Z", "Y").to_euler()
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); cam.data.lens = 85; cam.data.clip_start = 0.001
sc.collection.objects.link(cam); sc.camera = cam
sc.render.engine = "CYCLES"; sc.cycles.samples = 32; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 800, 1000

def shot(name, hide, target, dist, d):
    for o in sc.objects:
        if o.type == "MESH" and not o.name.startswith(("can_body", "print_", "overcap")):
            o.hide_render = any(o.name.startswith(h) for h in hide)
    d = Vector(d).normalized()
    cam.location = Vector(target) - d * dist
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = out + name
    bpy.ops.render.render(write_still=True)

# Blender 匯入 glTF 後轉回 Z 軸朝上，正面朝 -Y
shot("bag.png", [], (0, 0, 0.058), 0.42, (0.4, 1.0, -0.25))
shot("tube.png", ["bov_bag", "liquid"], (0, 0, 0.058), 0.42, (0.4, 1.0, -0.25))
shot("tube_bottom.png", ["bov_bag", "liquid"], (0, 0, 0.013), 0.05, (0.5, 1.0, -0.45))
