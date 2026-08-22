import re

with open("src/global-auth.js", "r") as f:
    content = f.read()

replacement = """export async function saveToProfile(type, data, isAutoSave = false, customOptions = {}) {
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
  let docId;

  if (type === "player-rankings") {
    const urlParams = new URLSearchParams(window.location.search);
    const loadId = urlParams.get('loadId');
    let title = customOptions.title;
    
    if (loadId && loadId.startsWith("player-rankings_")) {
       docId = loadId;
       if (!title) {
          title = prompt("Update title for your player rankings?", activeWeek);
          if (!title) return;
       }
    } else {
       if (!title) {
          title = prompt("Enter a title for your custom player rankings:", "My Player Rankings");
          if (!title) return;
       }
       docId = `player-rankings_${Date.now()}`;
    }
    
    // Limit to 10
    try {
       const { getDocs, query, collection, where } = await import("firebase/firestore");
       const q = query(collection(db, "users", window.currentUser.uid, "savedData"), where("type", "==", "player-rankings"));
       const snap = await getDocs(q);
       const isExisting = snap.docs.find(d => d.id === docId);
       if (!isExisting && snap.size >= 10) {
          alert("You can only have up to 10 player rankings saved at once. Please delete an old one from your profile.");
          return;
       }
    } catch(e) {
       console.error("Error checking limits", e);
    }
    
    activeWeek = title; // We store the title in the 'week' field for the dashboard
  } else if (type === "schedule") {
    if (activeWeek !== "Preseason") {
        alert("Record predictions can only be saved during the preseason.");
        return;
    }
    
    // For schedule, use the team name in the week to display nicely on dashboard
    const teamName = customOptions.team || "Team";
    let safeTeam = teamName.replace(/ /g, '_');
    
    // If we are actively editing a past loaded item, preserve it
    const urlParams = new URLSearchParams(window.location.search);
    const loadId = urlParams.get('loadId');
    if (loadId && loadId.startsWith(type + "_")) {
       safeTeam = loadId.substring(type.length + 1);
    }
    
    docId = `${type}_${safeTeam}`;
    activeWeek = `2026 ${teamName}`; // Storing formatted title in week field
  } else {
    let safeWeek = activeWeek.replace(/ /g, '_');
    
    // If we are actively editing a past loaded item, preserve its week
    const urlParams = new URLSearchParams(window.location.search);
    const loadId = urlParams.get('loadId');
    if (loadId && loadId.startsWith(type + "_")) {
       safeWeek = loadId.substring(type.length + 1);
       activeWeek = safeWeek.replace(/_/g, ' ');
    }
    
    docId = `${type}_${safeWeek}`;
  }
  
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
}"""

start_str = "export async function saveToProfile(type, data, isAutoSave = false) {"
end_str = "  }\n}"

start_idx = content.find(start_str)
# finding the very end of the function. We will just use regex to replace it
new_content = re.sub(r'export async function saveToProfile\(type, data, isAutoSave = false\) \{.*?\n\}', replacement, content, flags=re.DOTALL)

with open("src/global-auth.js", "w") as f:
    f.write(new_content)
