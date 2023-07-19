import { Client, factory } from "@lumeweb/libkernel/module";
import defer from "p-defer";
import { CatOptions, LsOptions, StatOptions } from "@helia/unixfs";

interface AbortableGenerator {
  abort: () => void;
  iterable: () => AsyncIterable<Uint8Array>;
}

export const MODULE =
  "zduNhCWRFPpBRUx8uneN8hsYcHMwadCVmTAhS2etpu87sBVQ7cfNTXB4tP";

export class IPFSClient extends Client {
  public async ready() {
    return this.callModuleReturn("ready");
  }

  public async stat(cid: string, options?: Partial<StatOptions>) {
    return this.callModuleReturn("stat", { cid, options });
  }

  public ls(cid: string, options?: Partial<LsOptions>): AbortableGenerator {
    return this.connectModuleGenerator("ls", { cid, options });
  }

  public cat(cid: string, options?: Partial<CatOptions>): AbortableGenerator {
    return this.connectModuleGenerator("cat", { cid, options });
  }

  public async ipns(cid: string): Promise<string> {
    return this.callModuleReturn("ipnsResolve", { cid });
  }

  public async activePeers(): Promise<number> {
    return this.callModuleReturn("getActivePeers");
  }

  private connectModuleGenerator(
    method: string,
    data: any,
  ): AbortableGenerator {
    let pipe = defer<Uint8Array>();

    const [update, result] = this.connectModule(method, data, (item: any) => {
      pipe.resolve(item);
    });

    (async () => {
      const ret = await result;
      this.handleError(ret);
      pipe.resolve(undefined);
    })();

    return {
      abort() {
        update("abort");
      },

      iterable(): AsyncIterable<Uint8Array> {
        return {
          [Symbol.asyncIterator]() {
            return {
              async next(): Promise<IteratorResult<Uint8Array>> {
                const chunk = await pipe.promise;
                if (chunk === undefined) {
                  return {
                    value: new Uint8Array(),
                    done: true,
                  };
                }

                pipe = defer();

                update("next");

                return {
                  value: chunk,
                  done: false,
                };
              },
            };
          },
        };
      },
    };
  }

  public async register() {
    return this.callModuleReturn("register");
  }
}

export const createClient = factory<IPFSClient>(IPFSClient, MODULE);
