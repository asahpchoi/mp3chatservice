const express = require("express"),
  cors = require("cors"),
  fs = require("fs"),
  url = require("url"),
  { Configuration, OpenAIApi } = require("openai"),
  configuration = new Configuration({
    apiKey: process.env.apiKey,
  });
const openai = new OpenAIApi(configuration);
const app = express();
app.use(cors());

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

async function getTranscription(file) {
  const result = await openai.createTranscription(
    fs.createReadStream(file),
    "whisper-1"
  );
  return result.data.text;
}

async function getSummary(text) {
  var axios = require("axios");
  const systemMsg = `You are a mindreader that only speaks in Markdown.  

Example formatting:

Testing No-Code Workflow

--Summary--

This audio recording documents a test of a no-code workflow using Google Drive and a single code step to reduce calls and improve efficiency.

--Additional Info--

## Main points in the conversation

- point 1
- point 2

## Problems and Solutions

- point 1
- point 2

## Action Plan

- point 1
- point 2

## Evaluation of the converstation

- point 1
- point 2
  `;
  const userMsg = `Write a Title for the transcript that is under 15 words.

Then write: "--Summary--"

Write "Summary" as a Heading 1.

Write a summary of the provided transcript.

Then write: "--Additional Info--".

Then return a list of the main points in the provided transcript. Then return a list of action items. Then return a list of follow up questions. Then return a list of potential arguments against the transcript.

For each list, return a Heading 2 before writing the list items. Limit each list item to 100 words, and return no more than 5 points per list.

Transcript:

${text}`;

  messages = [
    { role: "system", content: systemMsg },
    { role: "user", content: userMsg },
  ];

  var data = JSON.stringify({
    model: "gpt-3.5-turbo",
    messages,
    temperature: 0.8,
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

  //console.log({ result: result.data.choices[0].message });
  return result.data.choices[0].message;
}

app.post("/upload", upload.single("file"), async (req, res, next) => {
  const file = req.file;
  if (!file) {
    const error = new Error("Please upload a file");
    error.httpStatusCode = 400;
    return next(error);
  }

  const result = await getTranscription(file.path);
  const summary = await getSummary(result);

  res.json({ result, summary });
});

app.get("/", async (req, res) => {
  res.json({ server: "up" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
