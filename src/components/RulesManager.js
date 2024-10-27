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
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUnpinningAll, setIsUnpinningAll] = useState(false);

  useEffect(() => {
    const fetchRules = async () => {
      if (!user) return;

      setIsFetching(true);

      const rulesSnapshot = await getDocs(collection(db, `users/${user.uid}/rules`));
      const fetchedRules = rulesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })).sort((a, b) => a.order - b.order);
      
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
        order: rules.length,
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

  const deleteAllRules = async () => {
    setIsDeletingAll(true);
    const querySnapshot = await getDocs(collection(db, `users/${auth.currentUser.uid}/rules`));
    const deletePromises = querySnapshot.docs.map(async (rule) => {
      if (!rule.data().pinned) {
        const ruleDoc = doc(db, `users/${auth.currentUser.uid}/rules`, rule.id);
        return deleteDoc(ruleDoc);
      }
      return null;
    });
    await Promise.all(deletePromises);
    setRules(rules.filter((rule) => rule.pinned));
    setIsDeletingAll(false);
  };

  const unpinAllRules = async () => {
    setIsUnpinningAll(true);
    const querySnapshot = await getDocs(collection(db, `users/${auth.currentUser.uid}/rules`));
    const updatePromises = querySnapshot.docs.map(async (rule) => {
      const ruleDoc = doc(db, `users/${auth.currentUser.uid}/rules`, rule.id);
      return updateDoc(ruleDoc, { pinned: false });
    });
    await Promise.all(updatePromises);
    setRules(rules.map((rule) => ({ ...rule, pinned: false })));
    setIsUnpinningAll(false);
  };

  const resetRules = async () => {
    setIsResetting(true);
    const querySnapshot = await getDocs(collection(db, `users/${auth.currentUser.uid}/rules`));
    const updatePromises = querySnapshot.docs.map(async (rule) => {
      const ruleDoc = doc(db, `users/${auth.currentUser.uid}/rules`, rule.id);
      return updateDoc(ruleDoc, { checked: false });
    });
    await Promise.all(updatePromises);
    setRules(rules.map((rule) => ({ ...rule, checked: false })));
    setIsResetting(false);
  };

  const toggleChecked = async (id, checked) => {
    const ruleDoc = doc(db, `users/${auth.currentUser.uid}/rules`, id);
    await updateDoc(ruleDoc, { checked: !checked });
    
    setRules((prevRules) => prevRules.map((rule) => 
      rule.id === id ? { ...rule, checked: !checked } : rule
    ));
  };

  const togglePin = async (id, pinned) => {
    const ruleDoc = doc(db, `users/${auth.currentUser.uid}/rules`, id);
    await updateDoc(ruleDoc, { pinned: !pinned });
  
    setRules((prevRules) => {
      const updatedRules = prevRules.map((rule) => 
        rule.id === id ? { ...rule, pinned: !pinned } : rule
      );
  
      // Re-sort: Pinned items at top, followed by unpinned
      return updatedRules.sort((a, b) => b.pinned - a.pinned);
    });
  };

  const handleDragEnd = async (result) => {
    const { destination, source } = result;
    if (!destination) return;
    
    // Prevent drag-and-drop between pinned and unpinned lists
    if (
      (source.droppableId === "pinned" && destination.droppableId === "unpinned") ||
      (source.droppableId === "unpinned" && destination.droppableId === "pinned")
    ) {
      return;
    }

    const reorderedRules = Array.from(rules);
    const [movedRule] = reorderedRules.splice(source.index, 1);
    reorderedRules.splice(destination.index, 0, movedRule);

    setRules(reorderedRules);

    const updatePromises = reorderedRules.map((rule, index) => {
      return updateDoc(doc(db, `users/${user.uid}/rules`, rule.id), {
        order: index,
      });
    });

    await Promise.all(updatePromises);
  };

  const pinnedRules = rules.filter((rule) => rule.pinned);
  const unpinnedRules = rules.filter((rule) => !rule.pinned);

  return (
    <div>
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
              {isAdding ? 'Adding...' : 'Add Rule'}
            </button>
          </div>
        </div>
      </form>

      {isFetching ? (
        <div className="text-center">
          <span className="spinner-border text-light" role="status" aria-hidden="true"></span>
          <p>Fetching Rules...</p>
        </div>
      ) : (
        <>
          <h5 className="rule-counter">Total Rules: {rules.length}</h5>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="pinned">
              {(provided) => (
                <ul className="list-group mb-3" {...provided.droppableProps} ref={provided.innerRef}>
                  {pinnedRules.map((rule, index) => (
                    <Draggable key={rule.id} draggableId={rule.id} index={index}>
                      {(provided, snapshot) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`list-group-item d-flex justify-content-between align-items-center ${snapshot.isDragging ? "dragging" : ""}`}
                        >
                          <button className="pinned-btn" onClick={() => togglePin(rule.id, rule.pinned)}>
                            <i className={rule.pinned ? "fas fa-thumbtack pin-icon" : "fas fa-thumbtack unpin-icon"}></i>
                          </button>
                          <input
                            type="checkbox"
                            className="custom-checkbox"
                            checked={rule.checked}
                            onChange={() => toggleChecked(rule.id, rule.checked)}
                          />
                          <label className={`checkbox-label ${rule.checked ? "checked" : ""}`}>{rule.text}</label>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => deleteRule(rule.id)}
                            disabled={deletingRuleId === rule.id}
                          >
                            {deletingRuleId === rule.id ? "Deleting..." : <i className="fas fa-trash"></i>}
                          </button>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>

            {pinnedRules.length > 0 && <div className="pinned-separator" />}

            <Droppable droppableId="unpinned">
              {(provided) => (
                <ul className="list-group mb-3" {...provided.droppableProps} ref={provided.innerRef}>
                  {unpinnedRules.map((rule, index) => (
                    <Draggable key={rule.id} draggableId={rule.id} index={index}>
                      {(provided, snapshot) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`list-group-item d-flex justify-content-between align-items-center ${snapshot.isDragging ? "dragging" : ""}`}
                        >
                          <button className="pinned-btn" onClick={() => togglePin(rule.id, rule.pinned)}>
                            <i className={rule.pinned ? "fas fa-thumbtack pin-icon" : "fas fa-thumbtack unpin-icon"}></i>
                          </button>
                          <input
                            type="checkbox"
                            className="custom-checkbox"
                            checked={rule.checked}
                            onChange={() => toggleChecked(rule.id, rule.checked)}
                          />
                          <label className={`checkbox-label ${rule.checked ? "checked" : ""}`}>{rule.text}</label>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => deleteRule(rule.id)}
                            disabled={deletingRuleId === rule.id}
                          >
                            {deletingRuleId === rule.id ? "Deleting..." : <i className="fas fa-trash"></i>}
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

          {/* Reset, Unpin all, and Delete all buttons */}
          <div className="text-center mb-3">
            <button onClick={resetRules} className="btn btn-danger" disabled={isResetting}>
              {isResetting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Unchecking All...
                </>
              ) : (
                "Uncheck All"
              )}
            </button>
            <button onClick={unpinAllRules} className="btn btn-danger ml-3" disabled={isUnpinningAll}>
              {isUnpinningAll ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Clearing Pins...
                </>
              ) : (
                "Clear Pins"
              )}
            </button>
            <button onClick={deleteAllRules} className="btn btn-secondary ml-5" disabled={isDeletingAll}>
              {isDeletingAll ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Deleting All Rules...
                </>
              ) : (
                "Delete All Rules"
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default RulesManager;
