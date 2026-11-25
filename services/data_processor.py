import hashlib
import io
import re
from typing import Dict, Any, Tuple, Optional, Union
import pandas as pd
import numpy as np


class DataProcessorService:
    """
    Servicio de ingeniería de datos para la ingesta, saneamiento determinista
    y normalización de registros de llamadas de Call Center en formato Excel.
    """

    # Diccionario de alias y sinónimos comunes de telefonía (ACD / PBX)
    COLUMN_ALIASES: Dict[str, list[str]] = {
        'call_id': ['id_llamada', 'call_id', 'callid', 'id', 'ticket', 'identificador'],
        'agent_code': ['codigo_agente', 'agent_code', 'agent_id', 'cod_agente', 'agente_id', 'id_asesor'],
        'agent_name': ['nombre_agente', 'agent_name', 'nombre', 'asesor', 'nombre_asesor', 'ejecutivo'],
        'call_datetime': ['fecha_hora', 'call_datetime', 'fecha', 'datetime', 'timestamp', 'hora_inicio'],
        'call_type': ['tipo_llamada', 'call_type', 'tipo', 'direction', 'sentido'],
        'call_status': ['estado_llamada', 'call_status', 'estado', 'status', 'disposition', 'resultado'],
        'total_duration': ['duracion_total_seg', 'total_duration_seconds', 'duracion_total', 'duration', 'duracion', 'tiempo_total'],
        'talk_time': ['tiempo_conversacion_seg', 'talk_time_seconds', 'tiempo_conversacion', 'talk_time', 'conversacion'],
        'wait_time': ['tiempo_espera_seg', 'wait_time_seconds', 'tiempo_espera', 'wait_time', 'espera', 'hold_time'],
        'wrap_up_time': ['tiempo_post_llamada_seg', 'wrap_up_time_seconds', 'tiempo_post_llamada', 'wrap_up_time', 'acw', 'post_llamada'],
        'silence_time': ['tiempo_silencio_seg', 'silence_time_seconds', 'tiempo_silencio', 'silence_time', 'silencio', 'pausa'],
    }

    @staticmethod
    def calculate_sha256(file_content: bytes) -> str:
        """Calcula el hash criptográfico SHA-256 de los bytes de un archivo para garantizar idempotencia."""
        return hashlib.sha256(file_content).hexdigest()

    @staticmethod
    def parse_duration_to_seconds(value: Any) -> Optional[float]:
        """
        Convierte cualquier formato de duración (segundos numéricos, enteros, cadenas 'HH:MM:SS' o 'MM:SS')
        a un valor de punto flotante en segundos. Si el formato es inválido, retorna None.
        """
        if pd.isna(value) or value is None:
            return None

        # Si ya es un valor numérico
        if isinstance(value, (int, float, np.number)):
            return float(value)

        str_val = str(value).strip()

        # Si es una cadena numérica directa (ej. "15", "23.5")
        try:
            return float(str_val)
        except ValueError:
            pass

        # Si tiene formato de tiempo HH:MM:SS o MM:SS
        time_parts = str_val.split(':')
        if len(time_parts) == 2:  # MM:SS
            try:
                minutes = int(time_parts[0])
                seconds = float(time_parts[1])
                return float(minutes * 60 + seconds)
            except ValueError:
                return None
        elif len(time_parts) == 3:  # HH:MM:SS
            try:
                hours = int(time_parts[0])
                minutes = int(time_parts[1])
                seconds = float(time_parts[2])
                return float(hours * 3600 + minutes * 60 + seconds)
            except ValueError:
                return None

        return None

    @classmethod
    def match_columns(cls, df: pd.DataFrame) -> Dict[str, str]:
        """
        Identifica automáticamente qué columna del archivo cargado corresponde a cada campo requerido
        del sistema mediante comparación de sinónimos insensibles a mayúsculas y acentos.
        """
        mapping: Dict[str, str] = {}
        # Normalizar nombres de columnas existentes a minúsculas sin espacios
        clean_cols = {re.sub(r'[^a-z0-9_]', '', col.lower().strip()): col for col in df.columns}

        for canonical_name, aliases in cls.COLUMN_ALIASES.items():
            for alias in aliases:
                norm_alias = re.sub(r'[^a-z0-9_]', '', alias.lower())
                if norm_alias in clean_cols:
                    mapping[canonical_name] = clean_cols[norm_alias]
                    break

        return mapping

    @classmethod
    def process_excel(cls, file_source: Union[str, bytes, io.BytesIO]) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
        """
        Ejecuta la canalización (pipeline) completa de ingesta y saneamiento:
        1. Lee el libro Excel (.xlsx / .xls).
        2. Mapea columnas con sinónimos.
        3. Aísla duplicados exactos.
        4. Detecta valores corruptos, nulos o duraciones negativas.
        5. Retorna: (DataFrame Válido, DataFrame Inválido, Estadísticas de Ingesta).
        """
        if isinstance(file_source, bytes):
            file_bytes = file_source
            file_io = io.BytesIO(file_source)
        elif isinstance(file_source, io.BytesIO):
            file_bytes = file_source.getvalue()
            file_io = file_source
        else:
            with open(file_source, 'rb') as f:
                file_bytes = f.read()
            file_io = io.BytesIO(file_bytes)

        file_hash = cls.calculate_sha256(file_bytes)
        file_size = len(file_bytes)

        # Cargar primera hoja del archivo Excel mediante Pandas
        df_raw = pd.read_excel(file_io)
        total_rows = len(df_raw)

        if total_rows == 0:
            return pd.DataFrame(), pd.DataFrame(), {
                'total_rows': 0, 'valid_rows': 0, 'invalid_rows': 0, 'duplicate_rows': 0,
                'sha256': file_hash, 'file_size': file_size
            }

        mapping = cls.match_columns(df_raw)

        # Construir DataFrame normalizado con nombres canónicos
        normalized_data = {}
        for canonical, orig_col in mapping.items():
            normalized_data[canonical] = df_raw[orig_col]

        df = pd.DataFrame(normalized_data)

        # Campos mínimos requeridos
        if 'call_id' not in df.columns:
            df['call_id'] = [f"ROW-{i+1}" for i in range(total_rows)]
        if 'agent_code' not in df.columns:
            df['agent_code'] = "AG-UNKNOWN"
        if 'agent_name' not in df.columns:
            df['agent_name'] = df['agent_code'].astype(str)
        if 'call_type' not in df.columns:
            df['call_type'] = 'ENTRANTE'
        if 'call_status' not in df.columns:
            df['call_status'] = 'CONTESTADA'

        # Parsear todas las duraciones numéricamente
        duration_cols = ['total_duration', 'talk_time', 'wait_time', 'wrap_up_time', 'silence_time']
        for col in duration_cols:
            if col in df.columns:
                df[col] = df[col].apply(cls.parse_duration_to_seconds)
            else:
                df[col] = 0.0

        # Normalizar estados y tipos
        df['call_type'] = df['call_type'].fillna('ENTRANTE').astype(str).str.upper().str.strip()
        df['call_status'] = df['call_status'].fillna('CONTESTADA').astype(str).str.upper().str.strip()

        # Detección de duplicados exactos basados en call_id
        is_duplicate = df.duplicated(subset=['call_id'], keep='first')
        duplicate_count = int(is_duplicate.sum())

        # Vector de validaciones deterministas
        errors = []
        is_valid = []

        for idx, row in df.iterrows():
            row_errors = []
            
            # Validez del identificador
            if pd.isna(row['call_id']) or str(row['call_id']).strip() == '':
                row_errors.append("Falta ID de llamada")

            # Validez del asesor
            if pd.isna(row['agent_code']) or str(row['agent_code']).strip() == '' or str(row['agent_code']) == 'nan':
                row_errors.append("Falta código de asesor")

            # Validez de la duración total
            dur = row['total_duration']
            if dur is None or pd.isna(dur):
                row_errors.append("Duración no numérica o corrupta")
            elif dur < 0:
                row_errors.append(f"Duración negativa ({dur}s)")
            
            # Duplicados
            if is_duplicate.iloc[idx]:
                row_errors.append(f"Llamada duplicada ({row['call_id']})")

            if row_errors:
                is_valid.append(False)
                errors.append("; ".join(row_errors))
            else:
                is_valid.append(True)
                errors.append("")

        df['is_valid'] = is_valid
        df['is_duplicate'] = is_duplicate
        df['validation_error'] = errors

        # Parseo de fecha de llamada
        if 'call_datetime' in df.columns:
            df['call_datetime'] = pd.to_datetime(df['call_datetime'], errors='coerce')
        else:
            df['call_datetime'] = pd.NaT

        # Separar conjuntos
        df_valid = df[df['is_valid']].copy()
        df_invalid = df[~df['is_valid']].copy()

        stats = {
            'total_rows': total_rows,
            'valid_rows': int(len(df_valid)),
            'invalid_rows': int(len(df_invalid)),
            'duplicate_rows': duplicate_count,
            'sha256': file_hash,
            'file_size': file_size,
        }

        return df_valid, df_invalid, stats
