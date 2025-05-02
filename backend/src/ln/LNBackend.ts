import { nwc } from "@getalby/sdk";

// FIXME: this needs to be re-thought a bit
// since LNBackend does not have access to DB
// transactions
export interface LNBackend {
  listTransactions(
    request: nwc.Nip47ListTransactionsRequest
  ): Promise<nwc.Nip47ListTransactionsResponse>;
  getInfo(): Promise<nwc.Nip47GetInfoResponse>;
  getSupportedMethods(): nwc.Nip47SingleMethod[];
  makeInvoice(
    request: nwc.Nip47MakeInvoiceRequest
  ): Promise<nwc.Nip47Transaction>;
  lookupInvoice(request: {
    type: nwc.Nip47Transaction["type"];
    sparkRequestId: string;
  }): Promise<{ preimage?: string }>;
  getBalance(): Promise<nwc.Nip47GetBalanceResponse>;
  payInvoice(
    request: nwc.Nip47PayInvoiceRequest,
    onReceivedSparkRequestId: (sparkRequestId: string) => void
  ): Promise<nwc.Nip47PayResponse>;
}
