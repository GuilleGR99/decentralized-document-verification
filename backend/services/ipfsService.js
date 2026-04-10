import { create } from 'ipfs-http-client';
import fs from "fs";

const ipfs = create({ url: "http://ipfs:5001" })
const REGISTRY_PATH = "/shared/registry.json";

export async function uploadToIPFS(fileBuffer) {
    const result = await ipfs.add(fileBuffer, {
        pin: true
    });

    return {
        cid: result.cid.toString(),
        size: result.size
    };
}

export async function getFromIPFS(cid) {
    const chunks = [];

    for await (const chunk of ipfs.cat(cid)) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
}

export async function existsInIPFS(cid) {
    try {
        for await (const _ of ipfs.cat(cid, { length: 1 })) {
            return true;
        }
        return true;
    } catch {
        return false;
    }
}

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) return [];
  return JSON.parse(fs.readFileSync(REGISTRY_PATH));
}

function saveRegistry(data) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2));
}

export function persistCID(cid) {
  const registry = loadRegistry();

  if (!registry.includes(cid)) {
    registry.push(cid);
    saveRegistry(registry);
  }
}

