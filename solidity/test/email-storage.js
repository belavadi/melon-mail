const helper = require('./helper');

const sha3 = require('solidity-sha3').default;

contract('EmailStorage', async (accounts) => {

    it('should set a new username hash as a owner of the mail contract', async () => {
        const { publicEmail, emailStorage } = await helper.getContracts();

        await emailStorage.setUsernameHash(sha3("test2@melon-mail.eth"), { from: accounts[0]});

        const userHash = await emailStorage.usernameHashExists(sha3("test2@melon-mail.eth"));

        assert.isTrue(userHash);
    });

    it('should fail to set a new username hash from a random user account', async () => {
        const { publicEmail, emailStorage } = await helper.getContracts();

        try {
            await emailStorage.setUsernameHash(sha3("test2@melon-mail.eth"), { from: accounts[2]});            
        } catch(err) {
            assert.isTrue(err.toString().includes('invalid opcode'));
            return;
        }
    });

    it('should add a new owner to the list of EmailStorage owners', async () => {
        const { publicEmail, emailStorage } = await helper.getContracts();

        try {
            await emailStorage.addOwner(accounts[1], { from: accounts[0] });
            
            const isOwner = await emailStorage.owners(accounts[1]);

            assert.isTrue(isOwner);

        } catch(err) {
            console.log(err);
            return;
        }
    });

    it('should remove an owner from the list of EmailStorage owners', async () => {
        const { publicEmail, emailStorage } = await helper.getContracts();

        try {
            await emailStorage.removeOwner(accounts[1], { from: accounts[0] });
            
            const isOwner = await emailStorage.owners(accounts[1]);

            assert.isFalse(isOwner);

        } catch(err) {
            console.log(err);
            return;
        }
    });

    it('should fail to add an owner from the list of EmailStorage owners, because we are not owners', async () => {
        const { publicEmail, emailStorage } = await helper.getContracts();

        try {
            await emailStorage.addOwner(accounts[1], { from: accounts[0] });
        } catch(err) {
            assert.isTrue(err.toString().includes('invalid opcode'));
            return;
        }
    });

    it('should fail to remove an owner from the list of EmailStorage owners, because we are not owners', async () => {
        const { publicEmail, emailStorage } = await helper.getContracts();

        try {
            await emailStorage.removeOwner(accounts[1], { from: accounts[0] });
        } catch(err) {
            assert.isTrue(err.toString().includes('invalid opcode'));
            return;
        }
    });

});