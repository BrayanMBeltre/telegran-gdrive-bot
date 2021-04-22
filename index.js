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
  uploadFile,
  generatePublicUrl,
  listFolders,
  listFiles,
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
        ctx.deleteMessage(ctx.callbackQuery.message.message_id);
        ctx.session.folderId = file.id;
        ctx.scene.enter("listFoldersScene");
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
    bot.action(sceneName, (ctx) => {
      ctx.deleteMessage(ctx.callbackQuery.message.message_id);
      ctx.scene.enter(sceneName);
    });
  }

  if (nextPageToken) {
    bot.action("NextPage", (ctx) => {
      ctx.deleteMessage(ctx.callbackQuery.message.message_id);
      ctx.session.pageToken = nextPageToken;
      ctx.scene.enter("listFoldersScene");
    });
  }

  return Markup.inlineKeyboard(keyboard);
};

const createFilesKeyboard = (files, size, sceneName, nextPageToken) => {
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
        console.log("hello world")
        console.log(file.mimeType)
        ctx.replyWithDocument(file.webContentLink)
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
    bot.action(sceneName, (ctx) => {
      ctx.deleteMessage(ctx.callbackQuery.message.message_id);
      ctx.scene.enter(sceneName);
    });
  }

  if (nextPageToken) {
    bot.action("NextPage", (ctx) => {
      ctx.deleteMessage(ctx.callbackQuery.message.message_id);
      ctx.session.pageToken = nextPageToken;
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

  try {
    const folder_name = ctx.message.text;
    const response = await createFolder(folder_name);
    const { webViewLink } = await generatePublicUrl(response.id);

    ctx.reply(`${response.name} has been created!`);
    inlineUrlKeyboard("Open", webViewLink);
  } catch (error) {
    console.log(error);
  }

  return ctx.scene.leave();
});

// LIST SUBJECTS SCENE
// FIXME error on next page selection
const listFoldersScene = new BaseScene("listFoldersScene");
listFoldersScene.enter(async (ctx) => {
  // feedback
  ctx.telegram.sendChatAction(ctx.chat.id, "typing");

  const { files, nextPageToken } = await listFolders(
    ctx.session.folderId,
    ctx.session.pageToken
  );

  ctx.reply(`Select subject`, createKeyboard(files, 2, null, nextPageToken));

  return ctx.scene.leave();
});

// UPLOAD FILE SCENE
const uploadFileScene = new BaseScene("uploadFileScene");
uploadFileScene.enter((ctx) => {
  // feedback
  ctx.telegram.sendChatAction(ctx.chat.id, "typing");

  ctx.reply("Select File", createKeyboard());
});

uploadFileScene.on("document", async (ctx) => {
  // feedback
  ctx.telegram.sendChatAction(ctx.chat.id, "upload_document");
  const { file_name, mime_type, file_id } = ctx.message.document;
  // const folderId = "1aDvFr2Y2aYs4V3P4fxxyMj_77O7Kytas"
  const folderId = undefined

  try {
    const { href } = await ctx.telegram.getFileLink(file_id);
    const data = await getFileFromTelegram(href);
    const response = await uploadFile(file_name, mime_type, data, folderId);
    const { webViewLink, webContentLink } = await generatePublicUrl(response.id);

    ctx.reply(
      `${response.name} has been uploaded!`, inlineUrlKeyboard("Download", webContentLink)
    );

    return ctx.scene.leave();
  } catch (error) {
    console.log(error);
    ctx.reply("something bad happen try again");
  }
});

uploadFileScene.on("photo", (ctx) => {
  // feedback
  ctx.telegram.sendChatAction(ctx.chat.id, "typing");

  ctx.reply("you need to upload the photo like a file", createKeyboard());
});

// LIST FILES SCENE
const listFilesScene = new BaseScene("listFilesScene")
listFilesScene.enter(async (ctx) => {
  ctx.telegram.sendChatAction(ctx.chat.id, "typing");

  const folderId = "1VlC1huKGIVWxbxRvIIqfx9P869XIKDts"

  const { files } = await listFiles(folderId)
  console.log(files)

  // ctx.reply(`Select subject`, createFilesKeyboard(files, 2, null, null));

  ctx.replyWithMediaGroup([

    ...files.map(file => (
      {
        "media": file.webContentLink,
        "caption": file.name,
        "type": "photo"

      }))

  ])



})

// SCENES

const stage = new Stage([createFolderScene, listFoldersScene, uploadFileScene, listFilesScene]);
stage.action("exit", async (ctx) => {
  await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
  console.log("leaving stage");
  ctx.session = {};
  ctx.scene.leave();
});
bot.use(session());
bot.use(stage.middleware());

// COMMANDS
bot.command("/scene1", (ctx) => ctx.scene.enter("createFolderScene"));

bot.command("/scene2", (ctx) => ctx.scene.enter("listFoldersScene"));

bot.command("/scene3", (ctx) => ctx.scene.enter("uploadFileScene"));

bot.command("/scene4", (ctx) => ctx.scene.enter("listFilesScene"));
// COMMANDS

// const getFiles = async (fileId, tokenId) => {

//   const { files } = await listFiles(
//     fileId,
//     tokenId,
//   );

//   const response = await generatePublicUrl(files[0].id)
//   console.log(response)
//   // console.log(files[0].id)


// }

// getFiles()

//  ERRORS
process.on("uncaughtException", function (error) {
  console.log("\x1b[31m", "Exception: ", error, "\x1b[0m");
});

process.on("unhandledRejection", function (error, p) {
  console.log("\x1b[31m", "Error: ", error.message, "\x1b[0m");
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
