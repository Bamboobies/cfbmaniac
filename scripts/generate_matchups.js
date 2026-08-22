import fs from 'fs';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";

// Read teamsData
const teamsJs = fs.readFileSync('teams.js', 'utf8');
const match = teamsJs.matchAll(/name:\s*"([^"]+)"/g);
const teamsByFPI = [];
for (const m of match) teamsByFPI.push(m[1]);

const firebaseConfig = {
  apiKey: "AIzaSyDn6R7TMb2MgDuj9LIwDsbdg-n9D9jIEjE",
  authDomain: "cfb-maniac.firebaseapp.com",
  projectId: "cfb-maniac"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchUserGames(userWeek) {
    let espnWeek = userWeek;
    if (userWeek === 0 || userWeek === 1) espnWeek = 1;
    
    const url80 = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?year=2026&week=${espnWeek}&groups=80&limit=300`;
    const url81 = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?year=2026&week=${espnWeek}&groups=81&limit=300`;
    
    const [res80, res81] = await Promise.all([fetch(url80), fetch(url81)]);
    const data80 = await res80.json();
    const data81 = await res81.json();
    
    const eventsMap = new Map();
    (data80.events || []).forEach(e => eventsMap.set(e.id, e));
    (data81.events || []).forEach(e => eventsMap.set(e.id, e));
    
    let events = Array.from(eventsMap.values());
    if (userWeek === 0) events = events.filter(e => e.date < '2026-09-01');
    else if (userWeek === 1) events = events.filter(e => e.date >= '2026-09-01');
    
    return events;
}

async function run() {
    // 1. Grade previous matchups if they exist
    if (fs.existsSync('public/matchups.json')) {
        const prevMatchups = JSON.parse(fs.readFileSync('public/matchups.json', 'utf8'));
        const prevWeek = prevMatchups.week;
        
        const prevEvents = await fetchUserGames(prevWeek);
        const ATSWinners = {};
        let allCompleted = true;
        for (const g of prevMatchups.games) {
            const espnEvent = prevEvents.find(e => {
                const c = e.competitions[0].competitors;
                return (c[0].team.location === g.home && c[1].team.location === g.away) ||
                       (c[0].team.location === g.away && c[1].team.location === g.home) ||
                       e.name.includes(g.home);
            });
            if (espnEvent && espnEvent.status.type.completed) {
                const comp = espnEvent.competitions[0];
                const team0 = comp.competitors[0];
                const team1 = comp.competitors[1];
                const score0 = parseInt(team0.score || 0);
                const score1 = parseInt(team1.score || 0);
                const homeScore = team0.homeAway === 'home' ? score0 : score1;
                const awayScore = team0.homeAway === 'away' ? score0 : score1;
                
                let homeSpread = g.homeSpread || 0;
                let awaySpread = g.awaySpread || 0;
                
                const homeAdjusted = homeScore + homeSpread;
                const awayAdjusted = awayScore + awaySpread;
                
                if (homeAdjusted > awayScore) {
                    ATSWinners[g.id] = g.home;
                } else if (awayAdjusted > homeScore) {
                    ATSWinners[g.id] = g.away;
                } else {
                    ATSWinners[g.id] = 'PUSH';
                }
            } else {
                allCompleted = false;
            }
        }
        
        const usersSnap = await getDocs(collection(db, "users"));
        for (const userDoc of usersSnap.docs) {
            const uid = userDoc.id;
            const userData = userDoc.data();
            const picksRef = doc(db, "users", uid, "picks", "week" + prevWeek);
            const picksSnap = await getDoc(picksRef);
            if (picksSnap.exists()) {
                const pickData = picksSnap.data();
                if (!pickData.graded) {
                    let eloChange = 0;
                    let gamesGraded = 0;
                    for (const gameId in pickData.picks) {
                        const pickedTeam = pickData.picks[gameId];
                        if (ATSWinners[gameId]) {
                            if (ATSWinners[gameId] === 'PUSH') eloChange += 0; // Push
                            else if (ATSWinners[gameId] === pickedTeam) eloChange += 100; // Covered
                            else eloChange -= 80; // Did not cover
                            gamesGraded++;
                        }
                    }
                    
                    if (gamesGraded > 0) {
                        await setDoc(doc(db, "users", uid), {
                            elo: (userData.elo || 500) + eloChange
                        }, { merge: true });
                        await setDoc(picksRef, { graded: true, eloChange }, { merge: true });
                        console.log(`Graded user ${uid}: ${eloChange} ELO`);
                    }
                }
            }
        }
    }

    // 2. Determine target week
    const now = new Date();
    const startOfSeason = new Date("2026-08-23T00:00:00Z");
    let targetWeek = Math.floor((now - startOfSeason) / (7 * 24 * 60 * 60 * 1000));
    if (targetWeek < 0) targetWeek = 0;

    // Fetch upcoming games
    const upcomingEvents = await fetchUserGames(targetWeek);
    const fcsMatchups = [];
    for (const e of upcomingEvents) {
        const t1 = e.competitions[0].competitors[0].team.location;
        const t2 = e.competitions[0].competitors[1].team.location;
        
        const t1IsFBS = teamsByFPI.includes(t1);
        const t2IsFBS = teamsByFPI.includes(t2);
        
        if (t1IsFBS || t2IsFBS) {
            const away = e.competitions[0].competitors.find(c => c.homeAway === 'away').team.location;
            const home = e.competitions[0].competitors.find(c => c.homeAway === 'home').team.location;
            const matchId = [away, home].sort().join("-");
            
            let details = "PK";
            let homeSpread = 0;
            let awaySpread = 0;
            if (e.competitions[0].odds && e.competitions[0].odds.length > 0) {
                const odds = e.competitions[0].odds[0];
                details = odds.details || "PK";
                if (details !== "PK" && details !== "EVEN") {
                    const parts = details.split(' ');
                    const line = parseFloat(parts.pop());
                    
                    if (odds.homeTeamOdds && odds.homeTeamOdds.favorite) {
                        homeSpread = line;
                        awaySpread = -line;
                    } else if (odds.awayTeamOdds && odds.awayTeamOdds.favorite) {
                        awaySpread = line;
                        homeSpread = -line;
                    } else {
                        // Fallback string matching if API structure changes
                        const favTeam = parts.join(' ');
                        if (home.includes(favTeam) || favTeam.includes(home)) {
                            homeSpread = line;
                            awaySpread = -line;
                        } else {
                            awaySpread = line;
                            homeSpread = -line;
                        }
                    }
                }
            }
            fcsMatchups.push({
                id: matchId,
                away,
                home,
                date: e.date,
                details,
                homeSpread,
                awaySpread
            });
        }
    }
    
    // Sort by date then by id
    fcsMatchups.sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

    const output = {
      week: targetWeek,
      generatedAt: new Date().toISOString(),
      games: fcsMatchups
    };
    if (!fs.existsSync('public')) fs.mkdirSync('public');
    fs.writeFileSync('public/matchups.json', JSON.stringify(output, null, 2));
    fs.writeFileSync('matchups.json', JSON.stringify(output, null, 2));
    console.log(`Generated Week ${targetWeek} with ${fcsMatchups.length} FBS games`);
    process.exit(0);
}
run().catch(console.error);
