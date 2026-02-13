# Start with Python 3.11 slim image (smaller, faster)
FROM python:3.11-slim

# Set working directory inside container
WORKDIR /app

# Copy requirements first (Docker caches this layer for faster rebuilds)
COPY main_backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application code
COPY main_backend/ .

# Expose port 8000 (FastAPI default)
EXPOSE 8000

# Command to run when container starts
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

