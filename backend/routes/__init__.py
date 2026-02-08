# Routes Package for Aircabio API
# This package contains domain-specific route modules

from .auth import router as auth_router
from .settings import router as settings_router
from .tracking import router as tracking_router

__all__ = ['auth_router', 'settings_router', 'tracking_router']
