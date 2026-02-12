from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from .database import engine, Base
from .routers import auth, words, learning, media

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="David's Mom API")

# Mount static files
# Point to public/static so backend can also serve them if needed
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

# Ensure uploads directory exists
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)

app.mount("/static", StaticFiles(directory=static_dir), name="static")
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# CORS configuration
origins = [
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(words.router)
app.include_router(learning.router)
app.include_router(media.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to David's Mom API"}
