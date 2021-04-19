require("dotenv").config();
const {
  Telegraf,
  Markup,
  session,
  Scenes: { BaseScene, Stage },
} = require("telegraf");

// KEYBOARDS
const navigation_keyboard = (sceneName) => {
  sceneName ? sceneName : "";
  const hideBack = sceneName ? false : true;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback("Select subject", "setSubject"),
      Markup.button.callback("select teacher", "setTeacher"),
      Markup.button.callback("select teacher", "setTeacher"),
    ],
    [
      Markup.button.callback("Select subject", "setSubject"),
      Markup.button.callback("select teacher", "setTeacher"),
      Markup.button.callback("select teacher", "setTeacher"),
    ],
    [
      Markup.button.callback("Select subject", "setSubject"),
      Markup.button.callback("select teacher", "setTeacher"),
      Markup.button.callback("select teacher", "setTeacher"),
    ],
    [
      Markup.button.callback("back", sceneName, hideBack),
      Markup.button.callback("Cancel", "exit"),
    ],
  ]);

  if (sceneName) {
    bot.action(sceneName, async (ctx) => {
      await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
      ctx.scene.enter(sceneName);
    });
  }

  return keyboard;
};

// KEYBOARDS

// SCENES
// SUBJECT SCENE
const subjectScene = new BaseScene("subjectScene");

subjectScene.enter((ctx) => {
  ctx.reply("ENTERING SUBJECT SCENE");
  ctx.reply("Select subject", navigation_keyboard(""));
});

subjectScene.on("text", (ctx) => {
  ctx.reply("ON SUBJECT SCENE");
  ctx.session.subject = ctx.message.text;

  return ctx.scene.enter("teacherScene");
});

subjectScene.leave((ctx) => ctx.reply("LEAVING SUBJECT SCENE"));

// SUBJECT SCENE

// TEACHER SCENE
const teacherScene = new BaseScene("teacherScene");
teacherScene.enter((ctx) => {
  ctx.reply("ENTERING TEACHER SCENE");
  ctx.reply("Select teacher", navigation_keyboard("subjectScene"));
});

teacherScene.on("text", (ctx) => {
  ctx.reply("ON TEACHER SCENE");
  ctx.session.teacher = ctx.message.text;
  return ctx.scene.leave();
});

teacherScene.leave((ctx) => {
  ctx.reply("LEAVING TEACHER SCENE");
});
// TEACHER SCENE
// SCENES

const stage = new Stage([subjectScene, teacherScene]);
stage.action("exit", (ctx) => ctx.scene.leave());

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());
bot.use(stage.middleware());

bot.command("/info", (ctx) =>
  ctx.reply(
    `Your subject is ${ctx.session?.subject} and your teacher is ${ctx.session?.teacher}`
  )
);
bot.command("/find", (ctx) => ctx.scene.enter("subjectScene"));

// bot.action("cancel", async (ctx) => {
//   await ctx.answerCbQuery("Your wish is my command");
//   await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
//   ctx.scene.leave("teacherScene");
// });

bot.launch();
