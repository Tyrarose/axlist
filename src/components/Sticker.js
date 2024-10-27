import React, { useState, useEffect, useRef } from "react";
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";

const Stickers = ({ user }) => {
  const [postItList, setPostItList] = useState([]);
  const [localText, setLocalText] = useState({});
  const [savingState, setSavingState] = useState({}); // Track save states for visual feedback
  const draggingPositionRef = useRef(null); // Store position during drag

  // Fetch existing stickers from Firestore
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, `users/${user.uid}/stickers`), (snapshot) => {
      const fetchedStickers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPostItList(fetchedStickers);

      const initialText = snapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data().text || '';
        return acc;
      }, {});
      setLocalText(initialText);
    });

    return () => unsubscribe();
  }, [user]);

  // Function to save sticker position to Firebase with visual feedback
  const updateStickerPosition = async (id, newPosition) => {
    const stickerDoc = doc(db, `users/${auth.currentUser.uid}/stickers`, id);
    await updateDoc(stickerDoc, { position: newPosition });

    // Update the saving state to show a successful save indication
    setSavingState((prev) => ({ ...prev, [id]: "saved" }));
    setTimeout(() => setSavingState((prev) => ({ ...prev, [id]: "" })), 1000); // Remove after 1 second
  };

  // Handle dragging of stickers
  const handleMouseDown = (e, id) => {
    const sticker = postItList.find((s) => s.id === id);
    if (!sticker) return;

    // Set initial offsets for dragging
    const offsetX = e.clientX - sticker.position.x;
    const offsetY = e.clientY - sticker.position.y;
    draggingPositionRef.current = { offsetX, offsetY, id };

    // Start dragging
    const handleMouseMove = (e) => {
      if (!draggingPositionRef.current || draggingPositionRef.current.id !== id) return;

      const newPosition = {
        x: e.clientX - draggingPositionRef.current.offsetX,
        y: e.clientY - draggingPositionRef.current.offsetY,
      };

      setPostItList((prev) =>
        prev.map((sticker) =>
          sticker.id === id ? { ...sticker, position: newPosition } : sticker
        )
      );
    };

    // Save position on mouse release
    const handleMouseUp = async () => {
      if (!draggingPositionRef.current) return;

      const { id } = draggingPositionRef.current;
      const updatedSticker = postItList.find((s) => s.id === id);
      if (updatedSticker) {
        await updateStickerPosition(id, updatedSticker.position); // Save position to Firebase
      }

      draggingPositionRef.current = null; // Reset dragging state
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Handle text input changes
  const handleTextChange = (id, newText) => {
    setLocalText((prev) => ({ ...prev, [id]: newText }));
  };

  const handleBlur = (id) => {
    saveTextToFirestore(id, localText[id]);
  };

  const saveTextToFirestore = async (id, newText) => {
    const stickerDoc = doc(db, `users/${auth.currentUser.uid}/stickers`, id);
    await updateDoc(stickerDoc, { text: newText });
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

  return (
    <>
      {postItList.map(({ id, position, text }) => (
        <div
          key={id}
          className={`sticky-note ${savingState[id] ? "saved" : ""}`} // Apply 'saved' style when saving
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            position: "absolute",
            boxShadow: savingState[id] ? "0px 0px 8px 2px #888" : "none", // Visual feedback for saved state
          }}
          onMouseDown={(e) => handleMouseDown(e, id)} // Start drag on mouse down
        >
          <button className="delete-button" onClick={() => deleteSticker(id)}>
            ×
          </button>
          <textarea
            className="note-textarea"
            value={localText[id] !== undefined ? localText[id] : text}
            onChange={(e) => handleTextChange(id, e.target.value)}
            onBlur={() => handleBlur(id)}
          />
        </div>
      ))}
    </>
  );
};

export default Stickers;
