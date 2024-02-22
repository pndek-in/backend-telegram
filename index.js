if (process.env.NODE_ENV !== "production") {
  require("dotenv").config()
}

const { Telegraf, session, Markup } = require("telegraf")
const { Redis } = require("@telegraf/session/redis")
const API = require("./utils/api")
const { HELP, REGEX } = require("./constants")

const store = Redis({
  url: process.env.REDIS_URL
})

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)
bot.use(session({ store, defaultSession: () => ({}) }))

const checkContext = (ctx, command) => {
  const userId = ctx.from.id

  // Check if the user has a session and create one if not
  if (!ctx.session[userId]) {
    ctx.session[userId] = {
      /* initial session data */
    }
  }

  // Now ctx.session[userId] can store user-specific data
  // Example: storing the last command
  ctx.session[userId].lastCommand = command
}

bot.command(["set_token", "create"], async (ctx) => {
  checkContext(ctx, ctx.message.text)

  // Send a message to the user
  if (ctx.command === "set_token") {
    ctx.reply("Please enter your token")
  } else if (ctx.command === "create") {
    ctx.reply("Input your URL")
  }
})

bot.command(["start", "help"], (ctx) => {
  ctx.reply(HELP.generalHelpMessage)
})

bot.command("list", async (ctx) => {
  const userId = ctx.from.id
  const userToken = ctx.session[userId]?.token || null
  if (!userToken) {
    ctx.reply("Please set your token first")
    return
  }

  const response = await API.link.listShortLinks({
    token: userToken
  })

  if (response.status === 200) {
    let message = "Your short links:\n"

    response.data.data.forEach((link, index) => {
      message += `
      ${index + 1}. pndek.in/${link.path} ${
        link.description ? `( ${link.description} )` : ""
      }
      ${link.url}\n`
    })

    ctx.reply(message)
  } else {
    ctx.reply("Failed to fetch short links")
  }
})

bot.command("edit", async (ctx) => {
  const userId = ctx.from.id
  const userToken = ctx.session[userId]?.token || null
  if (!userToken) {
    ctx.reply("Please set your token first")
    return
  }

  const response = await API.link.listShortLinks({
    token: userToken
  })

  const inlineData = response.data.data.map((link) => {
    return {
      text: `pndek.in/${link.path} | ${link.url}`,
      callback_data: `edit_${link.linkId}`
    }
  })

  ctx.reply(
    "Select an option: ",
    Markup.inlineKeyboard(inlineData, { columns: 1 })
  )
})

bot.action(REGEX.EDIT_COMMAND_REGEX, async (ctx) => {
  const linkId = ctx.match[1]
  checkContext(ctx, `edit_${linkId}`)

  await ctx.reply(`
Input format to edit the link, skip the field if you don't want to change it:
  short:<new_short_link>#desc:<new_description>

Example:
  short:my-new-short-link#desc:My new description
`)
  // Don't forget to answer the callback query to remove the "loading" status
  await ctx.answerCbQuery()
})

bot.on("message", async (ctx) => {
  const userId = ctx.from.id

  // Retrieve user-specific data from the session
  const lastCommand = ctx.session[userId]?.lastCommand || null
  const userToken = ctx.session[userId]?.token || null

  // If the user don't have a last command, reply with help message
  if (!lastCommand) {
    ctx.reply(HELP.generalHelpMessage)
    return
  }

  // Clear the last command
  if (lastCommand) {
    ctx.session[userId].lastCommand = null
  }

  // Send a message to the user
  if (lastCommand === "/set_token") {
    const token = ctx.message.text.split(" ")[0]
    const user = await API.auth.getMe({ token })

    if (user.status === 200) {
      ctx.session[userId].token = token
      ctx.reply("Your token has been set")
    } else {
      ctx.reply("Invalid token")
    }
  } else if (lastCommand === "/create") {
    if (!userToken) {
      ctx.reply("Please set your token first")
      return
    }

    const [url] = ctx.message.text.split(" ")
    const response = await API.link.createShortLink({
      token: userToken,
      payload: { url }
    })

    if (response.status === 201) {
      ctx.reply(`Your short link is:
pndek.in/${response.data.data.path}`)
    } else {
      ctx.reply("Failed to create short link")
    }
  } else if (REGEX.EDIT_COMMAND_REGEX.test(lastCommand)) {
    ctx.reply("updating link, please wait...")
    const linkId = lastCommand.split("_")[1]

    const inputs = ctx.message.text.split("#")

    const payload = {}

    inputs.forEach((input) => {
      const [key, value] = input.split(":")
      const acceptedPayload = {
        desc: "description",
        short: "path"
      }

      if (acceptedPayload[key]) {
        payload[acceptedPayload[key]] = value || null
      }
    })

    if (
      !(payload.hasOwnProperty("path") || payload.hasOwnProperty("description"))
    ) {
      ctx.reply("Invalid input")
      return
    }

    const response = await API.link.editShortLink({
      token: userToken,
      id: linkId,
      payload
    })

    if (response.status === 200) {
      ctx.reply(`Link updated,
Original URL: ${response.data.data.url}
Short: pndek.in/${response.data.data.path}
${
  response.data.data.description
    ? `Description: ${response.data.data.description}`
    : ""
} `)
    } else {
      ctx.reply("Failed to update link: " + response.data.message)
    }
  }
})

bot.launch()
