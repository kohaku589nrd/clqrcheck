# Sistema de Inventario de Equipos de Radiación

Sistema de inventario en tiempo real para equipos de medición de radiación, basado en códigos QR y lectura por webcam.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + TailwindCSS |
| Backend | FastAPI (Python) |
| Base de datos | SQLite + SQLAlchemy |
| Scanner QR | html5-qrcode (cámara del navegador) |
| Generación QR | qrcode (Python) |

---

## Estructura del proyecto

```
Inventory/
├── backend/
│   ├── main.py              # App FastAPI, CORS, rutas
│   ├── database.py          # Conexión SQLite
│   ├── models.py            # Tablas: equipos, usuarios, ubicaciones, sesion_activa, historial_uso
│   ├── schemas.py           # Validación con Pydantic
│   ├── qr_utils.py          # Generación de códigos QR (basado en LiveInventory.py)
│   ├── fotos/               # Imágenes de equipos subidas por el usuario
│   └── routes/
│       ├── equipos.py       # CRUD equipos + subir foto + generar QR
│       ├── usuarios.py      # CRUD usuarios + generar QR
│       ├── ubicaciones.py   # CRUD instalaciones + QR maestro
│       ├── scanner.py       # Máquina de estados del scanner
│       └── historial.py     # Historial de uso
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Scanner.jsx       # Página principal: cámara + estado sesión
│       │   ├── Equipos.jsx       # Gestión de equipos
│       │   ├── Historial.jsx     # Historial de uso
│       │   └── Configuracion.jsx # Usuarios, instalaciones, QR maestro
│       ├── components/
│       │   ├── QRReader.jsx      # Componente de cámara + decodificación QR
│       │   └── EstadoSesion.jsx  # Panel lateral con estado actual
│       └── api.js                # Cliente HTTP hacia el backend
├── LiveInventory.py         # Script original (generación manual de QR)
├── start_backend.bat        # Arranca el backend
├── start_frontend.bat       # Arranca el frontend
└── inventory.db             # Base de datos SQLite (se crea automáticamente)
```

---

## Requisitos

- Python 3.10+
- Node.js 18+ (LTS)

### Dependencias Python

```bash
pip install fastapi uvicorn sqlalchemy pydantic qrcode[pil] opencv-python pyzbar python-multipart pillow
```

### Dependencias Node

```bash
cd frontend
npm install
```

---

## Cómo iniciar

Abrir **dos terminales** (o doble click en los `.bat`):

**Terminal 1 — Backend:**
```bash
# Desde la carpeta raíz Inventory/
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Luego abrir el navegador en `http://localhost:5173`

> La documentación interactiva de la API queda disponible en `http://localhost:8000/docs`

---

## Flujo de uso

El sistema funciona como una máquina de estados controlada por el scanner:

```
[Escanear equipo] → [Escanear usuario] → [Escanear instalación] → [Escanear QR Maestro]
                                                                          ↓
                                                               Guarda en historial
```

1. **Escanear QR de equipo** — el equipo queda activo en pantalla. Se muestra nombre, estado de calibración (vigente/vencida), utilidad, tipo de detector y foto si tiene.
2. **Escanear QR de usuario** — el usuario queda asignado al equipo.
3. **Escanear QR de instalación** — la instalación destino queda asignada.
4. **Escanear QR Maestro** — cierra la sesión y registra el uso en el historial (equipo, usuario, instalación, hora inicio y fin).

El QR Maestro puede escanearse en cualquier paso posterior al equipo para cancelar la sesión anticipadamente.

---

## Páginas

| Página | Descripción |
|---|---|
| **Scanner** | Cámara en tiempo real + estado de la sesión activa |
| **Equipos** | Alta, edición y eliminación de equipos. Subida de foto. Generación de QR para imprimir. |
| **Historial** | Tabla con todos los usos registrados: equipo, usuario, instalación, duración. |
| **Configuración** | Gestión de usuarios e instalaciones. Generación de QR maestro. |

---

## Códigos QR

Cada entidad tiene su propio QR generado por el backend. Se accede directamente desde la interfaz para imprimir.

| Tipo | Endpoint |
|---|---|
| Equipo | `GET /equipos/{id}/qr` |
| Usuario | `GET /usuarios/{id}/qr` |
| Instalación | `GET /ubicaciones/{id}/qr` |
| QR Maestro | `GET /ubicaciones/master/qr` |

Los QR contienen un JSON con el campo `type` que identifica la entidad:

```json
{ "type": "equipment", "Codigo": "000001", "nombre": "Ludlum 26-1", ... }
{ "type": "user",      "Codigo": "USR-001", "nombre": "Sebastian Sepulveda" }
{ "type": "location",  "Codigo": "LAAN-001", "Instalacion": "LAAN" }
{ "type": "master" }
```

---

## Base de datos

SQLite, archivo `inventory.db` creado automáticamente en la raíz del proyecto.

| Tabla | Descripción |
|---|---|
| `equipos` | Equipos registrados |
| `usuarios` | Usuarios del sistema |
| `ubicaciones` | Instalaciones destino |
| `sesion_activa` | Estado actual del scanner (fila única) |
| `historial_uso` | Registro histórico de cada uso |
# clqrcheck
