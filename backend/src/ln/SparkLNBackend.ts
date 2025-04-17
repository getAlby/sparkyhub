import {
  Nip47ListTransactionsRequest,
  Nip47ListTransactionsResponse,
  Nip47GetInfoResponse,
  Nip47SingleMethod,
  Nip47MakeInvoiceRequest,
  Nip47Transaction,
  Nip47LookupInvoiceRequest,
  Nip47GetBalanceResponse,
  Nip47PayInvoiceRequest,
  Nip47PayResponse,
} from "@getalby/sdk/dist/nwc";
import { LNBackend } from "./LNBackend";
import { SparkWallet } from "@buildonspark/spark-sdk";
import { Invoice } from "@getalby/lightning-tools";

export class SparkLNBackend implements LNBackend {
  private _wallet?: SparkWallet;
  private _mnemonic: string; // Store the mnemonic

  constructor(mnemonic: string) {
    // Accept mnemonic in constructor
    this._mnemonic = mnemonic;
  }

  async init() {
    const { wallet } = await SparkWallet.initialize({
      mnemonicOrSeed: this._mnemonic, // Use the stored mnemonic
      options: {
        network: "MAINNET",
      },
    });
    this._wallet = wallet;
  }

  async listTransactions(
    _request: Nip47ListTransactionsRequest
  ): Promise<Nip47ListTransactionsResponse> {
    if (!this._wallet) {
      throw new Error("wallet not initialized");
    }
    // always claim. TODO: don't do this as it's inefficient
    this._wallet.claimTransfers();

    // we use the DB here, we don't go directly to the LN wallet.
    return {
      transactions: [],
      total_count: 0,
    };
  }
  async getInfo(): Promise<Nip47GetInfoResponse> {
    if (!this._wallet) {
      throw new Error("wallet not initialized");
    }
    const pubkey = await this._wallet.getIdentityPublicKey();
    return {
      methods: this.getSupportedMethods(),
      alias: "Spark NWC",
      block_hash: "",
      block_height: 0,
      color: "#000000",
      network: "mainnet",
      pubkey,
    };
  }
  getSupportedMethods(): Nip47SingleMethod[] {
    return [
      "get_info",
      "make_invoice",
      "pay_invoice",
      "get_balance",
      "lookup_invoice",
      "list_transactions",
    ];
  }
  async makeInvoice(
    request: Nip47MakeInvoiceRequest
  ): Promise<Nip47Transaction> {
    if (!this._wallet) {
      throw new Error("wallet not initialized");
    }

    const sparkInvoice = await this._wallet.createLightningInvoice({
      amountSats: Math.floor(request.amount / 1000),
      memo: request.description,
    });

    const invoice = new Invoice({ pr: sparkInvoice.invoice.encodedEnvoice });

    const transaction: Nip47Transaction = {
      type: "incoming",
      invoice: invoice.paymentRequest,
      description: invoice.description || "",
      // description_hash: invoice.descriptionHash || "", // Removed, not available on Invoice class
      description_hash: "", // Set to empty string as fallback
      amount: request.amount, // msat
      fees_paid: 0,
      created_at: Math.floor(invoice.createdDate.getTime() / 1000),
      expires_at: Math.floor(
        invoice.createdDate.getTime() / 1000 + (invoice.expiry || 0)
      ),
      payment_hash: invoice.paymentHash,
      state: "pending",
      preimage: "",
      settled_at: 0,
      metadata: {
        spark_request_id: sparkInvoice.id,
      },
    };
    return transaction;
  }
  async lookupInvoice(request: {
    type: Nip47Transaction["type"];
    sparkRequestId: string;
  }): Promise<{ preimage?: string }> {
    if (!this._wallet) {
      throw new Error("wallet not initialized");
    }
    // always claim. TODO: don't do this as it's inefficient
    this._wallet.claimTransfers();

    let response;
    if (request.type === "incoming") {
      response = await this._wallet.getLightningReceiveRequest(
        request.sparkRequestId
      );
    } else {
      response = await this._wallet.getLightningSendRequest(
        request.sparkRequestId
      );
    }
    console.log("Checked spark request", request, response);
    if (response?.status === "TRANSFER_COMPLETED") {
      // TODO: add fees
      return {
        preimage: request.sparkRequestId, // FIXME: fake preimage
      };
    }
    return {};
  }
  async getBalance(): Promise<Nip47GetBalanceResponse> {
    if (!this._wallet) {
      throw new Error("wallet not initialized");
    }
    const claimed = await this._wallet.claimTransfers();
    console.log({ claimed });
    const balance = await this._wallet.getBalance();
    return {
      balance: Number(balance.balance) * 1000,
    };
  }
  async payInvoice(
    request: Nip47PayInvoiceRequest
  ): Promise<Nip47PayResponse & { sparkRequestId: string }> {
    if (!this._wallet) {
      throw new Error("wallet not initialized");
    }
    const response = await this._wallet.payLightningInvoice({
      invoice: request.invoice,
    });

    console.log("Invoice Response:", response);

    // FIXME: need to check status of spark request
    // but also need to make sure to return the sparkRequestId so we can save the pending payment
    return {
      preimage: response.id, // FIXME: fake preimage
      fees_paid: response.fee.originalValue,
      sparkRequestId: response.id,
    };
  }
}
