const PublicEmail = artifacts.require("./PublicEmail.sol");
const EmalStorage = artifacts.require("./EmailStorage.sol");

module.exports = function(deployer) {
  deployer.deploy(PublicEmail);
  deployer.deploy(EmalStorage);
};
