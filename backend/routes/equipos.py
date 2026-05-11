import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response, FileResponse
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Equipo
from ..schemas import EquipoCreate, EquipoOut
from ..qr_utils import generate_qr_bytes, build_equipo_qr_data

router = APIRouter(prefix="/equipos", tags=["equipos"])

FOTOS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fotos")


@router.get("/", response_model=List[EquipoOut])
def listar_equipos(db: Session = Depends(get_db)):
    return db.query(Equipo).all()


@router.post("/", response_model=EquipoOut)
def crear_equipo(equipo: EquipoCreate, db: Session = Depends(get_db)):
    if db.query(Equipo).filter(Equipo.codigo == equipo.codigo).first():
        raise HTTPException(400, "Código ya existe")
    db_equipo = Equipo(**equipo.model_dump())
    db.add(db_equipo)
    db.commit()
    db.refresh(db_equipo)
    return db_equipo


@router.get("/{equipo_id}", response_model=EquipoOut)
def obtener_equipo(equipo_id: int, db: Session = Depends(get_db)):
    eq = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not eq:
        raise HTTPException(404, "Equipo no encontrado")
    return eq


@router.put("/{equipo_id}", response_model=EquipoOut)
def actualizar_equipo(equipo_id: int, datos: EquipoCreate, db: Session = Depends(get_db)):
    eq = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not eq:
        raise HTTPException(404, "Equipo no encontrado")
    for k, v in datos.model_dump().items():
        setattr(eq, k, v)
    db.commit()
    db.refresh(eq)
    return eq


@router.delete("/{equipo_id}")
def eliminar_equipo(equipo_id: int, db: Session = Depends(get_db)):
    eq = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not eq:
        raise HTTPException(404, "Equipo no encontrado")
    db.delete(eq)
    db.commit()
    return {"ok": True}


@router.post("/{equipo_id}/foto")
def subir_foto(equipo_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    eq = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not eq:
        raise HTTPException(404, "Equipo no encontrado")
    ext = os.path.splitext(file.filename)[1]
    filename = f"equipo_{equipo_id}{ext}"
    filepath = os.path.join(FOTOS_DIR, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    eq.foto_path = filename
    db.commit()
    return {"foto_path": filename}


@router.get("/{equipo_id}/foto/imagen")
def obtener_foto(equipo_id: int, db: Session = Depends(get_db)):
    eq = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not eq or not eq.foto_path:
        raise HTTPException(404, "Foto no encontrada")
    filepath = os.path.join(FOTOS_DIR, eq.foto_path)
    if not os.path.exists(filepath):
        raise HTTPException(404, "Archivo no encontrado")
    return FileResponse(filepath)


@router.get("/{equipo_id}/qr")
def qr_equipo(equipo_id: int, db: Session = Depends(get_db)):
    eq = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not eq:
        raise HTTPException(404, "Equipo no encontrado")
    data = build_equipo_qr_data(eq)
    return Response(content=generate_qr_bytes(data), media_type="image/png")
