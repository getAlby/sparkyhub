import { nwc } from "@getalby/sdk";
import { LNBackend } from "../ln/LNBackend";
import { PrismaClient, Transaction } from "@prisma/client"; // Import Prisma Client
import { Nip47Transaction } from "@getalby/sdk/dist/nwc";
import { Invoice } from "@getalby/lightning-tools";

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
        const spark_request_id = result.metadata?.spark_request_id as
          | string
          | undefined;
        if (!spark_request_id) {
          throw new Error("No spark request ID in response");
        }
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
            spark_request_id,
          },
        });
        console.log(
          `Saved pending incoming transaction for invoice ${result.payment_hash} (User: ${this._userId}, App: ${this._appId})`
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
    if (!request.invoice && !request.payment_hash) {
      throw new Error("No payment_hash or invoice specified");
    }
    let transaction = await this._prisma.transaction.findUnique({
      where: request.payment_hash
        ? {
            payment_hash: request.payment_hash,
          }
        : {
            invoice: request.invoice,
          },
    });

    if (!transaction) {
      return {
        error: {
          code: "NOT_FOUND",
          message: "transaction was not found",
        },
        result: undefined,
      };
    }

    if (transaction.state !== ("settled" satisfies Nip47Transaction["state"])) {
      if (!transaction.spark_request_id) {
        throw new Error("No spark request ID in transaction");
      }
      const result = await this._wallet.lookupInvoice({
        type: transaction.type as Nip47Transaction["type"],
        sparkRequestId: transaction.spark_request_id,
      });
      if (result.preimage) {
        transaction = await this._prisma.transaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            preimage: result.preimage,
            settled_at: new Date(),
            state: "settled" satisfies Nip47Transaction["state"],
            fees_paid_msat: 0, // TODO:
          },
        });
      }
    }

    return {
      result: mapDBTransaction(transaction),
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
      // TODO: save the transaction as pending

      const invoice = new Invoice({
        pr: request.invoice,
      });
      const transaction = await this._prisma.transaction.create({
        data: {
          userId: this._userId,
          appId: this._appId,
          type: "outgoing", // makeInvoice creates incoming transactions for the service
          state: "pending", // Initially pending
          invoice: request.invoice,
          payment_hash: invoice.paymentHash,
          amount_msat: BigInt(invoice.satoshi * 1000), // Convert number to BigInt
          fees_paid_msat: null, // Use null if undefined
          description: invoice.description,
          settled_at: null,
          created_at: invoice.createdDate,
          expires_at: invoice.expiryDate || new Date(),
        },
      });
      console.log(
        `Saved pending outgoing transaction for invoice ${invoice.paymentHash} (User: ${this._userId}, App: ${this._appId})`
      );

      const result = await this._wallet.payInvoice(request);

      // TODO: check if the result was actually paid, otherwise
      // do not update the transaction (apart from the request id)
      await this._prisma.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          preimage: result.preimage,
          settled_at: new Date(),
          state: "settled" satisfies Nip47Transaction["state"],
          fees_paid_msat: 0, // TODO: result.fees_paid, (check it is msat)
          spark_request_id: result.sparkRequestId,
        },
      });

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
    await this._wallet.listTransactions(request);

    const transactions = await this._prisma.transaction.findMany({
      where: {
        userId: this._userId,
        appId: this._appId,
      },
    });

    return {
      result: {
        transactions: transactions.map(mapDBTransaction),
        total_count: transactions.length,
      },
      error: undefined,
    };
  }
}

function mapDBTransaction(transaction: Transaction): Nip47Transaction {
  return {
    amount: Number(transaction.amount_msat),
    created_at: Math.floor(transaction.created_at.getTime() / 1000),
    description: transaction.description || "",
    description_hash: "",
    expires_at: Math.floor(transaction.expires_at.getTime() / 1000),
    fees_paid: transaction.fees_paid_msat || 0,
    invoice: transaction.invoice,
    payment_hash: transaction.payment_hash,
    preimage: transaction.preimage || "",
    settled_at: transaction.settled_at
      ? Math.floor(transaction.settled_at.getTime() / 1000)
      : 0,
    state: transaction.state as Nip47Transaction["state"],
    type: transaction.type as Nip47Transaction["type"],
    metadata: {
      spark_request_id: transaction.spark_request_id,
    },
  };
}
