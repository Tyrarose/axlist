import React, { useState, useEffect } from "react";
import { auth, signOut, onAuthStateChanged } from "./firebase";
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from "./pages/Login";
import Register from "./pages/Register";
import RuleRender from "./components/RuleRender";
import './App.css';

function App() {
  const [user, setUser] = useState(null); // Tracks logged in user
  const [authChecked, setAuthChecked] = useState(false); // Tracks if authentication is checked

  // Check for persistent login on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Set user if logged in
      setAuthChecked(true); // Mark auth check as done
    });
    return unsubscribe;
  }, []);

  // Function to log out
  const handleLogout = async () => {
    try {
      await signOut(auth); // Attempt to sign out the user
      setUser(null); // Clear user state upon successful sign-out
    } catch (error) {
      console.error("Error during sign-out:", error); // Log any errors that occur
      alert("Failed to sign out. Please try again.");
    }
  };

  // Show loading screen until authentication is checked
  if (!authChecked) {
    return (
      <div className="loading-screen">
        <p>Loading...</p>
        {/* You can add a spinner component here */}
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <RuleRender user={user} handleLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register setUser={setUser} />} />
      </Routes>
    </Router>
  );
}

export default App;
