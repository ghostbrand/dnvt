from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
import uuid
import asyncio

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize services with database
from src.services import init_services
init_services(db)

# Import routes
from src.routes import register_routes

# ==================== WEBSOCKET CONNECTION MANAGER ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting: {e}")
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

# ==================== APP INITIALIZATION ====================

app = FastAPI(title="DNVT - Sistema de Gestão de Acidentes")

# Register all routes
register_routes(app)

# ==================== ADDITIONAL API ROUTES ====================

api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"message": "DNVT - Sistema de Gestão de Acidentes de Trânsito", "status": "online"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.post("/rotas/verificar-acidentes")
async def verificar_acidentes_rota(
    lat_origem: float,
    lng_origem: float,
    lat_destino: float,
    lng_destino: float
):
    """Verifica se há acidentes ativos na rota entre origem e destino"""
    min_lat = min(lat_origem, lat_destino) - 0.01
    max_lat = max(lat_origem, lat_destino) + 0.01
    min_lng = min(lng_origem, lng_destino) - 0.01
    max_lng = max(lng_origem, lng_destino) + 0.01
    
    acidentes_na_rota = await db.acidentes.find({
        "status": {"$in": ["REPORTADO", "VALIDADO", "EM_ATENDIMENTO"]},
        "latitude": {"$gte": min_lat, "$lte": max_lat},
        "longitude": {"$gte": min_lng, "$lte": max_lng}
    }, {"_id": 0}).to_list(100)
    
    return {
        "possui_acidentes": len(acidentes_na_rota) > 0,
        "total_acidentes": len(acidentes_na_rota),
        "acidentes": acidentes_na_rota
    }

app.include_router(api_router)

# ==================== WEBSOCKET ENDPOINTS ====================

@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Received WebSocket message: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# ==================== CORS ====================

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== SHUTDOWN EVENT ====================

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
