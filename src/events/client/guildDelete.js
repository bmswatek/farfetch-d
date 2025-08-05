const fs = require("fs");
const path = require("path");

// Define the path to the channelSettings.json file
const settingsPath = path.join(__dirname, "../../data/channelSettings.json");

module.exports = {
  name: "guildDelete", // The event name
  async execute(guild) {
    console.log(`Bot was removed from: ${guild.name} (${guild.id})`);

    try {
      // Read the existing data
      const channelSettings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));

      // Check if the server ID exists in the file
      if (channelSettings[guild.id]) {
        // Delete the server's data
        delete channelSettings[guild.id];

        // Save the updated data back to the file
        fs.writeFileSync(settingsPath, JSON.stringify(channelSettings, null, 4));
        console.log(`Removed data for server ${guild.id}.`);
      } else {
        console.log(`No data found for server ${guild.id}.`);
      }
    } catch (error) {
      console.error(`Failed to update channelSettings.json: ${error.message}`);
    }
  },
};
