const sha3 = require('solidity-sha3').default;

const helper = require('./helper');

const PublicEmailExample = artifacts.require("./examples/PublicEmailExample.sol");

contract('PublicEmail', async (accounts) => {

  const keys = helper.generateKeys();

  it("should register a new user", async () => {
    const { publicEmail, emailStorage } = await helper.getContracts();

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
    const { publicEmail, emailStorage } = await helper.getContracts();

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

  it("should call the sendEmail function with one recepient", async () => {
    const { publicEmail, emailStorage } = await helper.getContracts();

    const mail = {
      from: accounts[0],
      to: accounts[1],
      mailHash: sha3("Some email msg"),
      threadHash: sha3("A thread hash"),
      threadId: sha3("thread_id")
    };

    try {
      await publicEmail.sendEmail([mail.to],
       mail.mailHash,
       mail.threadHash,
       mail.threadId,
       {from: accounts[0]});

      const event = emailStorage.EmailSent();
      
      event.watch((err, res) => {
        assert.deepEqual(mail, res.args);
        event.stopWatching();
      });

    } catch(err) {
      console.log(err);
    }

  });

  it("should call the sendEmail function with multiple recepients", async () => {
    const { publicEmail, emailStorage } = await helper.getContracts();

    const mail = {
      from: accounts[0],
      to: accounts,
      mailHash: sha3("Some email msg"),
      threadHash: sha3("A thread hash"),
      threadId: sha3("thread_id")
    };

    try {
      await publicEmail.sendEmail(mail.to,
       mail.mailHash,
       mail.threadHash,
       mail.threadId,
       {from: accounts[0]});

      const event = emailStorage.EmailSent();
      
      event.get((err, events) => {
        assert.equal(events.length, accounts.length, "The correct number of events where sent");
        event.stopWatching();
      });

    } catch(err) {
      console.log(err);
    }

  });

  it("should update contacts by firing an event", async () => {
      const { publicEmail, emailStorage } = await helper.getContracts();

      const data = {
        usernameHash: sha3("test@melon-mail.eth"),
        ipfsHash: sha3("ipfsHash")
      };

      try {
        await publicEmail.updateContacts(data.usernameHash, data.ipfsHash, { from: accounts[0] });

        const event = emailStorage.ContactsUpdated();
        
        event.watch((err, res) => {
          assert.deepEqual(data, res.args, "Get event with the correct data");
          event.stopWatching();
        });

      } catch(err) {
        console.log(err);
      }
    });

    it("should call the sendExternalEmail and check if events were triggered on both contracts", async () => {
      const { publicEmail, emailStorage } = await helper.getContracts();

      const publicEmailExample = await PublicEmailExample.deployed();

      const mail = {
        from: accounts[0],
        to: accounts[1],
        mailHash: sha3("Some email msg"),
        threadHash: sha3("A thread hash"),
        threadId: sha3("thread_id")
      };

      await publicEmail.sendExternalEmail(
        publicEmailExample.address,
        [mail.to],
        mail.mailHash,
        mail.threadHash,
        mail.threadId,
        {from: accounts[0]}
      );

      const storageEvent = emailStorage.EmailSent();
      
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