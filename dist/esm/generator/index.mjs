import { createDocument } from 'zod-openapi';
import * as fs from 'fs';
import * as path from 'path';
import { getOpenApiPathsObject, mergePaths } from './paths.mjs';
export const generateOpenApiDocument = (appRouter, opts) => {
    const securitySchemes = opts.securitySchemes ?? {
        Authorization: {
            type: 'http',
            scheme: 'bearer',
        },
    };
    const document = createDocument({
        openapi: opts.openApiVersion ?? '3.0.3',
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
        paths: mergePaths(getOpenApiPathsObject(appRouter, Object.keys(securitySchemes)), opts.paths),
        components: {
            securitySchemes,
        },
        tags: opts.tags?.map((tag) => ({ name: tag })),
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
//# sourceMappingURL=index.js.map