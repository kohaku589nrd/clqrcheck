from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base


class Equipo(Base):
    __tablename__ = "equipos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    AMD = Column(String)
    utilidad = Column(String)
    fecha_cal = Column(String)  # formato DD_MM_YYYY
    codigo = Column(String, unique=True, nullable=False, index=True)
    tipo_det = Column(String)
    foto_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Ubicacion(Base):
    __tablename__ = "ubicaciones"
    id = Column(Integer, primary_key=True, index=True)
    instalacion = Column(String, nullable=False)
    codigo = Column(String, unique=True, nullable=False, index=True)


class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    codigo = Column(String, unique=True, nullable=False, index=True)


class HistorialUso(Base):
    __tablename__ = "historial_uso"
    id = Column(Integer, primary_key=True, index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    ubicacion_id = Column(Integer, ForeignKey("ubicaciones.id"), nullable=True)
    ubicacion_custom = Column(String, nullable=True)
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=True)  # None = sesión activa

    equipo = relationship("Equipo")
    usuario = relationship("Usuario")
    ubicacion = relationship("Ubicacion")


class SesionActiva(Base):
    """Fila única (id=1) que representa el estado actual del scanner."""
    __tablename__ = "sesion_activa"
    id = Column(Integer, primary_key=True, default=1)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    ubicacion_id = Column(Integer, ForeignKey("ubicaciones.id"), nullable=True)
    inicio = Column(DateTime, nullable=True)
    completado_at = Column(DateTime, nullable=True)
    historial_id = Column(Integer, ForeignKey("historial_uso.id"), nullable=True)
    es_retoma = Column(Integer, nullable=False, default=0)  # 0=False, 1=True (SQLite bool)
    ubicacion_custom = Column(String, nullable=True)

    equipo = relationship("Equipo", foreign_keys=[equipo_id])
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    ubicacion = relationship("Ubicacion", foreign_keys=[ubicacion_id])
