
# Builder stage
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache build-base python3 make g++
RUN npm install
COPY . .

# Production stage
FROM node:24-alpine AS production
WORKDIR /app
# Only copy node_modules and built app from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src

EXPOSE 8877
CMD ["npm", "run", "api-server"]
