# MediCheck: Multi-Module Medical AI Screening Platform

**Graduation Project:** AI-Powered Medical Risk Assessment and Image-Based Screening Platform
**Repository:** https://github.com/nouran45/graduationmed
**Technology Stack:** FastAPI, Next.js, MongoDB Atlas, PyTorch, TensorFlow/Keras, scikit-learn
**Project Type:** Graduation thesis / medical AI decision-support platform

---

## Project Overview

MediCheck is a full-stack medical AI platform developed as a graduation project to support early screening and risk assessment across multiple clinical domains. The system integrates tabular clinical data, lifestyle-based screening inputs, X-ray images, and dermatology images into a unified web application.

The platform is designed as an **AI-assisted screening tool**, not as a replacement for physicians, radiologists, or clinical diagnosis. Each module provides a structured prediction, confidence score, clinical interpretation, and recommended next step where applicable.

**Components:**

* DenseNet121 attack detector
* SUNet sparse denoiser
* SUNet v3 dense denoiser
* ViT-Base/16 skin classifier

**Reported Recovery Results:**

* 1-pixel sparse attack recovery: 98.80%
* 2-pixel sparse attack recovery: 100%
* FGSM recovery: 99.67%
* PGD recovery: 98.83%

**Frontend Behavior:**
For clean images, the system may show confidence.
For sparse/dense adversarial routes, confidence may be hidden to avoid misleading interpretation after defensive preprocessing.

---

## Technology Stack

### Backend

* Python 3.11
* FastAPI
* Uvicorn
* MongoDB Atlas
* PyMongo
* JWT authentication
* Passlib / bcrypt
* PyTorch
* TensorFlow / Keras
* timm
* scikit-learn
* joblib
* NumPy / Pandas

### Frontend

* Next.js App Router
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Lucide React icons
* Fetch API for backend communication

### Database and Authentication

* MongoDB Atlas for users and prediction history
* JWT access tokens
* Hashed passwords
* Protected prediction endpoints
* Dashboard history retrieval

---

## Project Structure

```text
graduationmed/
├── backend/
│   ├── app.py
│   ├── models.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── utils/
│   │   ├── predict.py
│   │   ├── predict_diabetes.py
│   │   ├── predict_kidney.py
│   │   ├── predict_heart.py
│   │   ├── predict_fracture.py
│   │   ├── predict_skin_defense.py
│   │   └── normalize.py
│   ├── diabetes_model/
│   ├── kidney_phase6/
│   ├── fracture_stageE/
│   └── skin_defense/
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── login/
│   │   ├── signup/
│   │   ├── dashboard/
│   │   ├── diabetes-prediction/
│   │   ├── kidney-prediction/
│   │   ├── heart-assessment/
│   │   ├── x-ray/
│   │   ├── skin-checker/
│   │   └── symptom-checker/
│   ├── components/
│   │   ├── diabetes-risk-predictor.tsx
│   │   ├── kidney-disease-predictor.tsx
│   │   ├── heart-disease-predictor.tsx
│   │   ├── x-ray-predictor.tsx
│   │   └── skin-predictor.tsx
│   ├── lib/
│   └── package.json
│
├── README.md
└── .gitignore
```

---

## Backend Setup

### 1. Clone the Repository

```bash
git clone https://github.com/nouran45/graduationmed.git
cd graduationmed/backend
```

### 2. Create and Activate Virtual Environment

For Windows PowerShell:

```powershell
python -m venv venv
.\venv\Scripts\activate
```

For macOS/Linux:

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```



### 5. Run Backend

```bash
python -m uvicorn app:app --reload
```

Backend will run at:

```text
http://127.0.0.1:8000
```

Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

---

## Frontend Setup

### 1. Go to Frontend Folder

```bash
cd ../frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Frontend Environment

Create `.env.local` inside the `frontend/` folder.

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

### 4. Run Frontend

```bash
npm run dev
```

Frontend will run at:

```text
http://localhost:3000
```

---

## Model Summary

| Module        | Final Model                              | Main Dataset / Input                        | Main Thesis Result                                      |
| ------------- | ---------------------------------------- | ------------------------------------------- | ------------------------------------------------------- |
| Diabetes      | Transfer-NAMI                            | BRFSS 2016–2023                             | AUC around 0.805 on 2023 held-out cohort                |
| Kidney        | Phase 6 Focal FT-Transformer             | 2,059 clinical records                      | 100% recall, 91.0% AUROC                                |
| Heart         | ACF-Net                                  | IEEE merged heart dataset + external CVD    | 96.14% accuracy, 98.45% AUROC                           |
| Bone Fracture | Stage E EfficientNetB0 + Swin-T ensemble | 506-image held-out X-ray test set           | 99.01% accuracy, 0.9968 AUC                             |
| Skin Defense  | Phase F DenseNet121 + SUNet + ViT        | Dermatology images with adversarial attacks | 98.80–100% sparse recovery; 98.83–99.67% dense recovery |

---

## Medical Disclaimer

This platform is intended for educational and research purposes as part of a graduation project. It is an AI-assisted screening system and must not be used as a standalone diagnostic tool.

Predictions should always be interpreted by qualified healthcare professionals. Positive or uncertain predictions require clinical confirmation, laboratory testing, radiology review, or specialist assessment depending on the module.

---

## Known Limitations

* The models are research prototypes and require broader external validation.
* The kidney module prioritizes recall, which may increase false positives.
* The diabetes module has limited recall compared with ideal clinical screening targets.
* The X-ray model was evaluated on an internal held-out test set and still requires real-world radiology validation.
* The skin defense pipeline improves robustness against selected adversarial attacks but does not guarantee security against all attack types.
* The system depends on correct model assets being placed in the expected backend folders.

---

## Git Workflow for Team Updates

### Fetch and Pull Latest Main

```bash
git fetch origin
git switch main
git pull --ff-only origin main
```

### Create a Feature Branch

```bash
git switch -c feature/your-feature-name
```

### Commit Frontend or Backend Changes

```bash
git status
git add path/to/changed-file
git commit -m "Describe your change"
git push -u origin feature/your-feature-name
```

Then open a Pull Request on GitHub and merge into `main` after review.

---

## License

This repository is part of an academic graduation project. Add the final license according to the team/supervisor requirements.

---

## Contact

For project-related questions, contact the graduation project team or repository maintainers.

**Repository:** https://github.com/nouran45/graduationmed
