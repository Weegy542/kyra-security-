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
const CLIENT_ID = "1494445442992443632";
const GUILD_ID = "859389888898400266";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

const commands = [
  new SlashCommandBuilder().setName("panel").setDescription("Create ticket panel"),
  new SlashCommandBuilder().setName("ban").setDescription("Ban a user").addUserOption(o => o.setName("user").setRequired(true)),
  new SlashCommandBuilder().setName("kick").setDescription("Kick a user").addUserOption(o => o.setName("user").setRequired(true)),
  new SlashCommandBuilder().setName("timeout").setDescription("Timeout a user").addUserOption(o => o.setName("user").setRequired(true)).addIntegerOption(o => o.setName("seconds").setRequired(true)),
  new SlashCommandBuilder().setName("lock").setDescription("Lock channel"),
  new SlashCommandBuilder().setName("unlock").setDescription("Unlock channel"),
  new SlashCommandBuilder().setName("purge").setDescription("Delete messages").addIntegerOption(o => o.setName("amount").setRequired(true)),
  new SlashCommandBuilder().setName("slowmode").setDescription("Set slowmode").addIntegerOption(o => o.setName("seconds").setRequired(true))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
});

function getLogChannel(guild) {
  return guild.channels.cache.find(c => c.name === "kyra-logs");
}

client.on("interactionCreate", async interaction => {
  const logChannel = interaction.guild?.channels.cache.find(c => c.name === "kyra-logs");

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

      return interaction.reply({ content: "Select a ticket category:", components: [row] });
    }

    if (interaction.commandName === "ban") {
      if (!interaction.member.permissions.has("BanMembers")) return interaction.reply({ content: "No permission", ephemeral: true });
      const user = interaction.options.getUser("user");
      await interaction.guild.members.ban(user).catch(() => {});
      interaction.reply(`Banned ${user.tag}`);
      if (logChannel) logChannel.send(`🔨 ${user.tag} banned`);
    }

    if (interaction.commandName === "kick") {
      if (!interaction.member.permissions.has("KickMembers")) return interaction.reply({ content: "No permission", ephemeral: true });
      const user = interaction.options.getUser("user");
      await interaction.guild.members.kick(user).catch(() => {});
      interaction.reply(`Kicked ${user.tag}`);
      if (logChannel) logChannel.send(`👢 ${user.tag} kicked`);
    }

    if (interaction.commandName === "timeout") {
      const user = interaction.options.getUser("user");
      const time = interaction.options.getInteger("seconds");
      const member = await interaction.guild.members.fetch(user.id);
      await member.timeout(time * 1000).catch(() => {});
      interaction.reply(`Timed out ${user.tag}`);
      if (logChannel) logChannel.send(`⏱ ${user.tag} timed out (${time}s)`);
    }

    if (interaction.commandName === "lock") {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
      interaction.reply("Channel locked");
    }

    if (interaction.commandName === "unlock") {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true });
      interaction.reply("Channel unlocked");
    }

    if (interaction.commandName === "purge") {
      const amount = interaction.options.getInteger("amount");
      await interaction.channel.bulkDelete(amount, true);
      interaction.reply({ content: `Deleted ${amount}`, ephemeral: true });
    }

    if (interaction.commandName === "slowmode") {
      const sec = interaction.options.getInteger("seconds");
      await interaction.channel.setRateLimitPerUser(sec);
      interaction.reply(`Slowmode set to ${sec}s`);
    }
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
    const type = interaction.values[0];

    const channel = await interaction.guild.channels.create({
      name: `${type}-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("close_ticket").setLabel("Close Ticket").setStyle(ButtonStyle.Danger)
    );

    await channel.send({ content: `Ticket (${type}) created for ${interaction.user}`, components: [closeRow] });

    if (logChannel) logChannel.send(`🎫 Ticket created: ${channel.name}`);

    await interaction.reply({ content: `Created: ${channel}`, ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === "close_ticket") {
    if (logChannel) logChannel.send(`❌ Ticket closed: ${interaction.channel.name}`);
    await interaction.reply({ content: "Closing...", ephemeral: true });
    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 3000);
  }
});

client.on("guildMemberAdd", member => {
  const channel = member.guild.systemChannel;
  if (channel) {
    channel.send("Welcome to CrystalSMP, We hope you enjoy your time here. Please enjoy");
  }
  getLogChannel(member.guild)?.send(`📥 ${member.user.tag} joined`);
});

client.on("guildMemberRemove", m => getLogChannel(m.guild)?.send(`📤 ${m.user.tag} left`));

client.on("messageDelete", m => {
  if (!m.guild || m.author?.bot) return;
  getLogChannel(m.guild)?.send(`🗑 ${m.author.tag}: ${m.content}`);
});

client.on("messageUpdate", (o, n) => {
  if (!o.guild || o.author?.bot) return;
  getLogChannel(o.guild)?.send(`✏️ ${o.author.tag}\nBefore: ${o.content}\nAfter: ${n.content}`);
});

client.on("channelDelete", async channel => {
  getLogChannel(channel.guild)?.send(`📁 Deleted: ${channel.name}`);
  const logs = await channel.guild.fetchAuditLogs({ type: 12, limit: 1 });
  const entry = logs.entries.first();
  if (entry) checkNuke(channel.guild, entry.executor.id, "channel");
});

client.on("roleDelete", async role => {
  getLogChannel(role.guild)?.send(`🛑 Role deleted: ${role.name}`);
  const logs = await role.guild.fetchAuditLogs({ type: 32, limit: 1 });
  const entry = logs.entries.first();
  if (entry) checkNuke(role.guild, entry.executor.id, "role");
});

client.on("guildBanAdd", b => getLogChannel(b.guild)?.send(`🔨 ${b.user.tag} banned`));
client.on("guildBanRemove", b => getLogChannel(b.guild)?.send(`♻️ ${b.user.tag} unbanned`));

const tracker = new Map();
const LIMIT = 3;
const WINDOW = 10000;

async function checkNuke(guild, id, type) {
  const key = `${id}-${type}`;
  const now = Date.now();
  if (!tracker.has(key)) tracker.set(key, []);
  const data = tracker.get(key).filter(t => now - t < WINDOW);
  data.push(now);
  tracker.set(key, data);

  if (data.length >= LIMIT) {
    const member = await guild.members.fetch(id).catch(() => {});
    if (member && member.bannable) {
      await member.ban({ reason: "Anti-nuke" });
      getLogChannel(guild)?.send(`🚨 Anti-nuke banned ${member.user.tag}`);
    }
  }
}

client.login(TOKEN);
