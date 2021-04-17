require("dotenv").config();
const { Telegraf, Markup, Composer } = require("telegraf");
const path = require("path");
const fs = require("fs");
const {
  getFileFromTelegram,
  upploadFile,
  generatePublicUrl,
} = require("./index");

const token = process.env.BOT_TOKEN;
const bot = new Telegraf(token);

bot.start((ctx) => ctx.reply(`Deep link payload: ${ctx.startPayload}`));

bot.on("document", (ctx) => {
  ctx.telegram.sendChatAction(ctx.chat.id, "upload_document");
  const fileName = ctx.message.document.file_name;
  const fileType = ctx.message.document.mime_type;

  // Get file Url From Telegram
  ctx.telegram
    .getFileLink(ctx.message.document.file_id)
    .then((url) => {
      // Download That File With Axios
      getFileFromTelegram(url.href)
        .then((file) => {
          // Send That File To Google Drive
          upploadFile(fileName, fileType, file);
          // FIXME
          ctx.reply("file uploaded");
        })
        .catch((e) => console.log(e.message));
    })
    .catch((e) => console.log(e.message));
});

const photo = path.join(__dirname, "templarAssasin.jpg");
const document = path.join(__dirname, "documentfile.pdf");

// Reply with anyFile
// bot.command("file", (ctx) => {
//   ctx.replyWithChatAction("upload_document");
//   ctx.replyWithDocument({
//     filename: "templarAssasin.jpg",
//     source: fs.createReadStream(photo),
//   });
// });

bot.command("file", (ctx) => {
  ctx.telegram.sendChatAction(ctx.chat.id, "upload_document");
  ctx.telegram.sendDocument(
    ctx.chat.id,
    { source: fs.createReadStream(photo), filename: "templarAssaasing.jpg" },
    { reply_to_message_id: ctx.message.message_id }
  );
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
