pragma solidity ^0.4.16;

contract AbstractEmail {
    function receiveExternalEmail(address to, string mailHash, string threadHash, bytes32 threadId);
}
