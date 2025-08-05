const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

const settingsPath = path.resolve(__dirname, "../data/channelSettings.json");
const eventsPath = path.resolve(__dirname, "../data/events.json");

// Helper to format date nicely
function formatDate(dateString) {
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
}

// Helper to format labels by inserting spaces and capitalizing words
function formatLabel(label) {
  return label
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Color mapping for each event type based on LeekDuck's style
const eventColors = {
  "community-day": "#ff9800",
  "spotlight-hour": "#4caf50",
  "raid-hour": "#e91e63",
  "special-event": "#03a9f4",
  "wild-area": "#8bc34a",
  "event": "#f44336",
  "pokemon-spotlight-hour": "#ffeb3b",
  "go-battle-league": "#3f51b5",
  "max-mondays": "#9c27b0",
  "raid-battles": "#673ab7",
  "pokestop-showcase": "#00bcd4",
  "max-battles": "#cddc39",
  "research-day": "#ff5722",
  "raid-day": "#795548",
  default: "#0099ff",
};

// Get color for event based on `eventType`
function getEventColor(eventType) {
  const color = eventColors[eventType?.toLowerCase()] || eventColors.default;
  if (!eventColors[eventType?.toLowerCase()]) {
    console.warn(`Event type "${eventType}" not recognized. Using default color.`);
  }
  return color;
}

// Format list items with optional shiny indicator
function formatList(items, field = "text") {
  return items.map((item) => `• ${item[field]}`).join("\n");
}

// Function to delete all messages in a channel
async function deleteAllMessages(channel) {
  try {
    const fetchedMessages = await channel.messages.fetch({ limit: 100 }); // Fetch up to 100 messages
    const deletedMessages = [];

    for (const [, msg] of fetchedMessages) {
      try {
        await msg.delete();
        deletedMessages.push(msg.id);
      } catch (error) {
        console.error(`Failed to delete message ${msg.id}:`, error);
      }
    }

    console.log(`Deleted ${deletedMessages.length} messages in channel ${channel.id}.`);
  } catch (error) {
    console.error(`Error while deleting messages in channel ${channel.id}:`, error);
  }
}

// Function to categorize events based on their start and end dates
function categorizeEvents(events, now) {
  const categories = {
    ongoing: { today: [], thisWeek: [], nextWeek: [] },
    upcoming: { today: [], thisWeek: [], nextWeek: [] },
  };

  for (const event of events) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const daysToEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    const daysToStart = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));

    if (startDate <= now && endDate >= now) {
      if (daysToEnd <= 1) categories.ongoing.today.push(event);
      else if (daysToEnd <= 7) categories.ongoing.thisWeek.push(event);
      else if (daysToEnd <= 14) categories.ongoing.nextWeek.push(event);
    }

    if (startDate > now) {
      if (daysToStart <= 1) categories.upcoming.today.push(event);
      else if (daysToStart <= 7) categories.upcoming.thisWeek.push(event);
      else if (daysToStart <= 14) categories.upcoming.nextWeek.push(event);
    }
  }

  return categories;
}

// Main function to check events and notify channels
async function checkAndNotifyEvents(client, guildId = null) {
  const now = new Date();
  const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, "utf8")) : {};

  if (!fs.existsSync(eventsPath)) return;
  const events = JSON.parse(fs.readFileSync(eventsPath, "utf8"));

  // Filter settings if guildId is provided
  const guildSettings = guildId ? { [guildId]: settings[guildId] } : settings;

  // Categorize events into "ongoing" and "upcoming" sections
  const categorizedEvents = categorizeEvents(events, now);

  for (const [currentGuildId, channelId] of Object.entries(guildSettings)) {
    if (!channelId) continue;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      console.error(`Could not fetch channel ${channelId} in guild ${currentGuildId}`);
      continue;
    }

    // **Step 1: Clear the channel of old messages**
    await deleteAllMessages(channel);

    // **Step 2: Send Ongoing Events**
    for (const [label, eventsList] of Object.entries(categorizedEvents.ongoing)) {
      if (eventsList.length > 0) {
        const formattedLabel = `Ends ${formatLabel(label)}`;
        const headerEmbed = new EmbedBuilder()
          .setTitle(`🔴 Ongoing Events - ${formattedLabel}`)
          .setColor("#ff9800")
          .setDescription("🔥 Check out events that are happening right now!");
        await channel.send({ embeds: [headerEmbed] });

        for (const event of eventsList) {
          const eventEmbed = createDetailedEventEmbed(event);
          await channel.send({ embeds: [eventEmbed] });
        }
      }
    }

    // **Step 3: Send Upcoming Events**
    for (const [label, eventsList] of Object.entries(categorizedEvents.upcoming)) {
      if (eventsList.length > 0) {
        const formattedLabel = `Starts ${formatLabel(label)}`;
        const headerEmbed = new EmbedBuilder()
          .setTitle(`🚀 Upcoming Events - ${formattedLabel}`)
          .setColor("#4caf50")
          .setDescription("🎉 Take a look at events starting soon!");
        await channel.send({ embeds: [headerEmbed] });

        for (const event of eventsList) {
          const eventEmbed = createDetailedEventEmbed(event);
          await channel.send({ embeds: [eventEmbed] });
        }
      }
    }
  }
}

// Detailed Event Embed with infographics, shiny indicators, and color by eventType
function createDetailedEventEmbed(event) {
  const eventType = event.eventType?.toLowerCase() || "default";
  const embedColor = getEventColor(eventType);

  const embed = new EmbedBuilder()
    .setTitle(event.name)
    .setURL(event.link || "#")
    .setDescription(event.heading || "Event Details")
    .setColor(embedColor)
    .setImage(event.image)
    .addFields(
      { name: "🗓️ Starts", value: formatDate(event.start), inline: true },
      { name: "🗓️ Ends", value: formatDate(event.end), inline: true }
    );

  // Event Bonuses
  if (event.extraData?.communityday?.bonuses || event.extraData?.spotlight?.bonus) {
    const bonuses = event.extraData.communityday?.bonuses || [{ text: event.extraData.spotlight.bonus }];
    embed.addFields({ name: "🎁 Bonuses", value: formatList(bonuses), inline: false });
  }

  // Featured Pokémon for Community Days or Spotlight Hours
  const spawns = event.extraData.communityday?.spawns || event.extraData.spotlight?.list;
  if (spawns) {
    const spawnNames = spawns.map((spawn) => `${spawn.name}${spawn.canBeShiny ? " ✨" : ""}`).join("\n");
    embed.addFields({ name: "🌟 Featured Pokémon", value: spawnNames, inline: false });
    if (spawns[0]?.image) {
      embed.setThumbnail(spawns[0].image);
    }
  }

  // Raid Bosses with shiny indicator and shiny images
  const raidBosses = event.extraData.raidbattles?.bosses;
  const shinies = event.extraData.raidbattles?.shinies;

  if (raidBosses) {
    const bossNames = raidBosses.map((boss) => `${boss.name}${boss.canBeShiny ? " ✨" : ""}`).join("\n");
    embed.addFields({ name: "👑 Raid Bosses", value: bossNames, inline: false });

    if (raidBosses[0]?.image) {
      embed.setThumbnail(raidBosses[0].image);
    }

    if (shinies && shinies.length > 0) {
      const shinyNames = shinies.map((shiny) => shiny.name).join(", ");
      embed.addFields({ name: "✨ Shiny Available", value: shinyNames, inline: false });
      if (shinies[0]?.image) {
        embed.setImage(shinies[0].image);
      }
    }
  }

  return embed;
}

module.exports = checkAndNotifyEvents;
