pragma solidity ^0.4.16;

contract Email {
    mapping (bytes32 => bool) usernameHashExists;
    
    event UserRegistered(bytes32 indexed usernameHash, address indexed addr, string encryptedUsername, string publicKey);
    event EmailSent(address indexed from, address indexed to, string mailHash, string threadHash, bytes32 indexed threadId);
    event ContactsUpdated(bytes32 indexed usernameHash, string ipfsHash);

    function registerUser(bytes32 usernameHash, string encryptedUsername, string publicKey) public {
        require(usernameHashExists[usernameHash] == false);

        usernameHashExists[usernameHash] = true;

        UserRegistered(usernameHash, msg.sender, encryptedUsername, publicKey);
    }

    function sendEmail(address to, string mailHash, string threadHash, bytes32 threadId) public {
        EmailSent(tx.origin, to, mailHash, threadHash, threadId);
    }

    function sendExternalEmail(Email externalContractAddress, address to, string mailHash, string threadHash, bytes32 threadId) public {
        Email externalEmailContract = externalContractAddress;
        externalEmailContract.sendEmail(to, mailHash, threadHash, threadId);
        
        EmailSent(msg.sender, to, mailHash, threadHash, threadId);
    }

    function updateContacts(bytes32 usernameHash, string ipfsHash) public {
        ContactsUpdated(usernameHash, ipfsHash);
    }
}
