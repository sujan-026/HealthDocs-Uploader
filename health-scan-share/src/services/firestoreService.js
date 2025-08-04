// Modular v9+ SDK
import {
    collection,
    doc,
    addDoc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
  } from "firebase/firestore";
  import { db } from "@/lib/firebase";
  
  /* --------------------------------- HELPERS -------------------------------- */
  
  const _COLLECTIONS = {
    Consultation: "Consultation",
    DocumentType: "DocumentType",
    MedicalRecords: "MedicalRecords",
    Patient: "Patient",
    Doctor: "doctor",            // note the lowercase “doctor” in the screenshot
  };
  
  // addDoc() ⬅ new doc with random id
  export async function createDoc(collectionName, data) {
    const ref = await addDoc(collection(db, _COLLECTIONS[collectionName]), {
      ...data,
      timestamp: serverTimestamp(),
    });
    return ref.id;                              // return generated id
  }
  
  // setDoc(..., { merge:true }) ⬅ full/partial update (id required)
  export async function upsertDoc(collectionName, id, data) {
    const ref = doc(db, _COLLECTIONS[collectionName], id);
    await setDoc(ref, { ...data, timestamp: serverTimestamp() }, { merge: true });
    return id;
  }
  
  // read ONE document
  export async function getDocById(collectionName, id) {
    const snap = await getDoc(doc(db, _COLLECTIONS[collectionName], id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }
  
  // read MANY (optionally filter with where())
  export async function getDocsInCollection(collectionName, field, op, value) {
    const colRef = collection(db, _COLLECTIONS[collectionName]);
    const q = field ? query(colRef, where(field, op, value)) : colRef;
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  
  /* ------------------------------ CONVENIENCE ------------------------------- */
  /* Feel free to delete these if you’re happy calling createDoc/getDocs… directly */
  
  export const addConsultation = (payload) =>
    createDoc("Consultation", {
      patientId: payload.patientId,
      doctorId: payload.doctorId,
      notes: payload.notes ?? "",
      date: payload.date ?? serverTimestamp(),
      ...payload.extra,          // allow any other keys you need
    });
  
  export const addMedicalRecord = (payload) =>
    createDoc("MedicalRecords", {
      patientId: payload.patientId,
      doctorId: payload.doctorId,
      allergies: payload.allergies ?? [],
      consultations: payload.consultationsRef,  // DocumentReference
      ...payload.extra,
    });
  
  export const updatePatient = (id, partial) => upsertDoc("Patient", id, partial);
  export const updateDoctor  = (id, partial) => upsertDoc("Doctor",  id, partial);
  