# syntax=docker/dockerfile:1

FROM golang:1.23-alpine AS build
WORKDIR /app

COPY go.mod go.sum ./
# Permitir uso de toolchain mais recente para dependências que requerem Go 1.24
ENV GOTOOLCHAIN=auto
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/api ./cmd/api/main.go

FROM alpine:3.20
WORKDIR /app
RUN apk add --no-cache ca-certificates wget
COPY --from=build /out/api /app/api

EXPOSE 8080
ENV PORT=8080
CMD ["/app/api"]
