const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = "859389888898400266";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel]
});

const commands = [
  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Create ticket panel")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("clientReady", async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
});

client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "panel") {

      const menu = new StringSelectMenuBuilder()
        .setCustomId("ticket_select")
        .setPlaceholder("Select ticket type")
        .addOptions([
          { label: "🐞 Bugs", value: "bugs" },
          { label: "👤 Player Report", value: "player" },
          { label: "🛡 Staff Report", value: "staff" },
          { label: "🤝 Partnerships", value: "partner" },
          { label: "🧪 Tier Testing", value: "testing" },
          { label: "❓ Support", value: "support" }
        ]);

      const row = new ActionRowBuilder().addComponents(menu);

      await interaction.reply({
        content: "🎫 Select a ticket category:",
        components: [row]
      });
    }
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
    const type = interaction.values[0];

    const channel = await interaction.guild.channels.create({
      name: `${type}-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel]
        }
      ]
    });

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("🔒 Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `Ticket (${type}) created for ${interaction.user}`,
      components: [closeRow]
    });

    await interaction.reply({
      content: `Created: ${channel}`,
      ephemeral: true
    });
  }

  if (interaction.isButton() && interaction.customId === "close_ticket") {
    const logChannel = interaction.guild.channels.cache.find(
      c => c.name === "kyra-logs"
    );

    if (logChannel) {
      logChannel.send(`Ticket closed: ${interaction.channel.name}`);
    }

    await interaction.reply({ content: "Closing...", ephemeral: true });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 3000);
  }
});

client.login(TOKEN);
