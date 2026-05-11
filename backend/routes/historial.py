from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import HistorialUso
from ..schemas import HistorialOut

router = APIRouter(prefix="/historial", tags=["historial"])


@router.get("/", response_model=List[HistorialOut])
def listar_historial(db: Session = Depends(get_db)):
    return db.query(HistorialUso).order_by(HistorialUso.fecha_fin.desc()).limit(200).all()
