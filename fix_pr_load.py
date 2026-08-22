import re

with open("player-rankings.html", "r") as f:
    pr = f.read()

replacement = """      if (loadId) {
        if (loadId.startsWith("awards")) {
           setMode("awards");
        } else if (loadId.startsWith("player-rankings")) {
           setMode("rankings");
        }
        const data = await loadFromProfile(loadId);"""
        
pr = pr.replace("""      if (loadId) {
        const data = await loadFromProfile(loadId);""", replacement)

with open("player-rankings.html", "w") as f:
    f.write(pr)

