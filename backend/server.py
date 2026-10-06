"""
Headless, minimal replacement for the AUTOMATIC1111 API, backed by stabilityai/sd-turbo.

It only implements what SD-collage's backend/automatic1111.py uses, with the same
request/response shape as A1111:
    POST /sdapi/v1/txt2img
    POST /sdapi/v1/img2img   (with "mask" it behaves as inpainting)
Requests are processed one at a time (a lock acts as the queue), like A1111 did.
A leading /prompt in the path is accepted and stripped, so it can sit directly behind
the reverse proxy that serves https://<domain>/prompt/ (no caddy needed).
"""
import argparse
import base64
import io
import json
import math
import os
import threading

import numpy as np
import torch
import torch.nn.functional as F
import uvicorn
from diffusers import (
    AutoPipelineForImage2Image,
    AutoPipelineForInpainting,
    AutoPipelineForText2Image,
    EulerAncestralDiscreteScheduler,
)
from fastapi import Body, FastAPI, HTTPException
from PIL import Image, ImageFilter, ImageOps

MODEL_ID = os.environ.get("SD_MODEL", "stabilityai/sd-turbo")  # hub id or local folder

# sd-turbo is distilled for cfg 1 (no guidance) and 1-4 steps
DEFAULT_STEPS = 4
DEFAULT_CFG = 1.0

device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.float16 if device == "cuda" else torch.float32
queue_lock = threading.Lock()

t2i = i2i = inpaint = None


def load_models():
    global t2i, i2i, inpaint
    print(f"Loading {MODEL_ID} on {device} (downloads it on first run)...", flush=True)
    if device == "cpu":
        print("WARNING: no CUDA GPU found, running on CPU will be very slow", flush=True)
    t2i = AutoPipelineForText2Image.from_pretrained(
        MODEL_ID, torch_dtype=dtype, variant="fp16" if device == "cuda" else None
    )
    # "Euler a" like the A1111 setup, with the trailing spacing turbo models need
    t2i.scheduler = EulerAncestralDiscreteScheduler.from_config(
        t2i.scheduler.config, timestep_spacing="trailing"
    )
    t2i.set_progress_bar_config(disable=True)
    t2i.to(device)
    # share the same weights between the three pipelines
    i2i = AutoPipelineForImage2Image.from_pipe(t2i)
    inpaint = AutoPipelineForInpainting.from_pipe(t2i)


# --- image helpers -------------------------------------------------------------

def b64_to_pil(data):
    if "," in data[:100]:
        data = data.split(",", 1)[1]  # strip "data:image/png;base64,"
    return Image.open(io.BytesIO(base64.b64decode(data)))


def pil_to_b64(img):
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode()


def flatten(img):
    """RGB image, transparency flattened on white (A1111's default background)."""
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[3])
        return bg
    return img.convert("RGB")


def fill_masked(img, mask):
    """Replace the masked area (white in mask) with colors smoothly pulled from the rest (A1111's 'fill')."""
    x = torch.from_numpy(np.asarray(img, np.float32)).permute(2, 0, 1)[None]
    w = torch.from_numpy((np.asarray(mask) < 128).astype(np.float32))[None, None]
    pyr = [(x * w, w)]
    while min(pyr[-1][0].shape[-2:]) > 1:
        c, ww = pyr[-1]
        pyr.append((F.avg_pool2d(c, 2, ceil_mode=True), F.avg_pool2d(ww, 2, ceil_mode=True)))
    est = pyr[-1][0] / pyr[-1][1].clamp(min=1e-6)
    for c, ww in reversed(pyr[:-1]):
        up = F.interpolate(est, size=c.shape[-2:], mode="bilinear", align_corners=False)
        est = c + (1 - ww) * up
    out = est[0].permute(1, 2, 0).clamp(0, 255).round().byte().numpy()
    return Image.fromarray(out)


def full_res_box(mask, size, padding):
    """Box around the mask, grown to the aspect ratio of the target size, clamped to the image."""
    bbox = mask.point(lambda v: 255 if v > 0 else 0).getbbox()
    if bbox is None:
        return None
    iw, ih = mask.size
    l, t, r, b = bbox
    l, t, r, b = max(l - padding, 0), max(t - padding, 0), min(r + padding, iw), min(b + padding, ih)
    ratio = size[0] / size[1]
    bw, bh = r - l, b - t
    if bw / bh < ratio:
        bw = min(math.ceil(bh * ratio), iw)
    else:
        bh = min(math.ceil(bw / ratio), ih)
    cx, cy = (l + r) / 2, (t + b) / 2
    l = int(min(max(cx - bw / 2, 0), iw - bw))
    t = int(min(max(cy - bh / 2, 0), ih - bh))
    return (l, t, l + bw, t + bh)


# --- generation ----------------------------------------------------------------

def run(pipe, prompt, negative, steps, cfg, seed, size, **kwargs):
    generator = torch.Generator(device).manual_seed(seed) if seed >= 0 else None
    with torch.inference_mode():
        return pipe(
            prompt=prompt,
            negative_prompt=negative or None,
            num_inference_steps=steps,
            guidance_scale=cfg,
            width=size[0],
            height=size[1],
            generator=generator,
            **kwargs,
        ).images[0]


def common(p, default_size=None):
    w = int(p.get("width") or (default_size[0] if default_size else 512))
    h = int(p.get("height") or (default_size[1] if default_size else 512))
    return dict(
        prompt=p.get("prompt", ""),
        negative=p.get("negative_prompt", ""),
        steps=int(p.get("steps") or DEFAULT_STEPS),
        cfg=float(p.get("cfg_scale") if p.get("cfg_scale") is not None else DEFAULT_CFG),
        seed=int(p.get("seed", -1)),
        size=(w - w % 8, h - h % 8),
    )


def txt2img(p):
    c = common(p)
    return run(t2i, **c)


def img2img(p):
    init = flatten(b64_to_pil(p["init_images"][0]))
    c = common(p, init.size)
    size = c["size"]
    strength = float(p.get("denoising_strength", 0.75))
    # diffusers runs int(steps * strength) steps and needs at least one
    strength = min(max(strength, 1.0 / c["steps"] + 1e-6), 1.0)

    if not p.get("mask"):
        return run(i2i, **c, image=init.resize(size, Image.LANCZOS), strength=strength)

    mask = b64_to_pil(p["mask"]).convert("L")
    if p.get("inpainting_mask_invert"):
        mask = ImageOps.invert(mask)
    mask = mask.resize(init.size, Image.LANCZOS)
    blur = int(p.get("mask_blur", 4))
    if blur:
        mask = mask.filter(ImageFilter.GaussianBlur(blur))
    fill = int(p.get("inpainting_fill", 1))  # 1 = keep original under the mask, else fill

    box = None
    if p.get("inpaint_full_res"):
        # only work on the masked area, upscaled to the full target size
        box = full_res_box(mask, size, int(p.get("inpaint_full_res_padding", 0)))
    if box:
        canvas, canvas_mask = init.crop(box), mask.crop(box)
    else:
        # whole image is generated at the requested size
        init, mask = init.resize(size, Image.LANCZOS), mask.resize(size, Image.LANCZOS)
        canvas, canvas_mask = init, mask
        box = (0, 0) + size
    region_size = (box[2] - box[0], box[3] - box[1])
    canvas = canvas.resize(size, Image.LANCZOS)
    canvas_mask = canvas_mask.resize(size, Image.LANCZOS)

    if fill == 1:
        start = canvas
    else:
        # the filled area is a flat blur with no content: with few turbo steps a partial
        # strength would leave it flat, so generate it from scratch (the rest is kept
        # intact by the pipeline's latent blending)
        start, strength = fill_masked(canvas, canvas_mask), 1.0
    result = run(inpaint, **c, image=start, mask_image=canvas_mask, strength=strength)

    # paste the generated area back over the original with the soft mask
    out = init.copy()
    out.paste(result.resize(region_size, Image.LANCZOS), box[:2], canvas_mask.resize(region_size, Image.LANCZOS))
    return out


# --- api -----------------------------------------------------------------------

app = FastAPI(title="SD-collage sd-turbo backend")


def handle(fn, p):
    try:
        with queue_lock:  # one image at a time, the rest wait in line
            img = fn(p)
    except KeyError as e:
        raise HTTPException(status_code=422, detail=f"missing field {e}")
    except Exception as e:
        print("Generation failed:", repr(e), flush=True)
        raise HTTPException(status_code=500, detail=str(e))
    return {"images": [pil_to_b64(img)], "parameters": p, "info": json.dumps({"seed": p.get("seed", -1)})}


@app.post("/sdapi/v1/txt2img")
def api_txt2img(payload: dict = Body(...)):
    return handle(txt2img, payload)


@app.post("/sdapi/v1/img2img")
def api_img2img(payload: dict = Body(...)):
    return handle(img2img, payload)


@app.get("/")
@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_ID, "device": device}


class StripPrefix:
    """ASGI wrapper: /prompt/foo -> /foo, anything else is passed through untouched."""

    def __init__(self, inner, prefix):
        self.inner = inner
        self.prefix = prefix

    async def __call__(self, scope, receive, send):
        path = scope.get("path", "")
        if scope["type"] in ("http", "websocket") and (path == self.prefix or path.startswith(self.prefix + "/")):
            scope = dict(scope, path=path[len(self.prefix):] or "/")
            if "raw_path" in scope:
                scope["raw_path"] = scope["raw_path"][len(self.prefix):] or b"/"
        await self.inner(scope, receive, send)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="sd-turbo headless API (A1111 compatible subset)")
    ap.add_argument("--host", default=os.environ.get("SD_HOST", "0.0.0.0"))
    ap.add_argument("--port", type=int, default=int(os.environ.get("SD_PORT", 7863)))
    args = ap.parse_args()
    load_models()
    uvicorn.run(StripPrefix(app, "/prompt"), host=args.host, port=args.port, log_level="info")
