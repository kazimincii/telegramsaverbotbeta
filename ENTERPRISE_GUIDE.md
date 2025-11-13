# Enterprise Features Guide

Complete guide for multi-tenant architecture and Role-Based Access Control (RBAC) in Telegram Saver Bot.

## Overview

Enterprise features enable organizations to:
- 🏢 **Multi-Tenancy**: Multiple isolated organizations
- 👥 **User Management**: Create and manage users per organization
- 🔐 **RBAC**: Role-based permissions system
- 🔑 **API Authentication**: Secure API key-based access
- 📊 **Plan Tiers**: Free, Pro, and Enterprise plans

## Quick Start

### 1. Create an Organization

```bash
curl -X POST http://localhost:8000/api/rbac/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "plan": "pro"
  }'
```

### 2. Create a User

```bash
curl -X POST http://localhost:8000/api/rbac/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@acme.com",
    "organization_id": "org_xxx",
    "role_ids": ["admin"]
  }'
```

### 3. Authenticate with API Key

```bash
curl -X POST http://localhost:8000/api/rbac/authenticate \
  -H "Content-Type": "application/json" \
  -d '{
    "api_key": "tk_xxx"
  }'
```

## Plan Tiers

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| **Max Users** | 3 | 10 | Unlimited |
| **Storage** | 10GB | 100GB | Unlimited |
| **Price** | $0/mo | $29/mo | Custom |
| **Support** | Community | Email | Priority |

## Default Roles

### Administrator
- Full system access
- Can manage everything
- Permission: `system.admin`

### Manager
- Can manage downloads and media
- Can create webhooks
- Can view analytics
- **Permissions**: download.*, media.*, webhook.*, analytics.view

### Viewer
- Read-only access
- Can view downloads, media, analytics
- **Permissions**: *.view

## Permissions System

### Available Permissions

#### Download Permissions
- `download.start` - Start downloads
- `download.stop` - Stop downloads
- `download.view` - View download status
- `download.delete` - Delete downloads

#### Media Permissions
- `media.view` - View media files
- `media.upload` - Upload media
- `media.delete` - Delete media
- `media.export` - Export media

#### Webhook Permissions
- `webhook.create` - Create webhooks
- `webhook.edit` - Edit webhooks
- `webhook.delete` - Delete webhooks
- `webhook.view` - View webhooks

#### Cloud Sync Permissions
- `cloud.configure` - Configure cloud storage
- `cloud.sync` - Trigger sync
- `cloud.view` - View sync status

#### Plugin Permissions
- `plugin.install` - Install plugins
- `plugin.uninstall` - Uninstall plugins
- `plugin.configure` - Configure plugins
- `plugin.view` - View plugins

#### IPFS Permissions
- `ipfs.upload` - Upload to IPFS
- `ipfs.download` - Download from IPFS
- `ipfs.pin` - Pin files
- `ipfs.unpin` - Unpin files

#### User Management
- `user.create` - Create users
- `user.edit` - Edit users
- `user.delete` - Delete users
- `user.view` - View users

#### Organization Management
- `org.create` - Create organizations
- `org.edit` - Edit organizations
- `org.delete` - Delete organizations
- `org.view` - View organizations
- `org.manage_users` - Manage organization users

#### Role Management
- `role.create` - Create custom roles
- `role.edit` - Edit roles
- `role.delete` - Delete roles
- `role.view` - View roles

#### Settings
- `settings.view` - View settings
- `settings.edit` - Edit settings

#### Analytics
- `analytics.view` - View analytics
- `analytics.export` - Export analytics data

#### System Admin
- `system.admin` - Full system access (overrides all)

## API Reference

### Organizations

#### List Organizations
```bash
GET /api/rbac/organizations
```

#### Create Organization
```bash
POST /api/rbac/organizations
{
  "name": "Acme Corp",
  "plan": "pro"  # free, pro, enterprise
}
```

#### Get Organization
```bash
GET /api/rbac/organizations/{org_id}
```

#### Delete Organization
```bash
DELETE /api/rbac/organizations/{org_id}
```

### Users

#### List Users
```bash
GET /api/rbac/users?org_id={org_id}
```

#### Create User
```bash
POST /api/rbac/users
{
  "username": "john_doe",
  "email": "john@example.com",
  "organization_id": "org_xxx",
  "role_ids": ["admin", "manager"]
}
```

#### Get User
```bash
GET /api/rbac/users/{user_id}
```

#### Delete User
```bash
DELETE /api/rbac/users/{user_id}
```

#### Assign Role to User
```bash
POST /api/rbac/users/{user_id}/roles
{
  "role_id": "admin"
}
```

#### Remove Role from User
```bash
DELETE /api/rbac/users/{user_id}/roles/{role_id}
```

### Roles

#### List Roles
```bash
GET /api/rbac/roles
```

#### Create Custom Role
```bash
POST /api/rbac/roles
{
  "name": "Content Manager",
  "description": "Can manage media and downloads",
  "permissions": ["media.view", "media.upload", "download.start"]
}
```

#### Get Role
```bash
GET /api/rbac/roles/{role_id}
```

#### Delete Role
```bash
DELETE /api/rbac/roles/{role_id}
```

### Permissions

#### List All Permissions
```bash
GET /api/rbac/permissions
```

#### Check User Permission
```bash
POST /api/rbac/check-permission
{
  "user_id": "user_xxx",
  "permission": "media.delete"
}
```

### Authentication

#### Authenticate with API Key
```bash
POST /api/rbac/authenticate
{
  "api_key": "tk_xxx"
}
```

## Use Cases

### Use Case 1: Enterprise with Multiple Teams

**Scenario**: Large company with multiple departments

1. **Create Organization**
   ```bash
   curl -X POST .../api/rbac/organizations \
     -d '{"name": "Acme Corp", "plan": "enterprise"}'
   ```

2. **Create Departments (Custom Roles)**
   ```bash
   # Marketing role
   curl -X POST .../api/rbac/roles \
     -d '{
       "name": "Marketing Team",
       "description": "Access to media and analytics",
       "permissions": ["media.view", "media.upload", "analytics.view"]
     }'

   # IT role
   curl -X POST .../api/rbac/roles \
     -d '{
       "name": "IT Team",
       "description": "Full technical access",
       "permissions": ["plugin.install", "cloud.configure", "settings.edit"]
     }'
   ```

3. **Create Users**
   ```bash
   # Marketing user
   curl -X POST .../api/rbac/users \
     -d '{
       "username": "sarah_marketing",
       "email": "sarah@acme.com",
       "organization_id": "org_acme",
       "role_ids": ["role_marketing"]
     }'

   # IT user
   curl -X POST .../api/rbac/users \
     -d '{
       "username": "mike_it",
       "email": "mike@acme.com",
       "organization_id": "org_acme",
       "role_ids": ["role_it", "admin"]
     }'
   ```

### Use Case 2: SaaS Multi-Tenant Application

**Scenario**: Multiple clients, each with isolated data

1. **Create Organizations per Client**
   ```bash
   # Client A
   curl -X POST .../api/rbac/organizations \
     -d '{"name": "Client A", "plan": "pro"}'

   # Client B
   curl -X POST .../api/rbac/organizations \
     -d '{"name": "Client B", "plan": "free"}'
   ```

2. **Each Client Gets Their Own Users**
   ```bash
   # Client A admin
   curl -X POST .../api/rbac/users \
     -d '{
       "username": "admin_clienta",
       "email": "admin@clienta.com",
       "organization_id": "org_clienta",
       "role_ids": ["admin"]
     }'

   # Client B viewer
   curl -X POST .../api/rbac/users \
     -d '{
       "username": "viewer_clientb",
       "email": "viewer@clientb.com",
       "organization_id": "org_clientb",
       "role_ids": ["viewer"]
     }'
   ```

3. **API Authentication per Client**
   ```bash
   # Each user gets unique API key
   # Client A uses: tk_xxx_clienta
   # Client B uses: tk_yyy_clientb
   ```

### Use Case 3: Granular Permission Control

**Scenario**: Custom permissions for specific workflows

1. **Create Custom Roles**
   ```bash
   # Read-only auditor
   curl -X POST .../api/rbac/roles \
     -d '{
       "name": "Auditor",
       "description": "View-only access for compliance",
       "permissions": [
         "download.view", "media.view", "analytics.view",
         "webhook.view", "user.view", "org.view"
       ]
     }'

   # Content moderator
   curl -X POST .../api/rbac/roles \
     -d '{
       "name": "Content Moderator",
       "description": "Can review and delete inappropriate content",
       "permissions": ["media.view", "media.delete", "analytics.view"]
     }'
   ```

2. **Assign to Users**
   ```bash
   curl -X POST .../api/rbac/users/{user_id}/roles \
     -d '{"role_id": "role_auditor"}'
   ```

## Frontend Integration

### Using Enterprise Manager Component

```javascript
import EnterpriseManager from "./components/EnterpriseManager";

function App() {
  return (
    <div>
      <EnterpriseManager />
    </div>
  );
}
```

The component provides:
- Organization management UI
- User creation and management
- Role management
- Permission browsing
- API key display

## Best Practices

### 1. Principle of Least Privilege
Give users only the permissions they need:

```bash
# Good: Specific permissions for analytics viewer
{
  "role": "Analytics Viewer",
  "permissions": ["analytics.view", "media.view"]
}

# Bad: Excessive permissions
{
  "role": "Analytics Viewer",
  "permissions": ["system.admin"]
}
```

### 2. Use Custom Roles for Teams
Create department-specific roles:

```bash
# Marketing team
{
  "name": "Marketing",
  "permissions": ["media.view", "media.upload", "analytics.view"]
}

# Operations team
{
  "name": "Operations",
  "permissions": ["download.start", "download.stop", "cloud.sync"]
}
```

### 3. Rotate API Keys Regularly
Users should regenerate API keys periodically for security.

### 4. Monitor Permission Usage
Track which permissions are actually used to optimize roles.

### 5. Separate Production and Test Organizations
Create separate organizations for testing:

```bash
curl -X POST .../api/rbac/organizations \
  -d '{"name": "Acme Corp - Staging", "plan": "free"}'
```

## Security Considerations

### API Key Security
- **Never commit API keys** to version control
- **Rotate keys** after suspected compromise
- **Use environment variables** for API keys
- **Restrict key usage** to specific IP ranges (future feature)

### Permission Auditing
- **Log all permission checks** for compliance
- **Review role assignments** regularly
- **Alert on permission escalation** attempts

### Organization Isolation
- **Data is isolated** per organization
- **Users cannot access** other organizations' data
- **Admin users** can only manage their own organization

## Migration Guide

### Migrating from Single-Tenant to Multi-Tenant

1. **Create Default Organization**
   ```bash
   curl -X POST .../api/rbac/organizations \
     -d '{"name": "Default Org", "plan": "enterprise"}'
   ```

2. **Migrate Existing Users**
   ```bash
   # Create users under default organization
   for user in existing_users:
     curl -X POST .../api/rbac/users \
       -d '{
         "username": user.name,
         "email": user.email,
         "organization_id": "org_default",
         "role_ids": ["admin"]
       }'
   ```

3. **Update Application Code**
   ```python
   # Before
   def download():
       # No auth
       pass

   # After
   def download():
       api_key = request.headers.get("Authorization")
       user = rbac_manager.check_api_key(api_key)
       if not user or not rbac_manager.user_has_permission(user.user_id, Permission.DOWNLOAD_START):
           raise HTTPException(401, "Unauthorized")
       # Continue
   ```

## Troubleshooting

### User Creation Fails
**Error**: "Organization has reached user limit"

**Solution**: Upgrade organization plan or delete inactive users

```bash
# Check organization limits
curl http://localhost:8000/api/rbac/organizations/{org_id}

# Upgrade plan
curl -X PUT .../api/rbac/organizations/{org_id} \
  -d '{"plan": "pro"}'
```

### Permission Denied
**Error**: User cannot perform action

**Solution**: Check user's roles and permissions

```bash
# Check user permissions
curl -X POST .../api/rbac/check-permission \
  -d '{"user_id": "user_xxx", "permission": "media.delete"}'

# Assign required role
curl -X POST .../api/rbac/users/{user_id}/roles \
  -d '{"role_id": "manager"}'
```

### Cannot Delete System Role
**Error**: "Cannot delete system role"

**Solution**: System roles (admin, manager, viewer) cannot be deleted. Create custom role instead.

## Support

- **Documentation**: See `RBAC_GUIDE.md`
- **API Reference**: Check `/api/rbac/` endpoints
- **Issues**: Report bugs in main repository

## License

Enterprise features inherit the license of the main application.
