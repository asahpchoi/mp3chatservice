// Importing required packages
const express = require("express"),
  cors = require("cors"),
  fs = require("fs"),
  url = require("url"),
  { Configuration, OpenAIApi } = require("openai"),
  configuration = new Configuration({
    apiKey: process.env.apiKey,
  });
const { Client } = require("@notionhq/client");

const token = "secret_JUsbKVd6EB0zgqwe1gWo4SmThx5Q9Jo2CFT4YP0Oi3f";

// Creating an instance of OpenAI API
const openai = new OpenAIApi(configuration);

// Initializing the Express app
const app = express();

// Adding CORS middleware to allow cross-origin requests
app.use(cors());

// Adding body-parser middleware to parse incoming request bodies
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Async function to get transcription from an audio file
async function getTranscription(file) {
  console.log("transcripting");
  try {
    const result = await openai.createTranscription(
      fs.createReadStream(file),
      "whisper-1"
    );
    return result.data.text;
  } catch (error) {
    return "Error";
  }
}

app.post("/createPage", async (req, res) => {
  const notion = new Client({ auth: token });
  const title = new Date().toLocaleString();
  const body = req.body.content.split("\r\n\r\n");
  const rich_text = body.map((data) => {
    const text = {
      type: "text",
      text: {
        content: data + "\n",
      },
    };
    return text;
  });

  //console.log({ body });
  const payload = {
    parent: {
      database_id: "fd6156d0cfce4550bcfeabe28456a78b",
    },
    properties: {
      Title: {
        id: "pageid",
        type: "title",
        title: [
          {
            type: "text",
            text: {
              content: title,
            },
          },
        ],
      },
    },
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text,
        },
      },
    ],
  };
  //console.log({ payload });

  const response = await notion.pages.create(payload);
  res.json(response);
});

// Route to get a summary of a given transcript
app.post("/getSummary", async (req, res) => {
  let summmary = null;
  //console.log(req.body);

  summary = await getSummary(req.body.transcript, req.body.actas);

  res.json({ summary });
});

// Multer middleware to handle file uploads
const multer = require("multer");
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + ".mp3");
  },
});
var upload = multer({ storage: storage });

// Route to handle file uploads and get the transcription of the uploaded file
app.post("/upload", upload.single("file"), async (req, res, next) => {
  const file = req.file;
  if (!file) {
    const error = new Error("Please upload a file");
    error.httpStatusCode = 400;
    return next(error);
  }

  const result = await getTranscription(file.path);

  res.json({ result });
});

// Default route to check if the server is up and running
app.get("/", async (req, res) => {
  const test = await getMessages(
    "act as an assistant to take note",
    "hello world"
  );
  //console.log(test);

  res.json({ server: "up" });
});

async function getNotionTemplates() {
  const notion = new Client({ auth: token });
  let results = [];

  const databaseId = "66082d850c7d421da628c752454fdde9";
  const response = await notion.databases.query({
    database_id: databaseId,
  });
  try {
    results = response.results
      .map((i) => i.properties)
      .filter((p) => p["Name"]["title"][0])
      .map((p) => {
        const data = {
          title: p["Name"]["title"][0]["plain_text"],
          format: p["Format"]["rich_text"][0]["plain_text"],
          instruction: p["Instruction"]["rich_text"][0]["plain_text"],
        };
        return data;
      });
    return results;
  } catch (x) {
    //console.log({ debug: response.results });
  }
}

// Async function to get system and user messages for a given action and text
async function getMessages(action, text) {
  const templates = await getNotionTemplates();
  //console.log({ templates });
  const msgs = templates.filter((x) => x.title === action);

  const result = {
    systemMsg: msgs[0].format,
    userMsg: msgs[0].instruction.replace("${text}", text),
  };

  return result;
}

// Route to get a list of available message actions
app.get("/getMessageList", async (req, res) => {
  const result = await getNotionTemplates();

  res.json(result.map((x) => x.title));
});

// Async function to get a summary of the given text based on a system message and a user message
async function getSummarywithInstructions(systemMsg, userMsg) {
  var axios = require("axios");

  let apiresult = "API Error";

  try {
    messages = [
      { role: "system", content: systemMsg },
      { role: "user", content: userMsg },
    ];

    var data = JSON.stringify({
      model: "gpt-3.5-turbo-16k",
      messages,
      temperature: 0.7,
    });

    var config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        Authorization: `Bearer ${process.env.apiKey}`,
        "Content-Type": "application/json",
      },
      data: data,
    };

    const result = await axios(config);

    apiresult = result.data.choices[0].message;
  } finally {
    return apiresult;
  }
}

// Async function to get a summary of the given text
async function getSummary(text, actas) {
  const { systemMsg, userMsg } = await getMessages(actas, text);

  return await getSummarywithInstructions(systemMsg, userMsg);
}

// Starting the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
