pragma solidity ^0.4.16;

contract Email {
    mapping (bytes32 => address) usernameToAddress;

    event BroadcastPublicKey(bytes32 indexed username, address indexed addr, string publicKey);
    event SendEmail(address indexed from, address indexed to, string mailHash, string threadHash, bytes32 indexed threadId);
    event UpdateContacts(address indexed usernameHash, string contactsHash);

    function registerUser(bytes32 username, string publicKey, string welcomeMailHash, string welcomeMailThreadHash) returns (bool) {
        if(usernameToAddress[username] != 0) {
            revert();
        }

        usernameToAddress[username] = msg.sender;

        BroadcastPublicKey(username, msg.sender, publicKey);
        SendEmail(msg.sender, msg.sender, welcomeMailHash, welcomeMailThreadHash, 0);

        return true;
    }

    function sendEmail(address to, string mailHash, string threadHash, bytes32 threadId) returns (bool result) {
        SendEmail(msg.sender, to, mailHash, threadHash, threadId);

        return true;
    }

    function updateContacts(address usernameHash, string contactsHash) {
        UpdateContacts(usernameHash, contactsHash);
    }
}
