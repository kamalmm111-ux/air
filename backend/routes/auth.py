# Authentication Routes
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
import bcrypt
import jwt
import os
from datetime import datetime, timezone, timedelta

router = APIRouter(tags=["Authentication"])

# These will be imported from main server.py
# db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS are set at module level

JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'aircabio_secret_key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_token(user_data: dict) -> str:
    payload = {
        "sub": user_data["id"],
        "email": user_data["email"],
        "role": user_data.get("role", "customer"),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    if user_data.get("fleet_id"):
        payload["fleet_id"] = user_data["fleet_id"]
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# Note: Routes are defined in server.py for now to avoid circular imports
# This module serves as a template for future refactoring
