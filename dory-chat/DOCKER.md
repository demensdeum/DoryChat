# DoryChat Docker Deployment (All-in-One)

This Docker image includes both the Next.js application and MongoDB in a single container.

## Quick Start

### Build the Docker image:
```bash
docker build -t dorychat .
```

### Run the container:
```bash
docker run -p 3000:3000 dorychat
```

That's it! The application will be available at http://localhost:3000

## Features

- **All-in-one container**: MongoDB and Next.js app in single image
- **No external dependencies**: Everything runs inside the container
- **Persistent data**: Use volumes to persist MongoDB data

## Persistent Data (Optional)

To persist MongoDB data across container restarts:

```bash
docker run -p 3000:3000 -v dorychat-data:/data/db dorychat
```

## Building and Publishing

```bash
# Build
docker build -t dorychat:latest .

# Run
docker run -d -p 3000:3000 --name dorychat-app dorychat:latest

# View logs
docker logs -f dorychat-app

# Stop
docker stop dorychat-app

# Remove
docker rm dorychat-app
```

## Image Details

- Base: Node.js 20 on Debian Bullseye
- MongoDB: Version 7.0
- Process Manager: Supervisord (manages both services)
- Default MongoDB URI: `mongodb://localhost:27017/dorychat`

## Access

- **Application**: http://localhost:3000
- **MongoDB** (internal): localhost:27017

## Logs

View application logs:
```bash
docker exec dorychat-app cat /var/log/nextjs.log
```

View MongoDB logs:
```bash
docker exec dorychat-app cat /var/log/mongodb.log
```
