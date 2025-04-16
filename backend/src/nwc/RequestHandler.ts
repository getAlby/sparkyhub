import { nwc } from "@getalby/sdk";
import { LNBackend } from "../ln/LNBackend";

export class RequestHandler implements nwc.NWCWalletServiceRequestHandler {
  private _wallet: LNBackend;

  constructor(wallet: LNBackend) {
    this._wallet = wallet;
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
    const result = await this._wallet.makeInvoice(request);
    return {
      result,
      error: undefined,
    };
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
