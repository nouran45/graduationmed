import os
import logging
import traceback
from pathlib import Path
from typing import Dict, Any, Optional

import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_pipeline = None

CONTINUOUS_NUM  = ['age', 'trestbps', 'chol', 'thalach', 'oldpeak']
BINARY_NUM      = ['fbs']
CAT_FEATS       = ['sex', 'cp', 'restecg', 'exang', 'slope']
ALL_NUMERIC     = CONTINUOUS_NUM + BINARY_NUM
ALL_FEATS       = ALL_NUMERIC + CAT_FEATS
ALL_FEATS_MODEL = ALL_FEATS
N_NUM_FEATS     = len(ALL_NUMERIC)
N_CAT_FEATS     = len(CAT_FEATS)

VALID_RANGES = {
    'age'     : (1,   120),
    'trestbps': (60,  250),
    'chol'    : (50,  700),
    'thalach' : (50,  250),
    'oldpeak' : (0.0, 10.0),
    'fbs'     : [0, 1],
    'sex'     : [0, 1],
    'cp'      : [0, 1, 2, 3],
    'restecg' : [0, 1, 2],
    'exang'   : [0, 1],
    'slope'   : [0, 1, 2],
}


# ================================================================
# FIX: sklearn 1.6 CalibratedClassifierCV compatibility
#
# Root cause:
#   sklearn 1.6 added __sklearn_tags__() to BaseEstimator.
#   Models pickled with sklearn < 1.6 lack this on their MRO.
#   CalibratedClassifierCV.predict_proba() calls:
#     _get_response_values() -> is_classifier() -> get_tags()
#     -> __sklearn_tags__() -> CRASH
#
# Fix:
#   Strategy 1 — Call XGBClassifier.predict_proba() directly
#     (XGBoost's own impl does NOT go through sklearn is_classifier).
#     Then replay calibration manually with cc.calibrators[0].
#
#   Strategy 2 — Raw XGBoost Booster via xgb.DMatrix.
#     Zero sklearn involvement.
#
#   Strategy 3 — Monkey-patch __sklearn_tags__ onto XGBClassifier
#     so sklearn 1.6 can find it, then call the wrapper normally.
#
#   Strategy 4 — Uncalibrated booster output (last resort).
#
# Key facts from sklearn 1.6 _CalibratedClassifier source:
#   Attribute name: cc.calibrators  (NO trailing underscore)
#   Binary classification: ONE calibrator stored (positive class)
#   proba[:,1] = calibrator.predict(raw_pos_proba)
#   proba[:,0] = 1 - proba[:,1]
# ================================================================

def _xgb_predict_proba_safe(calibrated_model, X: np.ndarray) -> np.ndarray:
    """
    Get calibrated XGBoost probabilities without triggering sklearn 1.6's
    broken __sklearn_tags__ introspection on old pickled models.
    """

    # Strategy 1: XGBClassifier.predict_proba + manual calibration replay
    try:
        cal_classifiers = calibrated_model.calibrated_classifiers_
        all_proba = []
        for cc in cal_classifiers:
            # XGBClassifier.predict_proba does NOT call is_classifier()
            raw_proba  = cc.estimator.predict_proba(X)   # shape (n, 2)
            raw_pos    = raw_proba[:, 1]                  # positive class
            # cc.calibrators (no underscore) — confirmed from sklearn 1.6 source
            # Binary: list has ONE calibrator for the positive class
            calibrator = cc.calibrators[0]
            cal_pos    = calibrator.predict(raw_pos)
            all_proba.append(cal_pos)
        logger.info("  XGB via Strategy 1 (XGBClassifier + manual calibration)")
        return np.mean(all_proba, axis=0)
    except Exception as e1:
        logger.warning(f"  XGB Strategy 1 failed: {e1}")

    # Strategy 2: raw XGBoost Booster — zero sklearn involvement
    try:
        import xgboost as xgb
        cal_classifiers = calibrated_model.calibrated_classifiers_
        all_proba = []
        for cc in cal_classifiers:
            booster = cc.estimator.get_booster()
            booster.set_param('device', 'cpu')
            raw_pos    = booster.predict(xgb.DMatrix(X))  # P(positive)
            calibrator = cc.calibrators[0]
            cal_pos    = calibrator.predict(raw_pos)
            all_proba.append(cal_pos)
        logger.info("  XGB via Strategy 2 (raw Booster + manual calibration)")
        return np.mean(all_proba, axis=0)
    except Exception as e2:
        logger.warning(f"  XGB Strategy 2 failed: {e2}")

    # Strategy 3: monkey-patch __sklearn_tags__ onto XGBClassifier
    try:
        import xgboost
        from sklearn.utils._tags import Tags

        def _xgb_sklearn_tags(self, **kwargs):
            tags = Tags()
            tags.estimator_type = "classifier"
            return tags

        if not hasattr(xgboost.XGBClassifier, '__sklearn_tags__'):
            xgboost.XGBClassifier.__sklearn_tags__ = _xgb_sklearn_tags
            logger.warning("  XGB Strategy 3: monkey-patched XGBClassifier.__sklearn_tags__")

        result = calibrated_model.predict_proba(X)[:, 1]
        logger.info("  XGB via Strategy 3 (monkey-patch)")
        return result
    except Exception as e3:
        logger.warning(f"  XGB Strategy 3 failed: {e3}")

    # Strategy 4: uncalibrated booster output — last resort
    try:
        import xgboost as xgb
        booster = calibrated_model.calibrated_classifiers_[0].estimator.get_booster()
        booster.set_param('device', 'cpu')
        raw = booster.predict(xgb.DMatrix(X))
        logger.warning("  XGB Strategy 4: uncalibrated booster output (last resort)")
        return raw
    except Exception as e4:
        raise RuntimeError(f"All XGB strategies failed. Last: {e4}") from e4


# ================================================================
# ARCHITECTURE CLASSES
# ================================================================

def add_enhanced_features(X_11: np.ndarray) -> np.ndarray:
    slope    = X_11[:, 10].reshape(-1, 1)
    oldpeak  = X_11[:,  4].reshape(-1, 1)
    cp       = X_11[:,  7].reshape(-1, 1)
    exang    = X_11[:,  9].reshape(-1, 1)
    age      = X_11[:,  0].reshape(-1, 1)
    thalach  = X_11[:,  3].reshape(-1, 1)
    chol     = X_11[:,  2].reshape(-1, 1)
    trestbps = X_11[:,  1].reshape(-1, 1)
    fbs      = X_11[:,  5].reshape(-1, 1)
    f12 = slope * oldpeak;         f13 = cp * exang
    f14 = age * oldpeak;           f15 = 1.0 / (thalach + 1e-6)
    f16 = chol / (age + 1e-6);     f17 = age * thalach
    f18 = np.log(np.abs(chol) + 1.0)
    f19 = oldpeak ** 2;            f20 = trestbps * oldpeak
    f21 = thalach / (age + 1e-6);  f22 = fbs * exang
    return np.hstack([X_11, f12, f13, f14, f15, f16,
                      f17, f18, f19, f20, f21, f22])


class PLEEmbedder:
    def __init__(self, n_bins: int = 8):
        self.n_bins    = n_bins
        self.bin_edges: Dict[str, np.ndarray] = {}

    def fit(self, X: np.ndarray, cols: list):
        self.cols = cols
        for i, c in enumerate(cols):
            e = np.quantile(X[:, i], np.linspace(0, 1, self.n_bins + 1))
            e = np.unique(e)
            if len(e) < 2:
                e = np.array([e[0] - 1e-6, e[0] + 1e-6])
            self.bin_edges[c] = e

    def transform(self, X: np.ndarray, cols: list) -> np.ndarray:
        parts = []
        for i, c in enumerate(cols):
            e = self.bin_edges[c]
            x = X[:, i]
            bins = []
            for j in range(len(e) - 1):
                lo, hi = e[j], e[j + 1]
                sp = max(hi - lo, 1e-8)
                bins.append(np.clip((x - lo) / sp, 0, 1))
            while len(bins) < self.n_bins:
                bins.append(np.zeros(len(x)))
            parts.append(np.stack(bins[:self.n_bins], axis=1))
        return np.concatenate(parts, axis=1)


class GroupSparseAttention(nn.Module):
    def __init__(self, d: int, n_heads: int, n_groups: int,
                 top_k: int, dropout: float = 0.1):
        super().__init__()
        assert d % n_heads == 0
        self.h  = n_heads
        self.dh = d // n_heads
        self.k  = top_k
        self.q    = nn.Linear(d, d, bias=False)
        self.k_   = nn.Linear(d, d, bias=False)
        self.v    = nn.Linear(d, d, bias=False)
        self.out  = nn.Linear(d, d)
        self.drop = nn.Dropout(dropout)
        self.prior = nn.Parameter(torch.zeros(n_groups, n_groups))
        nn.init.normal_(self.prior, std=0.02)

    def forward(self, x, group_ids, intra_mask):
        B, T, _ = x.shape
        H, Dh   = self.h, self.dh
        dev = x.device
        intra_mask = intra_mask.to(dev)
        group_ids  = group_ids.to(dev)
        Q = self.q(x).view(B, T, H, Dh).transpose(1, 2)
        K = self.k_(x).view(B, T, H, Dh).transpose(1, 2)
        V = self.v(x).view(B, T, H, Dh).transpose(1, 2)
        lg = torch.matmul(Q, K.transpose(-2, -1)) * (Dh ** -0.5)
        pb = self.prior[group_ids.unsqueeze(1), group_ids.unsqueeze(0)]
        lg = lg + pb.unsqueeze(0).unsqueeze(0)
        intra = intra_mask.unsqueeze(0).unsqueeze(0)
        inter = ~intra
        if self.k < T:
            il = lg.masked_fill(intra, float('-inf'))
            tv, _ = il.topk(min(self.k, T), dim=-1)
            lg = lg.masked_fill((il < tv[..., -1:]) & inter, float('-inf'))
        attn = self.drop(torch.softmax(lg, dim=-1))
        out  = torch.matmul(attn, V).transpose(1, 2).contiguous().view(B, T, -1)
        return self.out(out)


class GatedFFN(nn.Module):
    def __init__(self, d: int, mult: int = 2, dr: float = 0.1):
        super().__init__()
        self.fc1 = nn.Linear(d, d * mult * 2)
        self.fc2 = nn.Linear(d * mult, d)
        self.dr  = nn.Dropout(dr)

    def forward(self, x):
        h = self.fc1(x)
        g, v = h.chunk(2, dim=-1)
        return self.fc2(self.dr(F.silu(g) * v))


class ACFLayer(nn.Module):
    def __init__(self, d, nh, ng, k, ffn_m, dr):
        super().__init__()
        self.attn = GroupSparseAttention(d, nh, ng, k, dr)
        self.ffn  = GatedFFN(d, ffn_m, dr)
        self.ln1  = nn.LayerNorm(d)
        self.ln2  = nn.LayerNorm(d)
        self.dr   = nn.Dropout(dr)

    def forward(self, x, gids, imask):
        x = x + self.dr(self.attn(self.ln1(x), gids, imask))
        x = x + self.dr(self.ffn(self.ln2(x)))
        return x


class AdaptiveClinicalFormer(nn.Module):
    def __init__(self, n_ple, n_cat, cat_cards, d, nh, nl, ng,
                 gids, k, ffn_m, dr, feat_imp=None):
        super().__init__()
        self.n_ple     = n_ple
        self.n_cat     = n_cat
        self.n_tok     = n_ple + n_cat
        self.d         = d
        self.cat_cards = cat_cards
        self.num_proj  = nn.Linear(1, d)
        self.cat_emb   = nn.Embedding(max(max(cat_cards) + 1, 64), d)
        self.pos_emb   = nn.Embedding(self.n_tok, d)

        if feat_imp is not None:
            imp   = np.array(feat_imp, dtype=np.float32)
            imp   = imp / (imp.max() + 1e-8)
            drops = (0.05 + 0.25 * (1 - imp)).tolist()
            if len(drops) < self.n_tok:
                drops += [dr] * (self.n_tok - len(drops))
            drops = drops[:self.n_tok]
        else:
            drops = [dr] * self.n_tok
        self.feat_drops = nn.ModuleList(
            [nn.Dropout(float(d_)) for d_ in drops]
        )
        self.layers = nn.ModuleList(
            [ACFLayer(d, nh, ng, k, ffn_m, dr) for _ in range(nl)]
        )
        self.ln = nn.LayerNorm(d)
        in_d = d * self.n_tok
        self.head = nn.Sequential(
            nn.Linear(in_d, d * 2), nn.SiLU(), nn.Dropout(dr),
            nn.Linear(d * 2, d),   nn.SiLU(), nn.Dropout(dr / 2),
            nn.Linear(d, 1),
        )
        self.register_buffer('gids', torch.tensor(gids, dtype=torch.long))
        self.register_buffer(
            'imask',
            torch.tensor(gids, dtype=torch.long).unsqueeze(0) ==
            torch.tensor(gids, dtype=torch.long).unsqueeze(1),
        )

    def forward(self, x_ple, x_cat):
        toks = []
        for i in range(self.n_ple):
            t = self.feat_drops[i](self.num_proj(x_ple[:, i:i+1]))
            toks.append(t)
        for j in range(self.n_cat):
            max_idx = self.cat_cards[j] - 1
            idx = x_cat[:, j].clamp(0, max_idx)
            t = self.feat_drops[self.n_ple + j](self.cat_emb(idx))
            toks.append(t)
        x = torch.stack(toks, 1)
        x = x + self.pos_emb(
            torch.arange(self.n_tok, device=x.device)
        ).unsqueeze(0)
        for lyr in self.layers:
            x = lyr(x, self.gids, self.imask)
        return self.head(self.ln(x).view(x.size(0), -1)).squeeze(-1)


class CardioTabNetPipeline:
    def __init__(self, imputer, scaler, ple_encoder, acf_models,
                 xgb_model, cat_model, lgbm_model, config, cat_cards,
                 ple_gids, ensemble_weights, threshold):
        self.imputer          = imputer
        self.scaler           = scaler
        self.ple_encoder      = ple_encoder
        self.cat_cards        = cat_cards
        self.ple_gids         = ple_gids
        self.ensemble_weights = ensemble_weights
        self.threshold        = threshold
        self.config           = config

        self.acf_models = []
        for mdl in acf_models:
            mdl.cpu()
            mdl.eval()
            self.acf_models.append(mdl)

        try:
            xgb_model.estimator.set_params(device='cpu', tree_method='hist')
        except Exception:
            pass
        self.xgb_model  = xgb_model
        self.cat_model  = cat_model
        self.lgbm_model = lgbm_model
        self.n_ensemble_models = int(len(ensemble_weights))

    def preprocess(self, df: pd.DataFrame) -> np.ndarray:
        X = df[ALL_FEATS_MODEL].copy()
        for col in CAT_FEATS:
            X[col] = X[col].astype(int)
        X = X.values.astype(np.float32)
        X_num    = self.imputer.transform(X[:, :N_NUM_FEATS])
        X_num_sc = self.scaler.transform(X_num)
        return np.hstack([X_num_sc, X[:, N_NUM_FEATS:]]).astype(np.float32)

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        X   = self.preprocess(df)
        X22 = add_enhanced_features(X).astype(np.float32)

        Xple = self.ple_encoder.transform(
            X[:, :N_NUM_FEATS], ALL_NUMERIC
        ).astype(np.float32)
        Xcat = X[:, N_NUM_FEATS:].astype(int)

        device = next(self.acf_models[0].parameters()).device
        Xpv = torch.tensor(Xple, dtype=torch.float32).to(device)
        Xcv = torch.tensor(Xcat, dtype=torch.long).to(device)

        acf_probs = []
        for mdl in self.acf_models:
            with torch.no_grad():
                logits = mdl(Xpv, Xcv)
                acf_probs.append(torch.sigmoid(logits).cpu().numpy())
        p_acf = np.mean(acf_probs, axis=0)

        # Safe XGB call — bypasses sklearn 1.6 __sklearn_tags__ crash
        p_xgb = _xgb_predict_proba_safe(self.xgb_model, X22)

        probs_list = [p_acf, p_xgb]

        if self.cat_model is not None:
            probs_list.append(self.cat_model.predict_proba(X22)[:, 1])
        if self.lgbm_model is not None:
            probs_list.append(self.lgbm_model.predict_proba(X22)[:, 1])

        if len(probs_list) != self.n_ensemble_models:
            raise RuntimeError(
                f"Ensemble shape mismatch: pipeline was built with "
                f"{self.n_ensemble_models} models but predict_proba "
                f"assembled {len(probs_list)}."
            )

        return np.stack(probs_list, axis=1) @ self.ensemble_weights

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        return (self.predict_proba(df) >= self.threshold).astype(int)

    def predict_single(self, age, trestbps, chol, thalach, oldpeak,
                       fbs, sex, cp, restecg, exang, slope):
        row = pd.DataFrame([{
            'age': age, 'trestbps': trestbps, 'chol': chol,
            'thalach': thalach, 'oldpeak': oldpeak, 'fbs': fbs,
            'sex': sex, 'cp': cp, 'restecg': restecg,
            'exang': exang, 'slope': slope,
        }])
        prob = float(self.predict_proba(row)[0])
        pred = int(prob >= self.threshold)
        if   prob >= 0.70:           label = "High risk"
        elif prob >= self.threshold: label = "Moderate risk"
        else:                        label = "Low risk"
        return prob, pred, label


# ================================================================
# PATH RESOLVER
# ================================================================

def _resolve_model_path() -> Path:
    env_path = os.getenv("HEART_MODEL_PATH")
    if env_path:
        return Path(env_path).resolve()
    return (
        Path(__file__).resolve().parent.parent
        / "xgboostweights"
        / "cardiotabnet_pipeline.pkl"
    )


# ================================================================
# LOADER
# ================================================================

def _register_cardiotabnet_module():
    import sys, types as _types
    if 'cardiotabnet_module' in sys.modules:
        return
    mod = _types.ModuleType('cardiotabnet_module')
    for cls in [CardioTabNetPipeline, AdaptiveClinicalFormer,
                ACFLayer, GroupSparseAttention, GatedFFN, PLEEmbedder]:
        setattr(mod, cls.__name__, cls)
    mod.add_enhanced_features = add_enhanced_features
    sys.modules['cardiotabnet_module'] = mod
    logger.info("  cardiotabnet_module registered in sys.modules")


def load_heart_model() -> CardioTabNetPipeline:
    global _pipeline
    if _pipeline is not None:
        return _pipeline

    _register_cardiotabnet_module()
    model_path = _resolve_model_path()

    if not model_path.exists():
        msg = (
            f"CardioTabNet pipeline not found at: {model_path}\n"
            "Place cardiotabnet_pipeline.pkl in backend/xgboostweights/ "
            "or set the HEART_MODEL_PATH environment variable."
        )
        logger.error(msg)
        raise FileNotFoundError(msg)

    logger.info(f"Loading CardioTabNet pipeline from: {model_path}")

    last_err = None
    for strategy, loader in [
        ("joblib",        lambda: joblib.load(str(model_path))),
        ("pickle",        lambda: __import__("pickle").load(
                              open(model_path, "rb"))),
        ("pickle_latin1", lambda: __import__("pickle").load(
                              open(model_path, "rb"), encoding="latin1")),
    ]:
        try:
            logger.info(f"  Trying strategy: {strategy}")
            _pipeline = loader()
            logger.info(f"  Loaded via {strategy}")
            break
        except Exception as e:
            last_err = e
            logger.warning(f"  Strategy {strategy} failed: {e}")

    if _pipeline is None:
        raise RuntimeError(
            f"Failed to load pipeline. Last error: {last_err}\n"
            f"Path: {model_path}"
        )

    if not hasattr(_pipeline, "predict_proba") or \
       not hasattr(_pipeline, "threshold"):
        raise RuntimeError(
            "Loaded object is not a CardioTabNetPipeline."
        )

    logger.info(
        f"  CardioTabNet ready | threshold={_pipeline.threshold:.3f} | "
        f"ensemble_models={_pipeline.n_ensemble_models}"
    )
    return _pipeline


# ================================================================
# INPUT VALIDATION
# ================================================================

def _validate_input(data: Dict[str, Any]) -> Dict[str, Any]:
    validated = {}
    numeric_feats  = ['age', 'trestbps', 'chol', 'thalach', 'oldpeak']
    binary_feats   = ['fbs']
    category_feats = ['sex', 'cp', 'restecg', 'exang', 'slope']

    for feat in numeric_feats:
        if feat not in data or data[feat] is None:
            raise ValueError(f"Missing required feature: {feat}")
        val = float(data[feat])
        lo, hi = VALID_RANGES[feat]
        if not (lo <= val <= hi):
            logger.warning(f"  {feat}={val} outside expected range [{lo}, {hi}]")
        validated[feat] = val

    for feat in binary_feats + category_feats:
        if feat not in data or data[feat] is None:
            raise ValueError(f"Missing required feature: {feat}")
        val = int(data[feat])
        if val not in VALID_RANGES[feat]:
            logger.warning(f"  {feat}={val} not in expected values {VALID_RANGES[feat]}")
        validated[feat] = val

    return validated


# ================================================================
# HELPERS
# ================================================================

def _risk_level(prob: float) -> str:
    if prob >= 0.70: return "Very High"
    if prob >= 0.50: return "High"
    if prob >= 0.35: return "Moderate"
    if prob >= 0.20: return "Low"
    return "Very Low"


def _recommendations(has_disease: bool, data: Dict[str, Any], prob: float) -> list:
    recs = []
    if has_disease or prob > 0.5:
        recs += [
            "🥼 Immediate consultation with a cardiologist is strongly recommended.",
            "💊 Discuss starting or adjusting cardiac medications with your doctor.",
            "🩺 Schedule comprehensive cardiac evaluation including ECG and echocardiogram.",
            "🚭 If you smoke, quitting is the single most important step you can take.",
        ]
        if data.get("trestbps", 0) > 140:
            recs.append("⚠️ High blood pressure detected — strict BP control is critical.")
        if data.get("chol", 0) > 240:
            recs.append("📊 Elevated cholesterol — discuss statin therapy with your physician.")
        if data.get("fbs", 0) == 1:
            recs.append("🩸 Elevated fasting blood sugar — diabetes management is crucial.")
        if data.get("oldpeak", 0) > 2.0:
            recs.append("📈 Significant ST depression — indicates potential myocardial ischemia.")
        if data.get("exang", 0) == 1:
            recs.append("⚡ Exercise-induced angina — avoid strenuous activity until cleared by cardiologist.")
    else:
        recs += [
            "✅ Low risk detected — continue heart-healthy lifestyle habits.",
            "🥗 Maintain a balanced diet rich in fruits, vegetables, and whole grains.",
            "🏃 Regular physical activity: aim for 150 minutes of moderate exercise weekly.",
            "🩺 Regular health checkups and monitoring of blood pressure and cholesterol.",
        ]
        if data.get("age", 0) > 55:
            recs.append("👴 Age-related risk — consider more frequent cardiac screening.")
        if data.get("trestbps", 0) > 120:
            recs.append("📊 Prehypertension detected — lifestyle modifications recommended.")
    recs.append(
        "⚠️ This is an AI-assisted screening tool. "
        "Always consult a healthcare professional."
    )
    return recs


def _diagnosis_text(has_disease: bool, prob: float) -> str:
    pct = prob * 100
    if has_disease:
        if prob >= 0.90:
            return (
                f"High probability ({pct:.1f}%) of coronary heart disease detected. "
                "Immediate medical evaluation is strongly recommended."
            )
        if prob >= 0.70:
            return (
                f"Moderate-high probability ({pct:.1f}%) of heart disease. "
                "Medical consultation advised for comprehensive cardiac evaluation."
            )
        return (
            f"Possible heart disease detected ({pct:.1f}% probability). "
            "Further diagnostic testing recommended."
        )
    else:
        no_pct = (1 - prob) * 100
        if prob <= 0.20:
            return (
                f"Low probability of heart disease ({no_pct:.1f}% confidence negative). "
                "Continue preventive cardiac care and regular monitoring."
            )
        return (
            f"Cardiac function appears normal ({no_pct:.1f}% confidence). "
            "Maintain heart-healthy lifestyle."
        )


# ================================================================
# MAIN ENTRY POINT
# ================================================================

def predict_heart_disease(input_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        logger.info("  CardioTabNet prediction starting")
        pipeline  = load_heart_model()
        validated = _validate_input(input_data)
        logger.info(f"  Input validated: {validated}")

        df   = pd.DataFrame([validated])[ALL_FEATS]
        prob = float(pipeline.predict_proba(df)[0])
        pred = int(pipeline.predict(df)[0])

        has_disease   = bool(pred == 1)
        prob_no_dis   = round((1.0 - prob) * 100, 2)
        prob_dis      = round(prob * 100, 2)
        confidence    = round(max(prob, 1.0 - prob) * 100, 2)
        risk          = _risk_level(prob)
        recs          = _recommendations(has_disease, validated, prob)
        diagnosis     = _diagnosis_text(has_disease, prob)
        disease_label = (
            "Heart Disease Detected" if has_disease
            else "No Heart Disease Detected"
        )

        logger.info(
            f"  Result: {disease_label} | prob={prob_dis}% | "
            f"threshold={pipeline.threshold:.3f}"
        )

        return {
            "success"               : True,
            "prediction"            : pred,
            "has_heart_disease"     : has_disease,
            "confidence"            : confidence,
            "probability_no_disease": prob_no_dis,
            "probability_disease"   : prob_dis,
            "risk_level"            : risk,
            "disease"               : disease_label,
            "diagnosis"             : diagnosis,
            "recommendations"       : recs,
            "threshold_used"        : float(pipeline.threshold),
        }

    except FileNotFoundError as e:
        logger.error(str(e))
        return {"success": False, "error": str(e), "prediction": None, "confidence": 0}
    except ValueError as e:
        logger.error(str(e))
        return {"success": False, "error": str(e), "prediction": None, "confidence": 0}
    except Exception as e:
        logger.error(f"Prediction error: {e}\n{traceback.format_exc()}")
        return {"success": False, "error": str(e), "prediction": None, "confidence": 0}