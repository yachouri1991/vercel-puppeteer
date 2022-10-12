var app = require("express")();
var bodyParser = require('body-parser');
var now = new Date();
var filename = 'amazonoffers-' + now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate() + '.csv';

app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json());

let chrome = {};
let puppeteer;

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
            headless: false,
            ignoreHTTPSErrors: true,
        };
    }

    try {
        const formurls = req.body.urls;
        const urls = formurls.split(/\r?\n|\r|\n/g);

        let browser = await puppeteer.launch(options);
        let page = await browser.newPage();
        await page.goto('https://www.amazon.com/dp/' + urls, { waitUntil: 'load' });
        await page.waitForSelector('#productTitle');

        const elementSelector = '#productTitle';
        const text = await page.$eval(elementSelector, (uiElement) => {
          return uiElement.textContent;
        });
        
    res.send(text);
  } catch (err) {
    console.error(err);
    return null;
}
});

app.listen(3000, () => {
    console.log("Server started");
});

module.exports = app;
