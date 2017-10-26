const PublicEmail = artifacts.require("./PublicEmail.sol");

module.exports = function(deployer) {
  deployer.deploy(PublicEmail);
};
