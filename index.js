const { App } = require("@slack/bolt");

// Load environment variables
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const APP_TOKEN = process.env.APP_TOKEN;

const app = new App({
  signingSecret: SLACK_SIGNING_SECRET,
  token: SLACK_BOT_TOKEN,
  socketMode: true, // enable to use socket mode
  appToken: APP_TOKEN,
});

// Listens to incoming messages that contain "hello"
app.message(/code|write|function/, async ({ message, say }) => {

  // say() sends a message to the channel where the event was triggered
  await say({
    blocks: [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              {
                type: "text",
                text: "This is an example of a ",
              },
              {
                type: "text",
                text: "secure ",
                style: {
                bold: true
                },
              },
              {
                  type: "text",
                  text: "code block ",
              }
            ],
          },
        ],
      },
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_preformatted",
            elements: [
              {
                type: "text",
                text: '{\n  "object": {\n    "description": "this is an example of a json object"\n  }\n}',
              },
            ],
            border: 0,
          },
        ],
      },
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              {
                type: "text",
                text: "This is an example of an ",
              },
              {
                type: "text",
                text: "InSecure ",
                style: {
                bold: true
                },
              },
              {
                  type: "text",
                  text: "code block ",
              }
            ],
          },
        ],
      },
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_preformatted",
            elements: [
              {
                type: "text",
                text: '{\n  "object": {\n    "description": "this is an example of anoter json object"\n  }\n}',
              },
            ],
            border: 0,
          },
        ],
      },
    ],
  });
});

(async () => {
  // Initializing the InSecureApp
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ InSecure Coding agent is running! ⚡️");
})();
