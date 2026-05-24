"""
utils/predict_skin_defense.py
Phase F — Complete Intelligent Defense Pipeline (FastAPI backend module).

Loads all 4 models once at first call (lazy, via lru_cache) and exposes:

    predict_skin_defense(image_path: str) -> dict

Pipeline:
    Input Image
        │
        ▼
    3-class DenseNet121  (attack type detector)
        │          │           │
    Class 0    Class 1     Class 2
    (Clean)   (Sparse)    (Dense)
        │          │           │
     [Skip]  SUNet v1    SUNet v3
             sparse
        └──────────┴───────────┘
                   │
                   ▼
            ViT Classifier
                   │
                   ▼
            Final skin label

Model files expected in:
    backend/skin_defense/
        best_3class_densenet.pt
        best_sunet_v1_sparse.pt
        best_sunet_v3.pt
        pytorch_model.bin
        vit_base_local/          ← folder with ViT config

Environment variables (set in backend/.env):
    SKIN_DETECTOR_PATH
    SKIN_SPARSE_SUNET_PATH
    SKIN_SUNET_V3_PATH
    SKIN_VIT_BIN_PATH
    SKIN_VIT_CFG_PATH
    SKIN_CONFIDENCE_THRESHOLD   (optional, default 0.6)
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

import torch
import torch.nn as nn
import numpy as np
from PIL import Image
from torchvision import transforms, models
from transformers import ViTForImageClassification

# ---------------------------------------------------------------------------
# Class labels — must match ViT training order
# ---------------------------------------------------------------------------
CLASS_LABELS: List[str] = [
    "Enfeksiyonel",
    "Ekzama",
    "Akne",
    "Pigment",
    "Benign",
    "Malign",
    "Acne",
    "Actinic Keratosis",
    "Basal Cell Carcinoma",
    "Benign Keratosis",
    "Dermatofibroma",
    "Melanocytic Nevus",
    "Melanoma",
    "Vascular Lesion",
    "Warts/Molluscum",
]

NUM_CLASSES = len(CLASS_LABELS)

# ---------------------------------------------------------------------------
# Paths — resolved relative to backend/ folder
# ---------------------------------------------------------------------------
_THIS_FILE = Path(__file__).resolve()
_BACKEND_DIR = _THIS_FILE.parents[1]
_DEFAULT_MODEL_DIR = _BACKEND_DIR / "skin_defense"


def _model_path(env_var: str, default_filename: str) -> str:
    return os.getenv(env_var, str(_DEFAULT_MODEL_DIR / default_filename))


def _get_device() -> torch.device:
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def _get_threshold() -> float:
    try:
        return float(os.getenv("SKIN_CONFIDENCE_THRESHOLD", "0.6"))
    except ValueError:
        return 0.6


# ===========================================================================
# ARCHITECTURE DEFINITIONS
# ===========================================================================

# ── Swin-Transformer U-Net (SUNet) — used for both sparse and dense denoisers ──

def _window_partition(x, ws):
    B, H, W, C = x.shape
    x = x.view(B, H // ws, ws, W // ws, ws, C)
    return x.permute(0, 1, 3, 2, 4, 5).contiguous().view(-1, ws, ws, C)


def _window_reverse(windows, ws, H, W):
    B = int(windows.shape[0] / (H * W / ws / ws))
    x = windows.view(B, H // ws, W // ws, ws, ws, -1)
    return x.permute(0, 1, 3, 2, 4, 5).contiguous().view(B, H, W, -1)


class _WindowAttention(nn.Module):
    def __init__(self, dim, window_size, num_heads, attn_drop=0.0, proj_drop=0.0):
        super().__init__()
        self.dim = dim
        self.window_size = window_size
        self.num_heads = num_heads
        self.scale = (dim // num_heads) ** -0.5
        self.relative_position_bias_table = nn.Parameter(
            torch.zeros((2 * window_size - 1) ** 2, num_heads)
        )
        nn.init.trunc_normal_(self.relative_position_bias_table, std=0.02)
        coords = torch.stack(
            torch.meshgrid([torch.arange(window_size), torch.arange(window_size)], indexing="ij")
        )
        coords_flat = torch.flatten(coords, 1)
        rel = coords_flat[:, :, None] - coords_flat[:, None, :]
        rel = rel.permute(1, 2, 0).contiguous()
        rel[:, :, 0] += window_size - 1
        rel[:, :, 1] += window_size - 1
        rel[:, :, 0] *= 2 * window_size - 1
        self.register_buffer("relative_position_index", rel.sum(-1))
        self.qkv = nn.Linear(dim, dim * 3, bias=True)
        self.attn_drop = nn.Dropout(attn_drop)
        self.proj = nn.Linear(dim, dim)
        self.proj_drop = nn.Dropout(proj_drop)
        self.softmax = nn.Softmax(dim=-1)

    def forward(self, x, mask=None):
        B_, N, C = x.shape
        qkv = self.qkv(x).reshape(B_, N, 3, self.num_heads, C // self.num_heads).permute(2, 0, 3, 1, 4)
        q, k, v = qkv.unbind(0)
        attn = (q * self.scale) @ k.transpose(-2, -1)
        rpb = self.relative_position_bias_table[self.relative_position_index.view(-1)].view(
            self.window_size ** 2, self.window_size ** 2, -1
        ).permute(2, 0, 1).contiguous()
        attn = attn + rpb.unsqueeze(0)
        if mask is not None:
            nW = mask.shape[0]
            attn = attn.view(B_ // nW, nW, self.num_heads, N, N) + mask.unsqueeze(1).unsqueeze(0)
            attn = attn.view(-1, self.num_heads, N, N)
        attn = self.attn_drop(self.softmax(attn))
        return self.proj_drop(self.proj((attn @ v).transpose(1, 2).reshape(B_, N, C)))


class _SwinBlock(nn.Module):
    def __init__(self, dim, num_heads, window_size=7, shift_size=0, mlp_ratio=4.0,
                 drop=0.0, attn_drop=0.0, input_resolution=None):
        super().__init__()
        self.dim = dim
        self.window_size = window_size
        self.shift_size = shift_size
        self.input_resolution = input_resolution
        if min(input_resolution) <= window_size:
            self.shift_size = 0
            self.window_size = min(input_resolution)
        self.norm1 = nn.LayerNorm(dim)
        self.attn = _WindowAttention(dim, self.window_size, num_heads, attn_drop, drop)
        self.norm2 = nn.LayerNorm(dim)
        mlp_h = int(dim * mlp_ratio)
        self.mlp = nn.Sequential(
            nn.Linear(dim, mlp_h), nn.GELU(), nn.Dropout(drop),
            nn.Linear(mlp_h, dim), nn.Dropout(drop),
        )
        am = None
        if self.shift_size > 0 and input_resolution is not None:
            H, W = input_resolution
            img_mask = torch.zeros(1, H, W, 1)
            cnt = 0
            for h in (slice(0, -self.window_size), slice(-self.window_size, -self.shift_size), slice(-self.shift_size, None)):
                for w in (slice(0, -self.window_size), slice(-self.window_size, -self.shift_size), slice(-self.shift_size, None)):
                    img_mask[:, h, w, :] = cnt
                    cnt += 1
            mw = _window_partition(img_mask, self.window_size).view(-1, self.window_size ** 2)
            am = mw.unsqueeze(1) - mw.unsqueeze(2)
            am = am.masked_fill(am != 0, -100.0).masked_fill(am == 0, 0.0)
        self.register_buffer("attn_mask", am)

    def forward(self, x):
        H, W = self.input_resolution
        B, L, C = x.shape
        shortcut = x
        x = self.norm1(x).view(B, H, W, C)
        if self.shift_size > 0:
            x = torch.roll(x, shifts=(-self.shift_size, -self.shift_size), dims=(1, 2))
        xw = _window_partition(x, self.window_size).view(-1, self.window_size ** 2, C)
        xw = self.attn(xw, mask=self.attn_mask).view(-1, self.window_size, self.window_size, C)
        x = _window_reverse(xw, self.window_size, H, W)
        if self.shift_size > 0:
            x = torch.roll(x, shifts=(self.shift_size, self.shift_size), dims=(1, 2))
        x = shortcut + x.view(B, H * W, C)
        return x + self.mlp(self.norm2(x))


class _PatchEmbed(nn.Module):
    def __init__(self, img_size=224, patch_size=4, in_chans=3, embed_dim=96):
        super().__init__()
        self.proj = nn.Conv2d(in_chans, embed_dim, patch_size, patch_size)
        self.norm = nn.LayerNorm(embed_dim)

    def forward(self, x):
        x = self.proj(x)
        H, W = x.shape[2], x.shape[3]
        return self.norm(x.flatten(2).transpose(1, 2)), H, W


class _PatchMerging(nn.Module):
    def __init__(self, input_resolution, dim):
        super().__init__()
        self.input_resolution = input_resolution
        self.dim = dim
        self.reduction = nn.Linear(4 * dim, 2 * dim, bias=False)
        self.norm = nn.LayerNorm(4 * dim)

    def forward(self, x):
        H, W = self.input_resolution
        B, L, C = x.shape
        x = x.view(B, H, W, C)
        x = torch.cat([x[:, 0::2, 0::2, :], x[:, 1::2, 0::2, :],
                        x[:, 0::2, 1::2, :], x[:, 1::2, 1::2, :]], -1)
        return self.reduction(self.norm(x.view(B, -1, 4 * C)))


class _PatchExpand(nn.Module):
    def __init__(self, input_resolution, dim, dim_scale=2):
        super().__init__()
        self.input_resolution = input_resolution
        self.dim = dim
        self.expand = nn.Linear(dim, 2 * dim, bias=False) if dim_scale == 2 else nn.Identity()
        self.norm = nn.LayerNorm(dim // dim_scale)

    def forward(self, x):
        H, W = self.input_resolution
        x = self.expand(x)
        B, L, C = x.shape
        x = x.view(B, H, W, C).view(B, H, W, 2, 2, C // 4).permute(0, 1, 3, 2, 4, 5).contiguous()
        return self.norm(x.view(B, H * 2, W * 2, C // 4).view(B, -1, C // 4))


class _FinalPatchExpand(nn.Module):
    def __init__(self, input_resolution, dim, patch_size=4):
        super().__init__()
        self.input_resolution = input_resolution
        self.dim = dim
        self.patch_size = patch_size
        self.expand = nn.Linear(dim, patch_size * patch_size * dim, bias=False)
        self.norm = nn.LayerNorm(dim)

    def forward(self, x):
        H, W = self.input_resolution
        x = self.expand(x)
        B, L, C = x.shape
        x = x.view(B, H, W, self.patch_size, self.patch_size, self.dim).permute(0, 1, 3, 2, 4, 5).contiguous()
        return self.norm(x.view(B, H * self.patch_size, W * self.patch_size, self.dim)).permute(0, 3, 1, 2)


class _SwinEncoderStage(nn.Module):
    def __init__(self, dim, depth, num_heads, window_size, mlp_ratio, input_resolution,
                 drop=0.0, attn_drop=0.0):
        super().__init__()
        self.blocks = nn.ModuleList([
            _SwinBlock(dim, num_heads, window_size,
                       0 if i % 2 == 0 else window_size // 2,
                       mlp_ratio, drop, attn_drop, input_resolution)
            for i in range(depth)
        ])

    def forward(self, x):
        for b in self.blocks:
            x = b(x)
        return x


class _SwinDecoderStage(nn.Module):
    def __init__(self, dim, depth, num_heads, window_size, mlp_ratio, input_resolution,
                 drop=0.0, attn_drop=0.0):
        super().__init__()
        self.norm = nn.LayerNorm(2 * dim)
        self.reduce = nn.Linear(2 * dim, dim, bias=False)
        self.blocks = nn.ModuleList([
            _SwinBlock(dim, num_heads, window_size,
                       0 if i % 2 == 0 else window_size // 2,
                       mlp_ratio, drop, attn_drop, input_resolution)
            for i in range(depth)
        ])

    def forward(self, x, skip):
        x = self.reduce(self.norm(torch.cat([x, skip], -1)))
        for b in self.blocks:
            x = b(x)
        return x


class SUNet(nn.Module):
    """Swin-Transformer U-Net used for both sparse and dense denoisers."""

    def __init__(self, img_size=224, patch_size=4, in_chans=3, embed_dim=96,
                 depths=None, num_heads=None, window_size=7, mlp_ratio=4.0,
                 drop_rate=0.0, attn_drop_rate=0.0):
        super().__init__()
        if depths is None:
            depths = [2, 2, 2, 2]
        if num_heads is None:
            num_heads = [3, 6, 12, 24]
        self.num_stages = len(depths)
        pr = img_size // patch_size
        self.resolutions = [(pr // (2 ** i), pr // (2 ** i)) for i in range(self.num_stages)]
        self.dims = [embed_dim * (2 ** i) for i in range(self.num_stages)]
        self.patch_embed = _PatchEmbed(img_size, patch_size, in_chans, embed_dim)
        self.pos_drop = nn.Dropout(drop_rate)
        self.encoder_stages = nn.ModuleList()
        self.downsamples = nn.ModuleList()
        for i in range(self.num_stages):
            self.encoder_stages.append(_SwinEncoderStage(
                self.dims[i], depths[i], num_heads[i], window_size,
                mlp_ratio, self.resolutions[i], drop_rate, attn_drop_rate))
            if i < self.num_stages - 1:
                self.downsamples.append(_PatchMerging(self.resolutions[i], self.dims[i]))
        self.upsamples = nn.ModuleList()
        self.decoder_stages = nn.ModuleList()
        for i in range(self.num_stages - 2, -1, -1):
            self.upsamples.append(_PatchExpand(self.resolutions[i + 1], self.dims[i + 1]))
            self.decoder_stages.append(_SwinDecoderStage(
                self.dims[i], depths[i], num_heads[i], window_size,
                mlp_ratio, self.resolutions[i], drop_rate, attn_drop_rate))
        self.final_expand = _FinalPatchExpand(self.resolutions[0], self.dims[0], patch_size)
        self.output_head = nn.Sequential(nn.Conv2d(embed_dim, in_chans, 1), nn.Sigmoid())

    def forward(self, x):
        x, H, W = self.patch_embed(x)
        x = self.pos_drop(x)
        skips = []
        for i, stage in enumerate(self.encoder_stages):
            x = stage(x)
            if i < self.num_stages - 1:
                skips.append(x)
                x = self.downsamples[i](x)
        for i, (up, dec) in enumerate(zip(self.upsamples, self.decoder_stages)):
            x = dec(up(x), skips[-(i + 1)])
        return self.output_head(self.final_expand(x))


# ===========================================================================
# MODEL LOADERS
# ===========================================================================

def _load_state_dict(path: str, device: torch.device) -> dict:
    sd = torch.load(path, map_location=device)
    if any(k.startswith("module.") for k in sd):
        sd = {k.replace("module.", ""): v for k, v in sd.items()}
    return sd


def _load_detector(device: torch.device) -> nn.Module:
    path = _model_path("SKIN_DETECTOR_PATH", "best_3class_densenet.pt")
    print(f"  [Defense] Loading 3-class DenseNet121 from {path}")
    model = models.densenet121(pretrained=False)
    in_f = model.classifier.in_features
    model.classifier = nn.Sequential(
        nn.Linear(in_f, 512), nn.BatchNorm1d(512), nn.ReLU(), nn.Dropout(0.4),
        nn.Linear(512, 256), nn.ReLU(), nn.Dropout(0.3),
        nn.Linear(256, 3),
    )
    model.load_state_dict(torch.load(path, map_location="cpu"), strict=True)
    return model.eval().to(device)


def _load_sparse_sunet(device: torch.device) -> nn.Module:
    path = _model_path("SKIN_SPARSE_SUNET_PATH", "best_sunet_v1_sparse.pt")
    print(f"  [Defense] Loading Sparse SUNet v1 from {path}")
    model = SUNet(img_size=224, patch_size=4, in_chans=3, embed_dim=96,
                  depths=[2, 2, 2, 2], num_heads=[3, 6, 12, 24], window_size=7)
    model.load_state_dict(_load_state_dict(path, device), strict=True)
    return model.eval().to(device)


def _load_sunet_v3(device: torch.device) -> nn.Module:
    path = _model_path("SKIN_SUNET_V3_PATH", "best_sunet_v3.pt")
    print(f"  [Defense] Loading Dense SUNet v3 from {path}")
    model = SUNet(img_size=224, patch_size=4, in_chans=3, embed_dim=96,
                  depths=[2, 2, 2, 2], num_heads=[3, 6, 12, 24], window_size=7)
    model.load_state_dict(_load_state_dict(path, device), strict=True)
    return model.eval().to(device)


def _load_vit(device: torch.device) -> ViTForImageClassification:
    cfg_path = _model_path("SKIN_VIT_CFG_PATH", "vit_base_local")
    bin_path = _model_path("SKIN_VIT_BIN_PATH", "pytorch_model.bin")
    print(f"  [Defense] Loading ViT from {cfg_path}")
    try:
        model = ViTForImageClassification.from_pretrained(
            cfg_path, num_labels=NUM_CLASSES, ignore_mismatched_sizes=True)
    except Exception:
        model = ViTForImageClassification.from_pretrained(
            "google/vit-base-patch16-224-in21k",
            num_labels=NUM_CLASSES, ignore_mismatched_sizes=True)
    sd = torch.load(bin_path, map_location="cpu")
    if any(k.startswith("module.") for k in sd):
        sd = {k.replace("module.", ""): v for k, v in sd.items()}
    model.load_state_dict(sd, strict=False)
    for p in model.parameters():
        p.requires_grad = False
    return model.eval().to(device)


# ---------------------------------------------------------------------------
# Bundle: load all 4 models once, cache forever
# ---------------------------------------------------------------------------
@lru_cache(maxsize=1)
def _get_defense_bundle():
    """Lazy-load all 4 Phase F models. Called on first /predict-skin-defense request."""
    device = _get_device()
    print("✅ Loading Phase F defense pipeline...")
    detector = _load_detector(device)
    sparse_sunet = _load_sparse_sunet(device)
    sunet_v3 = _load_sunet_v3(device)
    vit = _load_vit(device)
    for m in (detector, sparse_sunet, sunet_v3, vit):
        for p in m.parameters():
            p.requires_grad = False
    print(f"✅ Phase F pipeline ready on device={device}")
    return device, detector, sparse_sunet, sunet_v3, vit


# ---------------------------------------------------------------------------
# Transforms
# ---------------------------------------------------------------------------
_TF_RESTORE = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),         # [0,1] — NO normalisation before denoiser
])

_TF_DETECT = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

_VIT_NORM = transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])


# ===========================================================================
# PUBLIC FUNCTION
# ===========================================================================

def predict_skin_defense(image_path: str) -> Dict[str, Any]:
    """
    Run the full Phase F adversarial defense pipeline on a skin image.

    The pipeline:
      1. 3-class DenseNet121 detects attack type (clean / sparse / dense)
      2. Routes to the correct denoiser (skip / SUNet v1 sparse / SUNet v3)
      3. ViT classifies the denoised image

    Args:
        image_path: Absolute path to a .jpg / .jpeg / .png image file.

    Returns:
        {
            "success": True,
            "disease": str,
            "diagnosis": str,
            "label": int,
            "confidence": float,
            "all_probabilities": {class_name: float},
            "top5_predictions": [{label, probability}],
            "route_used": "clean_skip" | "sparse_sunet" | "sunet_v3",
            "detector_class": int,        # 0=Clean, 1=Sparse, 2=Dense
            "detector_confidence": float,
            "pipeline_version": "phase_f_v1",
            "type": "skin_disease"
        }
    """
    try:
        # ── Load models (cached after first call) ──────────────────────────
        device, detector, sparse_sunet, sunet_v3, vit = _get_defense_bundle()
        threshold = _get_threshold()

        # ── Load image ─────────────────────────────────────────────────────
        pil_image = Image.open(image_path).convert("RGB")

        # ── Prepare tensors ────────────────────────────────────────────────
        img_restore = _TF_RESTORE(pil_image).unsqueeze(0).to(device)   # [0,1] for denoiser
        img_detect = _TF_DETECT(pil_image).unsqueeze(0).to(device)     # normalised for DenseNet

        # ── Step 1: Detect attack type ─────────────────────────────────────
        with torch.no_grad():
            logits = detector(img_detect)
            probs_det = torch.softmax(logits, dim=1)
            det_conf, det_cls = probs_det.max(dim=1)
        det_cls = int(det_cls.item())
        det_conf = float(det_conf.item())

        # Low confidence → safe fallback to dense route
        route = det_cls if det_conf >= threshold else 2

        # ── Step 2: Denoise ────────────────────────────────────────────────
        with torch.no_grad():
            if route == 0:
                denoised = img_restore
                route_label = "clean_skip"
            elif route == 1:
                denoised = sparse_sunet(img_restore)
                route_label = "sparse_sunet"
            else:
                denoised = sunet_v3(img_restore)
                route_label = "sunet_v3"

        # ── Step 3: ViT classification ─────────────────────────────────────
        with torch.no_grad():
            vit_input = _VIT_NORM(denoised.squeeze(0)).unsqueeze(0).to(device)
            vit_logits = vit(pixel_values=vit_input).logits
            vit_probs = torch.softmax(vit_logits, dim=1).squeeze(0)

        predicted_index = int(vit_probs.argmax().item())
        confidence = float(vit_probs[predicted_index].item())
        predicted_label = CLASS_LABELS[predicted_index]

        all_probs = {
            CLASS_LABELS[i]: round(float(vit_probs[i].item()), 4)
            for i in range(NUM_CLASSES)
        }

        top5_vals, top5_idx = vit_probs.topk(5)
        top5 = [
            {
                "label": CLASS_LABELS[int(idx)],
                "class_index": int(idx),
                "probability": round(float(val), 4),
            }
            for val, idx in zip(top5_vals, top5_idx)
        ]

        return {
            "success": True,
            "disease": predicted_label,
            "diagnosis": predicted_label,
            "label": predicted_index,
            "confidence": round(confidence, 4),
            "all_probabilities": all_probs,
            "top5_predictions": top5,
            "route_used": route_label,
            "detector_class": det_cls,
            "detector_confidence": round(det_conf, 4),
            "pipeline_version": "phase_f_v1",
            "type": "skin_disease",
        }

    except FileNotFoundError as exc:
        return {"success": False, "error": str(exc)}
    except Exception as exc:
        return {"success": False, "error": f"Prediction error: {str(exc)}"}


def get_pipeline_status() -> Dict[str, Any]:
    """
    Check whether the Phase F models are loaded without triggering loading.
    Used by the /predict-skin-defense/health endpoint.
    """
    loaded = _get_defense_bundle.cache_info().currsize > 0
    return {
        "loaded": loaded,
        "models": {
            "detector":     _model_path("SKIN_DETECTOR_PATH", "best_3class_densenet.pt"),
            "sparse_sunet": _model_path("SKIN_SPARSE_SUNET_PATH", "best_sunet_v1_sparse.pt"),
            "sunet_v3":     _model_path("SKIN_SUNET_V3_PATH", "best_sunet_v3.pt"),
            "vit_bin":      _model_path("SKIN_VIT_BIN_PATH", "pytorch_model.bin"),
            "vit_cfg":      _model_path("SKIN_VIT_CFG_PATH", "vit_base_local"),
        },
        "device": str(_get_device()),
        "confidence_threshold": _get_threshold(),
        "pipeline_version": "phase_f_v1",
    }