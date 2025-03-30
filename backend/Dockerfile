# Use official Python runtime with slim-buster for smaller size
FROM python:3.9-slim-buster

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/backend

# Install system dependencies (required for Google Cloud packages)
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY chemopal-chatbot-lwiq-32307fc7aeef.json /backend/credentials.json

# Set environment variable
ENV GOOGLE_APPLICATION_CREDENTIALS="/backend/credentials.json"

# Set working directory
WORKDIR /backend

# First install protobuf with version pinning (BEFORE requirements)
RUN pip install --no-cache-dir "protobuf>=3.19.5,<5.0.0"

# Copy requirements first for better caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Explicitly install dialogflow (in case requirements.txt misses it)
RUN pip install --no-cache-dir google-cloud-dialogflow==2.41.1

# Verify the installation works
RUN python -c "from google.cloud import dialogflow; print(f'Dialogflow {dialogflow.__version__} installed')"

# Copy application code
COPY backend/ /backend/
COPY .env /backend/.env

# Ensure Google Cloud namespace packages are initialized
RUN touch /usr/local/lib/python3.9/site-packages/google/__init__.py && \
    touch /usr/local/lib/python3.9/site-packages/google/cloud/__init__.py

# Run as non-root user for security
RUN useradd -m appuser && chown -R appuser /backend
USER appuser

EXPOSE 8000

# Run with auto-reload for development (remove --reload for production)
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]