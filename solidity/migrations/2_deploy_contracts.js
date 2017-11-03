const PublicEmail = artifacts.require("./PublicEmail.sol");
const EmalStorage = artifacts.require("./EmailStorage.sol");
const PublicEmailExample = artifacts.require("./examples/PublicEmailExample.sol");

module.exports = function(deployer, network) {
  if(network === 'kovan') {
    deployer.deploy(PublicEmail);
  } else {
    deployer.deploy(PublicEmail);
    deployer.deploy(EmalStorage);
    deployer.deploy(PublicEmailExample);
  }
};
