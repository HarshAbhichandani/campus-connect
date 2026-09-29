# Lab 5 - Student REST API Docker image
FROM node:20-alpine

WORKDIR /app

# Install production dependencies first for better layer caching.
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the Express API source.
COPY server.js swagger.js ./
COPY models ./models

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
