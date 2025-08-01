import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCLl1NM4I__L24QtFaBX-v52HBUDmAUXng",
  authDomain: "ovie-online.firebaseapp.com",
  projectId: "ovie-online",
  storageBucket: "ovie-online.firebasestorage.app",
  messagingSenderId: "153379674097",
  appId: "1:153379674097:web:446e515ae97c2142ac1650",
  measurementId: "G-6QYCWBQPYX"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app)

export default app