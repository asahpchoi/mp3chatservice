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

app.post("/upload", upload.single("file"), async (req, res, next) => {
  const file = req.file;
  if (!file) {
    const error = new Error("Please upload a file");
    error.httpStatusCode = 400;
    return next(error);
  }

  openai
    .createTranscription(fs.createReadStream(file.path), "whisper-1")
    .catch((e) => console.log({ e }))
    .then((r) => {
      res.json({ result: r.data.text });
    });
});

app.get("/", async (req, res) => {
  console.log(process.env.apiKey);
  res.json({ testing: "123", server: process.env.apiKey });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
