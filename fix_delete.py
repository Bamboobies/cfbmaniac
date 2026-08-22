import re

for filename in ["src/leaderboard-init.js", "src/predictions-init.js"]:
    with open(filename, "r") as f:
        content = f.read()
    
    if "window.deleteSavedCreation =" not in content:
        content += """
window.deleteSavedCreation = async function(docId) {
  if (!currentUser) return;
  if (!confirm("Are you sure you want to delete this from your profile?")) return;
  
  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "savedData", docId));
    alert("Deleted successfully.");
    window.location.reload();
  } catch (e) {
    console.error("Error deleting:", e);
    alert("Failed to delete.");
  }
};
"""
        with open(filename, "w") as f:
            f.write(content)
