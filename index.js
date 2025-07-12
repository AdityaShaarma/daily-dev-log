import jsonfile from "jsonfile";
import moment from "moment";
import simpleGit from "simple-git";
import random from "random";

const path = "./data.json";
const git = simpleGit();

const markCommit = async (weekOffset, dayOffset) => {
  const date = moment()
    .subtract(1, "year")
    .add(1, "day")
    .add(weekOffset, "weeks")
    .add(dayOffset, "days")
    .format();

  const data = { date };
  const message = `Commit on ${date} - ${random.int(1, 1000)}`;

  await jsonfile.writeFile(path, data);
  await git.add([path]);
  await git.commit(message, { "--date": date });
};

const makeCommits = async (n) => {
  for (let i = 0; i < n; i++) {
    const week = random.int(0, 51);  // 52 weeks in a year
    const day = random.int(0, 6);    // 0=Sunday, 6=Saturday
    await markCommit(week, day);
  }

  await git.push();
};

makeCommits(200);