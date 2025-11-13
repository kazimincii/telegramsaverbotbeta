import React, { useState, useEffect } from "react";

export default function EnterpriseManager() {
  const [activeTab, setActiveTab] = useState("organizations");
  const [organizations, setOrganizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);

  // New organization form
  const [newOrg, setNewOrg] = useState({ name: "", plan: "free" });

  // New user form
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    organization_id: "",
    role_ids: [],
  });

  // New role form
  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
    permissions: [],
  });

  useEffect(() => {
    fetchOrganizations();
    fetchUsers();
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/rbac/organizations");
      const data = await response.json();
      if (data.ok) {
        setOrganizations(data.organizations);
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/rbac/users");
      const data = await response.json();
      if (data.ok) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/rbac/roles");
      const data = await response.json();
      if (data.ok) {
        setRoles(data.roles);
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/rbac/permissions");
      const data = await response.json();
      if (data.ok) {
        setPermissions(data.permissions);
      }
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
    }
  };

  const createOrganization = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/rbac/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrg),
      });

      const data = await response.json();
      if (data.ok) {
        alert("Organization created successfully!");
        setNewOrg({ name: "", plan: "free" });
        fetchOrganizations();
      }
    } catch (error) {
      alert("Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/rbac/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();
      if (data.ok) {
        alert(`User created! API Key: ${data.user.api_key}`);
        setNewUser({ username: "", email: "", organization_id: "", role_ids: [] });
        fetchUsers();
      }
    } catch (error) {
      alert("Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const createRole = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/rbac/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRole),
      });

      const data = await response.json();
      if (data.ok) {
        alert("Role created successfully!");
        setNewRole({ name: "", description: "", permissions: [] });
        fetchRoles();
      }
    } catch (error) {
      alert("Failed to create role");
    } finally {
      setLoading(false);
    }
  };

  const deleteOrganization = async (orgId) => {
    if (!confirm("Delete organization and all its users?")) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/rbac/organizations/${orgId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        alert("Organization deleted");
        fetchOrganizations();
        fetchUsers();
      }
    } catch (error) {
      alert("Failed to delete organization");
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm("Delete this user?")) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/rbac/users/${userId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        alert("User deleted");
        fetchUsers();
      }
    } catch (error) {
      alert("Failed to delete user");
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏢 Enterprise Management</h2>
      <p style={styles.subtitle}>Multi-tenant organization and RBAC management</p>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={activeTab === "organizations" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("organizations")}
        >
          Organizations ({organizations.length})
        </button>
        <button
          style={activeTab === "users" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("users")}
        >
          Users ({users.length})
        </button>
        <button
          style={activeTab === "roles" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("roles")}
        >
          Roles ({roles.length})
        </button>
        <button
          style={activeTab === "permissions" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("permissions")}
        >
          Permissions ({permissions.length})
        </button>
      </div>

      {/* Organizations Tab */}
      {activeTab === "organizations" && (
        <div style={styles.tabContent}>
          <h3>Create Organization</h3>
          <form onSubmit={createOrganization} style={styles.form}>
            <input
              type="text"
              placeholder="Organization Name"
              value={newOrg.name}
              onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
              required
              style={styles.input}
            />
            <select
              value={newOrg.plan}
              onChange={(e) => setNewOrg({ ...newOrg, plan: e.target.value })}
              style={styles.input}
            >
              <option value="free">Free (3 users, 10GB)</option>
              <option value="pro">Pro (10 users, 100GB)</option>
              <option value="enterprise">Enterprise (Unlimited)</option>
            </select>
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? "Creating..." : "Create Organization"}
            </button>
          </form>

          <h3 style={{ marginTop: "30px" }}>Organizations</h3>
          <div style={styles.grid}>
            {organizations.map((org) => (
              <div key={org.org_id} style={styles.card}>
                <h4>{org.name}</h4>
                <p><strong>Plan:</strong> {org.plan}</p>
                <p><strong>Max Users:</strong> {org.max_users}</p>
                <p><strong>Storage:</strong> {org.max_storage_gb}GB</p>
                <p><strong>Created:</strong> {new Date(org.created_at).toLocaleDateString()}</p>
                <p style={styles.orgId}>ID: {org.org_id}</p>
                <button
                  onClick={() => deleteOrganization(org.org_id)}
                  style={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div style={styles.tabContent}>
          <h3>Create User</h3>
          <form onSubmit={createUser} style={styles.form}>
            <input
              type="text"
              placeholder="Username"
              value={newUser.username}
              onChange={(e) =>
                setNewUser({ ...newUser, username: e.target.value })
              }
              required
              style={styles.input}
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              required
              style={styles.input}
            />
            <select
              value={newUser.organization_id}
              onChange={(e) =>
                setNewUser({ ...newUser, organization_id: e.target.value })
              }
              required
              style={styles.input}
            >
              <option value="">Select Organization</option>
              {organizations.map((org) => (
                <option key={org.org_id} value={org.org_id}>
                  {org.name}
                </option>
              ))}
            </select>
            <select
              multiple
              value={newUser.role_ids}
              onChange={(e) =>
                setNewUser({
                  ...newUser,
                  role_ids: Array.from(e.target.selectedOptions, (option) => option.value),
                })
              }
              style={{ ...styles.input, height: "80px" }}
            >
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? "Creating..." : "Create User"}
            </button>
          </form>

          <h3 style={{ marginTop: "30px" }}>Users</h3>
          <div style={styles.grid}>
            {users.map((user) => (
              <div key={user.user_id} style={styles.card}>
                <h4>{user.username}</h4>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Org:</strong> {user.organization_id}</p>
                <p><strong>Roles:</strong> {user.roles.join(", ")}</p>
                <p style={styles.apiKey}>API Key: {user.api_key}</p>
                <button
                  onClick={() => deleteUser(user.user_id)}
                  style={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === "roles" && (
        <div style={styles.tabContent}>
          <h3>Create Custom Role</h3>
          <form onSubmit={createRole} style={styles.form}>
            <input
              type="text"
              placeholder="Role Name"
              value={newRole.name}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              required
              style={styles.input}
            />
            <input
              type="text"
              placeholder="Description"
              value={newRole.description}
              onChange={(e) =>
                setNewRole({ ...newRole, description: e.target.value })
              }
              style={styles.input}
            />
            <select
              multiple
              value={newRole.permissions}
              onChange={(e) =>
                setNewRole({
                  ...newRole,
                  permissions: Array.from(e.target.selectedOptions, (opt) => opt.value),
                })
              }
              style={{ ...styles.input, height: "150px" }}
            >
              {permissions.map((perm) => (
                <option key={perm.name} value={perm.name}>
                  {perm.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? "Creating..." : "Create Role"}
            </button>
          </form>

          <h3 style={{ marginTop: "30px" }}>Roles</h3>
          <div style={styles.grid}>
            {roles.map((role) => (
              <div key={role.role_id} style={styles.card}>
                <h4>{role.name}</h4>
                <p>{role.description}</p>
                <p><strong>Permissions:</strong> {role.permissions.length}</p>
                <details>
                  <summary>View Permissions</summary>
                  <ul style={{ fontSize: "12px", marginTop: "5px" }}>
                    {role.permissions.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </details>
                {role.is_system_role && (
                  <span style={styles.badge}>System Role</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === "permissions" && (
        <div style={styles.tabContent}>
          <h3>Available Permissions</h3>
          <div style={styles.grid}>
            {Object.entries(
              permissions.reduce((acc, perm) => {
                if (!acc[perm.category]) acc[perm.category] = [];
                acc[perm.category].push(perm.name);
                return acc;
              }, {})
            ).map(([category, perms]) => (
              <div key={category} style={styles.card}>
                <h4>{category.toUpperCase()}</h4>
                <ul style={{ fontSize: "13px", lineHeight: "1.8" }}>
                  {perms.map((perm) => (
                    <li key={perm}>{perm}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
    maxWidth: "1400px",
    margin: "120px auto 40px",
    fontFamily: "Arial, sans-serif",
  },
  title: {
    fontSize: "32px",
    marginBottom: "10px",
    color: "#333",
  },
  subtitle: {
    fontSize: "16px",
    color: "#666",
    marginBottom: "30px",
  },
  tabs: {
    display: "flex",
    gap: "10px",
    marginBottom: "30px",
    borderBottom: "2px solid #eee",
  },
  tab: {
    padding: "12px 20px",
    background: "transparent",
    border: "none",
    borderBottom: "3px solid transparent",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "500",
    color: "#666",
    transition: "all 0.3s",
  },
  tabActive: {
    padding: "12px 20px",
    background: "transparent",
    border: "none",
    borderBottom: "3px solid #667eea",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
    color: "#667eea",
  },
  tabContent: {
    animation: "fadeIn 0.3s",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    maxWidth: "500px",
    padding: "20px",
    background: "#f9f9f9",
    borderRadius: "8px",
  },
  input: {
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
  },
  button: {
    padding: "12px 20px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  deleteButton: {
    padding: "8px 16px",
    background: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "13px",
    cursor: "pointer",
    marginTop: "10px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
    marginTop: "20px",
  },
  card: {
    padding: "20px",
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    border: "1px solid #eee",
  },
  orgId: {
    fontSize: "11px",
    color: "#999",
    marginTop: "10px",
    wordBreak: "break-all",
  },
  apiKey: {
    fontSize: "11px",
    color: "#999",
    marginTop: "10px",
    wordBreak: "break-all",
    background: "#f0f0f0",
    padding: "8px",
    borderRadius: "4px",
  },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    background: "#667eea",
    color: "white",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "600",
    marginTop: "10px",
  },
};
