FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev || npm install
COPY . .
EXPOSE 4000
CMD ["npx", "tsx", "index.ts"]
