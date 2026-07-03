import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Interests() {
  const { user } = useAuth();
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchInterests() {
    setLoading(true);
    const endpoint = user.role === 'owner' ? '/interests/received' : '/interests/sent';
    const { data } = await api.get(endpoint);
    setInterests(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchInterests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function respond(id, status) {
    await api.patch(`/interests/${id}`, { status });
    fetchInterests();
  }

  if (loading) return <div className="container"><p>Loading...</p></div>;

  return (
    <div className="container">
      <h1>{user.role === 'owner' ? 'Interest Requests Received' : 'My Interest Requests'}</h1>
      {interests.length === 0 && <p>Nothing here yet.</p>}
      <div className="grid">
        {interests.map((i) => (
          <div className="card" key={i._id}>
            <h3>{i.listing?.location}</h3>
            <p>₹{i.listing?.rent} / month</p>
            {user.role === 'owner' ? (
              <p>Tenant: {i.tenant?.name} ({i.tenant?.email})</p>
            ) : (
              <p>Owner: {i.owner?.name} ({i.owner?.email})</p>
            )}
            {i.compatibilityScore != null && (
              <p className={i.compatibilityScore >= 80 ? 'score-highlight' : ''}>
                Compatibility: {i.compatibilityScore}/100 ({i.scoreSource})
              </p>
            )}
            {i.compatibilityExplanation && <p className="muted small">{i.compatibilityExplanation}</p>}
            <p>Status: <strong>{i.status}</strong></p>

            {user.role === 'owner' && i.status === 'pending' && (
              <div className="row">
                <button onClick={() => respond(i._id, 'accepted')}>Accept</button>
                <button onClick={() => respond(i._id, 'declined')}>Decline</button>
              </div>
            )}

            {i.status === 'accepted' && <Link to={`/chat/${i._id}`}>Open chat</Link>}
          </div>
        ))}
      </div>
    </div>
  );
}
