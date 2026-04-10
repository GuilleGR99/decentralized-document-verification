import hre from "hardhat";
import fs from "fs";

const REGISTRY_PATH = "/shared/registry.json";

async function main() {
  const { ethers } = hre;

  const Contract = await ethers.getContractFactory("DocumentRegistry");
  const contract = await Contract.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("Deployed at:", address);

  await rehydrate(contract);

  fs.writeFileSync(
    "/shared/deployed.json",
    JSON.stringify({ address }, null, 2)
  );
}

async function rehydrate(contract) {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.log("No registry found, skipping rehydration");
    return;
  }

  const cids = JSON.parse(fs.readFileSync(REGISTRY_PATH));

  console.log(`Rehydrating ${cids.length} CIDs...`);

  for (const cid of cids) {
    try {
      const tx = await contract.store(cid);
      await tx.wait();
      console.log("Rehydrated:", cid);
    } catch (e) {
      console.log("Skipped:", cid);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});