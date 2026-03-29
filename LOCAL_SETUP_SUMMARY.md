# Study Resource Hub - Local Development Setup Complete ✅

## ✨ Application Status

All services are running and operational:

| Service | Port | Status | URL |
|---------|------|--------|-----|
| **Frontend** (React) | 3000 | ✅ Running | http://localhost:3000 |
| **Backend API** (Node.js/Express) | 5001 | ✅ Running | http://localhost:5001/api |
| **Vault** (Secret Management) | 8200 | ✅ Running | http://localhost:8200/ui |
| **MongoDB Atlas** | - | ✅ Connected | Cloud-hosted |
| **Nginx** | 8080/8443 | ⚠️ Optional | For production use |

---

## 🚀 Quick Start Commands

### View Running Containers
```bash
docker ps | grep -E "vault|backend|frontend"
```

### View Logs
```bash
# Backend logs
docker logs -f backend_resource

# Frontend logs  
docker logs -f frontend_resource

# Vault logs
docker logs -f vault_server
```

### Stop Services
```bash
docker compose down
```

### Start Services
```bash
docker compose up -d
```

### Restart Services
```bash
docker compose restart
```

---

## 🔐 Secrets & Vault Configuration

### Vault UI Access
- **URL**: http://localhost:8200/ui
- **Root Token**: `root` (development only)
- **Secrets Path**: `kv/app/backend`

### Current Secrets Stored in Vault
```json
{
  "mongodb_uri": "mongodb+srv://cloudstudy:LDczPh2BrCjjWlhQ@quantumcluster.mbr8y.mongodb.net/resources?retryWrites=true&w=majority",
  "port": "5000",
  "jwt_secret": "JIxHE$&R%E4e1^%jH1K8RmNyl"
}
```

### View Secrets in Vault
```bash
docker exec -e VAULT_TOKEN=root vault_server vault kv get kv/app/backend
```

### Update Secrets
```bash
docker exec -e VAULT_TOKEN=root vault_server vault kv put kv/app/backend \
  mongodb_uri="YOUR_NEW_URI" \
  port="5000" \
  jwt_secret="YOUR_NEW_SECRET"
```

---

## 📝 Environment Variables

### Backend (.env)
Located at `/backend/.env`:
```bash
MONGODB_URI=mongodb+srv://cloudstudy:LDczPh2BrCjjWlhQ@quantumcluster.mbr8y.mongodb.net/resources?retryWrites=true&w=majority
PORT=5000
JWT_SECRET=JIxHE$&R%E4e1^%jH1K8RmNyl
```

### Frontend (.env)
Located at `/frontend/.env`:
```bash
REACT_APP_API_BASE_URL=http://localhost:5001/api
REACT_APP_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
```

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (User)                         │
└─────────────────┬──────────────────────────────────────────┘
                  │
        ┌─────────▼─────────┐
        │  Frontend (React) │ :3000
        │  - User Interface │
        │  - Authentication │
        └─────────┬─────────┘
                  │ (HTTP/API)
        ┌─────────▼────────────┐       ┌──────────────┐
        │  Backend (Node.js)   │──────▶│ Vault Server │ :8200
        │  - Express API       │       │ - Secrets    │
        │  - JWT Auth          │       │ - AppRole    │
        │  - Resource CRUD     │       └──────────────┘
        └─────────┬────────────┘
                  │
        ┌─────────▼──────────────┐
        │  MongoDB Atlas (Cloud) │
        │  - Database Storage    │
        │  - Data Persistence    │
        └────────────────────────┘
```

---

## 🔧 Technology Stack

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: Radix UI
- **HTTP Client**: Axios
- **Routing**: React Router v6

### Backend
- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JWT + bcryptjs
- **Security**: Helmet, CORS, Express Mongo Sanitize
- **Logging**: Morgan
- **Validation**: Joi
- **Secrets**: HashiCorp Vault

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Secret Management**: HashiCorp Vault
- **Reverse Proxy**: Nginx (optional)
- **Development Database**: MongoDB Atlas (cloud-hosted)

---

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/register` - User registration

### Users (Admin Only)
- `GET /api/users` - List all users
- `DELETE /api/users/:id` - Delete user

### Requests
- `GET /api/requests` - List resource requests
- `GET /api/requests/:id` - Get request details
- `POST /api/requests` - Create request
- `PUT /api/requests/:id` - Update request
- `DELETE /api/requests/:id` - Delete request

### Resources
- `GET /api/resources` - List resources
- `GET /api/resources/:id` - Get resource details
- `POST /api/resources` - Add resource
- `PUT /api/resources/:id` - Update resource
- `DELETE /api/resources/:id` - Delete resource

---

## 🔑 Key Files & Directories

```
study-resource-hub/
├── backend/                    # Node.js/Express backend
│   ├── .env                   # Backend configuration
│   ├── server.js              # Main server file
│   ├── routes/                # API routes
│   ├── models/                # MongoDB models
│   ├── middleware/            # Express middleware
│   ├── Dockerfile             # Docker configuration
│   └── entrypoint.sh          # Container startup script
│
├── frontend/                   # React frontend
│   ├── .env                   # Frontend configuration
│   ├── src/                   # React source code
│   │   ├── pages/            # Page components
│   │   ├── components/        # Reusable components
│   │   ├── context/          # React context
│   │   └── App.tsx           # Main app component
│   ├── public/                # Static assets
│   └── Dockerfile             # Docker configuration
│
├── vault/                      # Vault configuration
│   ├── config/                # Vault configs
│   │   ├── vault.hcl         # Vault server config
│   │   ├── agent.hcl         # Vault Agent config
│   │   ├── backend.env.tpl   # Secret template
│   │   └── backend-policy.hcl # Vault policy
│   └── scripts/               # Setup scripts
│
├── nginx/                      # Nginx configuration
│   └── nginx.conf            # Nginx reverse proxy config
│
├── docker-compose.yml         # Docker Compose file
├── VAULT_SETUP.md            # Vault documentation
└── README.md                 # Project README
```

---

## 🚦 Troubleshooting

### Backend not connecting to MongoDB
**Error**: `MongoDB connection error`
**Solution**: 
1. Verify MongoDB Atlas connection string in `.env`
2. Check IP whitelist in MongoDB Atlas
3. Verify `MONGODB_URI` environment variable

### Frontend API calls failing
**Error**: `Failed to fetch from http://localhost:5001/api`
**Solution**:
1. Verify backend is running: `docker ps | grep backend_resource`
2. Check backend logs: `docker logs backend_resource`
3. Verify `REACT_APP_API_BASE_URL` in frontend `.env`

### Vault not accessible
**Error**: `Connection refused on http://vault:8200`
**Solution**:
1. Verify Vault container is running: `docker logs vault_server`
2. Check network connectivity: `docker network ls`
3. Restart services: `docker compose restart`

### Port already in use
**Error**: `failed to bind host port 0.0.0.0:3000/tcp: address already in use`
**Solution**:
```bash
# Find what's using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
```

---

## 📖 Learning Resources

- [Vault Documentation](https://www.vaultproject.io/docs)
- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [MongoDB Atlas Guide](https://docs.atlas.mongodb.com)
- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Documentation](https://docs.docker.com/compose)

---

## 🎯 Next Steps

1. **Develop Features**:
   - Implement resource management endpoints
   - Create admin dashboard
   - Add user profile management

2. **Enhance Security**:
   - Implement OAuth2/Google Sign-In
   - Add rate limiting
   - Implement CORS properly
   - Add HTTPS certificates

3. **Production Deployment**:
   - Set up Vault with HA storage (Consul, S3, etc.)
   - Configure proper SSL/TLS certificates
   - Implement CI/CD pipeline
   - Set up monitoring and logging (ELK Stack, Datadog, etc.)
   - Deploy to cloud (AWS, GCP, Azure)

4. **Testing**:
   - Write unit tests
   - Add integration tests
   - Setup E2E testing (Cypress, Playwright)
   - Configure GitHub Actions for CI/CD

---

## 📞 Support & Help

For more information:
- Check `VAULT_SETUP.md` for detailed Vault setup
- Review `README.md` for project overview
- Check individual service logs using `docker logs`
- Examine network connectivity with `docker network inspect study-resource-hub_app-network`

---

**Last Updated**: March 28, 2026  
**Application Status**: ✅ Running Successfully
