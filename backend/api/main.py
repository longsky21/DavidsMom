from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from routers import dashboard, words, media

app = FastAPI(title="DavidsMom Admin API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# backend/api/main.py (2层) -> 回退3层到达根目录
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

# Mount uploads directory for static file access (Images)
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
if not os.path.exists(UPLOADS_DIR):
    os.makedirs(UPLOADS_DIR)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Mount public directory for static file access (Subtitles)
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
if not os.path.exists(PUBLIC_DIR):
    os.makedirs(PUBLIC_DIR)
app.mount("/public", StaticFiles(directory=PUBLIC_DIR), name="public")

# Include Routers
app.include_router(dashboard.router)
app.include_router(words.router)
app.include_router(media.router)

@app.get("/")
def read_root():
    return {"message": "DavidsMom Admin API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
