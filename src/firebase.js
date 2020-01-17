import firebase from "firebase/app";
import "firebase/firestore"

const firebaseApp = firebase.initializeApp({
  apiKey: 'AIzaSyA-pcDkrU4oGUYhaYXAxZJwtW9VIRQtQKk',
  authDomain: 'JdHUAgbNIoYya6KhvzOq2yEnW9MGas6ao1r1pGvd',
  projectId: 'line-hack-2019'
});

const db = firebaseApp.firestore();

export { db };