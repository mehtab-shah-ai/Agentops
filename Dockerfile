# ==============================================================================
# AgentOps Backend Production Dockerfile (Root Context)
# ==============================================================================

FROM python:3.12-slim

# Set environment flags
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system utilities and build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency requirements from backend/
COPY backend/requirements.txt requirements.txt
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy application source code from backend/
COPY backend/app/ ./app/
COPY .env.example ./.env.example

# Expose dynamic port
EXPOSE 8000

# Production entrypoint with Uvicorn respecting Render's dynamic $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --proxy-headers"]
