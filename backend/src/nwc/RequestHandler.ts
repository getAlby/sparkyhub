import { nwc } from "@getalby/sdk";
import { LNBackend } from "../ln/LNBackend";
import { PrismaClient } from "@prisma/client"; // Import Prisma Client

export class RequestHandler implements nwc.NWCWalletServiceRequestHandler {
  private readonly _wallet: LNBackend;
  private readonly _userId: number;
  private readonly _appId: number;
  private readonly _prisma: PrismaClient;

  constructor(
    wallet: LNBackend,
    userId: number,
    appId: number,
    prisma: PrismaClient
  ) {
    this._wallet = wallet;
    this._userId = userId;
    this._appId = appId;
    this._prisma = prisma;
  }

  async getInfo(): nwc.NWCWalletServiceResponsePromise<nwc.Nip47GetInfoResponse> {
    const result = await this._wallet.getInfo();
    return Promise.resolve({
      result,
      error: undefined,
    });
  }

  async makeInvoice(
    request: nwc.Nip47MakeInvoiceRequest
  ): nwc.NWCWalletServiceResponsePromise<nwc.Nip47Transaction> {
    try {
      const result = await this._wallet.makeInvoice(request);

      // Save transaction to DB after successful invoice creation
      try {
        await this._prisma.transaction.create({
          data: {
            userId: this._userId,
            appId: this._appId,
            type: "incoming", // makeInvoice creates incoming transactions for the service
            state: "pending", // Initially pending
            invoice: result.invoice,
            payment_hash: result.payment_hash,
            amount_msat: BigInt(result.amount), // Convert number to BigInt
            fees_paid_msat: null, // Use null if undefined
            description: result.description,
            settled_at: result.settled_at
              ? new Date(result.settled_at * 1000)
              : null,
            created_at: new Date(result.created_at * 1000), // Convert seconds epoch to Date
            expires_at: new Date(result.expires_at * 1000), // Convert seconds epoch to Date (assuming it's always present)
          },
        });
        console.log(
          `Saved pending transaction for invoice ${result.payment_hash} (User: ${this._userId}, App: ${this._appId})`
        );
      } catch (dbError) {
        console.error(
          `Failed to save transaction for invoice ${result.payment_hash} to DB:`,
          dbError
        );
        // Decide if this should cause the NWC request to fail.
        // For now, we log the error but still return the successful invoice result.
      }

      return {
        result,
        error: undefined,
      };
    } catch (lnError) {
      console.error("Error creating invoice via LNBackend:", lnError);
      // Map LNBackend error to NWC error response
      return {
        result: undefined,
        error: {
          code: "INTERNAL", // Or map specific errors if possible
          message: `Failed to create invoice: ${lnError}`,
        },
      };
    }
  }
  async lookupInvoice(
    request: nwc.Nip47LookupInvoiceRequest
  ): nwc.NWCWalletServiceResponsePromise<nwc.Nip47Transaction> {
    const result = await this._wallet.lookupInvoice(request);
    return {
      result,
      error: undefined,
    };
  }
  async getBalance(): nwc.NWCWalletServiceResponsePromise<nwc.Nip47GetBalanceResponse> {
    const result = await this._wallet.getBalance();
    return {
      result,
      error: undefined,
    };
  }
  async payInvoice(
    request: nwc.Nip47PayInvoiceRequest
  ): nwc.NWCWalletServiceResponsePromise<nwc.Nip47PayResponse> {
    try {
      const result = await this._wallet.payInvoice(request);
      return {
        result,
        error: undefined,
      };
    } catch (error) {
      console.error(error);
      return {
        result: undefined,
        error: {
          code: "INTERNAL",
          message: "" + error,
        },
      };
    }
  }
  async listTransactions(
    request: nwc.Nip47ListTransactionsRequest
  ): nwc.NWCWalletServiceResponsePromise<nwc.Nip47ListTransactionsResponse> {
    const result = await this._wallet.listTransactions(request);
    return {
      result,
      error: undefined,
    };
  }
}
