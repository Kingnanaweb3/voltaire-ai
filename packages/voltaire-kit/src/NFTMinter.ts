/**
 * NFTMinter — ERC-7857 agent identity helper.
 *
 * Prepares agent metadata for minting as a non-transferable identity NFT
 * on 0G Chain. Per ERC-7857, agent NFTs encode reputation, role, and
 * verifiable execution history.
 */

import { ethers } from 'ethers';

export interface AgentNFTMetadata {
  agentId: string;
  role: string;
  walletAddress: string;
  capabilities: string[];
  reputationScore: number;
  totalExecutions: number;
  firstSeenAt: number;
  metadataVersion: '7857-v1';
}

export interface MintRequest {
  metadata: AgentNFTMetadata;
  metadataHash: string;
  signature: string;
  metadataURI: string;
}

export class NFTMinter {
  private signer: ethers.Wallet;

  constructor(privateKey: string, provider?: ethers.Provider) {
    this.signer = new ethers.Wallet(privateKey, provider);
  }

  buildMetadata(opts: {
    agentId: string;
    role: string;
    capabilities: string[];
    reputationScore: number;
    totalExecutions: number;
    firstSeenAt: number;
  }): AgentNFTMetadata {
    return {
      agentId: opts.agentId,
      role: opts.role,
      walletAddress: this.signer.address,
      capabilities: opts.capabilities,
      reputationScore: opts.reputationScore,
      totalExecutions: opts.totalExecutions,
      firstSeenAt: opts.firstSeenAt,
      metadataVersion: '7857-v1',
    };
  }

  hashMetadata(metadata: AgentNFTMetadata): string {
    const canonical = JSON.stringify(metadata, Object.keys(metadata).sort());
    return ethers.keccak256(ethers.toUtf8Bytes(canonical));
  }

  async prepareMintRequest(
    metadata: AgentNFTMetadata,
    metadataURI: string
  ): Promise<MintRequest> {
    const metadataHash = this.hashMetadata(metadata);
    const signature = await this.signer.signMessage(ethers.getBytes(metadataHash));
    return { metadata, metadataHash, signature, metadataURI };
  }

  static verifySignature(req: MintRequest): boolean {
    try {
      const recovered = ethers.verifyMessage(
        ethers.getBytes(req.metadataHash),
        req.signature
      );
      return recovered.toLowerCase() === req.metadata.walletAddress.toLowerCase();
    } catch {
      return false;
    }
  }
}
