const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1494445442992443632";
const GUILD_ID = "859389888898400266";

const rest = new REST({ version: "10" }).setToken(TOKEN);

const welcomeChannels = new Map();

const commands = [
  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Create ticket panel"),

  new SlashCommandBuilder()
    .setName("setwelcome")
    .setDescription("Set welcome channel")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("Channel for welcome messages")
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("Commands refreshed");
  } catch (err) {
    console.log(err);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "panel") {
    await interaction.reply({
      content:
`🎫 **Ticket Panel**
React with a category:

• Bugs  
• Player Report  
• Staff Report  
• Partnerships  
• Tier Testing  
• Support`,
      ephemeral: false
    });
  }

  if (interaction.commandName === "setwelcome") {
    const channel = interaction.options.getChannel("channel");
    welcomeChannels.set(interaction.guild.id, channel.id);

    await interaction.reply(`✅ Welcome channel set to ${channel}`);
  }
});

client.on("guildMemberAdd", member => {
  const channelId = welcomeChannels.get(member.guild.id);
  if (!channelId) return;

  const channel = member.guild.channels.cache.get(channelId);
  if (!channel) return;

  channel.send(
    `Welcome to CrystalSMP, ${member}! We hope you enjoy your time here. Please enjoy`
  );
});

client.login(TOKEN);
