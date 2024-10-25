import React, { useState } from 'react';
import { auth, createUserWithEmailAndPassword } from '../firebase';
import { useNavigate } from 'react-router-dom';

function Register({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
  
    // Append @axlist.pw if the email does not contain @
    const processedEmail = email.includes('@') ? email : `${email}@axlist.pw`;
  
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, processedEmail, password);
      setUser(userCredential.user);
      navigate("/"); // Navigate to the app after registration
    } catch (err) {
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('This email is already in use.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/weak-password':
          setError('Password should be at least 6 characters.');
          break;
        default:
          setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="container">
      <h1>Register</h1>
      <form onSubmit={handleRegister}>
        <div className="input-group mb-3">
        <div className="input-group mb-3">
          <input
            type="text"
            className="form-control username-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Username"
            required
          />
          <span className="email-domain-hint">@axlist.pw</span>
        </div>
        </div>
        <div className="input-group mb-4">
          <input
            type={showPassword ? "text" : "password"}
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="btn btn-secondary input-group-append"
          >
            <i className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true"></i>
          </button>
        </div>

        {error && <p className="text-danger">{error}</p>}

        <div className="text-center">
          <button type="submit" disabled={loading} className="btn btn-add w-100 mb-3">
            {loading ? 'Registering...' : 'Register'}
          </button>
        </div>

        <div className="pinned-separator" />

        <div className="text-center">
          <button className="btn btn-secondary w-100" onClick={() => navigate("/login")}>
            Back to Login
          </button>
        </div>
      </form>
    </div>
  );
}

export default Register;
