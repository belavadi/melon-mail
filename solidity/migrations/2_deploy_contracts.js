const PublicEmail = artifacts.require("./PublicEmail.sol");
const EmalStorage = artifacts.require("./EmailStorage.sol");
const PublicEmailExample = artifacts.require("./examples/PublicEmailExample.sol");

module.exports = function(deployer) {
  deployer.deploy(PublicEmail);
  deployer.deploy(EmalStorage);
  deployer.deploy(PublicEmailExample);
};
