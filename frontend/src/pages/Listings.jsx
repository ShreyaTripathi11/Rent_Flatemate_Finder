import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Listings() {
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState({ location: '', minBudget: '', maxBudget: '' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const { user } = useAuth();

  async function fetchListings() {
    setLoading(true);
    try {
      const params = {};
      if (filters.location) params.location = filters.location;
      if (filters.minBudget) params.minBudget = filters.minBudget;
      if (filters.maxBudget) params.maxBudget = filters.maxBudget;
      const { data } = await api.get('/listings', { params });
      setListings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function expressInterest(listingId) {
    setMessage('');
    try {
      await api.post('/interests', { listingId });
      setMessage('Interest sent! Check "My Interests" for updates.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to express interest');
    }
  }

  return (
    <div className="container">
      <h1>Browse Rooms</h1>

      <form
        className="filters card"
        onSubmit={(e) => {
          e.preventDefault();
          fetchListings();
        }}
      >
        <input
          placeholder="Location"
          value={filters.location}
          onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
        />
        <input
          placeholder="Min budget"
          type="number"
          value={filters.minBudget}
          onChange={(e) => setFilters((f) => ({ ...f, minBudget: e.target.value }))}
        />
        <input
          placeholder="Max budget"
          type="number"
          value={filters.maxBudget}
          onChange={(e) => setFilters((f) => ({ ...f, maxBudget: e.target.value }))}
        />
        <button type="submit">Filter</button>
      </form>

      {message && <p className="info">{message}</p>}
      {loading && <p>Loading listings...</p>}
      {!loading && listings.length === 0 && <p>No listings found.</p>}

      <div className="grid">
        {listings.map((listing) => (
          <div className="card listing-card" key={listing._id}>
            {listing.compatibilityScore != null && (
              <div className={`score-badge ${listing.compatibilityScore >= 80 ? 'high' : ''}`}>
                {listing.compatibilityScore}% match
              </div>
            )}
            <h3>{listing.location}</h3>
            <p>₹{listing.rent} / month</p>
            <p>Available from: {new Date(listing.availableFrom).toLocaleDateString()}</p>
            <p>{listing.roomType} · {listing.furnishingStatus}</p>
            {listing.description && <p className="muted">{listing.description}</p>}
            {listing.compatibilityExplanation && (
              <p className="muted small">{listing.compatibilityExplanation}</p>
            )}
            <p className="muted small">Owner: {listing.owner?.name}</p>
            <div className="row">
              <Link to={`/listings/${listing._id}`}>Details</Link>
              {user?.role === 'tenant' && (
                <button onClick={() => expressInterest(listing._id)}>Express interest</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
