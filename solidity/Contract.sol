pragma solidity ^0.4.16;

contract mortal {
    address public administrator;

    function mortal() {
        administrator = msg.sender;
    }

    function withdraw() {
        if (msg.sender == administrator) {
            while(!administrator.send(this.balance)){}
        }
    }

    function kill() {
        selfdestruct(administrator);
    }
}

contract Email is mortal {
    mapping (bytes32 => address) usernameToAddress;

    event BroadcastPublicKey(bytes32 indexed username, address indexed addr, string publicKey);
    event SendEmail(address indexed from, address indexed to, string mailHash, string threadHash, string threadId);

    function registerUser(bytes32 username, string publicKey) returns (bool) {
        if(usernameToAddress[username] != 0) {
            revert();
        }

        usernameToAddress[username] = msg.sender;

        BroadcastPublicKey(username, msg.sender, publicKey);

        return true;
    }

    function sendEmail(address to, string mailHash, string threadHash, string threadId) returns (bool result) {
        SendEmail(msg.sender, to, mailHash, threadHash, threadId);

        return true;
    }
}