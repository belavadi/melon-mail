const PublicEmailExample = artifacts.require("./examples/PublicEmailExample.sol");
const sha3 = require('solidity-sha3').default;

const helper = require('./helper');

contract('PublicEmailExample', async (accounts) => {

    const keys = helper.generateKeys();

    it('should set the admin of the contracts for the first user', async () => {
        const publicEmailExample = await PublicEmailExample.deployed();
        const owner = accounts[0];

        await publicEmailExample.addAdmin(owner, { from: owner });

        const approved = await publicEmailExample.admins(owner);

        assert.isTrue(approved);
    });

    it('should fail to set the admin of the contracts, because the user calling isnt owner', async () => {
        const publicEmailExample = await PublicEmailExample.deployed();

        try {
            await publicEmailExample.addAdmin(accounts[1], { from: accounts[4] });            
        } catch(err) {
            assert.isTrue(err.toString().includes('invalid opcode'));
            return;
        }
    });

    it('should approve a new address to register an email', async () => {
        const publicEmailExample = await PublicEmailExample.deployed();

        await publicEmailExample.approveUser(accounts[1], { from: accounts[0] });

        const approved = await publicEmailExample.approvedAddresses(accounts[1]);

        assert.isTrue(approved);
    });

    it('should fail to approve a new address because the user calling isnt admin', async () => {
        const publicEmailExample = await PublicEmailExample.deployed();
        
        try {
            await publicEmailExample.approveUser(accounts[1], { from: accounts[3] });            
        } catch(err) {
            assert.isTrue(err.toString().includes('invalid opcode'));
            return;
        }
    });

    it('should register a new user which is approved', async () => {
        const publicEmailExample = await PublicEmailExample.deployed();
        
        const encryptedUsername = helper.encrypt(keys, 'test@custom-domain.eth');        

        await publicEmailExample.registerUser(
            sha3("test@custom-domain.eth"),
            encryptedUsername, 
            keys.publicKey,
            {from: accounts[1]});
      
        publicEmailExample.UserRegistered().watch((err, res) => {
            assert.equal(res.args.encryptedUsername, encryptedUsername, "Got the user registered event");
            return;
        });
    });

    it('should fail to register a user because he isnt approved', async () => {
        const publicEmailExample = await PublicEmailExample.deployed();
        
        const encryptedUsername = helper.encrypt(keys, 'test@custom-domain.eth');        

        try {
            await publicEmailExample.registerUser(
                sha3("test@custom-domain.eth"),
                encryptedUsername, 
                keys.publicKey,
                {from: accounts[1]});
        } catch(err) {
            assert.isTrue(err.toString().includes('invalid opcode'));
            return;
        }
    });

    it('should remove the user from the list of admins', async () => {
        const publicEmailExample = await PublicEmailExample.deployed();
        
        const encryptedUsername = helper.encrypt(keys, 'test@custom-domain.eth');   

        await publicEmailExample.removeAdmin(accounts[0], {from: accounts[0]});

        const isAdmin = await publicEmailExample.admins(accounts[0]);

        assert.isFalse(isAdmin);
    });

});