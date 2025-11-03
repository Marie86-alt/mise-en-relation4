from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    raise ValueError("MONGO_URL n'est pas défini dans les variables d'environnement")

client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'mise_en_relation')]

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Lifespan context manager pour gérer le cycle de vie de l'application
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Démarrage de l'application")
    yield
    # Shutdown
    logger.info("Arrêt de l'application")
    client.close()

# Create the main app with lifespan
app = FastAPI(lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router
@api_router.get("/")
async def root():
    return {"message": "API Mise en Relation - Bienvenue"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    try:
        # Utiliser model_dump() au lieu de dict() (Pydantic v2)
        status_dict = input.model_dump()
        status_obj = StatusCheck(**status_dict)
        _ = await db.status_checks.insert_one(status_obj.model_dump())
        return status_obj
    except Exception as e:
        logger.error(f"Erreur lors de la création du status check: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la création")

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    try:
        status_checks = await db.status_checks.find().to_list(1000)
        return [StatusCheck(**status_check) for status_check in status_checks]
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des status checks: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération")

@api_router.get("/health")
async def health_check():
    try:
        # Vérifier la connexion à la base de données
        await db.command('ping')
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "database": "disconnected"}

# Include the router in the main app
app.include_router(api_router)

# CORS configuré de manière plus restrictive
allowed_origins = os.environ.get('ALLOWED_ORIGINS', '').split(',')
if not allowed_origins or allowed_origins == ['']:
    # En développement, autoriser localhost
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:19006"
    ]
    logger.warning("⚠️ CORS configuré avec des origines par défaut (développement)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("✅ Serveur FastAPI initialisé avec succès")
