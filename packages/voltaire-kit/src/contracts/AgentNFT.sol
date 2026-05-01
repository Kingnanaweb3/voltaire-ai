// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentNFT — ERC-7857 minimal implementation
 * @notice Non-transferable identity NFT for autonomous agents.
 *         Designed for deployment on 0G Chain. Each token represents
 *         one agent's verifiable identity, role, and reputation.
 */
contract AgentNFT {
    struct Agent {
        address wallet;
        string role;
        bytes32 metadataHash;
        string metadataURI;
        uint256 reputationScore;
        uint256 mintedAt;
    }

    mapping(uint256 => Agent) public agents;
    mapping(address => uint256) public agentIdOf;
    uint256 public nextTokenId = 1;

    event AgentMinted(uint256 indexed tokenId, address indexed wallet, string role);
    event ReputationUpdated(uint256 indexed tokenId, uint256 newScore);

    error AlreadyRegistered();
    error InvalidSignature();
    error NotAgent();

    function mint(
        string calldata role,
        bytes32 metadataHash,
        string calldata metadataURI,
        bytes calldata signature
    ) external returns (uint256 tokenId) {
        if (agentIdOf[msg.sender] != 0) revert AlreadyRegistered();

        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", metadataHash)
        );
        if (_recover(ethHash, signature) != msg.sender) revert InvalidSignature();

        tokenId = nextTokenId++;
        agents[tokenId] = Agent({
            wallet: msg.sender,
            role: role,
            metadataHash: metadataHash,
            metadataURI: metadataURI,
            reputationScore: 0,
            mintedAt: block.timestamp
        });
        agentIdOf[msg.sender] = tokenId;

        emit AgentMinted(tokenId, msg.sender, role);
    }

    function updateReputation(uint256 tokenId, uint256 newScore) external {
        if (agents[tokenId].wallet != msg.sender) revert NotAgent();
        agents[tokenId].reputationScore = newScore;
        emit ReputationUpdated(tokenId, newScore);
    }

    function _recover(bytes32 hash, bytes memory sig) internal pure returns (address) {
        if (sig.length != 65) return address(0);
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27;
        return ecrecover(hash, v, r, s);
    }
}
