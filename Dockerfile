FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

COPY backend/pyproject.toml /app/pyproject.toml
COPY backend/mazinkaiser /app/mazinkaiser

RUN pip install -e .

EXPOSE 8000

CMD ["uvicorn", "mazinkaiser.main:app", "--host", "0.0.0.0", "--port", "8000"]
