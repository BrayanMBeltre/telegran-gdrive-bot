require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const {
  getFileFromTelegram,
  upploadFile,
  generatePublicUrl,
} = require("./gdrive");

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply(`Deep link payload: ${ctx.startPayload}`));

bot.command("upload", (ctx) => {
  ctx.reply("Send me the file");
  bot.on("document", async (ctx) => {
    ctx.telegram.sendChatAction(ctx.chat.id, "upload_document");
    const { file_name, mime_type, file_id } = ctx.message.document;

    try {
      const { href } = await ctx.telegram.getFileLink(file_id);
      const data = await getFileFromTelegram(href);
      const response = await upploadFile(file_name, mime_type, data);
      const { webViewLink } = await generatePublicUrl(response.id);

      ctx.reply(
        `${response.name} has been uploaded!`,
        {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([Markup.button.url("URL", webViewLink)]),
        },
        { reply_to_message_id: ctx.message.message_id }
      );
    } catch (error) {
      console.log(error);
      ctx.reply("something bad happen try again");
    }
    ctx.reply("afuera del try");
  });
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
