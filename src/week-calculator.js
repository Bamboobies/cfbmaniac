export function getCurrentCFBWeek() {
  const now = new Date();
  
  // Base date for Week 1: Saturday Aug 29, 2026, 6:00 AM UTC
  // College football weeks usually flip around Tuesday (rankings), but user requested Saturday morning.
  // Let's set the switchover to Saturday morning at 8 AM Eastern (which is 12:00 UTC).
  // August 29, 2026 is Saturday.
  const week1Start = new Date(Date.UTC(2026, 7, 29, 12, 0, 0)); // Aug 29, 2026, 12:00 PM UTC (8 AM EDT)
  
  // Calculate difference in weeks
  const diffTime = now.getTime() - week1Start.getTime();
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  
  if (diffWeeks < 0) {
    return "Preseason";
  }
  
  // If it's week 16 or later, maybe postseason?
  if (diffWeeks + 1 > 16) {
    return "Postseason";
  }
  
  return `Week ${diffWeeks + 1}`;
}
