import puppeteer from "puppeteer";
import fsPromises from "fs/promises";

async function scrapeLeetcodeProblems() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/114.0.5735.199 Safari/537.36"
  );

  await page.goto("https://leetcode.com/problemset/", {
    waitUntil: "domcontentloaded",
  });

  const problemSelector =
    "a.group.flex.flex-col.rounded-\\[8px\\].duration-300";

  let allProblems = [];
  let prevCount = 0;
  const TARGET = 100;

  while (allProblems.length < TARGET) {
    await page.evaluate((sel) => {
      const currProblemsOnPage = document.querySelectorAll(sel);

      if (currProblemsOnPage.length) {
        currProblemsOnPage[currProblemsOnPage.length - 1].scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    }, problemSelector);

    await page.waitForFunction(
      (sel, prev) => document.querySelectorAll(sel).length > prev,
      {},
      problemSelector,
      prevCount
    );

    allProblems = await page.evaluate((sel) => {
      const nodes = Array.from(document.querySelectorAll(sel));

      return nodes.map((el) => ({
        title: el
          .querySelector(".ellipsis.line-clamp-1")
          ?.textContent.trim()
          .split(". ")[1],
        url: el.href,
      }));
    }, problemSelector);

    prevCount = allProblems.length;
  }

  const problemsWithDescriptions = [];

  for (let i = 0; i < 5; i++) {
    const { title, url } = allProblems[i];

    const problemPage = await browser.newPage();

    try {
      await problemPage.goto(url);

      let description = await problemPage.evaluate(() => {
        const descriptionDiv = document.querySelector(
          'div.elfjS[data-track-load="description_content"]'
        );

        const paragraphs = descriptionDiv.querySelectorAll("p");

        let collectedDescription = [];
        for (const p of paragraphs) {
          if (p.innerHTML.trim() === "&nbsp;") {
            break;
          }
          collectedDescription.push(p.innerText.trim());
        }

        return collectedDescription.filter((text) => text !== "").join(" ");
      });

      problemsWithDescriptions.push({ title, url, description });
    } catch (err) {
      console.error(`Error fetching description for ${title} (${url}):`, err);
    } finally {
      await problemPage.close();
    }
  }

  await fsPromises.mkdir("./problems", { recursive: true });

  await fsPromises.writeFile(
    "./problems/leetcode_problems.json",
    JSON.stringify(problemsWithDescriptions, null, 2)
  );

  await browser.close();
}

async function scrapeCodeforcesProblems() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/114.0.5735.199 Safari/537.36"
  );

  const problems = [];
  const TARGET = 1;

  for (let i = 0; i <= TARGET; i++) {
    const url = `https://codeforces.com/problemset/page/${i}`;

    await page.goto(url, { waitUntil: "domcontentloaded" });

    const problemSelector =
      "table.problems tr td:nth-of-type(2) > div:first-of-type > a";

    const links = await page.evaluate((sel) => {
      const anchors = document.querySelectorAll(sel);

      return Array.from(anchors).map((a) => a.href);
    }, problemSelector);

    for (let i = 0; i < 5; i++) {
      const link = links[i];

      try {
        await page.goto(link, { waitUntil: "domcontentloaded" });

        const { title, description } = await page.evaluate(() => {
          const title = document
            .querySelector(".problem-statement .title")
            .textContent.split(". ")[1];

          const description = document.querySelector(
            ".problem-statement > div:nth-of-type(2)"
          ).textContent;

          return { title, description };
        });

        problems.push({
          title,
          url: link,
          description,
        });
      } catch (err) {
        console.warn(`❌ Failed to scrape ${link}: ${err.message}`);
      }
    }
  }

  await fsPromises.mkdir("./problems", { recursive: true });

  await fsPromises.writeFile(
    "./problems/codeforces_problems.json",
    JSON.stringify(problems, null, 2)
  );

  await browser.close();
}

scrapeCodeforcesProblems();

scrapeLeetcodeProblems();
