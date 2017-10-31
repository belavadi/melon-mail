const PublicEmail = artifacts.require("./PublicEmail.sol");
const EmailStorage =  artifacts.require("./EmailStorage.sol");

const sha3 = require('solidity-sha3').default;

const helper = require('./helper');

contract('PublicEmail', async (accounts) => {

  const keys = helper.generateKeys();

  it("should register a new user", async () => {
    const publicEmail = await PublicEmail.deployed();

    const storageAddr = await publicEmail.emailStorage();
    const emailStorage = await EmailStorage.at(storageAddr);

    const encryptedUsername = helper.encrypt(keys, 'test@melon-mail.eth');

    await publicEmail.registerUser(
      sha3("test@melon-mail.eth"),
      encryptedUsername, 
      keys.publicKey,
      {from: accounts[0]});

    emailStorage.UserRegistered().watch((err, res) => {
      assert.equal(res.args.encryptedUsername, encryptedUsername, "Got the user registered event");
      return;
    });

  });

   it("should fail to register existing user", async () => {
    const publicEmail = await PublicEmail.deployed();

    const storageAddr = await publicEmail.emailStorage();
    const emailStorage = await EmailStorage.at(storageAddr);

    const encryptedUsername = helper.encrypt(keys, 'test@melon-mail.eth');

    try {
        await publicEmail.registerUser(
          sha3("test@melon-mail.eth"),
          encryptedUsername, 
          keys.publicKey,
          {from: accounts[0]});
    } catch(err) {
      assert.isTrue(err.toString().includes('invalid opcode'));
      return;
    }

  });



});