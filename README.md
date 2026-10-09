# lann-bot

A Discord ticket support bot built with [discord.js](https://discord.js.org) v14.

Members click **Open Ticket**, describe their issue, and get a private channel that only they and the support team can see. Staff can claim, add people, rename and close tickets. When a ticket closes, a text transcript is posted to a log channel and DM'd to the person who opened it.

## Features

- Ticket panel with an **Open Ticket** button and a reason form
- Private ticket channels under a category you choose
- One open ticket per member
- **Claim** and **Close** buttons inside each ticket (close asks for confirmation)
- Transcripts of closed tickets sent to a log channel and the ticket owner
- No database needed: ticket ownership is stored in the channel topic

## Commands

| Command | Who | What it does |
| --- | --- | --- |
| `/ticket-panel [channel]` | Manage Server | Posts the Open Ticket panel |
| `/ticket add <user>` | Support staff | Gives a user access to the ticket |
| `/ticket remove <user>` | Support staff | Removes a user from the ticket |
| `/ticket rename <name>` | Support staff | Renames the ticket channel |
| `/ticket close [reason]` | Staff or ticket owner | Closes the ticket |

"Support staff" means anyone with the support role or the Manage Channels permission.

## Setup

1. **Create the bot.** Go to the [Developer Portal](https://discord.com/developers/applications), create an application, open **Bot**, and click **Reset Token** to get your token. On the same page, turn on **Message Content Intent** (needed for transcripts).

2. **Invite it** with this URL, replacing `YOUR_CLIENT_ID`:

   ```
   https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268553232&scope=bot+applications.commands
   ```

   That grants View Channels, Send Messages, Manage Channels, Manage Roles, Read Message History, Embed Links and Attach Files.

3. **Prepare your server.** Create a support role and a category for tickets (and optionally a log channel). Turn on Developer Mode in Discord (Settings → Advanced) so you can right-click to copy IDs. Make sure the bot's role is above the support role in Server Settings → Roles.

4. **Configure.** Copy `.env.example` to `.env` and fill in the values.

5. **Install, register commands, and run:**

   ```bash
   npm install
   npm run deploy
   npm start
   ```

6. In your server, run `/ticket-panel` in the channel where members should open tickets.

You only need to run `npm run deploy` again when you add or change slash commands.
