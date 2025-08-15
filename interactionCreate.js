const ticketCommand = require('../commands/ticket.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // معالجة أوامر السلاش
        if (interaction.isCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
            }
        }

        // معالجة الأزرار
        if (interaction.isButton()) {
            if (interaction.customId === 'close_ticket') {
                await interaction.reply({ content: '🔒 يتم غلق التذكرة...', ephemeral: true });

                // إزالة التذكرة من لائحة التذاكر المفتوحة
                if (interaction.channel.topic && interaction.channel.topic.startsWith('TICKET-USER:')) {
                    const userId = interaction.channel.topic.split(':')[1];
                    ticketCommand.closeTicket(userId);
                }

                setTimeout(() => {
                    interaction.channel.delete().catch(() => {});
                }, 2000);
            }
        }
    }
};