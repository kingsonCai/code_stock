import { z } from 'zod';
declare const configSchema: z.ZodObject<{
    nodeEnv: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    port: z.ZodDefault<z.ZodNumber>;
    host: z.ZodDefault<z.ZodString>;
    jwt: z.ZodObject<{
        secret: z.ZodString;
        expiresIn: z.ZodDefault<z.ZodString>;
        refreshExpiresIn: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        secret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    }, {
        secret: string;
        expiresIn?: string | undefined;
        refreshExpiresIn?: string | undefined;
    }>;
    database: z.ZodObject<{
        type: z.ZodDefault<z.ZodEnum<["mongodb", "postgresql"]>>;
        mongo: z.ZodObject<{
            uri: z.ZodString;
            dbName: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            uri: string;
            dbName: string;
        }, {
            uri: string;
            dbName: string;
        }>;
        postgres: z.ZodObject<{
            host: z.ZodString;
            port: z.ZodNumber;
            user: z.ZodString;
            password: z.ZodString;
            database: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            port: number;
            host: string;
            database: string;
            user: string;
            password: string;
        }, {
            port: number;
            host: string;
            database: string;
            user: string;
            password: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "mongodb" | "postgresql";
        mongo: {
            uri: string;
            dbName: string;
        };
        postgres: {
            port: number;
            host: string;
            database: string;
            user: string;
            password: string;
        };
    }, {
        mongo: {
            uri: string;
            dbName: string;
        };
        postgres: {
            port: number;
            host: string;
            database: string;
            user: string;
            password: string;
        };
        type?: "mongodb" | "postgresql" | undefined;
    }>;
    redis: z.ZodObject<{
        host: z.ZodString;
        port: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        port: number;
        host: string;
    }, {
        port: number;
        host: string;
    }>;
    python: z.ZodObject<{
        path: z.ZodDefault<z.ZodString>;
        enginePath: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        enginePath: string;
    }, {
        path?: string | undefined;
        enginePath?: string | undefined;
    }>;
    logLevel: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
}, "strip", z.ZodTypeAny, {
    nodeEnv: "development" | "test" | "production";
    port: number;
    host: string;
    jwt: {
        secret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };
    database: {
        type: "mongodb" | "postgresql";
        mongo: {
            uri: string;
            dbName: string;
        };
        postgres: {
            port: number;
            host: string;
            database: string;
            user: string;
            password: string;
        };
    };
    redis: {
        port: number;
        host: string;
    };
    python: {
        path: string;
        enginePath: string;
    };
    logLevel: "debug" | "info" | "warn" | "error";
}, {
    jwt: {
        secret: string;
        expiresIn?: string | undefined;
        refreshExpiresIn?: string | undefined;
    };
    database: {
        mongo: {
            uri: string;
            dbName: string;
        };
        postgres: {
            port: number;
            host: string;
            database: string;
            user: string;
            password: string;
        };
        type?: "mongodb" | "postgresql" | undefined;
    };
    redis: {
        port: number;
        host: string;
    };
    python: {
        path?: string | undefined;
        enginePath?: string | undefined;
    };
    nodeEnv?: "development" | "test" | "production" | undefined;
    port?: number | undefined;
    host?: string | undefined;
    logLevel?: "debug" | "info" | "warn" | "error" | undefined;
}>;
export declare const config: {
    nodeEnv: "development" | "test" | "production";
    port: number;
    host: string;
    jwt: {
        secret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };
    database: {
        type: "mongodb" | "postgresql";
        mongo: {
            uri: string;
            dbName: string;
        };
        postgres: {
            port: number;
            host: string;
            database: string;
            user: string;
            password: string;
        };
    };
    redis: {
        port: number;
        host: string;
    };
    python: {
        path: string;
        enginePath: string;
    };
    logLevel: "debug" | "info" | "warn" | "error";
};
export type Config = z.infer<typeof configSchema>;
export {};
//# sourceMappingURL=index.d.ts.map