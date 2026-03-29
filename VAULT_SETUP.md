# HashiCorp Vault Integration for Study Resource Hub

This application uses HashiCorp Vault to securely manage and inject sensitive configuration secrets instead of hardcoding them in the codebase.

## Architecture

```
┌─────────────┐
│   Vault     │ (Port 8200)
│   Server    │ Stores secrets (MongoDB URI, JWT Secret, etc.)
└──────┬──────┘
       │
       ├─→ Vault Init Container (One-time setup)
       │   └─ Initializes Vault, enables AppRole, stores AppRole credentials
       │
       └─→ Vault Agent (In Backend Container)
           ├─ Authenticates using AppRole credentials
           ├─ Fetches secrets from Vault
           └─ Injects them into backend.env
```

## Components

### 1. **Vault Server** (`vault` service)
- HashiCorp Vault in development mode
- Listens on `http://vault:8200`
- Stores all application secrets
- Data persisted in Docker volume

### 2. **Vault Init** (`vault-init` service)
- One-time initialization container
- Initializes Vault with unseal keys
- Enables AppRole authentication method
- Creates backend policy and role
- Generates and stores AppRole credentials in shared volume
- Automatically exits after completion

### 3. **Vault Agent** (In Backend Container)
- Authenticates to Vault using AppRole credentials
- Fetches secrets on startup using role-id and secret-id
- Renders `backend.env.tpl` template with secrets
- Injects environment variables into backend process
- Can be configured to periodically refresh secrets

## Secrets Stored in Vault

Location: `secret/app/backend`

```json
{
  "mongodb_uri": "mongodb+srv://cloudstudy:LDczPh2BrCjjWlhQ@quantumcluster.mbr8y.mongodb.net/resources?retryWrites=true&w=majority",
  "port": "5000",
  "jwt_secret": "JIxHE$&R%E4e1^%jH1K8RmNyl"
}
```

## AppRole Authentication

The backend container authenticates to Vault using AppRole:

- **Role ID**: Stored in `/vault/secrets/role-id`
- **Secret ID**: Stored in `/vault/secrets/secret-id`
- **Policy**: `backend` policy with read access to `secret/app/backend`

## Getting Started

### 1. **Start the Application with Vault**

```bash
docker-compose up --build
```

#### What happens:
1. Vault container starts and initializes
2. Vault Init container sets up AppRole, policies, and secrets
3. Backend container waits for Vault Init to complete
4. Backend Vault Agent fetches secrets and starts the Node.js server
5. Frontend and Nginx start normally

### 2. **Access Vault UI**

Once running, access the Vault UI:
- **URL**: http://localhost:8200/ui
- **Token**: `root` (for development only)

### 3. **Verify Secrets in Vault**

```bash
# Enter the Vault container
docker exec -it vault_server sh

# Login to Vault
vault login -method=token token=root

# View stored secrets
vault kv get secret/app/backend

# List all secrets
vault kv list secret/app/
```

## Configuration Files

### `/vault/config/vault.hcl`
Main Vault server configuration:
- File-based storage backend
- TCP listener on port 8200
- UI enabled for development

### `/vault/config/agent.hcl`
Vault Agent configuration (runs in backend container):
- AppRole auto-authentication
- Template rendering for `backend.env`
- Caching for performance
- Signal configuration (HUP on secret refresh)

### `/vault/config/backend.env.tpl`
Template for rendering backend environment file:
```
{{- with secret "secret/data/app/backend" -}}
MONGODB_URI={{ .Data.data.mongodb_uri }}
PORT={{ .Data.data.port }}
JWT_SECRET={{ .Data.data.jwt_secret }}
{{- end }}
```

## Scripts

### `/vault/scripts/init-vault.sh`
Initialization script that:
1. Waits for Vault server to be ready
2. Initializes Vault (one-time)
3. Unseals Vault with unseal key
4. Enables KV v2 secrets engine
5. Creates AppRole role and policy
6. Stores secrets in Vault
7. Saves credentials to shared volume

### `/vault/scripts/entrypoint.sh`
Backend container entrypoint that:
1. Waits for Vault server
2. Waits for AppRole credentials
3. Starts Vault Agent
4. Waits for agent to fetch secrets
5. Loads environment variables
6. Starts Node.js application

## Security Considerations

### Development Mode (Current Setup)
- ✅ Secrets not hardcoded in code
- ✅ Secrets encrypted at rest
- ⚠️ Using root token (development only)
- ⚠️ TLS disabled (development only)

### Production Hardening

1. **Enable TLS**:
   ```hcl
   listener "tcp" {
     address       = "0.0.0.0:8200"
     tls_cert_file = "/vault/certs/server.crt"
     tls_key_file  = "/vault/certs/server.key"
   }
   ```

2. **Use Persisted Storage**:
   ```hcl
   storage "consul" {
     address = "consul:8500"
     path    = "vault/"
   }
   ```

3. **Implement Seal Wrapping**:
   ```hcl
   seal "awskms" {
     region = "us-east-1"
     kms_key_id = "arn:aws:kms:..."
   }
   ```

4. **Enable Audit Logging**:
   ```bash
   vault audit enable file file_path=/vault/logs/audit.log
   ```

5. **Use Kubernetes Auth** (in K8s):
   - Replace AppRole with Kubernetes authentication
   - No need to manage credentials manually

## Troubleshooting

### Vault Init Container Won't Complete
```bash
# Check logs
docker logs vault_init

# Manually initialize (if needed)
docker exec vault_server vault operator init
docker exec vault_server vault operator unseal <key>
```

### Backend Container Can't Connect to Vault
```bash
# Verify network connectivity
docker exec backend_resource ping vault

# Check Vault is running
docker ps | grep vault

# Check Vault status
docker exec vault_server vault status
```

### Secrets Not Loaded
```bash
# Check if credentials exist
docker exec backend_resource ls -la /vault/secrets/

# Check Vault Agent logs
docker logs backend_resource | grep "Vault Agent"

# Manually verify agent configuration
docker exec backend_resource cat /vault/config/agent.hcl
```

## Advanced Usage

### Update Secrets in Vault

```bash
# Method 1: Using CLI
docker exec vault_server vault login -method=token token=root
docker exec vault_server vault kv put secret/app/backend \
  mongodb_uri="new-connection-string" \
  jwt_secret="new-secret"

# Method 2: Using HTTP API
curl -X POST http://localhost:8200/v1/secret/data/app/backend \
  -H "X-Vault-Token: root" \
  -d '{
    "data": {
      "mongodb_uri": "new-connection-string",
      "port": "5000",
      "jwt_secret": "new-secret"
    }
  }'
```

### Specify Secret Rotation Duration

In `agent.hcl`, configure TTL:
```hcl
auto_auth {
  method {
    config = {
      # Secrets expire after 1 hour
      role_id_file_path = "/vault/secrets/role-id"
      secret_id_file_path = "/vault/secrets/secret-id"
      remove_secret_id_file_after_reading = false
    }
  }
}
```

### Enable Detailed Logging

Update `agent.hcl`:
```hcl
vault {
  address = "http://vault:8200"
  retry {
    num_retries = 5
  }
}
```

## For Local Development Without Docker

If you want to run Vault locally:

```bash
# Install Vault locally
brew install vault  # macOS
# or download from https://www.vaultproject.io/downloads

# Start Vault in dev mode
vault server -dev

# In another terminal, set up secrets
export VAULT_ADDR='http://127.0.0.1:8200'
vault login -method=token token=s.XXXXXXXXXXXXXX

# Enable KV and add secrets
vault secrets enable -version=2 kv
vault kv put secret/app/backend \
  mongodb_uri="..." \
  port="5000" \
  jwt_secret="..."

# Update backend/.env or run Vault Agent locally
```

## Migration from Hardcoded .env

If you had hardcoded `.env` file before:

1. **Old way** (less secure):
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=secret
   ```

2. **New way** (secure with Vault):
   - Secrets stored in Vault instead of `.env`
   - `.env` is a fallback for local development
   - Backend container injects secrets automatically
   - No need to commit secrets to version control

## References

- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [AppRole Auth Method](https://www.vaultproject.io/docs/auth/approle)
- [Vault Agent](https://www.vaultproject.io/docs/agent)
- [KV Secrets Engine v2](https://www.vaultproject.io/docs/secrets/kv/kv-v2)

---

**Note**: This setup is for development/staging. For production, implement additional security measures like TLS, persistent storage, audit logging, and proper authentication methods (e.g., Kubernetes Auth).
