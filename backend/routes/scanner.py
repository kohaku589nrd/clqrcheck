import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from ..database import get_db
from ..models import Equipo, Usuario, Ubicacion, SesionActiva, HistorialUso
from ..schemas import ScanResult, SesionOut, EquipoOut, UsuarioOut, UbicacionOut

router = APIRouter(prefix="/scanner", tags=["scanner"])

TIMEOUT_SESION_COMPLETA = 60  # segundos hasta standby tras completar los 3 pasos


def _now():
    return datetime.now(timezone.utc)


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
        ubicacion_custom=sesion.ubicacion_custom,
        inicio=sesion.inicio,
        completado_at=sesion.completado_at,
        es_retoma=bool(sesion.es_retoma),
    )


def _historial_activo(sesion: SesionActiva, db: Session):
    if not sesion.historial_id:
        return None
    return db.query(HistorialUso).filter(HistorialUso.id == sesion.historial_id).first()


def _limpiar_sesion_campos(sesion: SesionActiva):
    """Limpia todos los campos de estado sin tocar historial_id."""
    sesion.equipo_id = None
    sesion.usuario_id = None
    sesion.ubicacion_id = None
    sesion.ubicacion_custom = None
    sesion.inicio = None
    sesion.completado_at = None
    sesion.es_retoma = 0


def _timeout_sesion(sesion: SesionActiva, db: Session):
    """
    Standby / timeout: limpia estado visible del scanner.
    Si hay historial con usuario asignado → queda abierto acumulando tiempo.
    Si el equipo fue escaneado pero sin usuario → no hay historial, nada que preservar.
    """
    _limpiar_sesion_campos(sesion)
    # historial_id se preserva si existe
    db.commit()


def _detach_sesion(sesion: SesionActiva, db: Session):
    """
    Desvincula la sesión actual para dar paso a un nuevo equipo.
    Si existe historial (usuario fue asignado) → se mantiene abierto.
    Si no (solo equipo escaneado) → no hay nada que guardar.
    """
    _limpiar_sesion_campos(sesion)
    sesion.historial_id = None
    db.commit()


def _cerrar_sesion(sesion: SesionActiva, db: Session):
    """Cierre vía QR maestro: registra fecha_fin y limpia todo."""
    hist = _historial_activo(sesion, db)
    if hist:
        hist.fecha_fin = _now()
    _limpiar_sesion_campos(sesion)
    sesion.historial_id = None
    db.commit()


def _check_timeout(sesion: SesionActiva, db: Session) -> bool:
    if not sesion.completado_at:
        return False
    ct = sesion.completado_at
    if ct.tzinfo is None:
        ct = ct.replace(tzinfo=timezone.utc)
    if (datetime.now(timezone.utc) - ct).total_seconds() > TIMEOUT_SESION_COMPLETA:
        _timeout_sesion(sesion, db)
        db.refresh(sesion)
        return True
    return False


@router.get("/estado", response_model=SesionOut)
def obtener_estado(db: Session = Depends(get_db)):
    sesion = _get_o_crear_sesion(db)
    db.refresh(sesion)
    _check_timeout(sesion, db)
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
    _check_timeout(sesion, db)

    # ── QR maestro ───────────────────────────────────────────────────────────
    if tipo == "master":
        hist = _historial_activo(sesion, db)
        if not hist:
            return ScanResult(accion="ignorado", mensaje="No hay sesión activa", sesion=_sesion_out(sesion))
        _cerrar_sesion(sesion, db)
        db.refresh(sesion)
        return ScanResult(accion="sesion_cerrada", mensaje="Sesión finalizada y guardada en historial", sesion=_sesion_out(sesion))

    # ── QR de equipo ──────────────────────────────────────────────────────────
    if tipo == "equipment":
        codigo = data.get("Codigo")
        eq = db.query(Equipo).filter(Equipo.codigo == codigo).first()
        if not eq:
            raise HTTPException(404, f"Equipo con código {codigo} no registrado")

        existing = (
            db.query(HistorialUso)
            .filter(HistorialUso.equipo_id == eq.id, HistorialUso.fecha_fin.is_(None))
            .first()
        )

        if existing:
            # RETOMA: desvincular sesión actual y retomar el registro existente
            if sesion.historial_id and sesion.historial_id != existing.id:
                _detach_sesion(sesion, db)

            sesion.equipo_id = eq.id
            sesion.usuario_id = existing.usuario_id
            sesion.ubicacion_id = existing.ubicacion_id
            sesion.ubicacion_custom = existing.ubicacion_custom
            sesion.inicio = existing.fecha_inicio
            sesion.completado_at = None
            sesion.historial_id = existing.id
            sesion.es_retoma = 1
            db.commit()
            db.refresh(sesion)
            return ScanResult(
                accion="retoma",
                mensaje="Sesión activa retomada — escanea QR maestro para cerrar",
                sesion=_sesion_out(sesion),
            )

        # NUEVA sesión: solo marca equipo activo, el historial se crea al asignar usuario
        if sesion.equipo_id or sesion.historial_id:
            _detach_sesion(sesion, db)

        sesion.equipo_id = eq.id
        sesion.usuario_id = None
        sesion.ubicacion_id = None
        sesion.ubicacion_custom = None
        sesion.inicio = _now()
        sesion.completado_at = None
        sesion.historial_id = None  # se crea al escanear usuario
        sesion.es_retoma = 0
        db.commit()
        db.refresh(sesion)
        return ScanResult(accion="equipo_activo", mensaje=f"Equipo '{eq.nombre}' activado", sesion=_sesion_out(sesion))

    # ── QR de usuario ─────────────────────────────────────────────────────────
    if tipo == "user":
        if not sesion.equipo_id:
            return ScanResult(accion="error", mensaje="Escanea primero un equipo", sesion=_sesion_out(sesion))
        if sesion.es_retoma:
            return ScanResult(accion="error", mensaje="Sesión en retoma — solo QR maestro para cerrar", sesion=_sesion_out(sesion))

        codigo = data.get("Codigo")
        u = db.query(Usuario).filter(Usuario.codigo == codigo).first()
        if not u:
            raise HTTPException(404, f"Usuario con código {codigo} no registrado")

        if sesion.historial_id:
            # Ya existe historial (usuario cambiado en misma sesión): actualizar
            hist = _historial_activo(sesion, db)
            if hist:
                hist.usuario_id = u.id
        else:
            # Primera asignación de usuario: crear el historial ahora
            nuevo_hist = HistorialUso(
                equipo_id=sesion.equipo_id,
                usuario_id=u.id,
                fecha_inicio=sesion.inicio or _now(),
            )
            db.add(nuevo_hist)
            db.flush()
            sesion.historial_id = nuevo_hist.id

        sesion.usuario_id = u.id
        db.commit()
        db.refresh(sesion)
        return ScanResult(accion="usuario_asignado", mensaje=f"Usuario '{u.nombre}' asignado", sesion=_sesion_out(sesion))

    # ── QR de ubicación ───────────────────────────────────────────────────────
    if tipo == "location":
        if not sesion.equipo_id:
            return ScanResult(accion="error", mensaje="Escanea primero un equipo", sesion=_sesion_out(sesion))
        if sesion.es_retoma:
            return ScanResult(accion="error", mensaje="Sesión en retoma — solo QR maestro para cerrar", sesion=_sesion_out(sesion))
        if not sesion.usuario_id:
            return ScanResult(accion="error", mensaje="Escanea primero un usuario", sesion=_sesion_out(sesion))

        codigo = data.get("Codigo")
        ub = db.query(Ubicacion).filter(Ubicacion.codigo == codigo).first()
        if not ub:
            raise HTTPException(404, f"Ubicación con código {codigo} no registrada")

        sesion.ubicacion_id = ub.id
        sesion.ubicacion_custom = None
        sesion.completado_at = _now()
        hist = _historial_activo(sesion, db)
        if hist:
            hist.ubicacion_id = ub.id
            hist.ubicacion_custom = None
        db.commit()
        db.refresh(sesion)
        return ScanResult(accion="ubicacion_asignada", mensaje=f"Instalación '{ub.instalacion}' asignada", sesion=_sesion_out(sesion))

    # ── Instalación personalizada ─────────────────────────────────────────────
    if tipo == "location_custom":
        if not sesion.equipo_id:
            return ScanResult(accion="error", mensaje="Escanea primero un equipo", sesion=_sesion_out(sesion))
        if sesion.es_retoma:
            return ScanResult(accion="error", mensaje="Sesión en retoma — solo QR maestro para cerrar", sesion=_sesion_out(sesion))
        if not sesion.usuario_id:
            return ScanResult(accion="error", mensaje="Escanea primero un usuario", sesion=_sesion_out(sesion))

        texto = (data.get("texto") or "").strip()
        if not texto:
            return ScanResult(accion="error", mensaje="El nombre de instalación no puede estar vacío", sesion=_sesion_out(sesion))

        sesion.ubicacion_id = None
        sesion.ubicacion_custom = texto
        sesion.completado_at = _now()
        hist = _historial_activo(sesion, db)
        if hist:
            hist.ubicacion_id = None
            hist.ubicacion_custom = texto
        db.commit()
        db.refresh(sesion)
        return ScanResult(accion="ubicacion_asignada", mensaje=f"Instalación '{texto}' asignada", sesion=_sesion_out(sesion))

    raise HTTPException(400, f"Tipo de QR desconocido: {tipo}")


@router.post("/reset")
def reset_manual(db: Session = Depends(get_db)):
    """Vuelve el scanner a standby. El historial abierto queda activo."""
    sesion = _get_o_crear_sesion(db)
    _timeout_sesion(sesion, db)
    return {"ok": True, "mensaje": "Scanner en standby"}
