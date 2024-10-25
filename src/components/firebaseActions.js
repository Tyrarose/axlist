import { db, auth } from './firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export const fetchDocuments = async (path) => {
  const snapshot = await getDocs(collection(db, path));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const addDocument = async (path, data) => {
  const docRef = await addDoc(collection(db, path), data);
  return docRef.id;
};

export const updateDocument = async (path, id, data) => {
  const docRef = doc(db, path, id);
  await updateDoc(docRef, data);
};

export const deleteDocument = async (path, id) => {
  const docRef = doc(db, path, id);
  await deleteDoc(docRef);
};
