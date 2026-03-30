FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package.json and package-lock.json to the working directory
# This allows us to install dependencies first, leveraging Docker's cache
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on (for the backend server)
EXPOSE 5000

# Define the default command (will be overridden by docker-compose for specific services)
CMD ["node", "server.js"]