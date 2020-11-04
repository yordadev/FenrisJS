const puppeteer = require("puppeteer");
const fs = require("fs");
const URL = require("url-parse");

if (process.argv[2] == undefined) {
  console.log("no domain identified.");
  process.exit();
}

(async () => {
  async function run() {
    const browser = await puppeteer.launch({ headless: true }); // default is true
    const page = await browser.newPage();
    const inputUrl = process.argv[2];
    const url = new URL(inputUrl);

    const beenTo = Array();

    await page.goto(url.href.toString());
    beenTo.push(url.href.toString());

    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a")).map((anchor) => [anchor.href])
    );

    if (!fs.existsSync("./results")) {
      fs.mkdirSync("results");
    }

    const internalFile =
      "results/" + url.hostname.toString() + "-internal-links.json";
    if (fs.existsSync(internalFile) == false) {
      fs.writeFile(internalFile, "", function (err, file) {
        if (err) throw err;
        console.log("- Inner File Created!");
      });
    }

    const externalFile =
      "results/" + url.hostname.toString() + "-external-links.json";
    if (fs.existsSync(externalFile) == false) {
      fs.writeFile(externalFile, "", function (err, file) {
        if (err) throw err;
        console.log("- Outter File Created!");
      });
    }

    for (x = 0; x < links.length; x++) {
      if (validURL(links[x])) {
        let tempUrl = new URL(links[x]);
        if (tempUrl.hostname == url.hostname) {
          if (!beenTo.includes(tempUrl.href.toString())) {
            fs.appendFileSync(internalFile, tempUrl.href.toString() + "\n");
            await collectLinks(
              page,
              links[x],
              beenTo,
              internalFile,
              externalFile
            );
          }
        } else {
          fs.appendFileSync(externalFile, links[x] + "\n");
          // dont collect external links
        }
      }
    }
    await browser.close();
  }

  await run();

  // check if it is an actual link
  function validURL(str) {
    var pattern = new RegExp(
      "^(https?:\\/\\/)?" + // protocol
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
        "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
        "(\\#[-a-z\\d_]*)?$",
      "i"
    ); // fragment locator
    return !!pattern.test(str);
  }

  async function collectLinks(page, url, beenTo, internalFile, externalFile) {
    if (!beenTo.includes(url.toString())) {
      const browser = await puppeteer.launch({ headless: true });
      url = new URL(url);
      await page.goto(url.href.toString());
      beenTo.push(url.href.toString());

      const links = await page.evaluate(() =>
        Array.from(document.querySelectorAll("a")).map((anchor) => [
          anchor.href,
        ])
      );

      for (x = 0; x < links.length; x++) {
        if (validURL(links[x])) {
          let tempUrl = new URL(links[x]);
          if (tempUrl.hostname == url.hostname) {
            if (!beenTo.includes(tempUrl.href.toString())) {
              fs.appendFileSync(internalFile, tempUrl.href.toString() + "\n");
              await collectLinks(
                page,
                links[x],
                beenTo,
                internalFile,
                externalFile
              );
            }
          } else {
            fs.appendFileSync(externalFile, tempUrl.href.toString() + "\n");
            // dont collect external links
          }
        }
      }
      await browser.close();
    }
  }
})();
