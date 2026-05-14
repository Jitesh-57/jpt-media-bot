declare module "@pixelbin/admin" {
  export class PixelbinConfig {
    constructor(config: { domain: string; apiSecret: string });
  }

  export class PixelbinClient {
    constructor(config: PixelbinConfig);
    predictions: {
      list(): Promise<unknown[]>;
      getSchema(name: string): Promise<unknown>;
      create(params: {
        name: string;
        input?: Record<string, unknown>;
        webhook?: string;
      }): Promise<{ _id: string; status: string }>;
      get(id: string): Promise<{
        _id: string;
        status: "SUCCESS" | "FAILURE" | "PROCESSING" | "PENDING";
        output?: Record<string, unknown>;
        error?: string;
      }>;
      wait(
        id: string,
        options?: { maxAttempts?: number; retryInterval?: number }
      ): Promise<{
        _id: string;
        status: "SUCCESS" | "FAILURE" | "PROCESSING" | "PENDING";
        output?: Record<string, unknown>;
        error?: string;
      }>;
      createAndWait(params: {
        name: string;
        input?: Record<string, unknown>;
        webhook?: string;
      }): Promise<{
        _id: string;
        status: "SUCCESS" | "FAILURE" | "PROCESSING" | "PENDING";
        output?: Record<string, unknown>;
        error?: string;
      }>;
    };
  }
}
