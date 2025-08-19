FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install build dependencies
RUN apk add --no-cache build-base python3 make g++

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Expose the port the app runs on
EXPOSE 8877

# Command to run the app
CMD ["npm", "run", "api-server"]
