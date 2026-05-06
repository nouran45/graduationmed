# ShifAI: AI-Powered Healthcare Risk Assessment

**Team Name:** BioVision  
**Members:** Nouran Yasser Salama, Nour Atef Elhadidy, Sara Aiman zeitoun 
**Competition:** Appathon CSE-EJUST Challenge Summer 2025  
**Supervised by:** Dr. Rami Zweil, CSE Department

---

## Code Repository (Mandatory)
**GitHub:** https://github.com/nouran45/ai-contest-bioVision 

This repository contains the **full, complete, and functional source code** for the ShifAI application (backend + frontend + ML assets).

- **Content** 
- Detailed **setup, build, and run** instructions for both backend and frontend.  
- All required **dependencies and environment** steps.  
- A concise **features overview**.  
- A detailed **Generative AI Usage Log** with: task, tool used, prompt(s), response summary, and reflection on impact.  
- **License** information (MIT).

---

## Project Overview

ShifAI is a comprehensive, multi‑disease AI healthcare platform combining machine learning, medical imaging analysis, and clinician‑aligned decision support to enable early risk assessment for noncommunicable diseases (NCDs). The system integrates laboratory data, X‑ray imaging, and dermatological image analysis to provide interpretable, confidence‑based predictions for patients and healthcare professionals.

### Key Features
- **Multi‑Disease Prediction:** Diabetes, CKD, heart disease, anemia, and X‑ray fracture detection.  
- **Multi‑Modal Analysis:** Tabular lab data, medical X‑ray images, and dermatology photos.  
- **AI Symptom Chatbot:** Conversational assistant for symptom collection and preliminary triage.  
- **Clinician Collaboration:** Confidence‑based deferral to human expert (CoDoC‑inspired).  
- **Explainable AI:** Grad‑CAM heatmaps and confidence scores.  
- **Secure User Management:** JWT auth, hashed passwords, privacy‑conscious storage.  
- **Real‑Time Dashboard:** History tracking and results visualisation.  
- **Responsive UI:** Next.js + Tailwind (mobile‑friendly).

---

## Live Demo
- **Frontend (Vercel):** _add your Vercel URL here_  
- **Backend API:** _add your public FastAPI URL here_  

> For judges: demo credentials can be provided upon request.

---

## Technology Stack

### Backend
- **Framework:** FastAPI (Python 3.11)  
- **Database:** MongoDB Atlas  
- **Auth:** JWT (HS256), bcrypt hashing  
- **Deploy:** Docker, (AWS EC2/GCP VM), Uvicorn/Gunicorn  
- **ML:** XGBoost, scikit‑learn, TensorFlow/Keras, (optionally PyTorch)

### Frontend
- **Framework:** Next.js 14 (App Router)  
- **Styling:** Tailwind CSS + shadcn/ui, Lucide icons  
- **State:** React hooks, fetch wrappers  
- **Deploy:** Vercel

### Machine Learning
- **Tabular:** XGBoost/scikit‑learn (Diabetes, Heart, CKD, Anemia)  
- **X‑ray:** EfficientNet‑B0 CNN (`cnnweights/best_transfer_model_local.h5`)  
- **Dermatology:** ViT / EfficientNet variants (`vitweights/*`)  
- **Chatbot:** LLM‑based symptom assistant  
- **Augmentation:** Albumentations / tf.image  
- **Datasets:** HAM10000, ISIC, Kaggle derm sets, (optionally MIMIC‑CXR)

---

## Project Structure
```
ai-contest-bioVision/
├── backend/
│   ├── app.py                    # FastAPI entrypoint
│   ├── auth.py                   # JWT + password hashing
│   ├── models.py                 # Pydantic schemas
│   ├── requirements.txt          # Python deps
│   ├── utils/
│   │   ├── predict.py            # Skin disease inference
│   │   ├── predict_diabetes.py   # Diabetes inference
│   │   ├── predict_kidney.py     # CKD inference
│   │   ├── predict_heart.py      # Heart inference
│   │   ├── predict_anemia.py     # Anemia inference
│   │   ├── predict_fracture.py   # X‑ray fracture inference
│   │   ├── chatbot.py            # Symptom chatbot
│   │   └── normalize.py          # Preprocessing helpers
│   ├── vitweights/               # ViT weights
│   ├── cnnweights/               # CNN weights
│   └── xgboostweights/           # XGBoost models
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Landing
│   │   ├── layout.tsx            # Root layout
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── dashboard/            # History & cards
│   │   ├── diabetes-prediction/
│   │   ├── kidney-prediction/
│   │   ├── heart-assessment/
│   │   ├── anemia-prediction/
│   │   ├── x-ray/
│   │   ├── health-chat/
│   │   └── symptom-checker/
│   ├── components/
│   ├── lib/
│   └── package.json
│
├── README.md
└── .gitignore
```

---

## Setup & Installation

### Prerequisites
- **Python 3.11+**, **Node.js 18+**, **Git**
- MongoDB Atlas account (or local MongoDB)

### Backend Setup
```bash
git clone https://github.com/nouran45/ai-contest-bioVision.git
cd ai-contest-bioVision/backend

# Create & activate venv
# Windows (PowerShell)
py -3.11 -m venv .venv && .\.venv\Scripts\Activate.ps1
# macOS/Linux
python3.11 -m venv .venv && source .venv/bin/activate

pip install -r requirements.txt

# .env (create backend/.env)
# MONGO_URI=...
# SECRET_KEY=...
# (optional) CORS_ORIGINS='["http://localhost:3000"]'

uvicorn app:app --reload --host 0.0.0.0 --port 8000
# Backend on http://127.0.0.1:8000
```

#### Version Pinning Tip
If models were saved with `scikit-learn==1.2.2`, pin the same:
```
scikit-learn==1.2.2
xgboost==3.0.5
numpy==2.1.3
```

### Frontend Setup
```bash
cd ../frontend
pnpm install   # or npm/yarn
# .env.local
# NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
pnpm dev       # http://localhost:3000
```

### Quick Test
```powershell
# Login and call a protected route (Windows PowerShell)
$resp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/login" -Method POST -ContentType "application/json" -Body '{"email":"testuser@example.com","password":"testpassword123"}'
$token = $resp.access_token
Invoke-RestMethod -Uri "http://127.0.0.1:8000/users/me" -Headers @{Authorization="Bearer $token"}
```

---

## API Summary

### Auth
- **POST /register** – create user  
- **POST /login** – returns JWT access token  
- **GET /verify-token** – verify token  
- **GET /users/me** – current user

### Predictions
- **POST /predict** – Skin disease (multipart `file`)  
- **POST /predict-diabetes** – Diabetes (JSON)  
- **POST /predict-kidney** – CKD (JSON)  
- **POST /predict-heart** – Heart disease (JSON)  
- **POST /predict-anemia** – Anemia (JSON)  
- **POST /predict-fracture** – X‑ray fracture (multipart `file`)

### History
- **GET /history** – raw history  
- **GET /dashboard-history** – formatted cards

### Chatbot
- **POST /chat** – symptom assistant  
- **GET /chat-history** – conversation log

---

## Model Metrics (Illustrative)
| Disease | Model | Accuracy | Precision | Recall | ROC AUC |
|--------:|------:|---------:|----------:|-------:|--------:|
| Anemia | XGBoost | 1.00 | 1.00 | 1.00 | 1.00 |
| Heart | XGBoost | 0.966 | 0.97 | 0.97 | 0.998 |
| Diabetes | XGBoost | 0.97 | 0.97 | 0.82 | 0.98 |
| CKD | Ensemble | 0.964 | 0.96 | 0.96 | 0.96 |
| X‑ray | EffNet‑B0 | 0.99 | 0.99 | 1.00 | — |
| Skin (8‑class) | ViT | 0.9738 | 0.97 | 0.97 | — |



---

## Generative AI Usage Log (Crucial)

For each significant instance, we include **Task**, **Tool**, **Prompt(s)**, **AI Response (summary)**, and **Impact**.

### 1) Model Architecture Comparison & Feature Engineering
- **Tools:** ChatGPT‑4, Blackbox AI  
- **Prompt(s):**  
  - “Compare EfficientNet vs ViT for 8‑class skin disease with 224×224 inputs; prioritise interpretability and latency.”  
  - “Rank lab features for CKD risk; propose imputation + scaling.”  
- **AI Response (summary):** Recommended EffNet‑B0 baseline with Grad‑CAM; ViT as follow‑up; suggested robust scaling + targeted imputation.  
- **Impact:** Saved ~8–10h research; established reproducible baseline.

### 2) Hyperparameter Optimisation & Training Strategy
- **Tools:** Claude, ChatGPT‑4, Blackbox AI  
- **Prompt(s):**  
  - “Design CV + early stopping for imbalanced medical data; give parameter ranges for XGBoost.”  
- **AI Response (summary):** Class‑weights, early stopping 15–25 rounds, learning‑rate decay; k‑fold stratified CV.  
- **Impact:** +5–8% validation accuracy; ~12h saved.

### 3) Backend API Design & FastAPI Implementation
- **Tools:** Copilot, DeepSeek, Claude  
- **Prompt(s):**  
  - “Scaffold FastAPI endpoints with JWT auth and MongoDB; add error handling.”  
- **AI Response (summary):** Generated boilerplate; async patterns; refined JWT & CORS hardening.  
- **Impact:** ~40–45% backend time reduction; security issues avoided early.

### 4) Data Quality & Preprocessing
- **Tools:** Claude, ChatGPT‑4, DeepSeek  
- **Prompt(s):**  
  - “Imputation strategy for mixed clinical features; preserve clinical ranges.”  
- **AI Response (summary):** Domain‑aware imputers; robust scaling; unit harmonisation.  
- **Impact:** +6–8% reliability; ~5–6h saved.

### 5) Health Chatbot & Prompting
- **Tools:** Claude, ChatGPT‑4, DeepSeek  
- **Prompt(s):**  
  - “Draft safe triage prompts with red‑flag escalation.”  
- **AI Response (summary):** Structured questioning; disclaimers; escalation rules.  
- **Impact:** Safer triage; better engagement.

### 6) Heart & Anemia Integration
- **Tools:** Blackbox AI, ChatGPT‑4, Claude  
- **Prompt(s):**  
  - “Minimal input schema for heart risk; map to model features.”  
- **AI Response (summary):** Feature mapping templates; thresholds & caveats.  
- **Impact:** ~30% faster module integration.

### 7) Testing & QA
- **Tools:** ChatGPT‑4, Blackbox AI, Claude  
- **Prompt(s):**  
  - “Generate synthetic yet realistic lab panels; enumerate edge cases.”  
- **AI Response (summary):** Test matrices; extreme‑value safety tests.  
- **Impact:** Hidden failure modes caught pre‑deploy.

### 8) Security & Compliance
- **Tools:** Claude, ChatGPT‑4, DeepSeek  
- **Prompt(s):**  
  - “HIPAA/GDPR checklist for FastAPI + MongoDB + JWT; minimal implementation.”  
- **AI Response (summary):** Threat model, audit logging, secure secrets, RBAC.  
- **Impact:** Regulatory risks mitigated.

### 9) Documentation & UX Copy
- **Tools:** Claude, ChatGPT‑4, Blackbox AI  
- **Prompt(s):**  
  - “Write patient‑facing explanation for confidence scores and next steps.”  
- **AI Response (summary):** Clear copy; consistent terminology.  
- **Impact:** Faster onboarding; fewer support questions.

### 10) Debugging Integration (Label/Prob Inversion)
- **Tools:** DeepSeek, Claude, Blackbox AI  
- **Prompt(s):**  
  - “Trace label mapping from training to UI; locate inversion source.”  
- **AI Response (summary):** Diff training class order vs UI indices; patch mapping.  
- **Impact:** Fixed critical correctness bug; prevented recurrence.

### 11) Performance Optimisation
- **Tools:** DeepSeek, Blackbox AI, ChatGPT‑4  
- **Prompt(s):**  
  - “Reduce inference latency; advise caching/quantisation.”  
- **AI Response (summary):** Async loading, model cache, quantisation, batching.  
- **Impact:** ~60–70% latency reduction; scalable concurrency.

---

## Challenges & Solutions
1. **Label Consistency:** Embed class metadata in model; validate at load.  
2. **Latency under Load:** Async inference + caching + load balancing.  
3. **Class Imbalance:** SMOTE, class‑weighted loss, stratified CV.  
4. **Version Conflicts:** Docker + pinned deps, or re‑export models.  
5. **Overfitting (Images):** Augmentations (MixUp/CutMix), regularisation, ensembles.

---

## Compliance & Security
- JWT (120‑min expiry), bcrypt hashing.  
- HTTPS/TLS; encryption at rest where applicable.  
- GDPR/HIPAA‑aligned logging & retention.  
- RBAC with least privilege; MongoDB Atlas security best practices.  
- Dockerised deploy with minimal attack surface.

---

## Future Enhancements
- Mobile app, offline fallbacks.  
- Wearable integration & streaming vitals.  
- Multi‑language & voice UI.  
- Federated learning for privacy.  
- Clinician XAI dashboard.  
- EHR/EMR integration.

---

## License
This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.



---

## Contact
**BioVision Team**  
Nouran Yasser Salama • Nour Atef Elhadidy • Sara Aiman Zeitoun  
**Supervisor:** Dr. Rami Zweil, CSE, EJUST

**Last Updated:** January 2025 • **Version:** 1.0.0
