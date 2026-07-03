import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function ListingDetail() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [message, setMessage] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/listings/${id}`).then(({ data }) => setListing(data));
  }, [id]);

  const isOwnerOfListing = user?.role === 'owner' && listing && listing.owner._id === user.id;

  async function expressInterest() {
    setMessage('');
    try {
      await api.post('/interests', { listingId: id });
      setMessage('Interest sent! Check "My Interests" for updates.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to express interest');
    }
  }

  async function markFilled() {
    try {
      const { data } = await api.patch(`/listings/${id}/fill`);
      setListing(data);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update listing');
    }
  }

  async function deleteListing() {
    if (!confirm('Delete this listing?')) return;
    try {
      await api.delete(`/listings/${id}`);
      navigate('/');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to delete listing');
    }
  }

  if (!listing) return <div className="container"><p>Loading...</p></div>;

  return (
    <div className="container narrow">
      <h1>{listing.location}</h1>
      <div className="card">
        <p>₹{listing.rent} / month</p>
        <p>Available from: {new Date(listing.availableFrom).toLocaleDateString()}</p>
        <p>{listing.roomType} · {listing.furnishingStatus}</p>
        {listing.isFilled && <p className="error">This room has been filled.</p>}
        {listing.description && <p>{listing.description}</p>}
        {listing.photos?.length > 0 && (
          <div className="photo-list">
            {listing.photos.map((p, i) => (
              <img src={p} alt={`Room ${i + 1}`} key={i} className="photo" />
            ))}
          </div>
        )}
        <p className="muted">Owner: {listing.owner?.name} ({listing.owner?.email})</p>

        {message && <p className="info">{message}</p>}

        {user?.role === 'tenant' && !listing.isFilled && (
          <button onClick={expressInterest}>Express interest</button>
        )}

        {isOwnerOfListing && (
          <div className="row">
            <Link to={`/listings/${id}/edit`}>Edit</Link>
            {!listing.isFilled && <button onClick={markFilled}>Mark as filled</button>}
            <button onClick={deleteListing}>Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}
