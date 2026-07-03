import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function Profile() {
  const [form, setForm] = useState({ preferredLocation: '', budgetMin: '', budgetMax: '', moveInDate: '', notes: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/profile').then(({ data }) => {
      if (data) {
        setForm({
          preferredLocation: data.preferredLocation,
          budgetMin: data.budgetMin,
          budgetMax: data.budgetMax,
          moveInDate: data.moveInDate.slice(0, 10),
          notes: data.notes || '',
        });
      }
    });
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.put('/profile', {
        ...form,
        budgetMin: Number(form.budgetMin),
        budgetMax: Number(form.budgetMax),
      });
      setSuccess('Profile saved! Listings will now be ranked for you by compatibility.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container narrow">
      <h1>My Tenant Profile</h1>
      <form onSubmit={handleSubmit} className="card">
        {error && <p className="error">{error}</p>}
        {success && <p className="info">{success}</p>}
        <label>Preferred Location</label>
        <input value={form.preferredLocation} onChange={(e) => update('preferredLocation', e.target.value)} required />
        <label>Budget Min (₹/month)</label>
        <input type="number" value={form.budgetMin} onChange={(e) => update('budgetMin', e.target.value)} required />
        <label>Budget Max (₹/month)</label>
        <input type="number" value={form.budgetMax} onChange={(e) => update('budgetMax', e.target.value)} required />
        <label>Move-in Date</label>
        <input type="date" value={form.moveInDate} onChange={(e) => update('moveInDate', e.target.value)} required />
        <label>Notes (optional)</label>
        <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} />
        <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Profile'}</button>
      </form>
    </div>
  );
}
