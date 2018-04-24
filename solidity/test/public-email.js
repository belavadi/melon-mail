const keccak256 = require('ethers').utils.keccak256;
const toUtf8Bytes = require('ethers').utils.toUtf8Bytes;
const helper = require('./helper');

const PublicEmailExample = artifacts.require('./examples/PublicEmailExample.sol');
const Manager = artifacts.require('./Manager.sol');
const Relay = artifacts.require('./Relay');
const PublicEmail = artifacts.require('./PublicEmail.sol');

contract('PublicEmail', async (accounts) => {

  const keys = helper.generateKeys();
  let publicEmailProxy;

  before(async () => {
    const manager = await Manager.deployed();
    const publicEmail = await PublicEmail.deployed();

    await manager.setActiveContract(publicEmail.address);

    const relay = await Relay.new(manager.address);

    publicEmailProxy = await PublicEmail.at(relay.address);
  });

  it('should register a new user', async () => {
    const encryptedUsername = helper.encrypt(keys, 'test@melon-mail.eth');

    await publicEmailProxy.registerUser(
      keccak256(toUtf8Bytes('test@melon-mail.eth')),
      encryptedUsername,
      keys.publicKey,
      { from: accounts[0] });

    publicEmailProxy.UserRegistered().watch((err, res) => {
      assert.equal(res.args.encryptedUsername, encryptedUsername, 'Got the user registered event');
      return;
    });

  });

  it('should fail to register existing user', async () => {
    const encryptedUsername = helper.encrypt(keys, 'test@melon-mail.eth');

    try {
      await publicEmailProxy.registerUser(
        keccak256(toUtf8Bytes('test@melon-mail.eth')),
        encryptedUsername,
        keys.publicKey,
        { from: accounts[0] });
    } catch (err) {
      assert.isTrue(err.toString().includes('revert'));
      return;
    }
  });

  it('should call the sendEmail function with one recepient', async () => {
    const mail = {
      from: accounts[0],
      to: accounts[1],
      mailHash: keccak256(toUtf8Bytes('Some email msg')),
      threadHash: keccak256(toUtf8Bytes('A thread hash')),
      threadId: keccak256(toUtf8Bytes('thread_id')),
    };

    try {
      await publicEmailProxy.sendEmail([mail.to],
        mail.mailHash,
        mail.threadHash,
        mail.threadId,
        { from: accounts[0] });

      const event = publicEmailProxy.EmailSent();

      event.watch((err, res) => {
        assert.deepEqual(mail, res.args);
        event.stopWatching();
      });

    } catch (err) {
      console.log(err);
    }

  });

  it('should call the sendEmail function with multiple recepients', async () => {
    const mail = {
      from: accounts[0],
      to: accounts,
      mailHash: keccak256(toUtf8Bytes('Some email msg')),
      threadHash: keccak256(toUtf8Bytes('A thread hash')),
      threadId: keccak256(toUtf8Bytes('thread_id')),
    };

    try {
      await publicEmailProxy.sendEmail(mail.to,
        mail.mailHash,
        mail.threadHash,
        mail.threadId,
        { from: mail.from });

      const event = publicEmailProxy.EmailSent();

      event.get((err, events) => {
        assert.equal(events.length, accounts.length, 'The correct number of events where sent');
        event.stopWatching();
      });

    } catch (err) {
      console.log(err);
    }

  });

  it('should update contacts by firing an event', async () => {
    const data = {
      usernameHash: keccak256(toUtf8Bytes('test@melon-mail.eth')),
      fileHash: keccak256(toUtf8Bytes('ipfsHash'))
    };

    try {
      await publicEmailProxy.updateContacts(data.usernameHash, data.ipfsHash, { from: accounts[0] });

      const event = publicEmailProxy.ContactsUpdated();

      event.watch((err, res) => {
        assert.deepEqual(data, res.args, 'Get event with the correct data');
        event.stopWatching();
      });

    } catch (err) {
      console.log(err);
    }
  });

  it('should call the sendExternalEmail and check if events were triggered on both contracts', async () => {
    const publicEmailExample = await PublicEmailExample.deployed();

    const mail = {
      from: accounts[0],
      to: accounts[1],
      mailHash: keccak256(toUtf8Bytes('Some email msg')),
      threadHash: keccak256(toUtf8Bytes('A thread hash')),
      threadId: keccak256(toUtf8Bytes('thread_id'))
    };

    await publicEmailProxy.sendExternalEmail(
      publicEmailExample.address,
      [mail.to],
      mail.mailHash,
      mail.threadHash,
      mail.threadId,
      { from: accounts[0] }
    );

    const storageEvent = publicEmailProxy.EmailSent();

    storageEvent.watch((err, res) => {
      if (res) {
        assert.deepEqual(mail, res.args);
        storageEvent.stopWatching();

        const emailExampleEvent = publicEmailExample.EmailSent();

        emailExampleEvent.watch((err, res) => {
          if (res) {
            assert.deepEqual(mail, res.args);
            emailExampleEvent.stopWatching();
          }
        });
      }
    });

  });

});