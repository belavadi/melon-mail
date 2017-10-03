pragma solidity ^0.4.16;

contract Email {
    mapping (bytes32 => address) public usernameHashToAddress;
    mapping (address => string) public addressToEncryptedUsername;

    event BroadcastPublicKey(bytes32 indexed usernameHash, address indexed addr, string publicKey);

    event SendEmail(address indexed from, address indexed to, string mailHash, string threadHash, bytes32 indexed threadId);
    
    function registerUser(bytes32 usernameHash, string encryptedUsername, string publicKey, string welcomeMailHash, string welcomeMailThreadHash) returns (bool) {
        if(usernameHashToAddress[usernameHash] != 0x0) {
            return false;
        }

        usernameHashToAddress[usernameHash] = msg.sender;
        addressToEncryptedUsername[msg.sender] = encryptedUsername;

        BroadcastPublicKey(usernameHash, msg.sender, publicKey);
        SendEmail(msg.sender, msg.sender, welcomeMailHash, welcomeMailThreadHash, 0);

        return true;
    }

    function internalEmail(address to, string mailHash, string threadHash, bytes32 threadId) {
        SendEmail(msg.sender, to, mailHash, threadHash, threadId);
    }

    function externalEmail(Email contractAddress, address from, address to, string mailHash, string threadHash, bytes32 threadId) {
        Email mailContract = contractAddress;

        SendEmail(msg.sender, to, mailHash, threadHash, threadId);
        mailContract.internalEmail(to, mailHash, threadHash, threadId);
    }
}
