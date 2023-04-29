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
  res.json({ server: "up" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
