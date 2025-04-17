import "websocket-polyfill";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { nwc } from "@getalby/sdk";
import { RequestHandler } from "./RequestHandler";
import { LNBackend } from "../ln/LNBackend"; // Import base type

const RELAY_URL = "wss://relay.getalby.com/v1"; // TODO: Make configurable

export class WalletService {
  private _walletService: nwc.NWCWalletService;
  // No instance variables for lnBackend or requestHandler
  private _subscriptions: Map<string, { unsub: () => void }> = new Map(); // Map clientPubkey to unsub function

  constructor() {
    this._walletService = new nwc.NWCWalletService({
      relayUrl: RELAY_URL,
    });
  }

  // Subscribe for a specific app connection, providing the LN backend instance for this subscription
  async subscribe(
    clientPubkey: string,
    walletServiceSecretKey: string,
    lnBackend: LNBackend
  ) {
    if (this._subscriptions.has(clientPubkey)) {
      console.warn(`Already subscribed for client pubkey: ${clientPubkey}`);
      // Optionally return the existing unsub function or handle as needed
      return this._subscriptions.get(clientPubkey)?.unsub;
    }

    // Create a new RequestHandler specifically for this subscription
    // Ensure the provided lnBackend is initialized *before* calling this subscribe method.
    const requestHandler = new RequestHandler(lnBackend);

    try {
      await this._walletService.publishWalletServiceInfoEvent(
        walletServiceSecretKey,
        lnBackend.getSupportedMethods(),
        []
      );

      const keypair = new nwc.NWCWalletServiceKeyPair(
        walletServiceSecretKey,
        clientPubkey
      );

      // Pass the dedicated requestHandler for this subscription
      const unsub = await this._walletService.subscribe(
        keypair,
        requestHandler
      );
      console.log(`Subscribed NWC listener for client pubkey: ${clientPubkey}`);

      // Store only the unsubscribe function
      this._subscriptions.set(clientPubkey, { unsub });
      return unsub; // Return the unsub function for the caller
    } catch (error) {
      console.error(
        `Failed to subscribe for client pubkey ${clientPubkey}:`,
        error
      );
      throw error; // Re-throw to signal failure
    }
  }

  unsubscribe(clientPubkey: string) {
    const subscription = this._subscriptions.get(clientPubkey);
    if (subscription) {
      try {
        subscription.unsub();
      } catch (error) {
        console.error(
          `Error during NWC unsubscribe for ${clientPubkey}:`,
          error
        );
      }
      this._subscriptions.delete(clientPubkey);
      console.log(
        `Unsubscribed NWC listener for client pubkey: ${clientPubkey}`
      );
    } else {
      console.warn(
        `No active subscription found for client pubkey: ${clientPubkey}`
      );
    }
  }
}
