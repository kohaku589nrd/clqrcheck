import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from .database import engine
from .models import Base
from .routes import equipos, usuarios, ubicaciones, scanner, historial


def _migrate(conn):
    """Migraciones incrementales sobre la DB existente."""

    # 1. historial_uso.fecha_fin: pasar de NOT NULL a nullable (requiere recrear tabla en SQLite)
    rows = conn.execute(text("PRAGMA table_info(historial_uso)")).fetchall()
    if rows:  # tabla ya existe
        fecha_fin_row = next((r for r in rows if r[1] == 'fecha_fin'), None)
        if fecha_fin_row and fecha_fin_row[3] == 1:  # notnull=1
            conn.execute(text("""
                CREATE TABLE historial_uso_new (
                    id INTEGER PRIMARY KEY,
                    equipo_id INTEGER NOT NULL,
                    usuario_id INTEGER,
                    ubicacion_id INTEGER,
                    fecha_inicio DATETIME NOT NULL,
                    fecha_fin DATETIME
                )
            """))
            conn.execute(text("INSERT INTO historial_uso_new SELECT * FROM historial_uso"))
            conn.execute(text("DROP TABLE historial_uso"))
            conn.execute(text("ALTER TABLE historial_uso_new RENAME TO historial_uso"))
            conn.commit()

    # 2. historial_uso: agregar columnas nuevas si no existen
    hu_rows = conn.execute(text("PRAGMA table_info(historial_uso)")).fetchall()
    hu_cols = {r[1] for r in hu_rows}
    if 'ubicacion_custom' not in hu_cols:
        conn.execute(text("ALTER TABLE historial_uso ADD COLUMN ubicacion_custom TEXT"))
    conn.commit()

    # 3. sesion_activa: agregar columnas nuevas si no existen
    sa_rows = conn.execute(text("PRAGMA table_info(sesion_activa)")).fetchall()
    sa_cols = {r[1] for r in sa_rows}
    for col, typedef in [
        ("completado_at", "DATETIME"),
        ("historial_id", "INTEGER"),
        ("es_retoma", "INTEGER DEFAULT 0"),
        ("ubicacion_custom", "TEXT"),
    ]:
        if col not in sa_cols:
            conn.execute(text(f"ALTER TABLE sesion_activa ADD COLUMN {col} {typedef}"))
    conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        _migrate(conn)
    yield


app = FastAPI(title="Inventory API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(equipos.router)
app.include_router(usuarios.router)
app.include_router(ubicaciones.router)
app.include_router(scanner.router)
app.include_router(historial.router)

FOTOS_DIR = os.path.join(os.path.dirname(__file__), "fotos")
os.makedirs(FOTOS_DIR, exist_ok=True)
app.mount("/fotos", StaticFiles(directory=FOTOS_DIR), name="fotos")


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}
