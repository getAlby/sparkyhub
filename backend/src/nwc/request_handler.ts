import { nwc } from "@getalby/sdk";

export class RequestHandler implements nwc.NWCWalletServiceRequestHandler {
  getInfo() {
    return Promise.resolve({
      result: {
        methods: ["get_info"],
        alias: "Spark NWC",
        //... TODO: add other fields here
      } as nwc.Nip47GetInfoResponse,
      error: undefined,
    });
  }
  // ... handle other NIP-47 methods here
}
