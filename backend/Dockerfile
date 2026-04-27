# Use Python 3.12 slim image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for OpenCV, InsightFace and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libxcb1 \
    libx11-6 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch first (avoids pulling the massive CUDA build)
RUN pip install --no-cache-dir \
    torch==2.3.0+cpu \
    torchvision==0.18.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install remaining dependencies
COPY requirements.txt .
# torch/torchvision already installed above — skip them here to avoid re-download
RUN pip install --no-cache-dir $(grep -v '^torch' requirements.txt | grep -v '^torchvision')

# Pre-download HuggingFace models at build time so cold starts are instant
RUN python -c "\
from transformers import pipeline; \
pipeline('image-classification', model='Falconsai/nsfw_image_detection'); \
pipeline('image-classification', model='jaranohaal/vit-base-violence-detection'); \
print('HuggingFace models cached ✅')"

# Copy application code
COPY . .

# Expose port (Railway uses PORT env variable)
EXPOSE 8080

# Run with gunicorn
CMD ["sh", "-c", "gunicorn app:app --bind 0.0.0.0:${PORT:-8080}"]
