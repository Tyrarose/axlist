import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const RulesManager = ({ user }) => {
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isDeletingAll, setIsDeletingAll] = useState(false); // Loading state for "Delete All Rules"
  const [isResetting, setIsResetting] = useState(false); // Loading state for "Uncheck All Boxes"
  const [isUnpinningAll, setIsUnpinningAll] = useState(false); // Loading state for "Unpin All"

  useEffect(() => {
    const fetchRules = async () => {
      if (!user) return;

      setIsFetching(true);

      const rulesSnapshot = await getDocs(collection(db, `users/${user.uid}/rules`));
      const fetchedRules = rulesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })).sort((a, b) => a.order - b.order);;
      setRules(fetchedRules);
      setIsFetching(false);
    };

    fetchRules();
  }, [user]);

  const addRule = async (e) => {
    e.preventDefault();
    if (newRule.trim()) {
      setIsAdding(true);
      const docRef = await addDoc(collection(db, `users/${auth.currentUser.uid}/rules`), {
        text: newRule,
        checked: false,
        pinned: false,
        order: rules.length, // Set initial order based on the number of existing rules
      });
      setRules([...rules, { id: docRef.id, text: newRule, checked: false, pinned: false, order: rules.length }]);
      setNewRule("");
      setIsAdding(false);
    }
  };
  

  const deleteRule = async (id) => {
    setDeletingRuleId(id);
    await deleteDoc(doc(db, `users/${auth.currentUser.uid}/rules`, id));
    setRules(rules.filter((rule) => rule.id !== id));
    setDeletingRuleId(null);
  };


  // Delete all rules except pinned ones
  const deleteAllRules = async () => {
    setIsDeletingAll(true); // Start loading state for deleting all rules
    const querySnapshot = await getDocs(collection(db, `users/${auth.currentUser.uid}/rules`));
    
    // Delete non-pinned rules
    const deletePromises = querySnapshot.docs.map(async (rule) => {
      if (!rule.data().pinned) {
        const ruleDoc = doc(db, `users/${auth.currentUser.uid}/rules`, rule.id);
        return deleteDoc(ruleDoc); // Return promise
      }
      return null; // Return null for pinned rules
    });
    
    // Wait for all delete operations to complete
    await Promise.all(deletePromises);
  
    // Filter out deleted rules and update state
    setRules(rules.filter((rule) => rule.pinned)); 
    setIsDeletingAll(false); // End loading state
  };

  // Unpin all rules
  const unpinAllRules = async () => {
    setIsUnpinningAll(true); // Start loading state for unpinning all rules
    const querySnapshot = await getDocs(collection(db, `users/${auth.currentUser.uid}/rules`));
  
    // Update the pinned property of each rule to false
    const updatePromises = querySnapshot.docs.map(async (rule) => {
      const ruleDoc = doc(db, `users/${auth.currentUser.uid}/rules`, rule.id);
      return updateDoc(ruleDoc, { pinned: false });
    });
  
    // Wait for all updates to complete
    await Promise.all(updatePromises);
  
    // Update local state to reflect changes
    setRules(rules.map((rule) => ({ ...rule, pinned: false })));
    setIsUnpinningAll(false); // End loading state
  };
  

  // Uncheck rules
  const resetRules = async () => {
    setIsResetting(true);
    const querySnapshot = await getDocs(collection(db, `users/${auth.currentUser.uid}/rules`));
    
    // Update the checked property of each rule to false
    const updatePromises = querySnapshot.docs.map(async (rule) => {
      const ruleDoc = doc(db, `users/${auth.currentUser.uid}/rules`, rule.id);
      return updateDoc(ruleDoc, { checked: false }); // Return promise for each update
    });
    
    // Wait for all updates to complete
    await Promise.all(updatePromises);
  
    // Update local state to reflect changes
    setRules(
      rules.map((rule) => ({
        ...rule,
        checked: false,
      }))
    );
    setIsResetting(false);
  };
  

  const toggleChecked = async (id, checked) => {
    const ruleDoc = doc(db, `users/${auth.currentUser.uid}/rules`, id);
    await updateDoc(ruleDoc, { checked: !checked });
    setRules(rules.map((rule) => (rule.id === id ? { ...rule, checked: !checked } : rule)));
  };
  

  const togglePin = async (id, pinned) => {
    const ruleDoc = doc(db, `users/${auth.currentUser.uid}/rules`, id);
    await updateDoc(ruleDoc, { pinned: !pinned });
    setRules(rules.map((rule) => (rule.id === id ? { ...rule, pinned: !pinned } : rule)));
  };

  // Sort rules so pinned ones are on top, then unchecked, then checked
  const sortedRules = [...rules].sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned - a.pinned; // Pinned rules first
    return a.checked - b.checked; // Unchecked before checked
  });

  const handleDragEnd = async (result) => {
    const { destination, source } = result;
  
    // If no destination, exit
    if (!destination) return;
  
    // If dropped in the same position, no need to reorder
    if (source.index === destination.index && source.droppableId === destination.droppableId) {
      return;
    }
  
    // Create a shallow copy of the rules
    const reorderedRules = Array.from(rules);
  
    // Move the dragged rule within the local array
    const [movedRule] = reorderedRules.splice(source.index, 1);
    movedRule.pinned = destination.droppableId === "pinned"; // Update pinned status based on destination
    reorderedRules.splice(destination.index, 0, movedRule);
  
    // Update local state immediately for responsiveness
    setRules(reorderedRules);
  
    // Batch update the order and pinned status in Firebase
    const updatePromises = reorderedRules.map((rule, index) => {
      return updateDoc(doc(db, `users/${user.uid}/rules`, rule.id), {
        order: index,
        pinned: rule.pinned,
      });
    });
  
    await Promise.all(updatePromises);
  };
  
  const pinnedRules = rules.filter((rule) => rule.pinned);
  const unpinnedRules = rules.filter((rule) => !rule.pinned);


  return (
    <div>
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
          <h5 className="rule-counter">Total Rules: {rules.length}</h5>

          {/* DragDropContext for handling drag events */}
          <DragDropContext onDragEnd={handleDragEnd}>
            {/* Pinned Rules */}
            <Droppable droppableId="pinned">
              {(provided) => (
                <ul
                  className="list-group mb-3"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {pinnedRules.map((rule, index) => (
                    <Draggable key={rule.id} draggableId={rule.id} index={index}>
                      {(provided) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
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
                            onChange={() => toggleChecked(rule.id, rule.checked)}
                          />

                          {/* Rule Number */}
                          <span className="counter">{index + 1}. </span>

                          {/* Rule text */}
                          <label className={`checkbox-label ${rule.checked ? "checked" : ""}`}>
                            {rule.text}
                          </label>

                          {/* Delete button */}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => deleteRule(rule.id)}
                            disabled={deletingRuleId === rule.id}
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
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>

            {/* Separator between pinned and unpinned */}
            {pinnedRules.length > 0 && <div className="pinned-separator" />}

            {/* Unpinned Rules */}
            <Droppable droppableId="unpinned">
              {(provided) => (
                <ul
                  className="list-group mb-3"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {unpinnedRules.map((rule, index) => (
                    <Draggable key={rule.id} draggableId={rule.id} index={index}>
                      {(provided) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
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
                            onChange={() => toggleChecked(rule.id, rule.checked)}
                          />

                          {/* Rule Number */}
                          <span className="counter">{index + 1}. </span>

                          {/* Rule text */}
                          <label className={`checkbox-label ${rule.checked ? "checked" : ""}`}>
                            {rule.text}
                          </label>

                          {/* Delete button */}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => deleteRule(rule.id)}
                            disabled={deletingRuleId === rule.id}
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
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        </>
      )}

      {/* Reset, Unpin all, and Delete all buttons */}
      <div className="text-center mb-3">
      
          {/* Reset, Unpin all, and Delete all buttons */}
          <div className="text-center mb-3">
            <button
              onClick={resetRules}
              className="btn btn-danger"
              disabled={isResetting}
            >
              {isResetting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Unchecking All...
                </>
              ) : (
                "Uncheck All"
              )}
            </button>
            <button
              onClick={unpinAllRules}
              className="btn btn-danger ml-3"
              disabled={isUnpinningAll}
            >
              {isUnpinningAll ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Clearing Pins...
                </>
              ) : (
                "Clear Pins"
              )}
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
    </div>
  );
};

export default RulesManager;
