import "@nomicfoundation/hardhat-ethers";

export default {
  solidity: "0.8.20",
  defaultNetwork: "localhost",
  networks: {
    localhost: {
      url: "http://hardhat-node:8545"
    }
  }
};

