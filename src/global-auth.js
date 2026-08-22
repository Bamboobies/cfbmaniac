import { auth, provider, signInWithPopup, signOut, onAuthStateChanged, db, doc, setDoc, getDoc } from "./firebase.js";
import { getCurrentCFBWeek } from "./week-calculator.js";

// Inject the Auth UI into the DOM
export function initAuth(onUserLoadCallback = null) {
  const authContainer = document.createElement('div');
  authContainer.style.position = 'absolute';
  authContainer.style.top = '15px';
  authContainer.style.right = '15px';
  authContainer.style.zIndex = '1000';
  authContainer.style.fontFamily = "'Outfit', sans-serif";
  
  authContainer.innerHTML = `
    <div id="global-header-unauth" style="display: flex;">
      <button id="globalLoginBtn" style="background: #18181b; color: #fff; border: 1px solid #3f3f46; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s;">Sign In</button>
    </div>
    
    <div id="global-header-auth" style="display: none; align-items: center; gap: 15px;">
      <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;" onclick="window.location.href='/predictions.html'">
        <img id="globalUserAvatar" src="" alt="Profile" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #fbbf24;">
        <div style="display: none; flex-direction: column; justify-content: center;" class="auth-name-container">
          <div id="globalUserName" style="font-weight: 600; font-size: 0.9rem; color: #fff;"></div>
        </div>
      </div>
      <button id="globalLogoutBtn" style="background: #3f3f46; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">Sign Out</button>
    </div>
  `;
  
  document.body.appendChild(authContainer);

  const style = document.createElement('style');
  style.textContent = `
    @media(min-width: 600px) {
      .auth-name-container { display: flex !important; }
    }
  `;
  document.head.appendChild(style);

  document.getElementById('globalLoginBtn').addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
    }
  });

  document.getElementById('globalLogoutBtn').addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  });

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      document.getElementById('global-header-unauth').style.display = 'none';
      document.getElementById('global-header-auth').style.display = 'flex';
      
      document.getElementById('globalUserName').textContent = user.displayName || 'Player';
      document.getElementById('globalUserAvatar').src = user.photoURL || 'https://via.placeholder.com/32';
      
      window.currentUser = user;
    } else {
      document.getElementById('global-header-unauth').style.display = 'flex';
      document.getElementById('global-header-auth').style.display = 'none';
      window.currentUser = null;
    }
    
    if (onUserLoadCallback) {
      onUserLoadCallback(user);
    }
  });
}


// Global Save function
export async function saveToProfile(type, data, isAutoSave = false) {
  let user = window.currentUser;
  
  if (!user) {
    if (!isAutoSave) {
      try {
        const credential = await signInWithPopup(auth, provider);
        user = credential.user;
        window.currentUser = user;
      } catch(e) {
        console.error(e);
        return;
      }
    } else {
      return;
    }
  }
  
  if (!user) return;
  
  let activeWeek = getCurrentCFBWeek();
  let safeWeek = activeWeek.replace(/ /g, '_');
  
  // If we are actively editing a past loaded item, preserve its week
  const urlParams = new URLSearchParams(window.location.search);
  const loadId = urlParams.get('loadId');
  if (loadId && loadId.startsWith(type + "_")) {
     safeWeek = loadId.substring(type.length + 1);
     activeWeek = safeWeek.replace(/_/g, ' ');
  }
  
  const docId = `${type}_${safeWeek}`;
  
  try {
    const docRef = doc(db, "users", window.currentUser.uid, "savedData", docId);
    await setDoc(docRef, {
      updatedAt: new Date().toISOString(),
      type: type,
      week: activeWeek,
      data: data
    });
    if (!isAutoSave) {
      alert("Successfully saved to your profile!");
    }
  } catch (error) {
    console.error("Error saving data:", error);
    if (!isAutoSave) {
      alert("Failed to save. Please try again.");
    }
  }
}

export async function loadFromProfile(docId) {
  if (!window.currentUser) return null;
  try {
    const docRef = doc(db, "users", window.currentUser.uid, "savedData", docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data().data;
    }
  } catch (err) {
    console.error("Error loading data:", err);
  }
  return null;
}
window.loadFromProfile = loadFromProfile;
