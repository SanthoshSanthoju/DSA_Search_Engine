const form = document.getElementById("search-form");
const input = document.getElementById("query-input");
const resultsDiv = document.getElementById("results");
const spinner = document.getElementById("spinner");

// Pastel Color Palette
const pastelColors = [
  "#FFE8D6", // Soft Orange
  "#E0F2F1", // Mint Green
  "#F3E5F5", // Lavender
  "#E3F2FD", // Baby Blue
  "#FCE4EC", // Pale Pink
  "#FFF9C4"  // Light Yellow
];

function getColorForTitle(title) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % pastelColors.length;
  return pastelColors[index];
}

function getRandomDate() {
    const dates = ["12 Jan", "14 Feb", "28 Mar", "05 Apr", "19 May", "22 Jun"];
    return dates[Math.floor(Math.random() * dates.length)];
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const query = input.value.trim();
  if (!query) return;

  resultsDiv.innerHTML = "";
  spinner.classList.remove("hidden");

  try {
    const res = await fetch("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const { results } = await res.json();

    spinner.classList.add("hidden");

    if (results.length === 0) {
      resultsDiv.innerHTML = "<p style='color:#fff; text-align:center;'>No matches found.</p>";
      return;
    }

    // 2. Render the "LuckyJob" Dashboard Cards
    resultsDiv.innerHTML = results
      .map((r, i) => {
        const bgColor = getColorForTitle(r.title);
        const date = getRandomDate();
        const difficulty = i % 3 === 0 ? "Hard" : i % 2 === 0 ? "Medium" : "Easy";
        const type = r.platform.includes("LeetCode") ? "DSA" : "CP";

        // === LOGIC TO CHOOSE THE LOGO ===
        const logoPath = r.platform.toLowerCase().includes("leetcode")
            ? "assets/logos/leetcode.png"
            : "assets/logos/codeforces.png";
        // ================================

        return `
          <a href="${r.url}" target="_blank" class="card" style="background-color: ${bgColor};">
              
              <div class="card-top">
                  <span class="card-date">${date}, 2025</span>
                  <img src="${logoPath}" alt="${r.platform} Logo" class="card-bookmark" />
              </div>
              
              <div class="card-content">
                  <span class="company-name">${r.platform.toUpperCase()}</span>
                  <h3 class="card-title">${r.title}</h3>
              </div>

              <div class="card-footer">
                  <div class="tags">
                      <span class="tag">${difficulty}</span>
                      <span class="tag">${type}</span>
                  </div>
                  <button class="details-btn">Solve</button>
              </div>
          </a>
      `;
      })
      .join("");
      
  } catch (err) {
    spinner.classList.add("hidden");
    console.error(err);
    resultsDiv.innerHTML = `<p style='color:#fff'>Error: ${err.message}</p>`;
  }
});