const { ethers } = require("hardhat");
require("dotenv").config({ path: ".env" });
const { FEE, VRF_COORDINATOR, LINK_TOKEN, KEY_HASH } = require("../constants");


async function main() {

  const rwgContract = await ethers.getContractFactory("RandomWinnerGame");
  const deployedRwgContract = await rwgContract.deploy(VRF_COORDINATOR,
    LINK_TOKEN,
    FEE,
    KEY_HASH
  );
  await deployedRwgContract.deployed();

  console.log("deployedRwgContract deployed to: ", deployedRwgContract.address);

  console.log("Sleeping.....");
  // Wait for etherscan to notice that the contract has been deployed
  await sleep(30_000);

  // Verify the contract after deploying
  await hre.run("verify:verify", {
    address: deployedRwgContract.address,
    constructorArguments: [VRF_COORDINATOR, LINK_TOKEN, FEE, KEY_HASH],
  })

}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
