import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

export default function ListingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    location: '',
    rent: '',
    availableFrom: '',
    roomType: 'single',
    furnishingStatus: 'unfurnished',
    description: '',
    photos: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/listings/${id}`).then(({ data }) => {
        setForm({
          location: data.location,
          rent: data.rent,
          availableFrom: data.availableFrom.slice(0, 10),
          roomType: data.roomType,
          furnishingStatus: data.furnishingStatus,
          description: data.description || '',
          photos: (data.photos || []).join(', '),
        });
      });
    }
  }, [id, isEdit]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        rent: Number(form.rent),
        photos: form.photos ? form.photos.split(',').map((p) => p.trim()).filter(Boolean) : [],
      };
      if (isEdit) {
        await api.patch(`/listings/${id}`, payload);
      } else {
        await api.post('/listings', payload);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save listing');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container narrow">
      <h1>{isEdit ? 'Edit Listing' : 'New Listing'}</h1>
      <form onSubmit={handleSubmit} className="card">
        {error && <p className="error">{error}</p>}
        <label>Location</label>
        <input value={form.location} onChange={(e) => update('location', e.target.value)} required />
        <label>Rent (₹/month)</label>
        <input type="number" value={form.rent} onChange={(e) => update('rent', e.target.value)} required />
        <label>Available From</label>
        <input type="date" value={form.availableFrom} onChange={(e) => update('availableFrom', e.target.value)} required />
        <label>Room Type</label>
        <select value={form.roomType} onChange={(e) => update('roomType', e.target.value)}>
          <option value="single">Single</option>
          <option value="shared">Shared</option>
          <option value="studio">Studio</option>
          <option value="1bhk">1 BHK</option>
          <option value="2bhk">2 BHK</option>
          <option value="other">Other</option>
        </select>
        <label>Furnishing Status</label>
        <select value={form.furnishingStatus} onChange={(e) => update('furnishingStatus', e.target.value)}>
          <option value="furnished">Furnished</option>
          <option value="semi-furnished">Semi-furnished</option>
          <option value="unfurnished">Unfurnished</option>
        </select>
        <label>Description</label>
        <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={4} />
        <label>Photo URLs (comma separated)</label>
        <input value={form.photos} onChange={(e) => update('photos', e.target.value)} placeholder="https://..., https://..." />
        <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Listing'}</button>
      </form>
    </div>
  );
}
