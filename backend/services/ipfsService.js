import { create } from 'ipfs-http-client';

const ipfs = create({
    url: process.env.IPFS_API || 'http://127.0.0.1:5001'
});

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

