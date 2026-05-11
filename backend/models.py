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


class SesionActiva(Base):
    """Fila única (id=1) que representa el estado actual del scanner."""
    __tablename__ = "sesion_activa"
    id = Column(Integer, primary_key=True, default=1)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    ubicacion_id = Column(Integer, ForeignKey("ubicaciones.id"), nullable=True)
    inicio = Column(DateTime, nullable=True)

    equipo = relationship("Equipo")
    usuario = relationship("Usuario")
    ubicacion = relationship("Ubicacion")


class HistorialUso(Base):
    __tablename__ = "historial_uso"
    id = Column(Integer, primary_key=True, index=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    ubicacion_id = Column(Integer, ForeignKey("ubicaciones.id"), nullable=True)
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=False)

    equipo = relationship("Equipo")
    usuario = relationship("Usuario")
    ubicacion = relationship("Ubicacion")
