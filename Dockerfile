# Use an official Bun runtime as a parent image
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# Install dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application
RUN bun run build

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD ["bun", "run", "start"]
