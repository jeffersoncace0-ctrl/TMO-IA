@echo off
TITLE Plataforma TMO-IA - Servidor Enterprise
COLOR 0A

echo =====================================================================
echo           INICIANDO PLATAFORMA EMPRESARIAL TMO-IA
echo   Django 6 + Dash 4.5 + Plotly + Pandas + APScheduler (Pure Python)
echo =====================================================================
echo.

cd /d "%~dp0"

IF NOT EXIST "venv\Scripts\activate.bat" (
    echo [ERROR] No se encontro el entorno virtual en la carpeta venv.
    echo Creando entorno virtual...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo Instalando dependencias...
    pip install -r requirements.txt
) ELSE (
    call venv\Scripts\activate.bat
)

echo [1/3] Verificando migraciones de base de datos...
python manage.py migrate --noinput

echo [2/3] Verificando suite de pruebas automatizadas...
python -m pytest tests\test_environment.py -q

echo.
echo [3/3] Iniciando servidor web en http://127.0.0.1:8000 ...
echo.
echo =====================================================================
echo   PANELES DISPONIBLES:
echo   - Inicio Operativo:       http://127.0.0.1:8000/
echo   - Subida de Excel:        http://127.0.0.1:8000/operaciones/subir/
echo   - Dashboard Dash:         http://127.0.0.1:8000/analitica/
echo   - Panel de Automatizacion:http://127.0.0.1:8000/automatizacion/panel/
echo   - Administracion Django:  http://127.0.0.1:8000/admin/
echo =====================================================================
echo Presiona CTRL+C para detener el servidor.
echo.

python manage.py runserver 8000
pause
