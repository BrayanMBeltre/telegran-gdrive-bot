require("dotenv").config();
const { Telegraf, Markup, Composer } = require("telegraf");
const path = require("path");
const fs = require("fs");
const {
  getFileFromTelegram,
  upploadFile,
  generatePublicUrl,
} = require("./gdrive");
const { default: axios } = require("axios");

const token = process.env.BOT_TOKEN;
const bot = new Telegraf(token);
//bot.use(Telegraf.log());

bot.start((ctx) => ctx.reply(`Deep link payload: ${ctx.startPayload}`));

bot.command("subir", (ctx) => {
  ctx.reply("what do you whant to upload?", {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      Markup.button.callback("File", "upload"),
      Markup.button.callback("Photo", "upload"),
    ]),
  });
});

bot.action("upload", async (ctx) => {
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

bot.command("url", (ctx) => {
  ctx.reply(
    "Link to drive",
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        Markup.button.url("URL", process.env.DRIVE_URL),
      ]),
    },
    { reply_to_message_id: ctx.message.message_id }
  );
});

bot.hears("Hola", (ctx) =>
  ctx.replyWithHTML(
    `Hola <b>${ctx.from.first_name}</b>, ¿qué tal estás?. Tu ID en Telegram es: <b>${ctx.message.from.id}</b>\n\nTu username es: <b>${ctx.message.from.username}</b> `
  )
);

bot.command("inline", (ctx) => {
  return ctx.reply("<b>Coke</b> or <i>Pepsi?</i>", {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      Markup.button.callback("Coke", "Coke"),
      Markup.button.callback("Pepsi", "Pepsi"),
    ]),
  });
});

bot.command("caption", (ctx) => {
  ctx.telegram.sendMessage(
    ctx.message.chat.id,
    ` has been uploaded!`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        Markup.button.callback("Coke", "Coke"),
        Markup.button.url("google", "google.com"),
      ]),
    },
    { reply_to_message_id: ctx.message.message_id }
  );
});

bot.on("message", (ctx) => {
  ctx.telegram.sendCopy(ctx.chat.id, ctx.message, {
    parse_mode: "HTML",
    ...Markup.inlineKeyboard([
      Markup.button.callback("Delete this?", "delete"),
    ]),
  });
});

// bot.command("file", (ctx) => {
//   ctx.telegram.sendChatAction(ctx.chat.id, "upload_document");
//   ctx.telegram.sendDocument(
//     ctx.chat.id,
//     { source: fs.createReadStream(photo), filename: "templarAssaasing.jpg" },
//     { reply_to_message_id: ctx.message.message_id }
//   );
// });

bot.catch((err) => {
  console.log("Ooops", err);
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
