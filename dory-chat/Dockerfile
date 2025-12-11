# All-in-one Docker image with MongoDB and Next.js
FROM node:20-bullseye

# Install MongoDB
RUN apt-get update && apt-get install -y \
    gnupg \
    curl \
    supervisor \
    && curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg \
    && echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bullseye/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list \
    && apt-get update \
    && apt-get install -y mongodb-org \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create directories
RUN mkdir -p /data/db /app

# Install Git and clone the repository into a temporary directory
RUN apt-get update && apt-get install -y git && \
    git clone https://github.com/demensdeum/DoryChat.git /tmp/dorychat

# Copy the application files to /app and set the WORKDIR
WORKDIR /app
RUN cp -a /tmp/dorychat/dory-chat/. .

# Install dependencies
RUN npm install --legacy-peer-deps

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


# Create MongoDB data directory with correct permissions
RUN mkdir -p /data/db && chown -R mongodb:mongodb /data/db

# Create supervisor config
RUN echo "[supervisord]\n\
nodaemon=true\n\
user=root\n\
\n\
[program:mongodb]\n\
command=/usr/bin/mongod --dbpath /data/db --bind_ip_all\n\
autostart=true\n\
autorestart=true\n\
user=mongodb\n\
stdout_logfile=/var/log/mongodb.log\n\
stderr_logfile=/var/log/mongodb.err\n\
\n\
[program:nextjs]\n\
command=/usr/local/bin/npm start\n\
directory=/app\n\
autostart=true\n\
autorestart=true\n\
environment=MONGODB_URI=\"mongodb://localhost:27017/dorychat\",NODE_ENV=\"production\",HOSTNAME=\"0.0.0.0\",PORT=\"3000\"\n\
stdout_logfile=/var/log/nextjs.log\n\
stderr_logfile=/var/log/nextjs.err" > /etc/supervisor/conf.d/services.conf

# Expose ports
EXPOSE 3000

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]
