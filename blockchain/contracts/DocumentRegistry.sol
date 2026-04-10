// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DocumentRegistry {

    struct Document {
        uint256 timestamp;
    }

    mapping(string => Document) public documents;

    function store(string memory cid) public {
        require(documents[cid].timestamp == 0, "Already exists");
        documents[cid] = Document(block.timestamp);
    }

    function verify(string memory cid) public view returns (bool, uint256) {
        if (documents[cid].timestamp != 0) {
            return (true, documents[cid].timestamp);
        }
        return (false, 0);
    }
}