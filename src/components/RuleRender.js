import React from "react";
import RulesManager from './RulesManager';
import Sticker from './Sticker';

function RuleRender({ user, handleLogout }) {
  return (
    <>
      <button onClick={handleLogout}  className="logout-icon" title="Logout">
        <i className="fas fa-sign-out"></i>
      </button>
      <h1 className="mb-5">Apex Legends Superglide Trainer </h1>
      <div className="container">
        {/* Render the RulesManager and Stickers components */}
        <RulesManager user={user} />
        <Sticker user={user} />
      </div>
    </>
    
  );
}

export default RuleRender;
