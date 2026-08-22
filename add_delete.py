import re

for filename in ["src/leaderboard-init.js", "src/predictions-init.js"]:
    with open(filename, "r") as f:
        content = f.read()
    
    rep = """        let url = `/index.html?loadId=${documentSnap.id}`;
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
        `;"""
        
    old_code = r"""        let url = `/index\.html\?loadId=\$\{documentSnap\.id\}`;
        if \(docType === "conference"\) url = `/conference\.html\?loadId=\$\{documentSnap\.id\}`;
        if \(docType === "schedule"\) url = `/schedule\.html\?loadId=\$\{documentSnap\.id\}`;
        if \(docType === "player-rankings"\) url = `/player-rankings\.html\?loadId=\$\{documentSnap\.id\}`;
        
        savedList\.innerHTML \+= `
          <a href="\$\{url\}" style="text-decoration: none; display: block; background: #18181b; border: 1px solid #3f3f46; border-radius: 6px; padding: 12px; transition: 0\.2s; cursor: pointer;" onmouseover="this\.style\.borderColor='#fbbf24'" onmouseout="this\.style\.borderColor='#3f3f46'">
            <div style="color: #fbbf24; font-weight: 600; margin-bottom: 5px;">\$\{fullTitle\}</div>
            <div style="color: #a1a1aa; font-size: 0\.75rem;">Updated: \$\{dateStr\}</div>
          </a>
        `;"""
        
    new_content = re.sub(old_code, rep, content)
    with open(filename, "w") as f:
        f.write(new_content)
