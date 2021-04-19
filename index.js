// TODO Divide in bot{commands, stages, index}, gdrive
require("dotenv").config();
const {
  Telegraf,
  Markup,
  session,
  Scenes: { BaseScene, Stage },
} = require("telegraf");
const {
  createFolder,
  getFileFromTelegram,
  upploadFile,
  generatePublicUrl,
  listFolders,
} = require("./gdrive");

const bot = new Telegraf(process.env.BOT_TOKEN);

// KEYBOARDS

const inlineUrlKeyboard = (btnName, url) => {
  return Markup.inlineKeyboard([Markup.button.url(btnName, url)]);
};

const createKeyboard = (files, size, sceneName, nextPageToken) => {
  sceneName ? sceneName : "";
  const hideBack = sceneName ? false : true;

  nextPageToken ? nextPageToken : "";
  const hideNext = nextPageToken ? false : true;

  const buttons = [];
  const keyboard = [];

  if (files) {
    files.map((file) => {
      buttons.push(Markup.button.callback(file.name, file.id));

      bot.action(file.id, (ctx) => {
        // ctx.deleteMessage(ctx.callbackQuery.message.message_id);
        // ctx.session.folderId = file.id;
        // ctx.scene.enter("listFoldersScene");
        // console.log(ctx);
        // console.log(file.id);
        ctx.reply("File ID:" + file.id);
      });
    });

    for (var i = 0; i < buttons.length; i += size) {
      keyboard.push(buttons.slice(i, i + size));
    }
  }

  keyboard.push([
    Markup.button.callback("Back", sceneName, hideBack),
    Markup.button.callback("Cancel", "exit"),
    Markup.button.callback("Next Page", "NextPage", hideNext),
  ]);

  if (sceneName) {
    bot.action(sceneName, async (ctx) => {
      await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
      ctx.scene.enter(sceneName);
    });
  }

  if (nextPageToken) {
    bot.action("NextPage", async (ctx) => {
      ctx.deleteMessage(ctx.callbackQuery.message.message_id);

      ctx.scene.enter("listFoldersScene");
    });
  }

  return Markup.inlineKeyboard(keyboard);
};
// KEYBOARDS

// SCENES
// CREATE FOLDER SCENE
const createFolderScene = new BaseScene("createFolderScene");
createFolderScene.enter((ctx) => {
  // feedback
  ctx.telegram.sendChatAction(ctx.chat.id, "upload_document");
  ctx.reply("Enter folder name", createKeyboard());
});

createFolderScene.on("text", async (ctx) => {
  // feedback
  ctx.telegram.sendChatAction(ctx.chat.id, "upload_document");

  const folder_name = ctx.message.text;
  const response = await createFolder(folder_name);
  const { webViewLink } = await generatePublicUrl(response.id);

  ctx.reply(
    `${response.name} has been created!`,
    inlineUrlKeyboard("Open", webViewLink)
  );

  return ctx.scene.leave();
});

// LIST FOLDERS SCENE

const listFoldersScene = new BaseScene("listFoldersScene");
listFoldersScene.enter(async (ctx) => {
  ctx.telegram.sendChatAction(ctx.chat.id, "typing");

  const { files, nextPageToken } = await listFolders(
    ctx.session.folderId,
    ctx.session.pageToken
  );
  ctx.session.pageToken = nextPageToken;

  ctx.reply("Select Subject", createKeyboard(files, 2, null, nextPageToken));
});

// SCENES

const stage = new Stage([createFolderScene, listFoldersScene]);
stage.action("exit", async (ctx) => {
  await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
  ctx.scene.leave();
});
bot.use(session());
bot.use(stage.middleware());

// COMMANDS
bot.command("/scene1", (ctx) => ctx.scene.enter("createFolderScene"));

bot.command("/scene2", (ctx) => ctx.scene.enter("listFoldersScene"));
// COMMANDS

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

bot.action("Teacher", (ctx) => {
  ctx.reply("/wizard");
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
