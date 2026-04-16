const { Client, GatewayIntentBits, Partials } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// ===== READY =====
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ===== WELCOME MESSAGE =====
client.on("guildMemberAdd", (member) => {
  const channel = member.guild.systemChannel;
  if (!channel) return;

  channel.send(
    `Welcome to CrystalSMP, We hope you enjoy your time here. ${member}`
  );
});

// ===== AUTOMOD =====
const linkRegex = /(https?:\/\/|www\.|discord\.gg)/gi;
const userMessages = new Map();

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  // Anti-Link
  if (linkRegex.test(message.content)) {
    await message.delete().catch(() => {});
    message.channel.send(`${message.author}, links are not allowed here.`)
      .then(msg => setTimeout(() => msg.delete(), 5000));
    return;
  }

  // Anti-Caps
  if (message.content.length > 6) {
    const caps = message.content.replace(/[^A-Z]/g, "").length;
    if (caps / message.content.length > 0.7) {
      await message.delete().catch(() => {});
      message.channel.send(`${message.author}, please don't spam caps.`)
        .then(msg => setTimeout(() => msg.delete(), 5000));
      return;
    }
  }

  // Anti-Spam
  const now = Date.now();
  const timestamps = userMessages.get(message.author.id) || [];

  timestamps.push(now);
  userMessages.set(message.author.id, timestamps.filter(t => now - t < 5000));

  if (timestamps.length > 5) {
    await message.delete().catch(() => {});
    message.channel.send(`${message.author}, stop spamming.`)
      .then(msg => setTimeout(() => msg.delete(), 5000));
  }
});

// ===== LOGIN (RAILWAY TOKEN) =====
client.login(process.env.TOKEN);
