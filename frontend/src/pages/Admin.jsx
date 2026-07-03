import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export default function Admin() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    api.get('/admin/overview').then(({ data }) => setOverview(data));
  }, []);

  useEffect(() => {
    if (tab === 'users') api.get('/admin/users').then(({ data }) => setUsers(data));
    if (tab === 'listings') api.get('/admin/listings').then(({ data }) => setListings(data));
  }, [tab]);

  async function toggleActive(id) {
    const { data } = await api.patch(`/admin/users/${id}/toggle-active`);
    setUsers((prev) => prev.map((u) => (u._id === id ? data : u)));
  }

  async function deleteListing(id) {
    if (!confirm('Delete this listing?')) return;
    await api.delete(`/admin/listings/${id}`);
    setListings((prev) => prev.filter((l) => l._id !== id));
  }

  return (
    <div className="container">
      <h1>Admin Dashboard</h1>
      <div className="row">
        <button onClick={() => setTab('overview')}>Overview</button>
        <button onClick={() => setTab('users')}>Users</button>
        <button onClick={() => setTab('listings')}>Listings</button>
      </div>

      {tab === 'overview' && overview && (
        <div className="grid stats">
          <div className="card"><h3>{overview.userCount}</h3><p>Total users</p></div>
          <div className="card"><h3>{overview.tenantCount}</h3><p>Tenants</p></div>
          <div className="card"><h3>{overview.ownerCount}</h3><p>Owners</p></div>
          <div className="card"><h3>{overview.listingCount}</h3><p>Listings</p></div>
          <div className="card"><h3>{overview.filledCount}</h3><p>Filled listings</p></div>
          <div className="card"><h3>{overview.interestCount}</h3><p>Interest requests</p></div>
          <div className="card"><h3>{overview.acceptedCount}</h3><p>Accepted matches</p></div>
          <div className="card"><h3>{overview.messageCount}</h3><p>Chat messages</p></div>
        </div>
      )}

      {tab === 'users' && (
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.isActive ? 'Active' : 'Suspended'}</td>
                <td><button onClick={() => toggleActive(u._id)}>{u.isActive ? 'Suspend' : 'Reactivate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'listings' && (
        <table className="table">
          <thead>
            <tr><th>Location</th><th>Rent</th><th>Owner</th><th>Filled</th><th>Action</th></tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l._id}>
                <td>{l.location}</td>
                <td>₹{l.rent}</td>
                <td>{l.owner?.name}</td>
                <td>{l.isFilled ? 'Yes' : 'No'}</td>
                <td><button onClick={() => deleteListing(l._id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
