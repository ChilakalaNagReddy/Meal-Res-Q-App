import builtins
import sqlalchemy.orm.session
builtins.JoinTransactionMode = getattr(sqlalchemy.orm.session, 'JoinTransactionMode', None)

from dotenv import load_dotenv
load_dotenv(override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import (
    auth_routes, donor_routes, ngo_routes, volunteer_routes,
    needer_routes, admin_routes, notification_routes, chat_routes
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Meal_ResQ API Platform",
    description="Backend services for food rescue donation matching, OTP verification, and role-based workflows.",
    version="1.0.0"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Route Blueprints
app.include_router(auth_routes.router)
app.include_router(donor_routes.router)
app.include_router(ngo_routes.router)
app.include_router(volunteer_routes.router)
app.include_router(needer_routes.router)
app.include_router(admin_routes.router)
app.include_router(notification_routes.router)
app.include_router(chat_routes.router)

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "app": "Meal_ResQ API Platform",
        "version": "1.0.0",
        "docs": "/docs"
    }
