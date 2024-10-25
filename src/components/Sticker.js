import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";

// Sticky Note Component for individual notes
const StickyNote = ({ id, position, text, updateStickerText }) => {
  const [noteText, setNoteText] = useState(text);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      updateStickerText(id, noteText); // Save to Firestore
    }
  };

  return (
    <div
      className="sticky-note"
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: '#629584',
        padding: '10px',
        width: '150px',
        height: '150px',
        boxShadow: '0 0 5px rgba(0,0,0,0.2)',
      }}
    >
      <textarea
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        onKeyPress={handleKeyPress}
        onBlur={() => updateStickerText(id, noteText)} // Save on blur (focus loss)
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'transparent',
          outline: 'none',
        }}
      />
    </div>
  );
};

const Stickers = ({ user }) => {
  const [postItList, setPostItList] = useState([]);

  // Fetch stickers from Firestore when the component is mounted
  useEffect(() => {
    if (!user) return;
  
    const unsubscribe = onSnapshot(collection(db, `users/${user.uid}/stickers`), (snapshot) => {
      const fetchedStickers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPostItList(fetchedStickers);
    });
  
    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [user]);
  

  // Handle double-click event to create a sticky note
  useEffect(() => {
    const handleDoubleClick = async (e) => {
      if (e.target.classList.contains('sticky-note')) return;
    
      const newSticker = {
        position: { x: e.clientX, y: e.clientY },
        text: '',
        fill: '#FEE440',
      };
    
      // Optimistically update UI
      const tempId = Date.now().toString(); // Generate a temporary ID
      setPostItList([...postItList, { id: tempId, ...newSticker }]);
    
      const docRef = await addDoc(collection(db, `users/${auth.currentUser.uid}/stickers`), newSticker);
      // Update the temporary ID with the actual Firestore ID
      setPostItList((prev) =>
        prev.map((sticker) => (sticker.id === tempId ? { ...sticker, id: docRef.id } : sticker))
      );
    };
    

    window.addEventListener('dblclick', handleDoubleClick);
    return () => window.removeEventListener('dblclick', handleDoubleClick);
  }, [postItList, user]);

  // Function to update sticker content in Firestore
  const updateStickerText = async (id, newText) => {
    const stickerDoc = doc(db, `users/${auth.currentUser.uid}/stickers`, id);
    await updateDoc(stickerDoc, { text: newText });
    setPostItList(
      postItList.map((sticker) =>
        sticker.id === id ? { ...sticker, text: newText } : sticker
      )
    );
  };

  return (
    <>
      {postItList.map(({ id, position, text }) => (
        <StickyNote
          key={id}
          id={id}
          position={position}
          text={text}
          updateStickerText={updateStickerText}
        />
      ))}
    </>
  );
};

export default Stickers;
