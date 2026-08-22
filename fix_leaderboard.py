import re

with open("src/leaderboard-init.js", "r") as f:
    content = f.read()

replacement = """      savedList.innerHTML = "";
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
      }"""

# We need to replace the old savedSnap.forEach block with this for...of block
# Let's find the start of savedList.innerHTML = ""; and the end of the forEach.
start_str = 'savedList.innerHTML = "";'
end_str = '      });\n    });'

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + replacement + '\n' + content[end_idx + len('      });'):]
    with open("src/leaderboard-init.js", "w") as f:
        f.write(new_content)
    print("Replaced successfully in leaderboard-init.js")
else:
    print("Could not find blocks in leaderboard-init.js")
