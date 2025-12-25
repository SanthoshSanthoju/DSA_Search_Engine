import fsPromises from "fs/promises";
import path from "path";

async function mergeProblemData() {
  const codeforcesPath = path.resolve("./problems/codeforces_problems.json");
  const leetcodePath = path.resolve("./problems/leetcode_problems.json");

  const codeforcesData = JSON.parse(
    await fsPromises.readFile(codeforcesPath, "utf-8")
  );
  const leetcodeData = JSON.parse(
    await fsPromises.readFile(leetcodePath, "utf-8")
  );

  const combined = [...codeforcesData, ...leetcodeData];

  await fsPromises.mkdir("./corpus", { recursive: true });

  await fsPromises.writeFile(
    "./corpus/all_problems.json",
    JSON.stringify(combined, null, 2)
  );
}

mergeProblemData();
