const puppeteer = require("puppeteer");
const ObjectsToCsv = require("objects-to-csv");
const professions = require("./professions");
const zones = require("./zones");

let pageGoal = 1;

const mainFunc = async (profession = "Infirmier", city = "Paris") => {
  let tempProf = profession;
  let tempCity = city;
  let content = "";
  //launch browser
  const browser = await puppeteer.launch({
    headless: true,
    // args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  try {
    // set user agent
    const userAgent = await page.evaluate(() => navigator.userAgent);
    page.setUserAgent(userAgent);

    await page.goto(`http://annuairesante.ameli.fr/`, {
      waitUntil: "networkidle2",
      timeout: 0,
    });

    await page.waitForSelector("#buttonPS");
    const startButton = await page.$("#buttonPS");
    await startButton.click();

    await delay(2000);

    await page.focus("#formPro");
    await page.keyboard.type(shortner(profession));
    await delay(2000);

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter"); // Enter Key

    await page.focus("#formOu");
    await page.keyboard.type(shortner(city));

    await delay(3000);

    await page.waitForSelector("span.input.autocompleteContainer");
    const isRes = await page.$("span.input.autocompleteContainer");
    if (isRes) {
      content = await page.evaluate((name) => name.innerText, isRes);
    }

    if (content.includes("No search") || content == "") {
      console.log(`No results for ${city}`);
      await browser.close();
      return;
    }

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter"); // Enter Key

    const searchButton = await page.$("input[type=submit]");

    await searchButton.click({
      waitUntil: "load",
      // Remove the timeout
      timeout: 0,
    });

    await loopPages(page, profession, city);

    await browser.close();
  } catch (error) {
    console.error(error);
    await browser.close();
    await mainFunc(tempProf, tempCity);
  }
};

const loopPages = async (page, profession, city) => {
  console.log("loopPages called");
  let allPros = [];
  //get page goal
  await delay(3000);

  const goal = await page.$("div.pagination");
  if (goal) {
    rawGoal = await page.evaluate((goal) => goal.innerText, goal);
    pageGoal = Number(rawGoal.match(/\d+/)[0]);
  }

  console.log(pageGoal);

  for (let i = 0; i <= pageGoal; i++) {
    console.log(`this page n ${i + 1} in ${profession}`);
    const pros = await CircleList(page, city);
    const csv = new ObjectsToCsv(pros);
    // Save to file:
    await csv.toDisk(`./${profession}.csv`, { append: true });
    // allPros = allPros.concat(pros);

    const nextButton = await page.$("input + a");

    if (nextButton) {
      await nextButton.click({
        waitUntil: "load",
        // Remove the timeout
        timeout: 0,
      });
    }

    await delay(3000);
    if (i == pageGoal) {
      console.log(`this is the last page`);
      const pros = await CircleList(page, city);
      allPros = allPros.concat(pros);
    }
  }

  //   console.log(allPros);

  return true;
};

const CircleList = async (page, city2) => {
  console.log("CircleList called");
  const profs = [];
  await page.waitForSelector(".item-professionnel");
  const handleArray = await page.$$(".item-professionnel");

  for (const content of handleArray) {
    let profTel = "";
    let profAdd = "";
    let profName = "";
    let city = "";
    let postalCode = "";

    const name = await content.$("div.nom_pictos");
    if (name) {
      profName = await page.evaluate((name) => name.innerText, name);
    }

    const tel = await content.$("div.item.left.tel");
    if (tel) {
      profTel = await page.evaluate((tel) => tel.innerText, tel);
    }

    const add = await content.$("div.item.left.adresse");
    if (add) {
      rawAdd = await page.evaluate((add) => add.innerText, add);
      [postalCode, city, profAdd] = getAddPostalAndCity(rawAdd.trim());
    }

    profs.push({
      name: profName,
      telephone: profTel,
      address: profAdd,
      city: city,
      postalCode: postalCode,
      zone: city2,
    });
  }

  return profs;
};

//HELPERS
const delay = (time) => {
  //simple helper to pause code execution
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
};

const shortner = (str) => {
  const splitted = str.split("");
  splitted.length = splitted.length - 1;

  return splitted.join("");
};

const getAddPostalAndCity = (address) => {
  const divided = address.split("\n");
  const cityandPost = divided[divided.length - 1];
  const [postalCode, ...rest] = cityandPost.split(" ");
  const city = rest.join(" ");
  divided.length = divided.length - 1;
  const adresse = divided.join(" ");

  return [postalCode, city, adresse];
};

const caller = async () => {
  for (let i = 0; i <= professions.length; i++) {
    for (let j = 0; j <= zones.length; j++) {
      console.log(
        `${professions[i]} : Actuellement dans la zone de ${zones[j]}`
      );
      await mainFunc(professions[i], zones[j]);
    }
  }
};

caller();
