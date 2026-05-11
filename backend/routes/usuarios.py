from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Usuario
from ..schemas import UsuarioCreate, UsuarioOut
from ..qr_utils import generate_qr_bytes, build_usuario_qr_data

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.get("/", response_model=List[UsuarioOut])
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(Usuario).all()


@router.post("/", response_model=UsuarioOut)
def crear_usuario(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.codigo == usuario.codigo).first():
        raise HTTPException(400, "Código ya existe")
    db_u = Usuario(**usuario.model_dump())
    db.add(db_u)
    db.commit()
    db.refresh(db_u)
    return db_u


@router.put("/{usuario_id}", response_model=UsuarioOut)
def actualizar_usuario(usuario_id: int, datos: UsuarioCreate, db: Session = Depends(get_db)):
    u = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    for k, v in datos.model_dump().items():
        setattr(u, k, v)
    db.commit()
    db.refresh(u)
    return u


@router.delete("/{usuario_id}")
def eliminar_usuario(usuario_id: int, db: Session = Depends(get_db)):
    u = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    db.delete(u)
    db.commit()
    return {"ok": True}


@router.get("/{usuario_id}/qr")
def qr_usuario(usuario_id: int, db: Session = Depends(get_db)):
    u = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    return Response(content=generate_qr_bytes(build_usuario_qr_data(u)), media_type="image/png")
