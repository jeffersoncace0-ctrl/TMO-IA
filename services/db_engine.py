"""
Gestión de conexiones SQLAlchemy para operaciones de alta velocidad con Pandas.
"""

from typing import Optional
from sqlalchemy import create_engine, Engine
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Instancia singleton del motor de base de datos
_engine: Optional[Engine] = None


def get_sqlalchemy_engine() -> Engine:
    """
    Obtiene o inicializa el motor de base de datos SQLAlchemy compartido.
    Reutiliza la conexión configurada en Django (SQLite o PostgreSQL).
    """
    global _engine
    if _engine is not None:
        return _engine

    db_conf = settings.DATABASES["default"]
    engine_name = db_conf["ENGINE"]

    if "sqlite3" in engine_name:
        db_path = str(db_conf["NAME"])
        connection_url = f"sqlite:///{db_path}"
    elif "postgresql" in engine_name:
        user = db_conf.get("USER", "")
        password = db_conf.get("PASSWORD", "")
        host = db_conf.get("HOST", "localhost")
        port = db_conf.get("PORT", "5432")
        name = db_conf.get("NAME", "")
        connection_url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"
    else:
        # Fallback a SQLite
        connection_url = f"sqlite:///{settings.BASE_DIR / 'db.sqlite3'}"

    logger.info("Inicializando SQLAlchemy Engine con URL: %s", connection_url)
    _engine = create_engine(connection_url, echo=False)
    return _engine
