import React, { useState, useEffect } from "react";
import { db } from "./firebase"; // Firebase configuration
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";

function App() {
  const [newRule, setNewRule] = useState("");
  const [rules, setRules] = useState([]);
  const [isAdding, setIsAdding] = useState(false); // Loading state for "Add Rule"
  const [deletingRuleId, setDeletingRuleId] = useState(null); // Track which rule is being deleted
  const [isDeletingAll, setIsDeletingAll] = useState(false); // Loading state for "Delete All Rules"
  const [isFetching, setIsFetching] = useState(true); // Loading state for fetching rules

  // Fetch rules from Firestore on component load
  useEffect(() => {
    const fetchRules = async () => {
      setIsFetching(true); // Start fetching
      const querySnapshot = await getDocs(collection(db, "rules"));
      const rulesList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRules(rulesList);
      setIsFetching(false); // End fetching
    };
    fetchRules();
  }, []);

  // Add new rule
  const addRule = async (e) => {
    e.preventDefault(); // Prevent form from refreshing the page
    if (newRule.trim()) {
      setIsAdding(true); // Start loading state
      const docRef = await addDoc(collection(db, "rules"), {
        text: newRule,
        checked: false,
        pinned: false, // Add the "pinned" state
      });
      setRules([...rules, { id: docRef.id, text: newRule, checked: false, pinned: false }]);
      setNewRule("");
      setIsAdding(false); // End loading state
    }
  };

  // Toggle checkbox
  const toggleRule = async (id, checked) => {
    const ruleDoc = doc(db, "rules", id);
    await updateDoc(ruleDoc, { checked: !checked });
    setRules(
      rules.map((rule) => (rule.id === id ? { ...rule, checked: !checked } : rule))
    );
  };

  // Toggle pinned state
  const togglePin = async (id, pinned) => {
    const ruleDoc = doc(db, "rules", id);
    await updateDoc(ruleDoc, { pinned: !pinned });
    setRules(
      rules.map((rule) => (rule.id === id ? { ...rule, pinned: !pinned } : rule))
    );
  };

  // Unpin all rules
  const unpinAllRules = async () => {
    const querySnapshot = await getDocs(collection(db, "rules"));
    querySnapshot.forEach(async (rule) => {
      const ruleDoc = doc(db, "rules", rule.id);
      await updateDoc(ruleDoc, { pinned: false });
    });
    setRules(
      rules.map((rule) => ({
        ...rule,
        pinned: false,
      }))
    );
  };

  // Delete a rule
  const deleteRule = async (id) => {
    setDeletingRuleId(id); // Start loading for specific rule
    const ruleDoc = doc(db, "rules", id);
    await deleteDoc(ruleDoc);
    setRules(rules.filter((rule) => rule.id !== id));
    setDeletingRuleId(null); // End loading
  };

  // Reset all checkboxes
  const resetRules = async () => {
    const querySnapshot = await getDocs(collection(db, "rules"));
    querySnapshot.forEach(async (rule) => {
      const ruleDoc = doc(db, "rules", rule.id);
      await updateDoc(ruleDoc, { checked: false });
    });
    setRules(
      rules.map((rule) => ({
        ...rule,
        checked: false,
      }))
    );
  };

  // Delete all rules except pinned ones
  const deleteAllRules = async () => {
    setIsDeletingAll(true); // Start loading state for deleting all rules
    const querySnapshot = await getDocs(collection(db, "rules"));
    querySnapshot.forEach(async (rule) => {
      if (!rule.data().pinned) { // Only delete non-pinned rules
        const ruleDoc = doc(db, "rules", rule.id);
        await deleteDoc(ruleDoc);
      }
    });
    setRules(rules.filter((rule) => rule.pinned)); // Keep only pinned rules
    setIsDeletingAll(false); // End loading state
  };

  // Sort rules so pinned ones are on top, then unchecked, then checked
  const sortedRules = [...rules].sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned - a.pinned; // Pinned rules first
    return a.checked - b.checked; // Unchecked before checked
  });

  const pinnedRules = sortedRules.filter(rule => rule.pinned);
  const unpinnedRules = sortedRules.filter(rule => !rule.pinned);

  return (
    <div className="container">
      <h1>My Trading Rules Checklist</h1>

      

      {/* Add new rule form */}
      <form onSubmit={addRule} className="mb-3">
        <div className="input-group">
          <input
            type="text"
            name="new_rule"
            className="form-control"
            placeholder="Add a new rule"
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            required
          />
          <div className="input-group-append">
            <button type="submit" className="btn btn-add" disabled={isAdding}>
              {isAdding ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Adding...
                </>
              ) : (
                "Add Rule"
              )}
            </button>
          </div>
        </div>
      </form>


      

      {/* Loading state while fetching rules */}
      {isFetching ? (
        <div className="text-center">
          <span className="spinner-border text-light" role="status" aria-hidden="true"></span>
          <p style={{ color: "white" }}>Fetching Rules...</p>
        </div>
      ) : (
        <>
          {/* List of pinned rules */}
          {/* Display total number of rules */}
          <h5 className="rule-counter">Total Rules: {rules.length}</h5>

          <ul className="list-group mb-3">
            {pinnedRules.map((rule, index) => (
              <li
                key={rule.id}
                className={`list-group-item d-flex justify-content-between align-items-center ${rule.checked ? "fade-out" : "fade-in"}`}
              >
                

                {/* Pin button */}
                <button
                  className="pinned-btn"
                  onClick={() => togglePin(rule.id, rule.pinned)}
                >
                  <i className={rule.pinned ? "fas fa-thumbtack pin-icon" : "fas fa-thumbtack unpin-icon"}></i>
                </button>

                {/* Checkbox */}
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={rule.checked}
                  onChange={() => toggleRule(rule.id, rule.checked)}
                />

{/* Rule Number */}
<span className="counter">{index + 1}. </span>

                <label
                  className={`checkbox-label ${rule.checked ? "checked" : ""}`}
                  htmlFor={`rule-${rule.id}`}
                >
                  {rule.text}
                </label>

                {/* Delete button */}
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteRule(rule.id)}
                  disabled={deletingRuleId === rule.id} // Disable button while deleting
                >
                  {deletingRuleId === rule.id ? (
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    ></span>
                  ) : (
                    <i className="fas fa-trash"></i>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* Separator between pinned and unpinned */}
          {pinnedRules.length > 0 && <div className="pinned-separator" />}

          {/* List of unpinned rules */}
          <ul className="list-group mb-3">
            {unpinnedRules.map((rule, index) => (
              <li
                key={rule.id}
                className={`list-group-item d-flex justify-content-between align-items-center ${rule.checked ? "fade-out" : "fade-in"}`}
              >
                

                {/* Pin button */}
                <button
                  className="pinned-btn"
                  onClick={() => togglePin(rule.id, rule.pinned)}
                >
                  <i className={rule.pinned ? "fas fa-thumbtack pin-icon" : "fas fa-thumbtack unpin-icon"}></i>
                </button>

                {/* Checkbox */}
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={rule.checked}
                  onChange={() => toggleRule(rule.id, rule.checked)}
                />

{/* Rule Number */}
<span className="counter">{pinnedRules.length + index + 1}. </span>


                <label
                  className={`checkbox-label ${rule.checked ? "checked" : ""}`}
                  htmlFor={`rule-${rule.id}`}
                >
                  {rule.text}
                </label>

                {/* Delete button */}
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteRule(rule.id)}
                  disabled={deletingRuleId === rule.id} // Disable button while deleting
                >
                  {deletingRuleId === rule.id ? (
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    ></span>
                  ) : (
                    <i className="fas fa-trash"></i>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Reset, Unpin all, and Delete all buttons */}
      <div className="text-center mb-3">
        <button onClick={resetRules} className="btn btn-danger">
          Uncheck all boxes
        </button>
        <button onClick={unpinAllRules} className="btn btn-danger ml-3">
          Unpin All
        </button>
        <button
          onClick={deleteAllRules}
          className="btn btn-secondary ml-5"
          disabled={isDeletingAll}
        >
          {isDeletingAll ? (
            <>
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              Deleting All Rules...
            </>
          ) : (
            "Delete All Rules"
          )}
        </button>
      </div>
    </div>
  );
}

export default App;
