import React, { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import PostIt from 'post-it-react';



function AppContent({ user, handleLogout }) {
  
    const [newRule, setNewRule] = useState("");
    const [rules, setRules] = useState([]);
    const [isAdding, setIsAdding] = useState(false); // Loading state for "Add Rule"
    const [deletingRuleId, setDeletingRuleId] = useState(null); // Track which rule is being deleted
    const [isDeletingAll, setIsDeletingAll] = useState(false); // Loading state for "Delete All Rules"
    const [isFetching, setIsFetching] = useState(true); // Loading state for fetching rules
    const [postItList, setPostItList] = useState([]); // For managing sticky notes
  
  
    // Fetch data from Firestore if user is logged in
    useEffect(() => {
      const fetchData = async () => {
        if (!user) return;
  
        // Fetch rules
        setIsFetching(true);
        const rulesSnapshot = await getDocs(collection(db, "rules"));
        const fetchedRules = rulesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRules(fetchedRules);
  
        // Fetch stickers
        const stickersSnapshot = await getDocs(collection(db, "stickers"));
        const fetchedStickers = stickersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPostItList(fetchedStickers);
  
        setIsFetching(false);
      };
  
      fetchData();
    }, [user]);
  
  
    // Handle double-click event to create a sticky note
    useEffect(() => {
      const handleDoubleClick = async (e) => {
        const isPostIt = e.target.classList.contains('post-it');
        if (isPostIt) return;
  
        const postItData = {
          id: crypto.randomUUID(),
          position: { x: e.clientX, y: e.clientY },
          text: '',
          fill: '#FEE440', // Sticky note color
        };
  
        const docRef = await addDoc(collection(db, "stickers"), postItData);
        setPostItList([...postItList, { id: docRef.id, ...postItData }]);
      };
  
      window.addEventListener('dblclick', handleDoubleClick);
      return () => window.removeEventListener('dblclick', handleDoubleClick);
    }, [postItList, user]);
  
  
  
    // Add new rule
    const addRule = async (e) => {
      e.preventDefault();
      if (newRule.trim()) {
        setIsAdding(true);
        const docRef = await addDoc(collection(db, `users/${auth.currentUser.uid}/rules`), {
          text: newRule,
          checked: false,
          pinned: false,
        });
        setRules([...rules, { id: docRef.id, text: newRule, checked: false, pinned: false }]);
        setNewRule("");
        setIsAdding(false);
      }
    };
  
  // Add sticker rule
    const addSticker = async (position) => {
      const postItData = {
        id: crypto.randomUUID(),
        position: position,
        text: '',
        fill: '#FEE440',
      };
      const docRef = await addDoc(collection(db, `users/${auth.currentUser.uid}/stickers`), postItData);
      setPostItList([...postItList, { id: docRef.id, ...postItData }]);
    };
  
  
    const fetchRules = async () => {
      const querySnapshot = await getDocs(collection(db, `users/${auth.currentUser.uid}/rules`));
      const rulesList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRules(rulesList);
    };
    
    const fetchStickers = async () => {
      const querySnapshot = await getDocs(collection(db, `users/${auth.currentUser.uid}/stickers`));
      const stickersList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPostItList(stickersList);
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
  
    const handleDragEnd = async (result) => {
      const { destination, source, draggableId } = result;
  
      // If no destination, exit
      if (!destination) return;
  
      // If dropped in the same position, no need to reorder
      if (source.droppableId === destination.droppableId && source.index === destination.index) {
        return;
      }
  
      const sourceRules = source.droppableId === "pinned" ? pinnedRules : unpinnedRules;
      const destRules = destination.droppableId === "pinned" ? pinnedRules : unpinnedRules;
  
      // Get the dragged rule
      const draggedRule = sourceRules[source.index];
  
      // Remove the dragged rule from the source array
      const updatedSourceRules = Array.from(sourceRules);
      updatedSourceRules.splice(source.index, 1);
  
      // Add the dragged rule to the destination array at the right position
      const updatedDestRules = Array.from(destRules);
      updatedDestRules.splice(destination.index, 0, draggedRule);
  
  
      // If moved between pinned and unpinned, update the pinned status
      if (source.droppableId !== destination.droppableId) {
        draggedRule.pinned = destination.droppableId === "pinned";
        updateDoc(doc(db, "rules", draggedRule.id), { pinned: draggedRule.pinned });
      }
  
      // Update the rules array
      const updatedRules = source.droppableId === destination.droppableId
        ? updatedSourceRules.concat(destRules) // Moving within the same droppable
        : updatedSourceRules.concat(updatedDestRules); // Moving between different droppables
  
      setRules(updatedRules);
    };
  
    const pinnedRules = sortedRules.filter(rule => rule.pinned);
    const unpinnedRules = sortedRules.filter(rule => !rule.pinned);
  
  
  
  
    return (
      <div className="container">
  
        <button onClick={handleLogout}>Logout</button> {/* Logout button */}
  
  
        <h1>My Trading Rules Checklist</h1>
  
        {/* Post-It Notes */}
        {postItList.map(({ id, position, text, fill }) => (
          <div key={id}>
            <PostIt
              postItListState={[postItList, setPostItList]}
              id={id}
              position={position}
              text={text}
              fill={fill}
              action={'delete'} // Default delete action
              actionFixed // Keep the delete button visible
              stylePinned 
              styleBentCorner 
            />
          </div>
        ))}
  
  
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
  
            {/* DragDropContext for handling drag events */}
            <DragDropContext onDragEnd={handleDragEnd}>
              {/* Pinned Rules Droppable */}
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
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}  
              </Droppable>
  
              {/* Separator between pinned and unpinned */}
              {pinnedRules.length > 0 && <div className="pinned-separator" />}
            
              {/* Unpinned Rules Droppable */}
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

  export default AppContent;