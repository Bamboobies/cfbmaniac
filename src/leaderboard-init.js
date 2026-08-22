import { auth, onAuthStateChanged, db, collection, query, orderBy, limit, getDocs, deleteDoc, doc } from "./firebase.js";

let currentUser = null;
let currentMode = 'alltime'; // or 'season'
let allUsers = [];

window.switchTab = function(mode) {
  currentMode = mode;
  document.getElementById('tab-alltime').classList.toggle('active', mode === 'alltime');
  document.getElementById('tab-season').classList.toggle('active', mode === 'season');
  renderLeaderboard();
};

window.closeModal = function() {
  document.getElementById('user-modal').style.display = 'none';
};

window.openUserProfile = function(userIndex) {
  const user = allUsers[userIndex];
  if (!user) return;
  
  document.getElementById('modal-avatar').src = user.photoURL || 'https://via.placeholder.com/80';
  document.getElementById('modal-name').textContent = user.displayName || 'Anonymous';
  
  const elo = currentMode === 'alltime' ? (user.elo || 500) : (user.seasonElo || 0);
  document.getElementById('modal-elo').textContent = elo;
  
  const wins = user.wins || 0;
  const losses = user.losses || 0;
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  document.getElementById('modal-winrate').textContent = `${winRate}%`;

  // Show extra stats for current user
  if (currentUser && user.id === currentUser.uid) {
    document.getElementById('modal-rank-box').style.display = 'block';
    document.getElementById('modal-season-rank-box').style.display = 'block';
    document.getElementById('past-predictions-container').style.display = 'block';
    
    let allUsersData = [...allUsers];
    allUsersData.sort((a, b) => (b.elo || 500) - (a.elo || 500));
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
      document.getElementById('modal-rank').textContent = '#' + (myAll.isTied ? 'T' : '') + myAll.rank;
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
      document.getElementById('modal-season-rank').textContent = '#' + (mySeason.sTied ? 'T' : '') + mySeason.sRank;
    }
    
    // Fetch saved creations
    import('./firebase.js').then(async ({ collection, getDocs, db }) => {
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
        if (docType === "player-rankings" || docType === "awards") url = `/player-rankings.html?loadId=${documentSnap.id}`;
        
        savedList.innerHTML += `
          <div style="position: relative; display: block; background: #18181b; border: 1px solid #3f3f46; border-radius: 6px; padding: 12px; transition: 0.2s;" onmouseover="this.style.borderColor='#fbbf24'" onmouseout="this.style.borderColor='#3f3f46'">
            <a href="${url}" style="text-decoration: none; display: block;">
              <div style="color: #fbbf24; font-weight: 600; margin-bottom: 5px; padding-right: 20px;">${fullTitle}</div>
              <div style="color: #a1a1aa; font-size: 0.75rem;">Updated: ${dateStr}</div>
            </a>
            <button onclick="deleteSavedCreation('${documentSnap.id}')" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: #ef4444; font-size: 1.2rem; cursor: pointer;" title="Delete">&times;</button>
          </div>
        `;
      }

    });

  } else {
    document.getElementById('modal-rank-box').style.display = 'none';
    document.getElementById('modal-season-rank-box').style.display = 'none';
    document.getElementById('past-predictions-container').style.display = 'none';
    const savedContainer = document.getElementById("saved-creations-container");
    if (savedContainer) savedContainer.style.display = 'none';
  }
  
  document.getElementById('user-modal').style.display = 'flex';
};

// Also expose openUserProfile for predictions page header
window.openCurrentUserProfile = function() {
  if (!currentUser) return;
  const idx = allUsers.findIndex(u => u.id === currentUser.uid);
  if (idx !== -1) {
    openUserProfile(idx);
  } else {
    // Current user not in top 50, mock data
    openUserProfile(-1, {
      id: currentUser.uid,
      photoURL: currentUser.photoURL,
      displayName: currentUser.displayName,
      elo: 500, // Would pull from their actual doc
      wins: 0,
      losses: 0
    });
  }
};

let searchFilter = '';

document.getElementById('search-input').addEventListener('input', (e) => {
  searchFilter = e.target.value.toLowerCase().trim();
  renderLeaderboard();
});

async function loadLeaderboard() {
  try {
    const usersRef = collection(db, "users");
    // Fetch all users to compute exact rankings and ties correctly
    const snapshot = await getDocs(usersRef);
    
    allUsers = [];
    snapshot.forEach(doc => {
      allUsers.push({ id: doc.id, ...doc.data() });
    });
    
    renderLeaderboard();
  } catch (e) {
    console.error("Error loading leaderboard", e);
    document.getElementById('leaderboard-container').innerHTML = '<div style="padding: 30px; text-align: center; color: #ef4444;">Failed to load leaderboard.</div>';
  }
}

function renderLeaderboard() {
  const container = document.getElementById('leaderboard-container');
  container.innerHTML = '';
  
  // Sort depending on mode
  const sortedUsers = [...allUsers].sort((a, b) => {
    const valA = currentMode === 'alltime' ? (a.elo || 500) : (a.seasonElo || 0);
    const valB = currentMode === 'alltime' ? (b.elo || 500) : (b.seasonElo || 0);
    return valB - valA;
  });

  // Calculate ranks with tie logic
  for (let i = 0; i < sortedUsers.length; i++) {
    const score = currentMode === 'alltime' ? (sortedUsers[i].elo || 500) : (sortedUsers[i].seasonElo || 0);
    if (i > 0) {
      const prevScore = currentMode === 'alltime' ? (sortedUsers[i-1].elo || 500) : (sortedUsers[i-1].seasonElo || 0);
      if (score === prevScore) {
        sortedUsers[i].rank = sortedUsers[i-1].rank;
        sortedUsers[i].isTied = true;
        sortedUsers[i-1].isTied = true;
      } else {
        sortedUsers[i].rank = i + 1;
        sortedUsers[i].isTied = false;
      }
    } else {
      sortedUsers[i].rank = 1;
      sortedUsers[i].isTied = false;
    }
  }

  let userRank = -1;
  let userIsTied = false;
  
  const myUser = sortedUsers.find(u => currentUser && u.id === currentUser.uid);
  if (myUser) {
    userRank = myUser.rank;
    userIsTied = myUser.isTied;
  }

  let displayUsers = sortedUsers;
  if (searchFilter) {
    displayUsers = displayUsers.filter(u => 
      (u.username || '').toLowerCase().includes(searchFilter) || 
      (u.displayName || '').toLowerCase().includes(searchFilter)
    );
  }

  // Only show top 50 in list unless searched
  if (!searchFilter) {
    displayUsers = displayUsers.slice(0, 50);
  }

  if (displayUsers.length === 0) {
    container.innerHTML = '<div style="padding: 30px; text-align: center; color: #a1a1aa;">No users found.</div>';
  }

  displayUsers.forEach((user, index) => {
    const actualRank = user.rank;
    const displayRankStr = user.isTied ? `T${actualRank}` : `${actualRank}`;
    
    let rankClass = '';
    if (actualRank === 1) rankClass = 'rank-1';
    else if (actualRank === 2) rankClass = 'rank-2';
    else if (actualRank === 3) rankClass = 'rank-3';
    
    const elo = currentMode === 'alltime' ? (user.elo || 500) : (user.seasonElo || 0);
    const isMe = currentUser && user.id === currentUser.uid;

    const html = `
      <div class="leaderboard-row" style="${isMe ? 'background: #27272a; border-left: 4px solid #fbbf24;' : ''}" onclick="openUserProfile(${allUsers.indexOf(user)})">
        <div class="rank ${rankClass}">${displayRankStr}</div>
        <div class="user-info">
          <img src="${user.photoURL || 'https://via.placeholder.com/40'}" alt="${user.username || user.displayName}">
          <div class="name" style="${isMe ? 'color: #fbbf24;' : ''}">
            ${user.username || user.displayName || 'Anonymous'} ${isMe ? '(You)' : ''}
          </div>
        </div>
        <div class="user-score">${elo}</div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
  });
  
  // Show "My Rank" banner if current user is logged in
  const myRankContainer = document.getElementById('my-rank-container');
  if (currentUser) {
    myRankContainer.style.display = 'flex';
    myRankContainer.style.cursor = 'pointer';
    myRankContainer.onclick = window.openCurrentUserProfile;
    if (userRank !== -1) {
      const displayMyRankStr = userIsTied ? `T${userRank}` : `${userRank}`;
      myRankContainer.innerHTML = `
        <div>Your Rank: <strong style="font-size: 1.4rem;">#${displayMyRankStr}</strong> out of ${sortedUsers.length}</div>
        <div style="font-size: 0.9rem; font-weight: 500; opacity: 0.8;">${userRank <= 50 ? 'You are in the Top 50!' : ''} Click to view profile.</div>
      `;
    } else {
      myRankContainer.innerHTML = `
        <div>Your Rank: <strong style="font-size: 1.4rem;">Unranked</strong></div>
        <div style="font-size: 0.9rem; font-weight: 500; opacity: 0.8;">Make predictions to get ranked. Click to view profile.</div>
      `;
    }
  } else {
    myRankContainer.style.display = 'none';
  }
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  loadLeaderboard();
});

// Initial load for non-logged in state
loadLeaderboard();

window.deleteSavedCreation = async function(docId) {
  if (!currentUser) return;
  if (!confirm("Are you sure you want to delete this from your profile?")) return;
  
  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "savedData", docId));
    alert("Deleted successfully.");
    window.location.reload();
  } catch (e) {
    console.error("Error deleting:", e);
    alert("Failed to delete.");
  }
};
