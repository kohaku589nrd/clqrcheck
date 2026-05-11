import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from ..database import get_db
from ..models import Equipo, Usuario, Ubicacion, SesionActiva, HistorialUso
from ..schemas import ScanResult, SesionOut, EquipoOut, UsuarioOut, UbicacionOut

router = APIRouter(prefix="/scanner", tags=["scanner"])


def _get_o_crear_sesion(db: Session) -> SesionActiva:
    sesion = db.query(SesionActiva).filter(SesionActiva.id == 1).first()
    if not sesion:
        sesion = SesionActiva(id=1)
        db.add(sesion)
        db.commit()
        db.refresh(sesion)
    return sesion


def _sesion_out(sesion: SesionActiva) -> SesionOut:
    return SesionOut(
        equipo=EquipoOut.model_validate(sesion.equipo) if sesion.equipo else None,
        usuario=UsuarioOut.model_validate(sesion.usuario) if sesion.usuario else None,
        ubicacion=UbicacionOut.model_validate(sesion.ubicacion) if sesion.ubicacion else None,
        inicio=sesion.inicio,
    )


def _cerrar_sesion(sesion: SesionActiva, db: Session):
    if sesion.equipo_id:
        db.add(HistorialUso(
            equipo_id=sesion.equipo_id,
            usuario_id=sesion.usuario_id,
            ubicacion_id=sesion.ubicacion_id,
            fecha_inicio=sesion.inicio or datetime.now(timezone.utc),
            fecha_fin=datetime.now(timezone.utc),
        ))
    sesion.equipo_id = None
    sesion.usuario_id = None
    sesion.ubicacion_id = None
    sesion.inicio = None
    db.commit()


@router.get("/estado", response_model=SesionOut)
def obtener_estado(db: Session = Depends(get_db)):
    sesion = _get_o_crear_sesion(db)
    db.refresh(sesion)
    return _sesion_out(sesion)


@router.post("/scan", response_model=ScanResult)
def procesar_scan(payload: dict, db: Session = Depends(get_db)):
    raw = payload.get("data", "")
    try:
        data = json.loads(raw) if isinstance(raw, str) else raw
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(400, "QR inválido")

    tipo = data.get("type")
    sesion = _get_o_crear_sesion(db)
    db.refresh(sesion)

    # QR maestro: cierra la sesión activa
    if tipo == "master":
        if not sesion.equipo_id:
            return ScanResult(accion="ignorado", mensaje="No hay sesión activa", sesion=_sesion_out(sesion))
        _cerrar_sesion(sesion, db)
        db.refresh(sesion)
        return ScanResult(accion="sesion_cerrada", mensaje="Sesión finalizada y guardada en historial", sesion=_sesion_out(sesion))

    # QR de equipo
    if tipo == "equipment":
        codigo = data.get("Codigo")
        eq = db.query(Equipo).filter(Equipo.codigo == codigo).first()
        if not eq:
            raise HTTPException(404, f"Equipo con código {codigo} no registrado")
        if sesion.equipo_id:
            _cerrar_sesion(sesion, db)
        sesion.equipo_id = eq.id
        sesion.usuario_id = None
        sesion.ubicacion_id = None
        sesion.inicio = datetime.now(timezone.utc)
        db.commit()
        db.refresh(sesion)
        return ScanResult(accion="equipo_activo", mensaje=f"Equipo '{eq.nombre}' activado", sesion=_sesion_out(sesion))

    # QR de usuario
    if tipo == "user":
        if not sesion.equipo_id:
            return ScanResult(accion="error", mensaje="Escanea primero un equipo", sesion=_sesion_out(sesion))
        codigo = data.get("Codigo")
        u = db.query(Usuario).filter(Usuario.codigo == codigo).first()
        if not u:
            raise HTTPException(404, f"Usuario con código {codigo} no registrado")
        sesion.usuario_id = u.id
        db.commit()
        db.refresh(sesion)
        return ScanResult(accion="usuario_asignado", mensaje=f"Usuario '{u.nombre}' asignado", sesion=_sesion_out(sesion))

    # QR de ubicación
    if tipo == "location":
        if not sesion.equipo_id:
            return ScanResult(accion="error", mensaje="Escanea primero un equipo", sesion=_sesion_out(sesion))
        if not sesion.usuario_id:
            return ScanResult(accion="error", mensaje="Escanea primero un usuario", sesion=_sesion_out(sesion))
        codigo = data.get("Codigo")
        ub = db.query(Ubicacion).filter(Ubicacion.codigo == codigo).first()
        if not ub:
            raise HTTPException(404, f"Ubicación con código {codigo} no registrada")
        sesion.ubicacion_id = ub.id
        db.commit()
        db.refresh(sesion)
        return ScanResult(accion="ubicacion_asignada", mensaje=f"Instalación '{ub.instalacion}' asignada", sesion=_sesion_out(sesion))

    raise HTTPException(400, f"Tipo de QR desconocido: {tipo}")


@router.post("/reset")
def reset_manual(db: Session = Depends(get_db)):
    sesion = _get_o_crear_sesion(db)
    _cerrar_sesion(sesion, db)
    return {"ok": True, "mensaje": "Sesión reiniciada"}
