import { ethers } from "ethers";
import { persistCID } from "./ipfsService.js";
import fs from "fs/promises";

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const wallet = new ethers.Wallet(privateKey, provider);

const filePath = process.env.CONTRACT_FILE;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Espera a que el nodo RPC esté disponible
async function waitForRPC(timeout = 20000) {
  const start = Date.now();

  while (true) {
    try {
      await provider.getBlockNumber();
      return;
    } catch {
      if (Date.now() - start > timeout) {
        throw new Error("Timeout waiting for RPC");
      }
      await sleep(1000);
    }
  }
}

// Espera a que exista el fichero deployed.json
async function waitForFile(path, timeout = 20000) {
  const start = Date.now();

  while (true) {
    try {
      await fs.access(path);
      return;
    } catch {
      if (Date.now() - start > timeout) {
        throw new Error("Timeout waiting for deployed.json");
      }
      await sleep(500);
    }
  }
}

// Espera a que el contrato esté realmente desplegado
async function waitForContract(address, timeout = 20000) {
  const start = Date.now();

  while (true) {
    try {
      const code = await provider.getCode(address);

      if (code !== "0x") return;
    } catch {
    }

    if (Date.now() - start > timeout) {
      throw new Error("Timeout waiting for contract deployment");
    }

    await sleep(500);
  }
}

// Inicialización controlada
async function initContract() {
  await waitForRPC();        
  await waitForFile(filePath);

  const { address } = JSON.parse(await fs.readFile(filePath));

  console.log("Using contract:", address);

  await waitForContract(address);

  const abi = [
    "function store(string cid)",
    "function verify(string cid) view returns (bool, uint256)"
  ];

  return new ethers.Contract(address, abi, wallet);
}

const contractPromise = initContract();

export async function storeCID(cid) {
  try {
    const contract = await contractPromise;

    const tx = await contract.store(cid);
    await tx.wait();
    persistCID(cid); // permite la persistencia del CID en el volumen
    return true;
  } catch (error) {
    console.log("STORE ERROR:", error.message);
    return false;
  }
}

export async function verifyCID(cid) {
  try {
    const contract = await contractPromise;

    return await contract.verify(cid);
  } catch (error) {
    if (error.message.includes("Already exists")) {
      return { status: "duplicate" };
    }
    
    console.log("VERIFY ERROR:", error.message);
    return [false, 0];
  }
}