# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# --- Install Shared Library ---
COPY ./libs/shared-models/ /app/libs/shared-models/
RUN pip install --no-cache-dir /app/libs/shared-models/

# --- Install App Dependencies ---
COPY ./services/calendar-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Copy App Source ---
COPY ./services/calendar-service/app/ ./app

# Expose the port the app runs on
EXPOSE 8090

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8090"]
