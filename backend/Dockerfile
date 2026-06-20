FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 4000
CMD ["node", "src/index.js"]
