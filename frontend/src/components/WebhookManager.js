import React, { useState, useEffect } from "react";

export default function WebhookManager() {
  const [webhooks, setWebhooks] = useState([]);
  const [supportedEvents, setSupportedEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [newWebhook, setNewWebhook] = useState({
    name: "",
    url: "",
    events: [],
  });

  // Load webhooks on mount
  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/webhooks");
      const data = await response.json();
      if (data.ok) {
        setWebhooks(data.webhooks);
        setSupportedEvents(data.supported_events);
      }
    } catch (error) {
      alert("Failed to load webhooks: " + error.message);
    }
    setLoading(false);
  };

  const createWebhook = async (e) => {
    e.preventDefault();

    if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
      alert("Please fill in all fields and select at least one event");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWebhook),
      });
      const data = await response.json();
      if (data.ok) {
        alert("Webhook created successfully!");
        setNewWebhook({ name: "", url: "", events: [] });
        setShowAddForm(false);
        loadWebhooks();
      } else {
        alert("Failed to create webhook: " + (data.detail || "Unknown error"));
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const deleteWebhook = async (webhookId) => {
    if (!window.confirm("Are you sure you want to delete this webhook?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/webhooks/${webhookId}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      if (data.ok) {
        alert("Webhook deleted successfully!");
        loadWebhooks();
      } else {
        alert("Failed to delete webhook");
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const testWebhook = async (url) => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (data.ok) {
        alert("Test webhook sent successfully! Check your webhook receiver.");
      } else {
        alert("Test failed: " + (data.detail || "Unknown error"));
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const handleEventToggle = (event) => {
    setNewWebhook((prev) => {
      const events = prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event];
      return { ...prev, events };
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🔗 Webhook Management</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={styles.addButton}
          disabled={loading}
        >
          {showAddForm ? "Cancel" : "+ Add Webhook"}
        </button>
      </div>

      <p style={styles.description}>
        Webhooks allow you to receive real-time notifications when events occur.
        Compatible with Zapier, Make.com, and custom endpoints.
      </p>

      {/* Add Webhook Form */}
      {showAddForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>Create New Webhook</h3>
          <form onSubmit={createWebhook} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Webhook Name</label>
              <input
                type="text"
                value={newWebhook.name}
                onChange={(e) =>
                  setNewWebhook({ ...newWebhook, name: e.target.value })
                }
                placeholder="My Zapier Integration"
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Webhook URL</label>
              <input
                type="url"
                value={newWebhook.url}
                onChange={(e) =>
                  setNewWebhook({ ...newWebhook, url: e.target.value })
                }
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Events to Subscribe</label>
              <div style={styles.eventList}>
                {supportedEvents.map((event) => (
                  <label key={event} style={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={newWebhook.events.includes(event)}
                      onChange={() => handleEventToggle(event)}
                      disabled={loading}
                    />
                    <span style={styles.checkboxLabel}>{event}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.formActions}>
              <button
                type="submit"
                style={styles.submitButton}
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Webhook"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Webhooks List */}
      <div style={styles.webhooksList}>
        <h3 style={styles.listTitle}>
          Registered Webhooks ({webhooks.length})
        </h3>

        {loading && <p style={styles.loading}>Loading...</p>}

        {!loading && webhooks.length === 0 && (
          <p style={styles.emptyState}>
            No webhooks configured yet. Click "Add Webhook" to create one.
          </p>
        )}

        {!loading &&
          webhooks.map((webhook) => (
            <div key={webhook.id} style={styles.webhookCard}>
              <div style={styles.webhookHeader}>
                <div>
                  <h4 style={styles.webhookName}>
                    {webhook.name}
                    {webhook.enabled && (
                      <span style={styles.enabledBadge}>Active</span>
                    )}
                  </h4>
                  <p style={styles.webhookUrl}>{webhook.url}</p>
                </div>
                <div style={styles.webhookActions}>
                  <button
                    onClick={() => testWebhook(webhook.url)}
                    style={styles.testButton}
                    disabled={loading}
                  >
                    Test
                  </button>
                  <button
                    onClick={() => deleteWebhook(webhook.id)}
                    style={styles.deleteButton}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={styles.webhookEvents}>
                <strong>Events:</strong>{" "}
                {webhook.events.map((event, idx) => (
                  <span key={event} style={styles.eventTag}>
                    {event}
                    {idx < webhook.events.length - 1 && ", "}
                  </span>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    backgroundColor: "var(--bg-secondary, #f5f5f5)",
    borderRadius: "8px",
    marginTop: "20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },
  title: {
    fontSize: "24px",
    margin: 0,
    color: "var(--text-primary, #333)",
  },
  description: {
    fontSize: "14px",
    color: "var(--text-secondary, #666)",
    marginBottom: "20px",
    lineHeight: "1.5",
  },
  addButton: {
    padding: "10px 20px",
    fontSize: "14px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  formCard: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  formTitle: {
    fontSize: "18px",
    marginBottom: "15px",
    color: "var(--text-primary, #333)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "5px",
    color: "var(--text-primary, #333)",
  },
  input: {
    padding: "10px",
    fontSize: "14px",
    border: "1px solid var(--border-color, #ddd)",
    borderRadius: "4px",
  },
  eventList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "10px",
    backgroundColor: "var(--bg-secondary, #f9f9f9)",
    borderRadius: "4px",
  },
  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
  },
  checkboxLabel: {
    fontSize: "14px",
    color: "var(--text-primary, #333)",
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
  },
  submitButton: {
    padding: "10px 24px",
    fontSize: "14px",
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  webhooksList: {
    marginTop: "20px",
  },
  listTitle: {
    fontSize: "18px",
    marginBottom: "15px",
    color: "var(--text-primary, #333)",
  },
  loading: {
    textAlign: "center",
    color: "var(--text-secondary, #666)",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    color: "var(--text-secondary, #999)",
    fontSize: "14px",
  },
  webhookCard: {
    backgroundColor: "white",
    padding: "15px",
    borderRadius: "4px",
    marginBottom: "10px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  webhookHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "10px",
  },
  webhookName: {
    fontSize: "16px",
    fontWeight: "bold",
    margin: "0 0 5px 0",
    color: "var(--text-primary, #333)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  webhookUrl: {
    fontSize: "12px",
    color: "var(--text-secondary, #666)",
    margin: 0,
    wordBreak: "break-all",
  },
  enabledBadge: {
    fontSize: "11px",
    padding: "2px 8px",
    backgroundColor: "#4CAF50",
    color: "white",
    borderRadius: "12px",
    fontWeight: "normal",
  },
  webhookActions: {
    display: "flex",
    gap: "8px",
  },
  testButton: {
    padding: "6px 12px",
    fontSize: "12px",
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  deleteButton: {
    padding: "6px 12px",
    fontSize: "12px",
    backgroundColor: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  webhookEvents: {
    fontSize: "13px",
    color: "var(--text-secondary, #666)",
  },
  eventTag: {
    fontSize: "12px",
    color: "var(--text-primary, #333)",
    fontFamily: "monospace",
  },
};
