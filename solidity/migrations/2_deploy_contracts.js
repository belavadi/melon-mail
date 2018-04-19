const PublicEmail = artifacts.require("./PublicEmail.sol");
const PublicEmailExample = artifacts.require("./examples/PublicEmailExample.sol");

const Manager = artifacts.require("./Manager.sol");
const Relay = artifacts.require("./Relay");

module.exports = function(deployer, network) {
  if(network === 'kovan') {
    deployer.deploy(PublicEmail);
  } else {
    deployer.deploy(Manager).then(() => {
      return deployer.deploy(Relay, Manager.address);
    });

    deployer.deploy(PublicEmail);
    deployer.deploy(PublicEmailExample);
  }
};
