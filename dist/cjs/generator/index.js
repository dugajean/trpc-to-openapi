"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOpenApiDocument = void 0;
const zod_openapi_1 = require("zod-openapi");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const paths_1 = require("./paths");
const generateOpenApiDocument = (appRouter, opts) => {
    var _a, _b, _c;
    const securitySchemes = (_a = opts.securitySchemes) !== null && _a !== void 0 ? _a : {
        Authorization: {
            type: 'http',
            scheme: 'bearer',
        },
    };
    const document = (0, zod_openapi_1.createDocument)({
        openapi: (_b = opts.openApiVersion) !== null && _b !== void 0 ? _b : '3.0.3',
        info: {
            title: opts.title,
            description: opts.description,
            version: opts.version,
        },
        servers: [
            {
                url: opts.baseUrl,
            },
        ],
        paths: (0, paths_1.mergePaths)((0, paths_1.getOpenApiPathsObject)(appRouter, Object.keys(securitySchemes)), opts.paths),
        components: {
            securitySchemes,
        },
        tags: (_c = opts.tags) === null || _c === void 0 ? void 0 : _c.map((tag) => ({ name: tag })),
        externalDocs: opts.docsUrl ? { url: opts.docsUrl } : undefined,
    });
    if (opts.saveToFile) {
        try {
            const dirName = path.dirname(opts.saveToFile);
            if (!fs.existsSync(dirName)) {
                fs.mkdirSync(dirName, { recursive: true });
            }
            fs.writeFileSync(opts.saveToFile, JSON.stringify(document, null, 2), { encoding: 'utf8' });
            console.log(`OpenAPI document saved to: ${opts.saveToFile}`);
        }
        catch (error) {
            console.error('Failed to save OpenAPI document:', error);
        }
    }
    return document;
};
exports.generateOpenApiDocument = generateOpenApiDocument;
//# sourceMappingURL=index.js.map