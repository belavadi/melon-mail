const PublicEmail = artifacts.require("./PublicEmail.sol");
const EmalStorage = artifacts.require("./EmailStorage.sol");

const ExternalPublicEmail = artifacts.require("./PublicEmail.sol");

module.exports = function(deployer) {
  deployer.deploy(PublicEmail);
  deployer.deploy(EmalStorage);
  deployer.deploy(ExternalPublicEmail);
};
