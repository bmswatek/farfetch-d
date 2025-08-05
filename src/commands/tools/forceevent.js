const { SlashCommandBuilder } = require("discord.js");
const checkAndNotifyEvents = require("../../utils/checkAndNotifyEvents");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("forceevent")
    .setDescription("Manually triggers event notifications"),

  async execute(interaction) {
    // Check if the user has admin permissions
    if (!interaction.member.permissions.has("ADMINISTRATOR")) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true, // Visible only to the user who invoked the command
      });
    }

    // Send an immediate response to acknowledge the command
    await interaction.reply({
      content: "Event notifications are being triggered. Please wait...",
      ephemeral: true,
    });

    // Trigger the notification function for the current guild
    try {
      await checkAndNotifyEvents(interaction.client, interaction.guild.id); // Pass the guild ID
      await interaction.followUp({
        content: "Event notifications have been successfully triggered.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error triggering events:", error);
      await interaction.followUp({
        content: "There was an error triggering the event notifications.",
        ephemeral: true,
      });
    }
  },
};
