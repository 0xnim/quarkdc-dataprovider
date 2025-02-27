FROM denoland/deno:alpine-2.2.2

# Set working directory
WORKDIR /app

# Copy application source
COPY . .

# Set environment variables
ENV PORT=8000
ENV TZ=America/New_York

# Expose the port
EXPOSE 8000

# Set timezone data
RUN apk add --no-cache tzdata

# Run the application with necessary permissions
CMD ["deno", "task", "start"]