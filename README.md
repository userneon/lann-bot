# lann-bot

A Discord ticket support bot built with [discord.js](https://discord.js.org) v14.

Members pick a ticket type from a dropdown, fill in a short form, and get a private thread in the panel's channel that only they and the support team can see. Staff can claim, add people, rename and close tickets. When a ticket closes, a text transcript is posted to a log channel and DM'd to the person who opened it.

## Features

- Ticket panel (in Mongolian) with a dropdown of ticket types, each with its own form: Санал хүсэлт, Unban хүсэлт, Гомдол, Сервер түрээс, Админ авах. Edit them in `src/categories.js`.
- Tickets are private threads, so no category or extra channels are needed
- One open ticket per member per type
- **Claim** and **Close** buttons inside each ticket (close asks for confirmation)
- Transcripts of closed tickets sent to a log channel and the ticket owner
- No database needed: ticket ownership is stored in the channel topic

## Commands

| Command | Who | What it does |
| --- | --- | --- |
| `/ticket-setup <role_1> [role_2..role_5] [log_channel]` | Manage Server | Sets the support roles (mentioned in every new ticket) and the transcript log channel |
| `/ticket-panel [channel]` | Manage Server | Posts the ticket panel |
| `/ticket add <user>` | Support staff | Gives a user access to the ticket |
| `/ticket remove <user>` | Support staff | Removes a user from the ticket |
| `/ticket rename <name>` | Support staff | Renames the ticket channel |
| `/ticket close [reason]` | Staff or ticket owner | Closes the ticket |

"Support staff" means anyone with one of the support roles or the Manage Threads permission.

## Setup

1. **Create the bot.** Go to the [Developer Portal](https://discord.com/developers/applications), create an application, open **Bot**, and click **Reset Token** to get your token. On the same page, turn on **Message Content Intent** (needed for transcripts).

2. **Invite it** with this URL, replacing `YOUR_CLIENT_ID`:

   ```
   https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=360777370624&scope=bot+applications.commands
   ```

   That grants View Channels, Send Messages, Send Messages in Threads, Create Private Threads, Manage Threads, Read Message History, Embed Links and Attach Files.

3. **Prepare your server.** Create a support role (and optionally a log channel for transcripts). Turn on Developer Mode in Discord (Settings → Advanced) so you can right-click to copy IDs. Then:
   - Make the support roles mentionable (Server Settings → Roles → the role → **Allow anyone to @mention this role**). The bot pings it in each new ticket, which is what adds the support team to the private thread.
   - In the channel where the panel will go, let `@everyone` **View Channel** and **Send Messages in Threads**, but turn off **Send Messages** and **Create Public/Private Threads** so members can only use the panel.
   - Give the support roles **Manage Threads** in that channel so they can see every ticket thread.

4. **Configure.** Copy `.env.example` to `.env` and fill in the bot token, application ID and server ID.

5. **Install, register commands, and run:**

   ```bash
   npm install
   npm run deploy
   npm start
   ```

6. In your server, run `/ticket-setup` to choose the support roles, e.g. test admin, main admin, senior and manager (and optionally a log channel), then run `/ticket-panel` in the channel where members should open tickets. Settings are saved in `data/settings.json`.

You only need to run `npm run deploy` again when you add or change slash commands.
