const cit = require("./zones");
const prof = require("./professions");

const kiki = async () => {
  console.log("yo");
};

const caller = async () => {
  for (let i = 0; i <= prof.length; i++) {
    for (let j = 0; j <= cit.length; j++) {
      await kiki();
    }
  }
};

caller();
