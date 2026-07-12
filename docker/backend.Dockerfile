# Stage 1: Build sphn (needs Rust toolchain, cmake, build-essential)
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake pkg-config libopus-dev git \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir torch \
    --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime (no compilers, no build tools)
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libopus0 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

WORKDIR /app
COPY backend ./backend

EXPOSE 8001
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8001"]
