var app = require("express")();
var bodyParser = require('body-parser');
var now = new Date();
var filename = 'amazonoffers-' + now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate() + '.csv';

app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json());


app.get('/', function (req, res) {
  res.sendFile(__dirname + '/form2.html');
});

app.post('/', function (req, res) {
  const formurls = req.body.urls;
  const urls = formurls.split(/\r?\n|\r|\n/g);
  const Chromium = require("chrome-aws-lambda");
  const fs = require("fs");
  const { Cluster } = require('puppeteer-cluster');

  (async () => {
    const cluster = await Cluster.launch({

      concurrency: Cluster.CONCURRENCY_PAGE,
      maxConcurrency: 1,
      puppeteerOptions: {
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: true,
        ignoreHTTPSErrors: true,
      },
    });

    cluster.on('taskerror', (err, data) => {
      console.log(`Error crawling ${data}: ${err.message}`);
    });

    await cluster.task(async ({ page, data: url }) => {

      await page.goto('https://www.amazon.com/dp/' + url + '/ref=olp-opf-redir?aod=1&ie=UTF8&condition=NEW', { waitUntil: 'load' });
      await page.waitForSelector('div.a-spacing-none.a-padding-base');
      const productsHandles = await page.$$(
        "div.a-spacing-none.a-padding-base"
      );



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

        if (deliverydate !== "Null") {
          fs.appendFile(filename, results = `${url}\t${price}\t${deliverydate.replace(",", " ").replace(". Details", "").replace(" if you spend $25 on items shipped by Amazon", "")}\t${soldby.trim()}\t${feedback}\n`, function (err) {
            if (err) throw err;
          });
        }
      }


    });

    for (const url of urls) {
      await cluster.queue(url);

    }

    await cluster.idle();
    await cluster.close();

    res.send(results);

  })();
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});

module.exports = app;
