from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class EquipoBase(BaseModel):
    nombre: str
    AMD: Optional[str] = None
    utilidad: Optional[str] = None
    fecha_cal: Optional[str] = None
    codigo: str
    tipo_det: Optional[str] = None


class EquipoCreate(EquipoBase):
    pass


class EquipoOut(EquipoBase):
    id: int
    foto_path: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UbicacionBase(BaseModel):
    instalacion: str
    codigo: str


class UbicacionCreate(UbicacionBase):
    pass


class UbicacionOut(UbicacionBase):
    id: int

    model_config = {"from_attributes": True}


class UsuarioBase(BaseModel):
    nombre: str
    codigo: str


class UsuarioCreate(UsuarioBase):
    pass


class UsuarioOut(UsuarioBase):
    id: int

    model_config = {"from_attributes": True}


class SesionOut(BaseModel):
    equipo: Optional[EquipoOut] = None
    usuario: Optional[UsuarioOut] = None
    ubicacion: Optional[UbicacionOut] = None
    inicio: Optional[datetime] = None


class ScanResult(BaseModel):
    accion: str
    mensaje: str
    sesion: SesionOut


class HistorialOut(BaseModel):
    id: int
    equipo: EquipoOut
    usuario: Optional[UsuarioOut] = None
    ubicacion: Optional[UbicacionOut] = None
    fecha_inicio: datetime
    fecha_fin: datetime

    model_config = {"from_attributes": True}
