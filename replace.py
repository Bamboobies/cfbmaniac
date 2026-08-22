import sys

with open('predictions.html', 'r') as f:
    content = f.read()

target = """<div style="text-align: center; padding: 40px 0; color: #a1a1aa;">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 15px; opacity: 0.5;"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        <h3 style="color: #fff; margin-bottom: 8px;">Dashboard Ready</h3>
        <p>The weekly games database is being built. Check back soon for the first slate of games!</p>
      </div>"""

replacement = """<div id="week0-section" style="margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #27272a; padding-bottom: 10px; margin-bottom: 20px;">
          <h3 style="color: #fbbf24; font-size: 1.2rem;">Week 0 Matchups</h3>
          <span id="saveStatus" style="font-size: 0.85rem; color: #a1a1aa;">Make your picks!</span>
        </div>
        <div id="games-container" style="display: flex; flex-direction: column; gap: 15px;"></div>
        <button id="savePicksBtn" class="btn" style="margin-top: 25px; width: 100%;">Save Picks</button>
      </div>"""

content = content.replace(target, replacement)

with open('predictions.html', 'w') as f:
    f.write(content)
