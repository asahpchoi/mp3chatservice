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
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

async function getTranscription(file) {
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

app.post("/getSummary", async (req, res) => {
  let summmary = null;
  console.log(req.body);

  summary = await getSummary(req.body.transcript, req.body.actas);

  res.json({ summary });
});

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

app.get("/", async (req, res) => {
  const test = await getMessages(
    "act as an assistant to take note",
    "hello world"
  );
  //console.log(test);

  res.json({ server: "up" });
});

async function getMessages(action, text) {
  const templates = await getMessageTemplates();
  const msgs = templates.filter((x) => x[0] === action);
  //console.log({ msgs });
  const result = {
    systemMsg: msgs[0][1],
    userMsg: msgs[0][2].replace("${text}", text),
  };

  return result;
}

app.get("/getMessageList", async (req, res) => {
  try {
    const result = await getMessageTemplates();
    res.json(result.map((x) => x[0]));
  } catch (error) {
    res.json({ message: "error" });
  }
});

async function getMessageTemplates() {
  const axios = require("axios");
  const url =
    "https://sheets.googleapis.com/v4/spreadsheets/1ojEnp8fsHmX-TMmIBaBowAxPfNwjZEZRfjS8R3a__Ys/values/Sheet1?key=AIzaSyCwJ7emYea23StNGIYTXlyY_E1Hm-pcsxo";
  const msgs = await axios.get(url);
  return msgs.data.values;
}

async function getSummarywithInstructions(systemMsg, userMsg) {
  var axios = require("axios");

  messages = [
    { role: "system", content: systemMsg },
    { role: "user", content: userMsg },
  ];

  //console.log({ messages });

  var data = JSON.stringify({
    model: "gpt-3.5-turbo",
    messages,
    temperature: 0.5,
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

async function getSummary(text, actas) {
  const { systemMsg, userMsg } = await getMessages(actas, text);

  return await getSummarywithInstructions(systemMsg, userMsg);
}

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
