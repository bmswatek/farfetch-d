const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Path to store channel settings
const settingsPath = path.resolve(__dirname, "../../data/channelSettings.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setupchannel")
    .setDescription("Set up a channel for event notifications.")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to set up for event notifications.")
        .setRequired(true)
    ),

  async execute(interaction) {
    // Check for permissions
    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true,
      });
    }

    // Get the selected channel
    const selectedChannel = interaction.options.getChannel("channel");

    // Save the channel to settings
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    }

    settings[interaction.guild.id] = selectedChannel.id;

    // Save updated settings
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    // Prepare confirmation message with a button
    const confirmationEmbed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("Channel Updated")
      .setDescription(
        `✅ Event notifications will now be sent in ${selectedChannel}.`
      )
      .setFooter({ text: "You can change this anytime using /setupchannel." });

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm-channel-change")
        .setLabel("Confirm")
        .setStyle(ButtonStyle.Primary)
    );

    const message = await interaction.reply({
      embeds: [confirmationEmbed],
      components: [actionRow],
      ephemeral: true,
    });

    // Set up a button collector for user confirmation
    const collector = message.createMessageComponentCollector({
      time: 60000, // 1-minute timeout
    });

    collector.on("collect", async (btnInteraction) => {
      if (btnInteraction.customId === "confirm-channel-change") {
        await btnInteraction.reply({
          content: "Thank you! The channel setup is confirmed.",
          ephemeral: true,
        });
        collector.stop(); // Stop listening after acknowledgment
      }
    });

    collector.on("end", () => {
      // Disable the button after collection ends
      const disabledActionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("confirm-channel-change")
          .setLabel("Acknowledged")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      interaction.editReply({ components: [disabledActionRow] });
    });
  },
};
