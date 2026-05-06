import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCex6PPp6eBgYemletJzdchY-9ZWdQIRDo",
  authDomain: "thebarbercraft-8e0a6.firebaseapp.com",
  projectId: "thebarbercraft-8e0a6",
  storageBucket: "thebarbercraft-8e0a6.firebasestorage.app",
  messagingSenderId: "409624797312",
  appId: "1:409624797312:web:67624d53ca7b00e6af0665",
  measurementId: "G-JZKPM642PE"
};

const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export default app;
