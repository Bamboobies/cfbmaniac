import { auth, provider, signInWithPopup, signOut, onAuthStateChanged, db, doc, setDoc, getDoc, deleteDoc } from "./firebase.js";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";

const headerUnauth = document.getElementById('header-unauth');
const headerAuth = document.getElementById('header-auth');
const dashboard = document.getElementById('dashboard');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const userScore = document.getElementById('userScore');

let currentUser = null;
let currentUsername = "";
let currentPicks = {};

let loadedGames = [];
let loadedWeek = 1;

async function loadMatchups() {
  try {
    const res = await fetch('/matchups.json');
    const data = await res.json();
    loadedGames = data.games;
    loadedWeek = data.week;
    
    // Update title
    const titleEl = document.querySelector('h3[style*="color: #fbbf24"]');
    if (titleEl) {
      titleEl.textContent = `Week ${loadedWeek} Matchups`;
    }
    const graphicTitleInput = document.getElementById('graphicTitleInput');
    if (graphicTitleInput && !currentUsername) {
      graphicTitleInput.value = `My Week ${loadedWeek} Picks`;
    }
  } catch(e) {
    console.error("Failed to load matchups", e);
  }
}
loadMatchups().then(() => {
  renderGames();
});

window.selectPick = function(gameId, team) {
  currentPicks[gameId] = team;
  renderGames();
  document.getElementById('saveStatus').textContent = 'Unsaved changes';
  document.getElementById('saveStatus').style.color = '#fbbf24';
};

window.closeModal = function() {
  document.getElementById('user-modal').style.display = 'none';
};

window.openUserProfile = async function() {
  if (!currentUser) return;
  document.getElementById('user-modal').style.display = 'flex';
  document.getElementById('modal-avatar').src = currentUser.photoURL || 'https://via.placeholder.com/80';
  document.getElementById('modal-name').textContent = currentUser.displayName || 'Anonymous Player';
  document.getElementById('modal-elo').textContent = 'Loading...';
  document.getElementById('modal-winrate').textContent = '--%';
  document.getElementById('modal-rank').textContent = '--';
  document.getElementById('modal-season-rank').textContent = '--';

  try {
    const userRef = doc(db, "users", currentUser.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const userData = docSnap.data();
      document.getElementById('modal-name').textContent = userData.username || userData.displayName || 'Anonymous Player';
      document.getElementById('modal-elo').textContent = userData.elo || 500;
      
      const wins = userData.wins || 0;
      const losses = userData.losses || 0;
      const total = wins + losses;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
      document.getElementById('modal-winrate').textContent = `${winRate}%`;

      // Fetch rank by counting users with higher ELO
      import('./firebase.js').then(async ({ collection, query, where, getDocs, orderBy }) => {
        const usersRef = collection(db, "users");
        // We can't do a count easily without importing count(), so we'll just fetch all or order and find index
        const qAll = query(usersRef, orderBy("elo", "desc"));
        const snapAll = await getDocs(qAll);
        let allUsersData = [];
        snapAll.forEach(d => allUsersData.push({ id: d.id, ...d.data() }));
        
        let allRank = 1; let allTied = false;
        for (let i = 0; i < allUsersData.length; i++) {
          const s = allUsersData[i].elo || 500;
          if (i > 0 && s === (allUsersData[i-1].elo || 500)) {
            allUsersData[i].rank = allUsersData[i-1].rank;
            allUsersData[i].isTied = true;
            allUsersData[i-1].isTied = true;
          } else {
            allUsersData[i].rank = i + 1;
            allUsersData[i].isTied = false;
          }
        }
        
        const myAll = allUsersData.find(u => u.id === currentUser.uid);
        if (myAll) {
          allRank = myAll.rank;
          allTied = myAll.isTied;
        }
        
        allUsersData.sort((a, b) => (b.seasonElo || 0) - (a.seasonElo || 0));
        let seasonRank = 1; let seasonTied = false;
        for (let i = 0; i < allUsersData.length; i++) {
          const s = allUsersData[i].seasonElo || 0;
          if (i > 0 && s === (allUsersData[i-1].seasonElo || 0)) {
            allUsersData[i].sRank = allUsersData[i-1].sRank;
            allUsersData[i].sTied = true;
            allUsersData[i-1].sTied = true;
          } else {
            allUsersData[i].sRank = i + 1;
            allUsersData[i].sTied = false;
          }
        }
        
        const mySeason = allUsersData.find(u => u.id === currentUser.uid);
        if (mySeason) {
          seasonRank = mySeason.sRank;
          seasonTied = mySeason.sTied;
        }
        
        document.getElementById('modal-rank').textContent = '#' + (allTied ? 'T' : '') + allRank;
        document.getElementById('modal-season-rank').textContent = '#' + (seasonTied ? 'T' : '') + seasonRank;
      });
      
      // Fetch saved creations
      import('./firebase.js').then(async ({ collection, getDocs }) => {
        const savedContainer = document.getElementById("saved-creations-container");
        const savedList = document.getElementById("saved-creations-list");
        if (!savedContainer || !savedList) return;
        
        savedContainer.style.display = "block";
        const savedRef = collection(db, "users", currentUser.uid, "savedData");
        const savedSnap = await getDocs(savedRef);
        
        if (savedSnap.empty) {
          savedList.innerHTML = `<div style="color: #71717a; text-align: center; background: #0a0a0a; padding: 15px; border-radius: 8px; grid-column: span 2;">No saved creations yet. Start building!</div>`;
          return;
        }
        
        savedList.innerHTML = "";
        for (const documentSnap of savedSnap.docs) {
          const data = documentSnap.data();
          if (!data.week) {
             await deleteDoc(doc(db, "users", currentUser.uid, "savedData", documentSnap.id));
             continue;
          }
          const docType = data.type || documentSnap.id.split('_')[0];
          const docWeek = data.week;
          const d = new Date(data.updatedAt);
          const dateStr = d.toLocaleDateString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'});
          
          let title = docType.charAt(0).toUpperCase() + docType.slice(1);
          if (docType === "top25") title = "Top 25 Rankings";
          if (docType === "player-rankings") title = "Player Rankings";
          if (docType === "bracket") title = "Playoff Bracket";
          if (docType === "conference") title = "Conference Rankings";
          if (docType === "schedule") title = "Record Predictor";
          
          const fullTitle = `${docWeek} ${title}`;
          
          let url = `/index.html?loadId=${documentSnap.id}`;
          if (docType === "conference") url = `/conference.html?loadId=${documentSnap.id}`;
          if (docType === "schedule") url = `/schedule.html?loadId=${documentSnap.id}`;
          if (docType === "player-rankings") url = `/player-rankings.html?loadId=${documentSnap.id}`;
          
          savedList.innerHTML += `
            <a href="${url}" style="text-decoration: none; display: block; background: #18181b; border: 1px solid #3f3f46; border-radius: 6px; padding: 12px; transition: 0.2s; cursor: pointer;" onmouseover="this.style.borderColor='#fbbf24'" onmouseout="this.style.borderColor='#3f3f46'">
              <div style="color: #fbbf24; font-weight: 600; margin-bottom: 5px;">${fullTitle}</div>
              <div style="color: #a1a1aa; font-size: 0.75rem;">Updated: ${dateStr}</div>
            </a>
          `;
        }

      });
    }
  } catch (err) {
    console.error("Failed to load user profile details", err);
  }
};

function renderGames() {
  const container = document.getElementById('games-container');
  if (!container) return;
  container.innerHTML = '';
  
  loadedGames.forEach(game => {
    const awayColor = window.teamColors && window.teamColors[game.away] ? window.teamColors[game.away] : '#3f3f46';
    const homeColor = window.teamColors && window.teamColors[game.home] ? window.teamColors[game.home] : '#3f3f46';
    
    const awaySelected = currentPicks[game.id] === game.away;
    const homeSelected = currentPicks[game.id] === game.home;
    
    const kickoff = new Date(game.date);
    const now = new Date();
    const isLocked = now >= kickoff;
    const lockedStyle = isLocked ? 'opacity: 0.3; pointer-events: none; filter: grayscale(100%);' : '';
    
    // Format date nicely
    const dateStr = kickoff.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    const safeId = game.id.replace(/'/g, "\\'");
    const safeAway = game.away.replace(/'/g, "\\'");
    const safeHome = game.home.replace(/'/g, "\\'");

    const gameHtml = `
      <div style="text-align: center; color: #a1a1aa; font-size: 0.75rem; margin-bottom: 5px; ${isLocked ? 'color: #ef4444;' : ''}">
        ${isLocked ? '🔒 LOCKED' : dateStr}
      </div>
      <div style="background: #141414; border: 1px solid #27272a; border-radius: 8px; padding: 15px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
        <div style="flex: 1; text-align: center;">
          <button onclick="selectPick('${safeId}', '${safeAway}')" style="width: 100%; padding: 15px 10px; border-radius: 6px; border: 3px solid ${awaySelected ? '#fbbf24' : 'transparent'}; background: ${awayColor}; color: #fff; cursor: pointer; transition: all 0.2s; opacity: ${awaySelected ? '1' : '0.7'}; text-shadow: 0px 1px 3px rgba(0,0,0,0.8); ${lockedStyle}">
            <div style="font-weight: 700; font-size: 1rem;">
              ${game.away} ${game.awaySpread ? (game.awaySpread > 0 ? '+' + game.awaySpread : game.awaySpread) : ''}
            </div>
          </button>
        </div>
        <div style="padding: 0 15px; color: #a1a1aa; font-size: 0.8rem; font-weight: 700;">VS</div>
        <div style="flex: 1; text-align: center;">
          <button onclick="selectPick('${safeId}', '${safeHome}')" style="width: 100%; padding: 15px 10px; border-radius: 6px; border: 3px solid ${homeSelected ? '#fbbf24' : 'transparent'}; background: ${homeColor}; color: #fff; cursor: pointer; transition: all 0.2s; opacity: ${homeSelected ? '1' : '0.7'}; text-shadow: 0px 1px 3px rgba(0,0,0,0.8); ${lockedStyle}">
            <div style="font-weight: 700; font-size: 1rem;">
              ${game.home} ${game.homeSpread ? (game.homeSpread > 0 ? '+' + game.homeSpread : game.homeSpread) : ''}
            </div>
          </button>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', gameHtml);
  });
}

function showUsernameModal(defaultName) {
  const modal = document.getElementById('username-modal');
  const input = document.getElementById('username-input');
  const errorMsg = document.getElementById('username-error');
  const saveBtn = document.getElementById('save-username-btn');
  
  input.value = defaultName;
  errorMsg.style.display = 'none';
  modal.style.display = 'flex';
  
  saveBtn.onclick = async () => {
    const val = input.value.trim().toLowerCase();
    if (!val || val.length < 3) {
      errorMsg.textContent = 'Username must be at least 3 characters.';
      errorMsg.style.display = 'block';
      return;
    }
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Checking...';
    
    try {
      const q = query(collection(db, "users"), where("username", "==", val));
      const snap = await getDocs(q);
      
      if (!snap.empty && snap.docs[0].id !== currentUser.uid) {
        errorMsg.textContent = 'Username is already taken.';
        errorMsg.style.display = 'block';
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Username';
        return;
      }
      
      await updateDoc(doc(db, "users", currentUser.uid), { username: val });
      userName.textContent = val;
      currentUsername = val;
      const graphicTitleInput = document.getElementById('graphicTitleInput');
      if (graphicTitleInput) graphicTitleInput.value = `${currentUsername}'s Week ${loadedWeek} Picks`;
      modal.style.display = 'none';
    } catch (e) {
      console.error(e);
      errorMsg.textContent = 'An error occurred. Try again.';
      errorMsg.style.display = 'block';
    }
    
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Username';
  };
}

// Handle Auth State Changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    if (headerUnauth) headerUnauth.style.display = 'none';
    if (headerAuth) headerAuth.style.display = 'flex';
    
    userName.textContent = user.displayName || 'Anonymous Player';
    userAvatar.src = user.photoURL || 'https://via.placeholder.com/40';
    
    // Check if user exists in database, if not create them
    const userRef = doc(db, "users", user.uid);
    try {
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        const generatedUsername = user.displayName ? user.displayName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + Math.floor(Math.random()*1000) : "user" + Math.floor(Math.random()*10000);
        await setDoc(userRef, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          elo: 500,
          joinedAt: new Date().toISOString()
        });
        userScore.textContent = `ELO: 500`;
        showUsernameModal(user.displayName ? user.displayName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : "");
      } else {
        const data = docSnap.data();
        userScore.textContent = `ELO: ${data.elo || 500}`;
        if (!data.username) {
          showUsernameModal(user.displayName ? user.displayName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : "");
        } else {
          userName.textContent = data.username;
          currentUsername = data.username;
          const graphicTitleInput = document.getElementById('graphicTitleInput');
          if (graphicTitleInput) graphicTitleInput.value = `${currentUsername}'s Week ${loadedWeek} Picks`;
        }
      }
      
      // Load current picks ONLY IF we don't already have unsaved picks we just made
      const picksRef = doc(db, "users", user.uid, "picks", "week" + loadedWeek);
      const picksSnap = await getDoc(picksRef);
      if (picksSnap.exists()) {
        const dbPicks = picksSnap.data().picks || {};
        // Merge db picks into current picks so we don't overwrite any local unsaved picks made before logging in
        currentPicks = { ...dbPicks, ...currentPicks };
        const saveStatus = document.getElementById('saveStatus');
        if (saveStatus) {
          saveStatus.textContent = 'Picks loaded';
          saveStatus.style.color = '#10b981';
        }
      }
      renderGames();
      
    } catch (error) {
      console.error("Error accessing user data:", error);
    }
  } else {
    currentUser = null;
    if (headerUnauth) headerUnauth.style.display = 'flex';
    if (headerAuth) headerAuth.style.display = 'none';
  }
});

// Login
loginBtn.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Login failed", error);
    alert("Sign-in failed: " + error.message);
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed", error);
  }
});

const savePicksBtn = document.getElementById('savePicksBtn');
if (savePicksBtn) {
  savePicksBtn.addEventListener('click', async () => {
    if (!currentUser) {
      alert("Please sign in to save your picks to the leaderboard.");
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        console.error(err);
      }
      return;
    }
    savePicksBtn.textContent = 'Saving...';
    savePicksBtn.disabled = true;
    
    try {
      const picksRef = doc(db, "users", currentUser.uid, "picks", "week" + loadedWeek);
      await setDoc(picksRef, {
        week: loadedWeek,
        picks: currentPicks,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      document.getElementById('saveStatus').textContent = 'Picks saved!';
      document.getElementById('saveStatus').style.color = '#10b981';
    } catch (err) {
      console.error("Error saving picks:", err);
      alert("Failed to save picks");
    }
    
    savePicksBtn.textContent = 'Save Picks';
    savePicksBtn.disabled = false;
  });
}

// Promo login link
const promoLoginLink = document.getElementById('promoLoginLink');
if (promoLoginLink) {
  promoLoginLink.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  });
}

// Graphic Generation Logic
const generateGraphicBtn = document.getElementById('generateGraphicBtn');
if (generateGraphicBtn) {
  generateGraphicBtn.addEventListener('click', async () => {
    const pickedGamesCount = Object.keys(currentPicks).length;
    if (pickedGamesCount === 0) {
      alert("Please make at least one pick before generating a graphic!");
      return;
    }

    generateGraphicBtn.textContent = 'Generating...';
    generateGraphicBtn.disabled = true;

    const countSelect = document.getElementById('graphicCount').value;
    let limit = countSelect === 'all' ? 999 : parseInt(countSelect, 10);
    
    const graphicGrid = document.getElementById('graphic-grid');
    graphicGrid.innerHTML = '';
    
    let renderedCount = 0;
    
    for (const game of loadedGames) {
      if (renderedCount >= limit) break;
      if (!currentPicks[game.id]) continue; // Only include games they picked
      
      const pick = currentPicks[game.id];
      const awayIsPick = pick === game.away;
      const homeIsPick = pick === game.home;
      
      const awayColor = window.teamColors && window.teamColors[game.away] ? window.teamColors[game.away] : '#3f3f46';
      const homeColor = window.teamColors && window.teamColors[game.home] ? window.teamColors[game.home] : '#3f3f46';
      
      const homeSpreadText = game.homeSpread ? (game.homeSpread > 0 ? '+' : '') + game.homeSpread : '';
      const awaySpreadText = game.awaySpread ? (game.awaySpread > 0 ? '+' : '') + game.awaySpread : '';
      
      const el = document.createElement('div');
      el.style.background = '#18181b';
      el.style.border = '2px solid #27272a';
      el.style.borderRadius = '12px';
      el.style.padding = '20px';
      el.style.display = 'flex';
      el.style.justifyContent = 'space-between';
      el.style.alignItems = 'center';
      
      el.innerHTML = `
        <div style="flex: 1; text-align: center; padding: 15px; border-radius: 8px; ${awayIsPick ? `background: ${awayColor}; color: #fff; transform: scale(1.05); font-weight: bold; border: 3px solid #fff;` : 'background: #0a0a0a; color: #a1a1aa;'}">
          <div style="font-size: 1.4rem;">${game.away}</div>
          <div style="font-size: 0.9rem; margin-top: 4px; opacity: 0.8;">${awaySpreadText}</div>
        </div>
        <div style="padding: 0 20px; font-weight: bold; color: #71717a; font-size: 1.2rem;">@</div>
        <div style="flex: 1; text-align: center; padding: 15px; border-radius: 8px; ${homeIsPick ? `background: ${homeColor}; color: #fff; transform: scale(1.05); font-weight: bold; border: 3px solid #fff;` : 'background: #0a0a0a; color: #a1a1aa;'}">
          <div style="font-size: 1.4rem;">${game.home}</div>
          <div style="font-size: 0.9rem; margin-top: 4px; opacity: 0.8;">${homeSpreadText}</div>
        </div>
      `;
      graphicGrid.appendChild(el);
      renderedCount++;
    }
    
    const customTitle = document.getElementById('graphicTitleInput') ? document.getElementById('graphicTitleInput').value.trim() : '';
    document.getElementById('graphic-title').textContent = customTitle || (currentUser ? `${currentUsername || 'My'} Week ${loadedWeek} Picks` : `My Week ${loadedWeek} Picks`);

    try {
      const container = document.getElementById('graphic-render-container');
      const canvas = await window.html2canvas(container, {
        scale: 2,
        backgroundColor: '#0a0a0a'
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      document.getElementById('graphic-preview').src = dataUrl;
      document.getElementById('graphic-result-section').style.display = 'block';
      
      // Suggest login if not logged in
      if (!currentUser) {
        document.getElementById('graphic-promo').style.display = 'block';
      } else {
        document.getElementById('graphic-promo').style.display = 'none';
      }
      
      // Download functionality
      document.getElementById('downloadGraphicBtn').onclick = () => {
        const link = document.createElement('a');
        link.download = `cfbmaniac-week${loadedWeek}-picks.png`;
        link.href = dataUrl;
        link.click();
      };

      const shareBtn = document.getElementById('shareGraphicBtn');
      if (shareBtn) {
        shareBtn.onclick = async () => {
          shareBtn.textContent = "Sharing...";
          shareBtn.disabled = true;
          try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const file = new File([blob], `cfbmaniac-week${loadedWeek}-picks.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: 'My CFB Picks',
                text: 'Check out my CFB predictions on CFB Maniac!',
                url: window.location.href,
                files: [file]
              });
            } else {
              alert("Social sharing is not natively supported on this browser. Try downloading the image instead!");
            }
          } catch (e) {
            console.error("Share failed", e);
          }
          shareBtn.textContent = "Share to Social";
          shareBtn.disabled = false;
        };
      }
      
    } catch (e) {
      console.error(e);
      alert("Failed to generate graphic.");
    }

    generateGraphicBtn.textContent = 'Create Graphic';
    generateGraphicBtn.disabled = false;
  });
}
