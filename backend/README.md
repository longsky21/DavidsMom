# DavidsMom Admin System

This is the refactored admin system for DavidsMom, featuring a modern React frontend and a FastAPI backend.

## Directory Structure

- `api/`: FastAPI backend service (Port 8001)
- `ui/`: React + Vite frontend application (Port 5175)

## Prerequisites

- Python 3.8+
- Node.js 16+
- MySQL Database (configured in root `.env`)

## Getting Started

### 1. Start the Backend API

```bash
cd api
# Install dependencies (if not already installed in root venv)
# pip install -r ../../requirements.txt

# Run the server
python main.py
```

The API will run at `http://localhost:8001`.
Docs available at `http://localhost:8001/docs`.

### 2. Start the Frontend UI

```bash
cd ui
npm install
npm run dev
```

The UI will run at `http://localhost:5175`.

## Features

- **Dashboard**: Visual overview of word coverage and media resources.
- **Words Management**: 
  - Filter words by missing images, difficulty, source.
  - Upload images for words.
  - Edit word details.
- **Media Management**:
  - Manage Video and Audio resources.
  - **Batch Import**: Scan server directories to auto-import media files.

## Configuration

The backend reads database configuration from the `.env` file in the project root.
ensure `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DICT_DB_NAME` are set correctly.
