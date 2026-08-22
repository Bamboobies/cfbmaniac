import re

with open("index.html", "r") as f:
    content = f.read()

replacement = """    ["w512","w89","w611","w710","sfA","sfB","sfC","sfD","f1","f2"].forEach(slot => {
      const team = params.get(slot);
      if (team) {
        const el = document.getElementById('name-'+slot);
        if (el) {
          el.textContent = team;
          el.classList.remove("empty");
          if (typeof applyTeamColor === 'function') {
             applyTeamColor(el.parentElement, team);
          }
          const seedEl = el.parentElement.querySelector(".seed-num");
          if (seedEl && teamSeedMap[team]) seedEl.textContent = teamSeedMap[team];
        }
      }
    });"""

start_str = "    [\"w512\",\"w89\",\"w611\",\"w710\",\"sfA\",\"sfB\",\"sfC\",\"sfD\",\"f1\",\"f2\"].forEach(slot => {"
end_str = "    const champ = params.get('champ');"

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + replacement + '\n' + content[end_idx:]
    with open("index.html", "w") as f:
        f.write(new_content)
    print("Replaced successfully in index.html (url load)")
else:
    print("Could not find url load blocks in index.html")
