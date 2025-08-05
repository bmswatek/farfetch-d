const fetchEventData = require("../../utils/fetchLeekDuckData.js");
const checkAndNotifyEvents = require("../../utils/checkAndNotifyEvents");
const { ActivityType } = require('discord.js');

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {

    client.user.setActivity({
      type: ActivityType.Custom,
      name: 'customstatus',
      state: 'Tracking Wild Farfetch\'d Spawns!'
    });

    console.log(`${client.user.tag} is online!`);

    try {
      // Fetch the latest event data from LeekDuck initially
      await fetchEventData();

      // Set up periodic fetching of event data every hour
      setInterval(fetchEventData, 21600000); // 6 hours in milliseconds

      // Check and notify events for all configured servers every hour.
      setInterval(() => checkAndNotifyEvents(client), 21600000); // 6 hours in milliseconds
    } catch (error) {
      console.error("Error in ready.js during initialization:", error);
    }
  },
};
