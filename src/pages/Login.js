import React, { useState } from 'react';
import { auth, signInWithEmailAndPassword } from '../firebase';
import { useNavigate } from 'react-router-dom';

function Login({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const processedEmail = email.includes('@') ? email : `${email}@axlist.pw`;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, processedEmail, password);
      setUser(userCredential.user);
      navigate("/");
    } catch (err) {
      switch (err.code) {
        case 'auth/wrong-password':
          setError('Incorrect password.');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email.');
          break;
        default:
          setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
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
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>

        <div className="pinned-separator" />

        <div className="text-center">
          <button className="btn btn-secondary w-100" onClick={() => navigate("/register")}>Register</button>
        </div>
      </form>
    </div>
  );
}

export default Login;
