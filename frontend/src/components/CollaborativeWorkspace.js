import React, { useState, useEffect, useContext } from 'react';
import './CollaborativeWorkspace.css';

const API_BASE = 'http://localhost:8000';

// Permission levels
const PERMISSIONS = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

const PERMISSION_HIERARCHY = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1
};

const CollaborativeWorkspace = () => {
  // State management
  const [view, setView] = useState('workspaces'); // workspaces, workspace-detail, collections, activity
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('user-' + Date.now()); // Mock user ID

  // Dialog states
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);

  // Form states
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [memberUserId, setMemberUserId] = useState('');
  const [memberPermission, setMemberPermission] = useState(PERMISSIONS.VIEWER);
  const [collectionName, setCollectionName] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemUrl, setItemUrl] = useState('');
  const [itemType, setItemType] = useState('file');
  const [commentText, setCommentText] = useState('');
  const [commentItemId, setCommentItemId] = useState(null);

  // Load user's workspaces on mount
  useEffect(() => {
    loadWorkspaces();
  }, []);

  // Load workspace details when selected
  useEffect(() => {
    if (selectedWorkspace) {
      loadWorkspaceDetails(selectedWorkspace.id);
    }
  }, [selectedWorkspace]);

  const loadWorkspaces = async () => {
    try {
      // In a real app, this would fetch user's workspaces
      // For now, we'll store them in localStorage
      const stored = localStorage.getItem('workspaces');
      if (stored) {
        setWorkspaces(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const loadWorkspaceDetails = async (workspaceId) => {
    try {
      // Load members
      const membersResponse = await fetch(`${API_BASE}/api/collaboration/workspace/${workspaceId}/members`);
      const membersData = await membersResponse.json();
      setMembers(membersData.members || []);

      // Load collections
      const collectionsResponse = await fetch(`${API_BASE}/api/collaboration/workspace/${workspaceId}/collections`);
      const collectionsData = await collectionsResponse.json();
      setCollections(collectionsData.collections || []);

      // Load activity feed
      const activityResponse = await fetch(`${API_BASE}/api/collaboration/workspace/${workspaceId}/activity`);
      const activityData = await activityResponse.json();
      setActivityFeed(activityData.activities || []);
    } catch (error) {
      console.error('Failed to load workspace details:', error);
    }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE}/api/collaboration/workspace/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workspaceName,
          description: workspaceDescription,
          owner_id: currentUserId
        })
      });

      const data = await response.json();

      if (data.success) {
        // Add to workspaces list
        const newWorkspaces = [...workspaces, data.workspace];
        setWorkspaces(newWorkspaces);
        localStorage.setItem('workspaces', JSON.stringify(newWorkspaces));

        setShowCreateWorkspace(false);
        setWorkspaceName('');
        setWorkspaceDescription('');

        // Select the new workspace
        setSelectedWorkspace(data.workspace);
        setView('workspace-detail');
      } else {
        alert('Failed to create workspace: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
      alert('Failed to create workspace');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE}/api/collaboration/member/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: selectedWorkspace.id,
          user_id: memberUserId,
          permission: memberPermission,
          added_by: currentUserId
        })
      });

      const data = await response.json();

      if (data.success) {
        setMembers([...members, data.member]);
        setShowAddMember(false);
        setMemberUserId('');
        setMemberPermission(PERMISSIONS.VIEWER);
        await loadWorkspaceDetails(selectedWorkspace.id);
      } else {
        alert('Failed to add member: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member');
    }
  };

  const handleUpdatePermission = async (userId, newPermission) => {
    try {
      const response = await fetch(`${API_BASE}/api/collaboration/permission/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: selectedWorkspace.id,
          user_id: userId,
          new_permission: newPermission,
          updated_by: currentUserId
        })
      });

      const data = await response.json();

      if (data.success) {
        await loadWorkspaceDetails(selectedWorkspace.id);
      } else {
        alert('Failed to update permission: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      alert('Failed to update permission');
    }
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE}/api/collaboration/collection/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: selectedWorkspace.id,
          name: collectionName,
          created_by: currentUserId
        })
      });

      const data = await response.json();

      if (data.success) {
        setCollections([...collections, data.collection]);
        setShowCreateCollection(false);
        setCollectionName('');
        await loadWorkspaceDetails(selectedWorkspace.id);
      } else {
        alert('Failed to create collection: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      alert('Failed to create collection');
    }
  };

  const handleAddToCollection = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE}/api/collaboration/collection/add-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_id: selectedCollection.id,
          item: {
            title: itemTitle,
            url: itemUrl,
            type: itemType
          },
          added_by: currentUserId
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowAddItem(false);
        setItemTitle('');
        setItemUrl('');
        setItemType('file');
        await loadWorkspaceDetails(selectedWorkspace.id);
      } else {
        alert('Failed to add item: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE}/api/collaboration/comment/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_id: selectedCollection.id,
          user_id: currentUserId,
          text: commentText,
          item_id: commentItemId
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowCommentDialog(false);
        setCommentText('');
        setCommentItemId(null);
        await loadWorkspaceDetails(selectedWorkspace.id);
      } else {
        alert('Failed to add comment: ' + data.error);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    }
  };

  const getCurrentUserPermission = () => {
    if (!selectedWorkspace || !members) return null;
    const member = members.find(m => m.user_id === currentUserId);
    return member ? member.permission : null;
  };

  const hasPermission = (requiredPermission) => {
    const userPermission = getCurrentUserPermission();
    if (!userPermission) return false;
    return PERMISSION_HIERARCHY[userPermission] >= PERMISSION_HIERARCHY[requiredPermission];
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const getActivityIcon = (action) => {
    const icons = {
      workspace_created: '🏢',
      member_added: '👤',
      permission_changed: '🔑',
      collection_created: '📁',
      item_added: '➕',
      comment_added: '💬'
    };
    return icons[action] || '📌';
  };

  // Render workspaces list
  const renderWorkspacesList = () => (
    <div className="workspaces-list">
      <div className="workspaces-header">
        <h2>My Workspaces</h2>
        <button className="btn-primary" onClick={() => setShowCreateWorkspace(true)}>
          + Create Workspace
        </button>
      </div>

      <div className="workspaces-grid">
        {workspaces.length === 0 ? (
          <div className="empty-state">
            <p>No workspaces yet. Create one to get started!</p>
          </div>
        ) : (
          workspaces.map(workspace => (
            <div
              key={workspace.id}
              className="workspace-card"
              onClick={() => {
                setSelectedWorkspace(workspace);
                setView('workspace-detail');
              }}
            >
              <h3>{workspace.name}</h3>
              <p>{workspace.description || 'No description'}</p>
              <div className="workspace-meta">
                <span>Created: {formatDate(workspace.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render workspace detail view
  const renderWorkspaceDetail = () => (
    <div className="workspace-detail">
      <div className="workspace-header">
        <button className="btn-back" onClick={() => {
          setSelectedWorkspace(null);
          setView('workspaces');
        }}>
          ← Back
        </button>
        <h2>{selectedWorkspace.name}</h2>
      </div>

      <div className="workspace-tabs">
        <button
          className={view === 'workspace-detail' ? 'active' : ''}
          onClick={() => setView('workspace-detail')}
        >
          Members
        </button>
        <button
          className={view === 'collections' ? 'active' : ''}
          onClick={() => setView('collections')}
        >
          Collections
        </button>
        <button
          className={view === 'activity' ? 'active' : ''}
          onClick={() => setView('activity')}
        >
          Activity
        </button>
      </div>

      <div className="workspace-content">
        {view === 'workspace-detail' && renderMembers()}
        {view === 'collections' && renderCollections()}
        {view === 'activity' && renderActivity()}
      </div>
    </div>
  );

  // Render members section
  const renderMembers = () => (
    <div className="members-section">
      <div className="section-header">
        <h3>Team Members</h3>
        {hasPermission(PERMISSIONS.ADMIN) && (
          <button className="btn-primary" onClick={() => setShowAddMember(true)}>
            + Add Member
          </button>
        )}
      </div>

      <div className="members-list">
        {members.map(member => (
          <div key={member.user_id} className="member-item">
            <div className="member-info">
              <div className="member-avatar">{member.user_id.charAt(0).toUpperCase()}</div>
              <div>
                <div className="member-name">{member.user_id}</div>
                <div className="member-date">Added: {formatDate(member.added_at)}</div>
              </div>
            </div>
            <div className="member-actions">
              {hasPermission(PERMISSIONS.ADMIN) && member.permission !== PERMISSIONS.OWNER ? (
                <select
                  value={member.permission}
                  onChange={(e) => handleUpdatePermission(member.user_id, e.target.value)}
                  className="permission-select"
                >
                  <option value={PERMISSIONS.VIEWER}>Viewer</option>
                  <option value={PERMISSIONS.EDITOR}>Editor</option>
                  <option value={PERMISSIONS.ADMIN}>Admin</option>
                </select>
              ) : (
                <span className="permission-badge permission-{member.permission}">
                  {member.permission}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render collections section
  const renderCollections = () => (
    <div className="collections-section">
      <div className="section-header">
        <h3>Shared Collections</h3>
        {hasPermission(PERMISSIONS.EDITOR) && (
          <button className="btn-primary" onClick={() => setShowCreateCollection(true)}>
            + Create Collection
          </button>
        )}
      </div>

      <div className="collections-grid">
        {collections.length === 0 ? (
          <div className="empty-state">
            <p>No collections yet. Create one to organize shared files!</p>
          </div>
        ) : (
          collections.map(collection => (
            <div key={collection.id} className="collection-card">
              <div className="collection-header">
                <h4>{collection.name}</h4>
                <span className="collection-count">{collection.items?.length || 0} items</span>
              </div>
              <div className="collection-meta">
                <span>Created by: {collection.created_by}</span>
                <span>Version: {collection.version}</span>
              </div>
              <div className="collection-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedCollection(collection);
                    setShowAddItem(true);
                  }}
                  disabled={!hasPermission(PERMISSIONS.EDITOR)}
                >
                  Add Item
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedCollection(collection);
                    setShowCommentDialog(true);
                  }}
                >
                  💬 {collection.comments?.length || 0}
                </button>
              </div>
              {collection.items && collection.items.length > 0 && (
                <div className="collection-items">
                  {collection.items.slice(0, 3).map(item => (
                    <div key={item.id} className="collection-item-preview">
                      <span className="item-icon">
                        {item.type === 'video' && '🎬'}
                        {item.type === 'image' && '🖼️'}
                        {item.type === 'audio' && '🎵'}
                        {item.type === 'document' && '📄'}
                        {item.type === 'file' && '📎'}
                      </span>
                      <span className="item-title">{item.title}</span>
                    </div>
                  ))}
                  {collection.items.length > 3 && (
                    <div className="collection-item-more">
                      +{collection.items.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render activity feed
  const renderActivity = () => (
    <div className="activity-section">
      <h3>Activity Feed</h3>
      <div className="activity-feed">
        {activityFeed.length === 0 ? (
          <div className="empty-state">
            <p>No activity yet</p>
          </div>
        ) : (
          activityFeed.map(activity => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">{getActivityIcon(activity.action)}</div>
              <div className="activity-content">
                <div className="activity-user">{activity.user_id}</div>
                <div className="activity-action">
                  {activity.action.replace(/_/g, ' ')}
                </div>
                {activity.details && (
                  <div className="activity-details">
                    {JSON.stringify(activity.details, null, 2)}
                  </div>
                )}
                <div className="activity-time">{formatDate(activity.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="collaborative-workspace">
      <div className="workspace-container">
        {!selectedWorkspace && renderWorkspacesList()}
        {selectedWorkspace && renderWorkspaceDetail()}
      </div>

      {/* Create Workspace Dialog */}
      {showCreateWorkspace && (
        <div className="dialog-overlay" onClick={() => setShowCreateWorkspace(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Workspace</h3>
            <form onSubmit={handleCreateWorkspace}>
              <div className="form-group">
                <label>Workspace Name *</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  required
                  placeholder="e.g., Marketing Team"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={workspaceDescription}
                  onChange={(e) => setWorkspaceDescription(e.target.value)}
                  placeholder="Brief description of the workspace"
                  rows={3}
                />
              </div>
              <div className="dialog-actions">
                <button type="button" onClick={() => setShowCreateWorkspace(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Dialog */}
      {showAddMember && (
        <div className="dialog-overlay" onClick={() => setShowAddMember(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Add Team Member</h3>
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label>User ID *</label>
                <input
                  type="text"
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  required
                  placeholder="user-12345"
                />
              </div>
              <div className="form-group">
                <label>Permission Level *</label>
                <select
                  value={memberPermission}
                  onChange={(e) => setMemberPermission(e.target.value)}
                >
                  <option value={PERMISSIONS.VIEWER}>Viewer - View only</option>
                  <option value={PERMISSIONS.EDITOR}>Editor - Can edit</option>
                  <option value={PERMISSIONS.ADMIN}>Admin - Full control</option>
                </select>
              </div>
              <div className="dialog-actions">
                <button type="button" onClick={() => setShowAddMember(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Collection Dialog */}
      {showCreateCollection && (
        <div className="dialog-overlay" onClick={() => setShowCreateCollection(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Collection</h3>
            <form onSubmit={handleCreateCollection}>
              <div className="form-group">
                <label>Collection Name *</label>
                <input
                  type="text"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  required
                  placeholder="e.g., Q4 Campaign Assets"
                />
              </div>
              <div className="dialog-actions">
                <button type="button" onClick={() => setShowCreateCollection(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Dialog */}
      {showAddItem && (
        <div className="dialog-overlay" onClick={() => setShowAddItem(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Add Item to Collection</h3>
            <form onSubmit={handleAddToCollection}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  required
                  placeholder="Item title"
                />
              </div>
              <div className="form-group">
                <label>URL *</label>
                <input
                  type="text"
                  value={itemUrl}
                  onChange={(e) => setItemUrl(e.target.value)}
                  required
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label>Type *</label>
                <select value={itemType} onChange={(e) => setItemType(e.target.value)}>
                  <option value="file">File</option>
                  <option value="video">Video</option>
                  <option value="image">Image</option>
                  <option value="audio">Audio</option>
                  <option value="document">Document</option>
                </select>
              </div>
              <div className="dialog-actions">
                <button type="button" onClick={() => setShowAddItem(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Comment Dialog */}
      {showCommentDialog && (
        <div className="dialog-overlay" onClick={() => setShowCommentDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Add Comment</h3>
            <form onSubmit={handleAddComment}>
              <div className="form-group">
                <label>Comment *</label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  required
                  placeholder="Write your comment..."
                  rows={4}
                />
              </div>
              <div className="dialog-actions">
                <button type="button" onClick={() => setShowCommentDialog(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Comment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborativeWorkspace;
