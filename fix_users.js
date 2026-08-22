import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDn6R7TMb2MgDuj9LIwDsbdg-n9D9jIEjE",
  projectId: "cfb-maniac"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fix() {
  const snapshot = await getDocs(collection(db, "users"));
  for (const userDoc of snapshot.docs) {
    const data = userDoc.data();
    if (!data.username && data.displayName) {
      await updateDoc(doc(db, "users", userDoc.id), {
        username: data.displayName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + Math.floor(Math.random()*1000)
      });
    }
  }
  console.log("Fixed users");
  process.exit(0);
}
fix().catch(console.error);
