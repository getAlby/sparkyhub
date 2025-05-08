import { SparkWallet } from "@buildonspark/spark-sdk";
import { Invoice } from "@getalby/lightning-tools";
import {
  Nip47GetBalanceResponse,
  Nip47GetInfoResponse,
  Nip47ListTransactionsRequest,
  Nip47ListTransactionsResponse,
  Nip47MakeInvoiceRequest,
  Nip47PayInvoiceRequest,
  Nip47PayResponse,
  Nip47SingleMethod,
  Nip47Transaction,
} from "@getalby/sdk/dist/nwc";
import { LNBackend } from "./LNBackend";

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

    const invoice = new Invoice({ pr: sparkInvoice.invoice.encodedInvoice });

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
  }): Promise<{ preimage?: string; fees_paid?: number }> {
    if (!this._wallet) {
      throw new Error("wallet not initialized");
    }

    let response;
    let preimage: string | undefined;
    let fees_paid: number | undefined;
    if (request.type === "incoming") {
      response = await this._wallet.getLightningReceiveRequest(
        request.sparkRequestId
      );
      if (!response) {
        throw new Error("failed to fetch lightning receive request");
      }
    } else {
      response = await this._wallet.getLightningSendRequest(
        request.sparkRequestId
      );
      if (!response) {
        throw new Error("failed to fetch lightning send request");
      }
      fees_paid = response.fee.originalValue * 1000;
    }

    if (response.status === "TRANSFER_COMPLETED") {
      preimage = response.paymentPreimage;
      if (!preimage) {
        throw new Error("No preimage in completed outgoing payment");
      }
      return {
        preimage,
        fees_paid,
      };
    }
    return {};
  }
  async getBalance(): Promise<Nip47GetBalanceResponse> {
    if (!this._wallet) {
      throw new Error("wallet not initialized");
    }

    const balance = await this._wallet.getBalance();
    return {
      balance: Number(balance.balance) * 1000,
    };
  }
  async payInvoice(
    request: Nip47PayInvoiceRequest,
    onReceivedSparkRequestId: (sparkRequestId: string) => void
  ): Promise<Nip47PayResponse> {
    if (!this._wallet) {
      throw new Error("wallet not initialized");
    }
    const maxFeeSats = await this._wallet.getLightningSendFeeEstimate({
      encodedInvoice: request.invoice,
    });
    if (maxFeeSats === undefined) {
      throw new Error("failed to fetch fee estimate");
    }
    const satoshi = new Invoice({ pr: request.invoice }).satoshi;
    if (!satoshi) {
      throw new Error("0-amount invoices not supported");
    }

    // console.log("Fee estimate", fee);
    let initialResponse = await this._wallet.payLightningInvoice({
      invoice: request.invoice,
      maxFeeSats,
    });
    // spark request ID is needed to later lookup the invoice
    onReceivedSparkRequestId(initialResponse.id);

    let preimage: string | undefined;
    for (let i = 0; i < 60; i++) {
      const response = await this._wallet.getLightningSendRequest(
        initialResponse.id
      );
      if (!response) {
        throw new Error("Failed to fetch lightning send request");
      }
      if (response.paymentPreimage) {
        preimage = response.paymentPreimage;
        break;
      }
    }

    if (!preimage) {
      throw new Error("No preimage found, timeout?");
    }

    return {
      preimage: preimage || initialResponse.id,
      fees_paid: initialResponse.fee.originalValue * 1000,
    };
  }
}
