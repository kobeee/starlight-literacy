#!/usr/bin/env python3
"""把纯 magenta(#ff00ff) chroma 背景的图抠成透明 RGBA PNG。

用法:
  chroma-key-to-alpha.py IN.png OUT.png [--preview PREVIEW.png] [--hi 110] [--lo 30]

算法: magenta-ness m = min(R,B) - G。
  背景(品红) m 很大 -> alpha=0; 主体(绿/棕/蓝/肤) m 小或负 -> alpha=255; 之间线性过渡(抗锯齿边)。
  再做品红溢色抑制: 主体里 B>G 的像素把 B 压回 max(R,G)，去掉边缘紫边。
"""
import sys
import numpy as np
from PIL import Image


def parse():
    a = sys.argv[1:]
    inp, out = a[0], a[1]
    opt = {"preview": None, "hi": 110.0, "lo": 30.0}
    i = 2
    while i < len(a):
        k = a[i].lstrip("-")
        opt[k] = a[i + 1]
        i += 2
    opt["hi"] = float(opt["hi"]); opt["lo"] = float(opt["lo"])
    return inp, out, opt


def key(inp, out, opt):
    im = Image.open(inp).convert("RGB")
    arr = np.asarray(im).astype(np.float32)
    R, G, B = arr[..., 0], arr[..., 1], arr[..., 2]
    m = np.minimum(R, B) - G
    hi, lo = opt["hi"], opt["lo"]
    alpha = np.clip((hi - m) / (hi - lo), 0.0, 1.0) * 255.0
    # 品红溢色抑制(只动保留区, 否则纯背景被改没意义)
    spill = (B > G)
    newB = np.where(spill, np.minimum(B, np.maximum(R, G)), B)
    rgba = np.dstack([R, G, newB, alpha]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")
    img.save(out)
    # 统计
    a8 = rgba[..., 3]
    print(f"[key] {out}  transparent%={float((a8 < 16).mean()):.3f}  solid%={float((a8 > 240).mean()):.3f}")

    if opt.get("preview"):
        # 合成到暖色卡片渐变(模拟 iOS P03 卡片), 方便肉眼验收
        W, H = img.size
        top = np.array([255, 243, 222], np.float32)   # cardWarm 近似
        bot = np.array([255, 230, 200], np.float32)
        grad = (top[None, None, :] * (1 - np.linspace(0, 1, H)[:, None, None])
                + bot[None, None, :] * np.linspace(0, 1, H)[:, None, None])
        grad = np.broadcast_to(grad, (H, W, 3)).copy()
        af = (rgba[..., 3:4].astype(np.float32)) / 255.0
        comp = rgba[..., :3].astype(np.float32) * af + grad * (1 - af)
        Image.fromarray(comp.astype(np.uint8), "RGB").save(opt["preview"])
        print(f"[preview] {opt['preview']}")


if __name__ == "__main__":
    inp, out, opt = parse()
    key(inp, out, opt)
