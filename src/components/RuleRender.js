import React from "react";
import RulesManager from './RulesManager';
import Sticker from './Sticker';

function RuleRender({ user, handleLogout }) {
  return (
    <div className="container">
      <button onClick={handleLogout}  className="logout-icon" title="Logout">
        <i className="fas fa-sign-out"></i>
      </button>
      <h1>My Trading Rules Checklist</h1>

      {/* Render the RulesManager and Stickers components */}
      <RulesManager user={user} />
      <Sticker user={user} />
    </div>
  );
}

export default RuleRender;
