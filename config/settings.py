import os
from pathlib import Path
from dotenv import load_dotenv

# Ruta raíz del proyecto (donde se ubica manage.py)
BASE_DIR = Path(__file__).resolve().parent.parent

# Cargar variables de entorno desde el archivo .env
load_dotenv(BASE_DIR / '.env')

# Clave secreta para firma criptográfica de sesiones y cookies
SECRET_KEY = os.getenv(
    'SECRET_KEY',
    'django-insecure-tmo-fallback-development-key-never-use-in-production'
)

# Modo de depuración (True en desarrollo, False en producción)
DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')

# Hosts permitidos para responder peticiones HTTP
ALLOWED_HOSTS = [host.strip() for host in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if host.strip()]

# Definición de aplicaciones instaladas
INSTALLED_APPS = [
    # Aplicaciones nativas de Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Módulos del Sistema Unificado (Enterprise Core & Call Center TMO)
    'apps.authentication.apps.AuthenticationConfig',
    'apps.documents.apps.DocumentsConfig',
    'apps.core.apps.CoreConfig',
    'apps.operations.apps.OperationsConfig',
    'apps.analytics.apps.AnalyticsConfig',
    'apps.automation.apps.AutomationConfig',
]

# Pipeline de middlewares para procesamiento de solicitudes y respuestas
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Permitir incrustación de componentes Dash mediante iframe desde el mismo origen
X_FRAME_OPTIONS = 'SAMEORIGIN'

# Enrutador principal de URLs
ROOT_URLCONF = 'config.urls'

# Configuración del motor de plantillas HTML
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# Puntos de entrada WSGI y ASGI
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Configuración de Base de Datos
DB_ENGINE = os.getenv('DB_ENGINE', 'django.db.backends.sqlite3')

if 'sqlite' in DB_ENGINE:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / os.getenv('DB_NAME', 'db.sqlite3'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': DB_ENGINE,
            'NAME': os.getenv('DB_NAME', 'tmo_db'),
            'USER': os.getenv('DB_USER', 'postgres'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
        }
    }

# Validadores de contraseña
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internacionalización y Zona Horaria
LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'America/Bogota'
USE_I18N = True
USE_TZ = True

# Archivos Estáticos (CSS, Imágenes corporativas)
STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Archivos Multimedia (Excels cargados por usuarios y reportes exportados)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Tipo predeterminado de clave primaria para modelos
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Directorio de logs del sistema
LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# Configuración centralizada de Logging estructurado
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} [{name}:{lineno}] {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': LOGS_DIR / 'tmo_platform.log',
            'encoding': 'utf-8',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
        'apps': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'services': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# =============================================================================
# PARÁMETROS OPERATIVOS DEL NEGOCIO (TMO)
# =============================================================================
DEFAULT_TMO_THRESHOLD = float(os.getenv('DEFAULT_TMO_THRESHOLD', '20.0'))
CRITICAL_Z_SCORE = float(os.getenv('CRITICAL_Z_SCORE', '2.0'))
SCHEDULER_INTERVAL_MINUTES = int(os.getenv('SCHEDULER_INTERVAL_MINUTES', '60'))
SCHEDULER_AUTOSTART = os.getenv('SCHEDULER_AUTOSTART', 'False').lower() in ('true', '1')

# Configuración SMTP para despacho de alertas por correo
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('SMTP_PORT', '465'))
EMAIL_USE_SSL = os.getenv('SMTP_USE_SSL', 'True').lower() in ('true', '1')
EMAIL_USE_TLS = os.getenv('SMTP_USE_TLS', 'False').lower() in ('true', '1')
EMAIL_HOST_USER = os.getenv('SMTP_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('SMTP_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL', 'notificaciones@empresa.com')
SMTP_NOTIFICATION_RECIPIENT = os.getenv('SMTP_NOTIFICATION_RECIPIENT', 'paulcacerez768@gmail.com')

# Configuración de Autenticación y Sesiones Corporativas
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/auth/login/'
LOGIN_URL = '/auth/login/'

