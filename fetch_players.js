import fs from 'fs';

const API_KEY = process.env.CFBD_API_KEY || 'YOUR_API_KEY_HERE';
const YEAR = 2026;

async function fetchRosters() {
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    console.error("Please provide your CFBD API key either by replacing YOUR_API_KEY_HERE or setting CFBD_API_KEY env var.");
    process.exit(1);
  }

  console.log(`Fetching ${YEAR} roster data from collegefootballdata.com...`);
  
  try {
    const res = await fetch(`https://api.collegefootballdata.com/roster?year=${YEAR}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status} - ${await res.text()}`);
    }

    const data = await res.json();
    console.log(`Fetched ${data.length} players. Processing...`);

    const playersData = data.map(p => ({
      id: p.id || Math.random().toString(36).substr(2, 9),
      name: `${p.firstName} ${p.lastName}`,
      first_name: p.firstName,
      last_name: p.lastName,
      team: p.team,
      position: p.position
    }));

    const jsContent = `const playersData = ${JSON.stringify(playersData, null, 2)};`;
    
    fs.writeFileSync('players.js', jsContent);
    fs.writeFileSync('public/players.js', jsContent); // Update public folder too if needed
    
    console.log('Successfully saved to players.js!');
  } catch (err) {
    console.error('Error fetching rosters:', err);
  }
}

fetchRosters();
