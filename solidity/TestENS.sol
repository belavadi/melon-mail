pragma solidity ^0.4.0;

/**
 * This is contract for testing ens resolvers without need to deploy registars.
 * Just use 0x9c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664fb9a3cb658 as node.
 * Owner of that node is 0xca35b7d915458ef540ade6068dfe2f44e8fa733c, but you can change that to any other ethereum address.
 * Owner of any other node is 0x0. 
 */

contract TestENS {
    function owner(bytes32 node) constant returns(address) {
        if (node == sha3("test")) {
            return 0xca35b7d915458ef540ade6068dfe2f44e8fa733c;
        } else {
            return 0x0;
        }
    }
    function resolver(bytes32 node) constant returns(address) {}
    function ttl(bytes32 node) constant returns(uint64) {}
    function setOwner(bytes32 node, address owner) {}
    function setSubnodeOwner(bytes32 node, bytes32 label, address owner) {}
    function setResolver(bytes32 node, address resolver) {}
    function setTTL(bytes32 node, uint64 ttl) {}

    // Logged when the owner of a node assigns a new owner to a subnode.
    event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner);

    // Logged when the owner of a node transfers ownership to a new account.
    event Transfer(bytes32 indexed node, address owner);

    // Logged when the resolver for a node changes.
    event NewResolver(bytes32 indexed node, address resolver);

    // Logged when the TTL of a node changes
    event NewTTL(bytes32 indexed node, uint64 ttl);
}
