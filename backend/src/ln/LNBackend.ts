import { nwc } from "@getalby/sdk";

export interface LNBackend {
  listTransactions(
    request: nwc.Nip47ListTransactionsRequest
  ): Promise<nwc.Nip47ListTransactionsResponse>;
  getInfo(): Promise<nwc.Nip47GetInfoResponse>;
  getSupportedMethods(): nwc.Nip47SingleMethod[];
  makeInvoice(
    request: nwc.Nip47MakeInvoiceRequest
  ): Promise<nwc.Nip47Transaction>;
  lookupInvoice(
    request: nwc.Nip47LookupInvoiceRequest
  ): Promise<nwc.Nip47Transaction>;
  getBalance(): Promise<nwc.Nip47GetBalanceResponse>;
  payInvoice(
    request: nwc.Nip47PayInvoiceRequest
  ): Promise<nwc.Nip47PayResponse>;
}
