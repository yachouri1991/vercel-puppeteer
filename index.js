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
  //Cluster = require('puppeteer-cluster');
} else {
  puppeteer = require("puppeteer");
  //Cluster = require('puppeteer-cluster');
}

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/form2.html');
});

app.post('/', function (req, res) {
  const formurls = req.body.urls;
  const urls = formurls.split(/\r?\n|\r|\n/g);
  //const { Cluster } = require('puppeteer-cluster');

  (async () => {
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
      await page.goto('https://www.amazon.com/dp/' + urls + '/ref=olp-opf-redir?aod=1&ie=UTF8&condition=NEW', { waitUntil: 'load' });

      await page.waitForSelector('div.a-spacing-none.a-padding-base');

      const productsHandles = await page.$$("div.a-spacing-none.a-padding-base");

      for (const producthandle of productsHandles) {

        let deliverydate = "Null";
        let soldby = "Null";
        let feedback = "Null";
        let price = "Null";


        try {
          deliverydate = await page.evaluate(
            (el) => el.querySelector(".a-spacing-top-micro #mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE span[data-csa-c-type]").textContent.replace(" delivery ", ",").trim(),
            producthandle
          );
        } catch (error) { }
        try {
          soldby = await page.evaluate(
            (el) => el.querySelector("#aod-offer-shipsFrom > div > div > div.a-fixed-left-grid-col.a-col-right > span").textContent.trim(),
            producthandle
          );
        } catch (error) { }
        try {
          feedback = await page.evaluate(
            (el) => el.querySelector("#aod-offer-seller-rating").textContent.replace(" positive over last 12 months", "").trim(),
            producthandle
          );
        } catch (error) { }
        try {
          price = await page.evaluate(
            (el) => el.querySelector("#aod-offer-price > div > div > div.a-fixed-left-grid-col.a-col-left").textContent.trim(),
            producthandle
          );
        } catch (error) { }

        results = `${urls}\t${price}\t${deliverydate.replace(",", " ").replace(". Details", "").replace(" if you spend $25 on items shipped by Amazon", "")}\t${soldby.trim()}\t${feedback}\n`

      }


      res.send(results);
    } catch (err) {
      console.error(err);
      return null;
    }

  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});

module.exports = app;
