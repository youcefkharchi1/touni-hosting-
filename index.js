require("dotenv").config();

const axios = require("axios");

const USERNAME = "youcefkharchi2";
const REPO = "bot-ticket-by-touni-test";
const BRANCH = "main";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // جلب التوكن من env
const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const { createTranscript } = require("discord-html-transcripts");
const fs = require("fs");
const config = require("./config.json");
const uploadToGitHub = require("./upload-to-github");

let ticketCount = 0;
const ratedTickets = new Map();
const claimedTickets = new Map();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

const openLogChannelId = "1298951776157962280";
const closeLogChannelId = "1298951750241357834";
const ratingLogChannelId = "1398463626997665954";

client.once("ready", () => {
  console.log(`${client.user.tag} ✅ جاهز للعمل`);
});

client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand() && interaction.commandName === "ticket") {
    const embed = new EmbedBuilder()
      .setTitle("🎟 Ticket System")
      .setDescription("Welcome to the ticket system, here you can open a ticket and get help from the staff team.")
      .setColor("#3498db")
      .setImage("https://d.top4top.io/p_34931kohk1.gif")
      .setThumbnail("https://d.top4top.io/p_34931kohk1.gif");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("some_info").setLabel("📌 Some Information").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("open_ticket_menu").setLabel("🎫 Open Ticket").setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  if (interaction.isButton() && interaction.customId === "open_ticket_menu") {
    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("select_ticket_type")
        .setPlaceholder("Please select a type to open a ticket.")
        .addOptions([
          { label: "Support Ticket", value: "support", description: "Open a ticket for support." },
          { label: "Report Ticket", value: "report", description: "Open a ticket for report." },
          { label: "Division Ticket", value: "division", description: "Open a ticket for division support." },
          { label: "Girl Ticket", value: "girl", description: "Open a support ticket for girls only." },
          { label: "Administrator Ticket", value: "admin", description: "Open a ticket to speak to an administrator." }
        ])
    );

    await interaction.reply({ components: [selectMenu], ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "select_ticket_type") {
    const type = interaction.values[0];
    const roleMap = {
      support: "1398417455831060601",
      report: "1398417455831060601",
      division: "1398429262528118844",
      girl: "1398429349262393435",
      admin: "1398430461344223384"
    };

    const roleId = roleMap[type];
    const allowedMultipleRoleId = "1398432988244475954";

    if (!interaction.member.roles.cache.has(allowedMultipleRoleId)) {
      const existingChannel = interaction.guild.channels.cache.find(c => c.topic === interaction.user.id);
      if (existingChannel) {
        return interaction.reply({ content: "⚠ You already have an open ticket.", ephemeral: true });
      }
    }

    try {
      ticketCount++;
      const ticketChannel = await interaction.guild.channels.create({
        name: `${type}-ticket-${ticketCount}`,
        type: ChannelType.GuildText,
        topic: `${interaction.user.id}|`, // نحجز مكان للي يدي الClaim
        parent: config.categoryId,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
          },
          {
            id: roleId,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
          }
        ]
      });

      const embed = new EmbedBuilder()
        .setTitle("🎫 Ticket Opened")
        .setDescription("Please explain your issue in detail. Our team will assist you shortly.")
        .setColor("#3498db");

      const controlButtons = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId("claim_ticket").setLabel("🛠 Claim Ticket").setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId("close_ticket").setLabel("🔒 Close Ticket").setStyle(ButtonStyle.Danger)
);
      await ticketChannel.send({
        content: `<@${interaction.user.id}> <@&${roleId}>`,
        embeds: [embed],
        components: [controlButtons]
      });

      await interaction.reply({ content: `✅ Your ticket has been created: ${ticketChannel}`, flags: 64 });

      const logEmbed = new EmbedBuilder()
        .setTitle("📥 تم فتح التذكرة")
        .addFields(
          { name: "👤 تم الإنشاء بواسطة", value: `<@${interaction.user.id}>`, inline: true },
          { name: "📎 التذكرة", value: `${ticketChannel}`, inline: true },
          { name: "⏰ الوقت", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
        )
        .setColor("Green")
        .setFooter({ text: "𝘽𝙊𝙏 𝘽𝙔 𝙏𝙊𝙐𝙉𝙄 𝘿𝙴𝙑 🛠" });

      const logChannel = await client.channels.fetch(openLogChannelId);
      await logChannel.send({ embeds: [logEmbed] });

    } catch (error) {
      console.error("❌ Error creating ticket:", error);
      await interaction.reply({ content: "❌ Failed to create ticket. Please try again later.", flags: 64 });
    }
  }

  if (interaction.isButton() && interaction.customId === "some_info") {
    await interaction.reply({ content: "📌 This is a quick guide or some important information.", flags: 64  });
  }
    const claimedById = claimedTickets.get(interaction.channel.id);
if (claimedById && interaction.user.id !== claimedById) {
  return interaction.reply({
    content: `❌ هذه التذكرة تم Claim من طرف <@${claimedById}> فقط هو يستطيع غلقها.`,
    ephemeral: true
  });
}
if (interaction.customId === "claim_ticket") {
  const channel = interaction.channel;
  const userId = channel.topic?.split("|")[0];// نجيب ID صاحب التذكرة
  const user = await client.users.fetch(userId).catch(() => null);
  const staffRoleId = config.supportRoleId;

  // التأكد أن العضو عنده صلاحية الرد
  if (!interaction.member.roles.cache.has(staffRoleId)) {
    return interaction.reply({
      content: "❌ لا يمكنك Claim هذه التذكرة. هذا الزر مخصص لأعضاء الدعم فقط.",
      ephemeral: true
    });
  }

  // إذا راهي التذكرة متعلقة مسبقًا
  if (claimedTickets.has(channel.id)) {
    const claimedBy = claimedTickets.get(channel.id);
    if (claimedBy === interaction.user.id) {
      return interaction.reply({ content: "✅ لقد قمت مسبقًا بـ Claim هذه التذكرة.", flags: 64  });
    } else {
      return interaction.reply({ content: "⚠️ تم Claim هذه التذكرة من طرف شخص آخر.",flags: 64  });
    }
  }

  // ✅ Claim جديد
  claimedTickets.set(channel.id, interaction.user.id);

// استخراج claimedBy من topic
const claimedById = channel.topic.includes("|") ? channel.topic.split("|")[1] : null;
const claimedBy = claimedById ? await channel.guild.members.fetch(claimedById) : null;

// إنشاء رسالة الـ DM
try {
  const user = await client.users.fetch(userId);
  const jumpURL = `https://discord.com/channels/${channel.guild.id}/${channel.id}`;
  const ticketName = channel.name;
  const openedByTag = `<@${user.id}>`;
  const claimedByTag = `<@${interaction.user.id}>`;
  const ticketType = ticketName.split("-")[0];
  const avatarURL = interaction.user.displayAvatarURL();

  const claimEmbed = new EmbedBuilder()
    .setAuthor({ name: "📥 تم استلام التذكرة", iconURL: avatarURL })
    .setColor("Blue")
    .setDescription(`عزيزي/عزيزتي ${openedByTag}، تم استلام تذكرتك بنجاح من طرف ${claimedByTag}.`)
    .addFields(
      { name: "📌 معلومات التذكرة", value: `🧾 **التذكرة:** <#${channel.id}>` },
      { name: "👤 تم فتحها بواسطة", value: `${openedByTag}`, inline: true },
      { name: "👮 تم استلامها بواسطة", value: `${claimedByTag}`, inline: true },
      { name: "🗂️ نوع التذكرة", value: `\`${ticketType}\`` }
    )
    .setFooter({
      text: "🧠 المطور: TOUNI ⚙️",
      iconURL: channel.guild.iconURL()
    })
    .setTimestamp();

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("📥 فتح التذكرة")
      .setStyle(ButtonStyle.Link)
      .setURL(jumpURL)
  );

  await user.send({ embeds: [claimEmbed], components: [buttonRow] }).catch(() => {});
} catch (err) {
  console.log("❌ لم يتمكن من إرسال DM للمستخدم:", err);
}
    await channel.permissionOverwrites.edit(staffRoleId, {
    SendMessages: false
  });

  // نسمح فقط للي عمل Claim
  await channel.permissionOverwrites.edit(interaction.user.id, {
    SendMessages: true
  });

  await interaction.reply({
    content: `📌 تم Claim التذكرة من طرف <@${interaction.user.id}>`,
    ephemeral: false
  });
}
  if (interaction.isButton() && interaction.customId === "close_ticket") {
    const channel = interaction.channel;
    const userId = channel.topic?.split("|")[0];
    const member = interaction.member;

    const overwrites = channel.permissionOverwrites.cache;
    const staffRoleOverwrite = overwrites.find(p => p.type === 0 && p.id !== interaction.guild.id && p.id !== userId);

    if (!staffRoleOverwrite || !member.roles.cache.has(staffRoleOverwrite.id)) {
      return interaction.reply({ content: "❌ فقط الطاقم المسؤول على هذا النوع من التذاكر يمكنه غلقها.",flags: 64 });
    }

    const user = await client.users.fetch(userId);
    const jumpURL = `https://discord.com/channels/${channel.guild.id}/${channel.id}`;

    await interaction.reply({ content: "🔒 Ticket will be closed in 5 seconds..." });

    const logEmbed = new EmbedBuilder()
      .setTitle("📤 تم غلق التذكرة")
      .addFields(
        { name: "👤 تم الغلق بواسطة", value: `<@${interaction.user.id}>`, inline: true },
        { name: "📎 التذكرة", value: `${channel.name}`, inline: true },
        { name: "⏰ الوقت", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
      )
      .setColor("Red")
      .setFooter({ text: "𝘽𝙊𝙏 𝘽𝙔 𝙏𝙊𝙐𝙉𝙄 𝘿𝙴𝙑 🛠" });

    const logChannel = await client.channels.fetch(closeLogChannelId);
    await logChannel.send({ embeds: [logEmbed] });

    const transcript = await createTranscript(channel, {
      limit: -1,
      returnType: 'buffer',
      fileName: `${channel.name}.html`
    });

    const folderPath = './ticket-touni';
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const filePath = `${folderPath}/${channel.name}.html`;
    fs.writeFileSync(filePath, transcript);
    uploadToGitHub(`ticket-touni/${channel.name}.html`, transcript.toString());

    const ratingRow = new ActionRowBuilder().addComponents(
      [1, 2, 3, 4, 5].map(n =>
        new ButtonBuilder()
          .setCustomId(`star_${n}_${channel.id}`)
          .setLabel("⭐".repeat(n))
          .setStyle(ButtonStyle.Secondary)
      )
    );

    const viewTranscriptButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("📄 زيارة نسخة التذكرة")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://youcefkharchi2.github.io/bot-ticket-by-touni-test/ticket-touni/${channel.name}.html`)
    );

    const dmEmbed = new EmbedBuilder()
      .setTitle("📩 شكراً لاستخدام نظام التذاكر")
      .setDescription("يرجى تقييم الخدمة التي تلقيتها في هذه التذكرة.")
      .setColor("DarkButNotBlack")
      .addFields(
        { name: "📎 العودة إلى التذكرة", value: `[اضغط هنا لعرض التذكرة المغلقة](${jumpURL})` },
        { name: "⭐ تقييم", value: "اضغط على النجمة المناسبة لتقييمك." }
      )
      .setFooter({ text: "𝘽𝙊𝙏 𝘽𝙔 𝙏𝙊𝙐𝙉𝙄 𝘿𝙴𝙑 🛠" });

    user.send({ embeds: [dmEmbed], components: [ratingRow, viewTranscriptButton] }).catch(() => { });

    setTimeout(() => {
      channel.delete().catch(() => { });
    }, 5000);
  }

  if (interaction.isButton() && interaction.customId.startsWith("star_")) {
    const parts = interaction.customId.split("_");
    const rating = parts[1];
    const channelId = parts[2];

    const userRatings = ratedTickets.get(interaction.user.id) || new Set();
    if (userRatings.has(channelId)) {
      return interaction.reply({ content: "⚠ tلقد قمت بتقييم هذه التذكرة من قبل.", flags: 64  });
    }

    const logChannel = await client.channels.fetch(ratingLogChannelId);

    const ratingEmbed = new EmbedBuilder()
      .setTitle("⭐ تقييم جديد")
      .addFields(
        { name: "👤 المستخدم", value: `<@${interaction.user.id}>`, inline: true },
        { name: "⭐ التقييم", value: `${rating} / 5`, inline: true },
        { name: "⏰ الوقت", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
      )
      .setColor("Gold");

    await logChannel.send({ embeds: [ratingEmbed] });

    userRatings.add(channelId);
    ratedTickets.set(interaction.user.id, userRatings);

    await interaction.reply({ content: `✅ تم تسجيل تقييمك (${rating} ⭐). شكراً!`, flags: 64 });
  }
});

client.login(config.token)