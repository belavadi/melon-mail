pragma solidity ^0.4.16;

contract Email {
    mapping (bytes32 => address) public usernameHashToAddress;
    mapping (address => string) public addressToEncryptedUsername;

    event BroadcastPublicKey(bytes32 indexed usernameHash, address indexed addr, string publicKey);

    event SendEmail(address indexed from, address indexed to, string mailHash, string threadHash, bytes32 indexed threadId);
    
    event UpdateContacts(bytes32 indexed usernameHash, string ipfsHash);

    function registerUser(bytes32 usernameHash, string encryptedUsername, string publicKey) public {
        require(usernameHashToAddress[usernameHash] == 0x0);

        usernameHashToAddress[usernameHash] = msg.sender;
        addressToEncryptedUsername[msg.sender] = encryptedUsername;

        BroadcastPublicKey(usernameHash, msg.sender, publicKey);
    }

    function internalEmail(address to, string mailHash, string threadHash, bytes32 threadId) public {
        SendEmail(msg.sender, to, mailHash, threadHash, threadId);
    }

    function externalEmail(Email contractAddress, address to, string mailHash, string threadHash, bytes32 threadId) public {
        Email mailContract = contractAddress;

        SendEmail(msg.sender, to, mailHash, threadHash, threadId);
        mailContract.internalEmail(to, mailHash, threadHash, threadId);
    }

    function updateContacts(bytes32 usernameHash, string ipfsHash) public {
        UpdateContacts(usernameHash, ipfsHash);
    }
}