// TODO Divide in bot{commands, stages, index}, gdrive
require("dotenv").config();
const {
  Telegraf,
  Markup,
  session,
  Scenes: { BaseScene, Stage, WizardScene },
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

const cancelButton = () => {
  return Markup.inlineKeyboard([Markup.button.callback("Cancel", "exit")]);
};

// KEYBOARDS

// SCENES

// FIXME pdf not showing
// FIXME craete folders name cache
// FIXME upload file without file in it
// FIXME auto rerun
// FIXME add a back button when entering a folder

// NEW LIST FOLDERS SCENE
const listFoldersScene = new BaseScene("listFoldersScene")
listFoldersScene.enter(async (ctx) => {
  ctx.session.folders = [];
  ctx.session.folderId = "";
  ctx.session.token = "";
  ctx.session.index = 0;
  ctx.session.deepCount = 0;

  // feedback
  ctx.telegram.sendChatAction(ctx.chat.id, "typing");

  const getFiles = async (folder, pageToken) => {
    const { files, nextPageToken } = await listFolders(
      folder,
      pageToken
    );

    ctx.session.folders.push(files)
    ctx.session.token = nextPageToken
  }

  ctx.session.folders.length == 0 ? await getFiles() : "";

  const showFiles = async (folderId) => {
    const { files } = await listFiles(folderId)
    // console.log(files)
    const photos = [];
    const pdfs = [];
    const others = [];

    files.map(file => {
      file.mimeType == "image/jpeg" ? photos.push(file) :
        file.mimeType == "application/pdf" ? pdfs.push(file) :
          others.push(file)
    })

    const hidePhotosButton = (photos.length <= 0)
    const hidePdfsButton = (pdfs.length <= 0)
    const hideOthersButton = (others.length <= 0)

    await ctx.reply("Select", Markup.inlineKeyboard(
      [
        [
          Markup.button.callback(`Show photos: ${photos.length}`, "photo", hidePhotosButton),
        ],
        [
          Markup.button.callback(`Show PDFs: ${pdfs.length}`, "pdf", hidePdfsButton),
        ],
        [
          Markup.button.callback(`Show others: ${others.length}`, "other", hideOthersButton),
        ],
        [
          Markup.button.callback(`Upload files in this folder`, "upload", hideOthersButton),

        ],
        [
          Markup.button.callback("Cancel", "exit")
        ]
      ]
    ))

    bot.action("photo", (ctx) => {
      ctx.telegram.sendChatAction(ctx.chat.id, "typing");
      ctx.deleteMessage()
      ctx.replyWithMediaGroup([

        ...photos.map(photo => (
          {
            "media": photo.webContentLink,
            "caption": photo.name,
            "type": "photo"

          }))

      ])
    });

    bot.action("pdf", (ctx) => {
      ctx.telegram.sendChatAction(ctx.chat.id, "typing");
      ctx.deleteMessage()
      ctx.replyWithMediaGroup([
        ...pdfs.map(pdf => (
          {
            "media": pdf.webContentLink,
            "caption": pdf.name,
            "type": "document"

          }))
      ])
    });

    bot.action("other", async (ctx) => {
      ctx.telegram.sendChatAction(ctx.chat.id, "typing");
      ctx.deleteMessage()
      const { webViewLink } = await generatePublicUrl(folderId);
      ctx.reply("Not available", inlineUrlKeyboard("Open in browser", webViewLink))
    })

    bot.action("upload", (ctx) => {
      ctx.deleteMessage()
      // feedback
      ctx.telegram.sendChatAction(ctx.chat.id, "typing");
      ctx.reply("Select PDFs or photos as a file")

      listFoldersScene.on("document", async (ctx) => {
        // feedback
        ctx.telegram.sendChatAction(ctx.chat.id, "upload_document");
        const { file_name, mime_type, file_id } = ctx.message.document;

        try {
          const { href } = await ctx.telegram.getFileLink(file_id);
          const data = await getFileFromTelegram(href);
          const response = await uploadFile(file_name, mime_type, data, folderId);
          const { webViewLink, webContentLink } = await generatePublicUrl(response.id);

          ctx.reply(`${response.name} has been uploaded!`);

          return ctx.scene.leave();
        } catch (error) {
          console.log(error);
          ctx.reply("something bad happen try again");
        }
      });

      listFoldersScene.on("photo", (ctx) => {
        // feedback
        ctx.telegram.sendChatAction(ctx.chat.id, "typing");

        ctx.reply("you need to upload the photo like a file", cancelButton());
      });

    });
  }

  const newKeyboard = (files, size) => {
    const hideBack = (ctx.session.index == 0) ? true : false;
    const hideNext = ctx.session.token ? false : true;

    const buttons = [];
    const keyboard = [];

    if (files) {
      files.map((file) => {
        buttons.push(Markup.button.callback(file.name, file.id));

        bot.action(file.id, async (ctx) => {
          ctx.deleteMessage();
          ctx.session.folders = [];
          ctx.session.index = 0;
          await getFiles(file.id)
          ctx.session.folderId = file.id;
          ctx.session.deepCount == 0 ? callMe() : showFiles(file.id);
          ctx.session.deepCount += 1;
        });
      });

      for (var i = 0; i < buttons.length; i += size) {
        keyboard.push(buttons.slice(i, i + size));
      }
    }

    keyboard.push(
      [
        Markup.button.callback(`Create new folder`, "createNewFolder", !hideNext),
      ],
      [
        Markup.button.callback("Back", "Back", hideBack),
        Markup.button.callback("Cancel", "exit"),
        Markup.button.callback("Next", "Next", hideNext),
      ]);

    bot.action("createNewFolder", (ctx) => {
      ctx.deleteMessage()
      // feedback
      ctx.telegram.sendChatAction(ctx.chat.id, "typing");
      ctx.reply("Type folder name")
      listFoldersScene.on("text", async (ctx) => {

        try {
          const folder_name = ctx.message.text;
          // feedback
          ctx.telegram.sendChatAction(ctx.chat.id, "typing");
          ctx.reply(`Folder name is ${folder_name}?`,
            Markup.inlineKeyboard(
              [
                Markup.button.callback("Cancel", "exit"),
                Markup.button.callback("Confirm", "newFolder")
              ]))

          bot.action("newFolder", async (ctx) => {
            ctx.deleteMessage()
            // feedback
            ctx.telegram.sendChatAction(ctx.chat.id, "upload_document");

            const response = await createFolder(folder_name, ctx.session.folderId);
            const { webViewLink } = await generatePublicUrl(response.id);

            ctx.reply(`${response.name} has been created!`);
            inlineUrlKeyboard("Open", webViewLink);
          })

        } catch (error) {
          console.log(error);
        }

        return ctx.scene.leave();
      });
    });

    bot.action("Back", (ctx) => {
      ctx.deleteMessage()
      ctx.session.index -= 1
      callMe()
    });

    bot.action("Next", async (ctx) => {
      await getFiles(null, ctx.session.token)
      ctx.deleteMessage()
      ctx.session.index += 1
      callMe()
    });

    return Markup.inlineKeyboard(keyboard);
  };

  const callMe = () => {
    ctx.reply("Select", newKeyboard(ctx.session.folders[ctx.session.index], 2))
  }

  callMe()

})

// SCENES

const stage = new Stage([listFoldersScene]);
stage.action("exit", async (ctx) => {
  await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
  console.log("leaving stage");
  // ctx.session = {};
  ctx.scene.leave();
});
bot.use(session());
bot.use(stage.middleware());

// COMMANDS

bot.command("/scene2", (ctx) => ctx.scene.enter("listFoldersScene"));

// COMMANDS


bot.launch();

//  ERRORS
process.on("uncaughtException", function (error) {
  console.log("\x1b[31m", "Exception: ", error, "\x1b[0m");
});

process.on("unhandledRejection", function (error, p) {
  console.log("\x1b[31m", "Error: ", error.message, "\x1b[0m");
});

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
