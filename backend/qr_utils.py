import qrcode
import json
from io import BytesIO


def generate_qr_bytes(data: dict) -> bytes:
    img = qrcode.make(json.dumps(data))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def build_equipo_qr_data(equipo) -> dict:
    return {
        "type": "equipment",
        "nombre": equipo.nombre,
        "AMD": equipo.AMD,
        "Utilidad": equipo.utilidad,
        "Fecha_Cal": equipo.fecha_cal,
        "Codigo": equipo.codigo,
        "Tipo_det": equipo.tipo_det,
    }


def build_ubicacion_qr_data(ubicacion) -> dict:
    return {
        "type": "location",
        "Instalacion": ubicacion.instalacion,
        "Codigo": ubicacion.codigo,
    }


def build_usuario_qr_data(usuario) -> dict:
    return {
        "type": "user",
        "nombre": usuario.nombre,
        "Codigo": usuario.codigo,
    }


MASTER_QR_DATA = {"type": "master"}


def generate_master_qr_bytes() -> bytes:
    return generate_qr_bytes(MASTER_QR_DATA)
