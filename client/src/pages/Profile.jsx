import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    phone: user.phone || '',
    country: user.country || '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await usersAPI.update(user.id, formData);
      updateUser({ ...user, ...response.data.data });
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
        Back
      </button>

      <div className="card">
        <h1 style={{ marginBottom: '1.5rem' }}>My Profile</h1>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Role:</strong> {user.role}
          </p>
          <p>
            <strong>Account Status:</strong> {user.is_verified ? 'Verified' : 'Not Verified'}
          </p>
          <p>
            <strong>Member Since:</strong> {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>

        <h2 style={{ marginBottom: '1rem' }}>Update Profile Information</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="first_name">First Name</label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="John"
            />
          </div>

          <div className="form-group">
            <label htmlFor="last_name">Last Name</label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Doe"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1234567890"
            />
          </div>

          <div className="form-group">
            <label htmlFor="country">Country</label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="USA"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>

        {user.profile && (
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>
              {user.role === 'freelancer' ? 'Freelancer' : 'Client'} Profile
            </h2>

            {user.role === 'freelancer' && (
              <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                {user.profile.headline && (
                  <p>
                    <strong>Headline:</strong> {user.profile.headline}
                  </p>
                )}
                {user.profile.bio && (
                  <p>
                    <strong>Bio:</strong> {user.profile.bio}
                  </p>
                )}
                {user.profile.hourly_rate && (
                  <p>
                    <strong>Hourly Rate:</strong> ${user.profile.hourly_rate}/hr
                  </p>
                )}
                {user.profile.experience_years !== null && (
                  <p>
                    <strong>Experience:</strong> {user.profile.experience_years} years
                  </p>
                )}
                {user.profile.rating_avg && (
                  <p>
                    <strong>Rating:</strong> {user.profile.rating_avg} / 5 ({user.profile.rating_count} reviews)
                  </p>
                )}
              </div>
            )}

            {user.role === 'client' && (
              <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                {user.profile.company_name && (
                  <p>
                    <strong>Company:</strong> {user.profile.company_name}
                  </p>
                )}
                {user.profile.company_size && (
                  <p>
                    <strong>Company Size:</strong> {user.profile.company_size}
                  </p>
                )}
                {user.profile.website && (
                  <p>
                    <strong>Website:</strong>{' '}
                    <a href={user.profile.website} target="_blank" rel="noopener noreferrer">
                      {user.profile.website}
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
