import "websocket-polyfill";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { nwc } from "@getalby/sdk";
import { RequestHandler } from "./request_handler";

// TODO: remove hard-coded values and subscribe to actual connections
const walletServiceSecretKey = bytesToHex(generateSecretKey());
const walletServicePubkey = getPublicKey(hexToBytes(walletServiceSecretKey));

const clientSecretKey = bytesToHex(generateSecretKey());
const clientPubkey = getPublicKey(hexToBytes(clientSecretKey));
const relayUrl = "wss://relay.getalby.com/v1";
const nwcUrl = `nostr+walletconnect://${walletServicePubkey}?relay=${relayUrl}&secret=${clientSecretKey}`;
console.info("enter this NWC URL in a client: ", nwcUrl);

export class WalletService {
  private _walletService: nwc.NWCWalletService;
  private _requestHandler: RequestHandler;
  constructor() {
    this._walletService = new nwc.NWCWalletService({
      relayUrl,
    });
    this._requestHandler = new RequestHandler();

    this.subscribe();
  }

  async subscribe() {
    await this._walletService.publishWalletServiceInfoEvent(
      walletServiceSecretKey,
      ["get_info"],
      []
    );

    const keypair = new nwc.NWCWalletServiceKeyPair(
      walletServiceSecretKey,
      clientPubkey
    );

    // TODO: handle unsub
    const unsub = await this._walletService.subscribe(
      keypair,
      this._requestHandler
    );
  }
}
