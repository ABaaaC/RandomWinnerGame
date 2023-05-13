require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env" });

const API_ALCHEMY_MUMBAI = process.env.API_ALCHEMY_MUMBAI;
const PRIV_KEY = process.env.PRIV_KEY;
const POLYGONSCAN_KEY = process.env.POLYGONSCAN_KEY;


// /** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    mumbai: {
      url: "https://polygon-mumbai.g.alchemy.com/v2/" + API_ALCHEMY_MUMBAI,
      accounts: [PRIV_KEY],
    }
  },
  etherscan: {
    apiKey: {
      polygonMumbai: POLYGONSCAN_KEY,
    }
  }
};