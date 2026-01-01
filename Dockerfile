# syntax=docker/dockerfile:1

# Stage 1: Build Frontend (Next.js)
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

# Copiar package files
COPY frontend/package*.json ./
RUN npm ci

# Copiar código do frontend e buildar
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend (Go)
FROM golang:1.23-alpine AS backend-build
WORKDIR /app

COPY go.mod go.sum ./
ENV GOTOOLCHAIN=auto
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/api ./cmd/api/main.go

# Stage 3: Final image
FROM alpine:3.20
WORKDIR /app

# Instalar dependências
RUN apk add --no-cache ca-certificates wget

# Copiar binário do backend
COPY --from=backend-build /out/api /app/api

# Copiar frontend compilado para /app/manager/dist
COPY --from=frontend-build /app/frontend/out /app/manager/dist

EXPOSE 4120
ENV PORT=4120
ENV FRONTEND_PATH=/app/manager/dist

CMD ["/app/api"]
