FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go-backend/go.mod ./
COPY go-backend/ ./
RUN go build -o /notebook .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=build /notebook /app/notebook
COPY static /app/static
ENV PORT=8080
EXPOSE 8080
CMD ["/app/notebook"]
