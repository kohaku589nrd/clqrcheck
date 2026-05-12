from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Ubicacion
from ..schemas import UbicacionCreate, UbicacionOut
from ..qr_utils import generate_qr_bytes, build_ubicacion_qr_data, generate_master_qr_bytes

router = APIRouter(prefix="/ubicaciones", tags=["ubicaciones"])


@router.get("/", response_model=List[UbicacionOut])
def listar_ubicaciones(db: Session = Depends(get_db)):
    return db.query(Ubicacion).all()


@router.post("/", response_model=UbicacionOut)
def crear_ubicacion(ubicacion: UbicacionCreate, db: Session = Depends(get_db)):
    if db.query(Ubicacion).filter(Ubicacion.codigo == ubicacion.codigo).first():
        raise HTTPException(400, "Código ya existe")
    db_u = Ubicacion(**ubicacion.model_dump())
    db.add(db_u)
    db.commit()
    db.refresh(db_u)
    return db_u


@router.put("/{ubicacion_id}", response_model=UbicacionOut)
def actualizar_ubicacion(ubicacion_id: int, datos: UbicacionCreate, db: Session = Depends(get_db)):
    u = db.query(Ubicacion).filter(Ubicacion.id == ubicacion_id).first()
    if not u:
        raise HTTPException(404, "Ubicación no encontrada")
    for k, v in datos.model_dump().items():
        setattr(u, k, v)
    db.commit()
    db.refresh(u)
    return u


@router.delete("/{ubicacion_id}")
def eliminar_ubicacion(ubicacion_id: int, db: Session = Depends(get_db)):
    u = db.query(Ubicacion).filter(Ubicacion.id == ubicacion_id).first()
    if not u:
        raise HTTPException(404, "Ubicación no encontrada")
    db.delete(u)
    db.commit()
    return {"ok": True}


@router.get("/master/qr")
def qr_master():
    return Response(content=generate_master_qr_bytes(), media_type="image/png")


@router.get("/{ubicacion_id}/qr")
def qr_ubicacion(ubicacion_id: int, db: Session = Depends(get_db)):
    u = db.query(Ubicacion).filter(Ubicacion.id == ubicacion_id).first()
    if not u:
        raise HTTPException(404, "Ubicación no encontrada")
    return Response(content=generate_qr_bytes(build_ubicacion_qr_data(u)), media_type="image/png")
