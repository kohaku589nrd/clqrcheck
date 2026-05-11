import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import engine
from .models import Base
from .routes import equipos, usuarios, ubicaciones, scanner, historial

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Inventory API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(equipos.router)
app.include_router(usuarios.router)
app.include_router(ubicaciones.router)
app.include_router(scanner.router)
app.include_router(historial.router)

FOTOS_DIR = os.path.join(os.path.dirname(__file__), "fotos")
os.makedirs(FOTOS_DIR, exist_ok=True)
app.mount("/fotos", StaticFiles(directory=FOTOS_DIR), name="fotos")


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}
