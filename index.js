const {
Client,
GatewayIntentBits,
Partials,
PermissionsBitField,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
ChannelType,
AuditLogEvent,
REST,
Routes
} = require('discord.js');

require('dotenv').config();

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
],
partials: [Partials.Channel]
});

const LOG_CHANNEL_NAME = "kyra-logs";

// ===== READY =====
client.once('ready', async () => {
console.log("Logged in as ${client.user.tag}");

const commands = [
{ name: 'panel', description: 'Send ticket panel' },
{
name: 'kick',
description: 'Kick user',
options: [{ name: 'user', type: 6, required: true }]
},
{
name: 'ban',
description: 'Ban user',
options: [{ name: 'user', type: 6, required: true }]
}
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

await rest.put(Routes.applicationCommands(client.user.id), {
body: commands
});

console.log("Slash commands loaded");
});

// ===== LOG CHANNEL =====
async function getLogChannel(guild) {
let channel = guild.channels.cache.find(c => c.name === LOG_CHANNEL_NAME);
if (!channel) {
channel = await guild.channels.create({
name: LOG_CHANNEL_NAME,
type: ChannelType.GuildText
});
}
return channel;
}

// ===== WELCOME =====
client.on('guildMemberAdd', member => {
if (member.guild.systemChannel) {
member.guild.systemChannel.send(
"Welcome to CrystalSMP, We hope you enjoy your time here."
);
}
});

// ===== LOGGING =====
client.on('guildMemberAdd', async member => {
const log = await getLogChannel(member.guild);
log.send("User joined: ${member.user.tag}");
});

client.on('guildMemberRemove', async member => {
const log = await getLogChannel(member.guild);
log.send("User left: ${member.user.tag}");
});

client.on('messageDelete', async message => {
if (!message.guild || message.author?.bot) return;
const log = await getLogChannel(message.guild);
log.send("Deleted: ${message.author.tag} -> ${message.content}");
});

// ===== ANTI NUKE =====
const actionMap = new Map();

async function antiNuke(guild, userId) {
const data = actionMap.get(userId) || { count: 0, time: Date.now() };

if (Date.now() - data.time > 10000) {
data.count = 1;
data.time = Date.now();
} else {
data.count++;
}

actionMap.set(userId, data);

if (data.count >= 3) {
const member = await guild.members.fetch(userId).catch(() => null);
if (!member) return;

await member.roles.set([]);
await member.timeout(600000);

const log = await getLogChannel(guild);
log.send(`⚠️ Anti-nuke triggered on ${member.user.tag}`);

}
}

client.on('channelDelete', async channel => {
const logs = await channel.guild.fetchAuditLogs({
type: AuditLogEvent.ChannelDelete
});
const entry = logs.entries.first();
if (entry) antiNuke(channel.guild, entry.executor.id);
});

client.on('roleDelete', async role => {
const logs = await role.guild.fetchAuditLogs({
type: AuditLogEvent.RoleDelete
});
const entry = logs.entries.first();
if (entry) antiNuke(role.guild, entry.executor.id);
});

// ===== AUTOMOD =====
const spamMap = new Map();

client.on('messageCreate', async message => {
if (!message.guild || message.author.bot) return;

const log = await getLogChannel(message.guild);

// Anti Link
const linkRegex = /(https?://|www.|discord.gg/)/gi;
if (linkRegex.test(message.content)) {
if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
await message.delete().catch(() => {});
message.channel.send("${message.author}, links are not allowed.");
log.send("Link blocked: ${message.author.tag}");
return;
}
}

// Spam
const data = spamMap.get(message.author.id) || { count: 0, last: Date.now() };

if (Date.now() - data.last < 3000) data.count++;
else data.count = 1;

data.last = Date.now();
spamMap.set(message.author.id, data);

if (data.count >= 5) {
await message.member.timeout(60000).catch(() => {});
message.channel.send("${message.author}, stop spamming.");
log.send("Spam detected: ${message.author.tag}");
}

// Caps
if (message.content.length > 10) {
const caps = message.content.replace(/[^A-Z]/g, '').length;
if (caps / message.content.length > 0.7) {
await message.delete().catch(() => {});
message.channel.send("${message.author}, no caps spam.");
log.send("Caps spam: ${message.author.tag}");
}
}
});

// ===== SLASH COMMANDS =====
client.on('interactionCreate', async interaction => {
if (interaction.isChatInputCommand()) {

if (interaction.commandName === 'panel') {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('support').setLabel('Support').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('player').setLabel('Player Report').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('staff').setLabel('Staff Report').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('partner').setLabel('Partnership').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('tier').setLabel('Tier Testing').setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({ content: 'Ticket Panel:', components: [row] });
}

if (interaction.commandName === 'kick') {
  const user = interaction.options.getUser('user');
  const member = await interaction.guild.members.fetch(user.id);
  await member.kick();
  interaction.reply(`Kicked ${user.tag}`);
}

if (interaction.commandName === 'ban') {
  const user = interaction.options.getUser('user');
  await interaction.guild.members.ban(user.id);
  interaction.reply(`Banned ${user.tag}`);
}

}

// Tickets
if (interaction.isButton()) {
const channel = await interaction.guild.channels.create({
name: "${interaction.customId}-${interaction.user.username}",
type: ChannelType.GuildText,
permissionOverwrites: [
{ id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
{ id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] }
]
});

await channel.send(`Welcome ${interaction.user}, support will be with you shortly.`);
await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });

}
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
