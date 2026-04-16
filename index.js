const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  PermissionsBitField
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// 🔧 CHANGE THIS TO YOUR LOG CHANNEL NAME
const LOG_CHANNEL_NAME = "kyra-logs";

const commands = [
  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Create ticket panel")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// 🔥 REGISTER COMMANDS
(async () => {
  try {
    await rest.put(
      Routes.applicationCommands("1494445442992443632"),
      { body: commands }
    );
    console.log("Commands registered!");
  } catch (err) {
    console.error(err);
  }
});

// ✅ READY
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// 📊 LOG FUNCTION
function sendLog(guild, message) {
  const channel = guild.channels.cache.find(
    c => c.name === LOG_CHANNEL_NAME
  );
  if (channel) channel.send(message);
}

// 🎫 PANEL
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "panel") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("support").setLabel("Support").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("report").setLabel("Player Report").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("staff").setLabel("Staff Report").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("partner").setLabel("Partnership").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("test").setLabel("Tier Test").setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: "🎫 **Kyra Support Panel**\nSelect a ticket:",
      components: [row]
    });
  }
});

// 🎫 BUTTONS (CREATE + CLOSE)
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  // CREATE TICKET
  if (!interaction.customId.includes("close")) {
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: 0,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });

    const closeBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    channel.send({
      content: `🎫 Ticket opened by ${interaction.user}`,
      components: [closeBtn]
    });

    sendLog(interaction.guild, `🎫 Ticket created by ${interaction.user.tag}`);

    return interaction.reply({
      content: `✅ Created: ${channel}`,
      ephemeral: true
    });
  }

  // CLOSE TICKET
  if (interaction.customId === "close_ticket") {
    sendLog(interaction.guild, `❌ Ticket closed by ${interaction.user.tag}`);

    await interaction.reply({ content: "Closing ticket...", ephemeral: true });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 2000);
  }
});

// 👋 JOIN LOG + WELCOME
client.on("guildMemberAdd", member => {
  const channel = member.guild.systemChannel;
  if (channel) {
    channel.send("Welcome to CrystalSMP, We hope you enjoy your time here.");
  }

  sendLog(member.guild, `📥 ${member.user.tag} joined`);
});

// 🚪 LEAVE LOG
client.on("guildMemberRemove", member => {
  sendLog(member.guild, `📤 ${member.user.tag} left`);
});

// 🗑️ DELETE LOG
client.on("messageDelete", message => {
  if (!message.guild || message.author?.bot) return;
  sendLog(message.guild, `🗑️ Message deleted: ${message.content}`);
});

// 🚫 ANTI LINK
client.on("messageCreate", message => {
  if (message.author.bot) return;

  const linkRegex = /(https?:\/\/|discord\.gg\/)/gi;

  if (linkRegex.test(message.content)) {
    message.delete().catch(() => {});
    message.channel.send(`${message.author}, links are not allowed!`);
    sendLog(message.guild, `🚫 Link deleted from ${message.author.tag}`);
  }
});

// 🔐 LOGIN
client.login(process.env.TOKEN);
