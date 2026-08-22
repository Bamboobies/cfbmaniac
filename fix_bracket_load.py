import re

with open("index.html", "r") as f:
    content = f.read()

replacement = """             if (data.picks) {
               Object.keys(data.picks).forEach(slot => {
                 const el = document.getElementById(slot === 'champ' ? 'champName' : 'name-'+slot);
                 if (el) {
                   const teamName = data.picks[slot] || "—";
                   el.textContent = teamName;
                   const isEmpty = !teamName || teamName === "—";
                   el.classList.toggle("empty", isEmpty);
                   if (typeof applyTeamColor === 'function') {
                     applyTeamColor(el.parentElement, isEmpty ? "" : teamName);
                   }
                   if (slot !== 'champ' && !isEmpty) {
                       const seedEl = el.parentElement.querySelector(".seed-num");
                       if (seedEl && teamSeedMap[teamName]) {
                           seedEl.textContent = teamSeedMap[teamName];
                       }
                   }
                   if (slot === 'champ' && !isEmpty) {
                       document.getElementById("champWrapper").style.display = "flex";
                   }
                 }
               });
             }"""

start_str = "             if (data.picks) {"
end_str = "             populateAllSeedSelects();"

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + replacement + '\n' + content[end_idx:]
    with open("index.html", "w") as f:
        f.write(new_content)
    print("Replaced successfully in index.html")
else:
    print("Could not find blocks in index.html")
