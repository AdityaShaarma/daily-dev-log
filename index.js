import fs from "fs/promises";
import moment from "moment";
import simpleGit from "simple-git";

const DATA_PATH = "./data.json";
const startDate = moment("2025-08-01T00:00:00");
const endDate = moment("2026-09-21T00:00:00");
const targetCommits = 180;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const buildDateSequence = () => {
  const candidateDates = [];
  const totalDays = endDate.diff(startDate, "days") + 1;
  let recentActiveDays = 0;
  let recentInactiveDays = 0;

  const monthActivity = [
    0.06, 0.09, 0.14, 0.2, 0.28, 0.38, 0.5, 0.42, 0.36, 0.22, 0.12, 0.08,
  ];

  for (let day = 0; day < totalDays; day += 1) {
    const date = startDate.clone().add(day, "days");
    const isWeekend = date.day() === 0 || date.day() === 6;
    const seasonalBias = monthActivity[date.month()] ?? 0.12;
    const weekdayBias = isWeekend ? 0.18 : 0.7;
    const streakBoost = recentActiveDays >= 2 ? 0.22 : 0;
    const downtimePenalty = recentInactiveDays >= 4 ? 0.26 : 0;
    const chance = clamp(seasonalBias * weekdayBias + streakBoost - downtimePenalty, 0.03, 0.82);
    const isActive = Math.random() < chance;

    if (isActive) {
      const burstBonus = Math.random() < 0.2 ? 2 : 0;
      const commitsForDay = 1 + randomInt(0, 2) + burstBonus;

      for (let count = 0; count < commitsForDay; count += 1) {
        const commitTime = date
          .clone()
          .hour(randomInt(8, 19))
          .minute(randomInt(0, 59))
          .second(randomInt(0, 59))
          .millisecond(0);

        candidateDates.push(commitTime);
      }

      recentActiveDays += 1;
      recentInactiveDays = 0;
    } else {
      recentInactiveDays += 1;
      recentActiveDays = 0;
    }
  }

  const ordered = candidateDates.sort((a, b) => a.valueOf() - b.valueOf());
  const selected = [];

  while (selected.length < targetCommits && ordered.length > 0) {
    const index = Math.floor(Math.random() * ordered.length);
    selected.push(ordered.splice(index, 1)[0]);
  }

  return selected.sort((a, b) => a.valueOf() - b.valueOf());
};

const ensureGitIdentity = async (git) => {
  try {
    await git.addConfig("user.name", "Aditya Sharma");
    await git.addConfig("user.email", "adi32556@gmail.com");
  } catch (error) {
    console.warn("git config not set; continuing with local defaults");
  }
};

const writeCommitLog = async (date) => {
  const payload = {
    date: date.format(),
    message: `build ${date.format("YYYY-MM-DD")}`,
  };

  await fs.writeFile(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const makeCommits = async () => {
  const git = simpleGit();
  const dates = buildDateSequence();

  await ensureGitIdentity(git);

  for (const date of dates) {
    const isoDate = date.format();
    await writeCommitLog(date);
    await git.add(DATA_PATH);
    await git.commit(`build ${date.format("YYYY-MM-DD")}`, { "--date": isoDate });
  }

  const count = await git.revList(["--count", "HEAD"]);
  console.log(`generated ${count} total commits`);
};

makeCommits().catch((error) => {
  console.error("failed to generate commit history:", error.message);
  process.exit(1);
});
