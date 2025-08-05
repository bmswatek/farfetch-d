const fs = require("fs");
const path = require("path");
const axios = require("axios");

// URL for the ScrapedDuck `events.json` file in raw format
const eventsUrl = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json";

async function fetchEventData() {
  try {
    const response = await axios.get(eventsUrl);
    const eventsData = response.data;

    // Define path to save events.json in the data directory
    const dirPath = path.join(__dirname, "../data");
    const filePath = path.join(dirPath, "events.json");

    // Ensure the directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Save the fetched event data to events.json
    fs.writeFileSync(filePath, JSON.stringify(eventsData, null, 2));
    console.log("Event data successfully fetched and saved.");
    return eventsData;
  } catch (error) {
    console.error("Error fetching event data:", error);
  }
}

module.exports = fetchEventData;
