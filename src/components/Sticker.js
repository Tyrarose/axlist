import React, { useState, useEffect, useRef } from "react";
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";

const Stickers = ({ user }) => {
  const [postItList, setPostItList] = useState([]);
  const [localText, setLocalText] = useState({}); // Local state for managing textarea input
  const draggingRef = useRef(null);
  const newStickerRef = useRef(null); // Ref for focusing new sticker's textarea

  // Fetch existing stickers from Firestore
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, `users/${user.uid}/stickers`), (snapshot) => {
      const fetchedStickers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPostItList(fetchedStickers);

      // Initialize local text state for each sticker
      const initialText = snapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data().text || '';
        return acc;
      }, {});
      setLocalText(initialText);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle double-click to add a new sticker
  useEffect(() => {
    const handleDoubleClick = async (e) => {
      if (e.target.classList.contains('sticky-note')) return;

      const newSticker = {
        position: { x: e.clientX, y: e.clientY },
        text: '',
        fill: '#FEE440',
      };

      const tempId = Date.now().toString();
      setPostItList([...postItList, { id: tempId, ...newSticker }]);
      setLocalText((prev) => ({ ...prev, [tempId]: '' })); // Initialize local text for new sticker

      const docRef = await addDoc(collection(db, `users/${auth.currentUser.uid}/stickers`), newSticker);
      setPostItList((prev) =>
        prev.map((sticker) => (sticker.id === tempId ? { ...sticker, id: docRef.id } : sticker))
      );

      // Focus on the new textarea after the sticker is added
      setTimeout(() => {
        if (newStickerRef.current) {
          newStickerRef.current.focus();
        }
      }, 0);
    };

    window.addEventListener('dblclick', handleDoubleClick);
    return () => window.removeEventListener('dblclick', handleDoubleClick);
  }, [postItList, user]);

  // Function to update sticker text in Firestore on blur
  const saveTextToFirestore = async (id, newText) => {
    const stickerDoc = doc(db, `users/${auth.currentUser.uid}/stickers`, id);
    await updateDoc(stickerDoc, { text: newText });
  };

  // Handle local typing without delay
  const handleTextChange = (id, newText) => {
    setLocalText((prev) => ({ ...prev, [id]: newText }));
  };

  // Save to Firestore when the user leaves the textarea
  const handleBlur = (id) => {
    saveTextToFirestore(id, localText[id]);
  };

  // Function to delete a sticker
  const deleteSticker = async (id) => {
    await deleteDoc(doc(db, `users/${auth.currentUser.uid}/stickers`, id));
    setPostItList((prev) => prev.filter((sticker) => sticker.id !== id));
    setLocalText((prev) => {
      const updatedText = { ...prev };
      delete updatedText[id];
      return updatedText;
    });
  };

  // Function to handle dragging of stickers
const handleDragStart = (e, id) => {
  const sticker = postItList.find((s) => s.id === id);
  if (!sticker) return;

  const offsetX = e.clientX - sticker.position.x;
  const offsetY = e.clientY - sticker.position.y;

  draggingRef.current = { id, offsetX, offsetY };

  let animationFrameId = null;

  const handleMouseMove = (e) => {
    if (!draggingRef.current) return;

    const updatePosition = () => {
      const { offsetX, offsetY } = draggingRef.current;
      const newPosition = {
        x: e.clientX - offsetX,
        y: e.clientY - offsetY,
      };

      setPostItList((prev) =>
        prev.map((sticker) =>
          sticker.id === id ? { ...sticker, position: newPosition } : sticker
        )
      );
      animationFrameId = null;
    };

    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(updatePosition);
    }
  };

  const handleMouseUp = async () => {
    if (!draggingRef.current) return;

    const { id } = draggingRef.current;
    const updatedSticker = postItList.find((s) => s.id === id);
    if (updatedSticker) {
      await updateStickerPosition(id, updatedSticker.position); // Save position to Firestore
    }

    draggingRef.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
};

// Function to update sticker position in Firestore
const updateStickerPosition = async (id, newPosition) => {
  const stickerDoc = doc(db, `users/${auth.currentUser.uid}/stickers`, id);
  await updateDoc(stickerDoc, { position: newPosition });
};


  return (
    <>
      {postItList.map(({ id, position, text }) => (
        <div
          key={id}
          className="sticky-note"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            position: 'absolute',
          }}
          onMouseDown={(e) => handleDragStart(e, id)} // Start dragging when mouse is down
        >
          <button className="delete-button" onClick={() => deleteSticker(id)}>
            ×
          </button>
          
          <textarea
            ref={id === postItList[postItList.length - 1]?.id ? newStickerRef : null} // Focus new sticker's textarea
            className="note-textarea"
            value={localText[id] !== undefined ? localText[id] : text} // Use local text for faster updates
            onChange={(e) => handleTextChange(id, e.target.value)} // Update local state on each keystroke
            onBlur={() => handleBlur(id)} // Save to Firestore on blur
          />
        </div>
      ))}
    </>
  );
};

export default Stickers;
