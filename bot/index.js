require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const {
  createFolder,
  getFileFromTelegram,
  upploadFile,
  generatePublicUrl,
  listFolders,
} = require("./gdrive");

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply(`Deep link payload: ${ctx.startPayload}`));

// FIXME need to work with command
const createFolderDictionary = {};
bot.command("createFolder", async (ctx) => {
  if (createFolderDictionary[ctx.chat.id] === undefined) {
    createFolderDictionary[ctx.chat.id] = {
      ...createFolderDictionary[ctx.chat.id],
      step: "set folder name",
    };
    ctx.reply("Write folder name");
  } else if (createFolderDictionary[ctx.chat.id].step === "set folder name") {
    createFolderDictionary[ctx.chat.id] = {
      step: "done",
      folder_name: ctx.message.text,
    };

    const { folder_name } = createFolderDictionary[ctx.chat.id];
    const response = await createFolder(folder_name);
    const { webViewLink } = await generatePublicUrl(response.id);

    ctx.reply(
      `${response.name} has been created!`,
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([Markup.button.url("URL", webViewLink)]),
      },
      { reply_to_message_id: ctx.message.message_id }
    );
  }
});

bot.command("listFolders", async (ctx) => {
  ctx.telegram.sendChatAction(ctx.chat.id, "typing");
  const { files, nextPageToken } = await listFolders("");

  ctx.reply("Select Subject", createKeyboard(files, 2));
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

const createKeyboard = (files, size) => {
  const buttons = [];

  files.map((file) => {
    buttons.push(Markup.button.url(file.name, file.webViewLink));
  });

  const keyboard = [];

  for (var i = 0; i < buttons.length; i += size) {
    keyboard.push(buttons.slice(i, i + size));
  }

  return Markup.inlineKeyboard(keyboard);
};

bot.action("Teacher", (ctx) => {
  ctx.reply("/wizard");
});

// TODO Create Guide Menu
// FIXME Only works with onText change this to command and then onText
const messageDictionary = {};
bot.command("wizard", (ctx) => {
  if (messageDictionary[ctx.chat.id] === undefined) {
    messageDictionary[ctx.chat.id] = {
      ...messageDictionary[ctx.chat.id],
      status: "subject set",
    };

    // create funtion to fill buttons
    ctx.reply("Select Subject", keyboard);
  } else if (messageDictionary[ctx.chat.id].status === "subject set") {
    messageDictionary[ctx.chat.id] = {
      ...messageDictionary[ctx.chat.id],
      status: "teacher set",
      subject: ctx.message.text,
    };
    // create funtion to fill buttons
    ctx.reply("Select Teacher", keyboard);
    // ctx.reply(`Your you selected ${ctx.message.text}. now select teacher`);
  } else if (messageDictionary[ctx.chat.id].status === "teacher set") {
    messageDictionary[ctx.chat.id] = {
      ...messageDictionary[ctx.chat.id],
      status: "done",
      teacher: ctx.message.text,
    };
    const { teacher, subject } = messageDictionary[ctx.chat.id];
    ctx.reply(`Subject: ${subject} and teacher: ${teacher}`);

    // clear
    delete messageDictionary[ctx.chat.id];
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
