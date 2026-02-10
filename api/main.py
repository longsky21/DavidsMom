from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, words, learning

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="David's Mom API")

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

@app.get("/")
def read_root():
    return {"message": "Welcome to David's Mom API"}
