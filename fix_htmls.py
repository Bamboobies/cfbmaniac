import re

with open("schedule.html", "r") as f:
    sched = f.read()

sched = re.sub(
    r'saveToProfile\("schedule", \{\n\s*team: currentTeam,\n\s*predictions: predictions\n\s*\}\);',
    'saveToProfile("schedule", { team: currentTeam, predictions: predictions }, false, { team: currentTeam });',
    sched
)

with open("schedule.html", "w") as f:
    f.write(sched)

with open("player-rankings.html", "r") as f:
    pr = f.read()

pr_save = """    if (currentMode === "awards") {
      saveToProfile("awards", { rankings: rankings });
    } else {
      saveToProfile("player-rankings", { rankings: rankings });
    }"""
    
pr = re.sub(
    r'saveToProfile\("player-rankings", \{\n\s*rankings: rankings\n\s*\}\);',
    pr_save,
    pr
)

# And in player-rankings.html load logic, we need to handle type="awards" vs "player-rankings"
# Right now, it's just hardcoded to `loadId = player-rankings_${safeWeek}`

with open("player-rankings.html", "w") as f:
    f.write(pr)

