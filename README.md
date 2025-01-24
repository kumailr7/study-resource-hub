# Study Resource Hub
A web application designed to efficiently manage and share study resources. Users can add, categorize, and tag resources, ensuring easy access and organization for learning materials. The app features a user-friendly interface with light/dark mode support, making it an ideal platform for students, educators, and self-learners.

## Prerequisites
- Docker and Docker Compose
- Node.js (for local development)
- npm or yarn

## Project Setup

### 1. Environment Setup
Create a `.env` file in the backend directory:

```bash
MONGODB_URL=mongodb://localhost:27017/study_resource_hub
PORT=5000
JWT_SECRET=your_jwt_secret_key
```

### 2. Running with Docker Compose
The entire application stack can be run using Docker Compose:

```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop all services
docker-compose down
```

### 3. MongoDB Setup
Run MongoDB using Docker:
```bash
# Pull MongoDB image
docker pull mongo

# Run MongoDB container
docker run -d -p 27017:27017 --name study-resource-mongodb mongo
```

### 4. Database Migrations
To set up the initial database collections and seed data:

```bash
# Navigate to backend directory
cd backend

# Run migrations
node migrations/migrate.js
```

This will create:
- Resources collection
- Resource requests collection
- Initial seed data (if any)

### 5. Running Locally (Development)

Frontend:
```bash
cd frontend
npm install
npm start
```

Backend:
```bash
cd backend
npm install
npm run dev
```

### 6. Nginx Configuration
The project includes Nginx for reverse proxy and SSL termination. Here's how to set it up:

1. Directory Structure:
```
nginx/
├── nginx.conf         # Nginx configuration file
└── certs/            # SSL certificates directory
    ├── domain.crt    # Your domain certificate
    └── domain.key    # Your private key
```

2. Sample Nginx Configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/certs/domain.crt;
    ssl_certificate_key /etc/nginx/certs/domain.key;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. SSL Certificate Setup:
- Place your SSL certificates in the `nginx/certs` directory
- Update the `nginx.conf` with your domain name
- Ensure proper permissions on certificate files

4. Custom Domain Setup:
- Point your domain's DNS A record to your server's IP address
- Update the `server_name` directive in nginx.conf with your domain
- Reload Nginx configuration:
```bash
docker-compose exec nginx nginx -s reload
```

## Project Structure
```
study-resource-hub/
├── frontend/          # React TypeScript frontend
├── backend/           # Node.js backend
├── nginx/            # Nginx configuration
│   ├── nginx.conf    # Nginx config file
│   └── certs/        # SSL certificates
├── docker-compose.yml # Docker compose configuration
└── .gitignore        # Git ignore file
```

## API Documentation
The backend API is available at `http://localhost:5000` with the following endpoints:
- `/api/resources` - Resource management
- `/api/auth` - Authentication endpoints
- `/api/requests` - Resource request management

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License
This project is licensed under the MIT License - see the LICENSE file for details

