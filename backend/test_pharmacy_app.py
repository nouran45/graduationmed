from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.pharmacies import router as pharmacy_router


app = FastAPI(
    title="MediCheck Pharmacy Network Test API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(pharmacy_router)


@app.get("/")
def root():
    return {
        "message": "Person 2 Pharmacy Network test API is running"
    }