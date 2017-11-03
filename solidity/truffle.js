const HDWalletProvider = require("truffle-hdwallet-provider");

const mnemonic = process.env.MNEMONIC;

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    kovan: {
      provider: new HDWalletProvider(mnemonic, "https://kovan.infura.io/"),
      network_id: 42,
      // host: "localhost",
      // port: 8545
    }
  }
};
