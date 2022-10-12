var app = require("express")();
var bodyParser = require('body-parser');
var now = new Date();
var filename = 'amazonoffers-' + now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate() + '.csv';

app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json());

let chrome = {};
let puppeteer;
//let Cluster;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/form2.html');
});


app.post("/", async (req, res) => {
  let options = {};

  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    options = {
      args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    };
  }

  try {
    let browser = await puppeteer.launch(options);

    let page = await browser.newPage();
    await page.goto("https://amazon.com/dp/B09Q3N85G8");
    res.send(await page.title());
  } catch (err) {
    console.error(err);
    return null;
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});

module.exports = app;
