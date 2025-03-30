# Use a Python base image
FROM python:3.9-slim

# Set the working directory to /backend
WORKDIR /backend

# Copy the backend directory into the container at /backend
COPY backend/ /backend/

# Copy the .env file from the root directory to the container
COPY .env /backend/.env

# Install any dependencies
RUN pip install --no-cache-dir -r /backend/requirements.txt

# Expose port
EXPOSE 8000

# Run the application using Uvicorn (adjust if needed)
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
