import { ZodOpenApiObject, ZodOpenApiPathsObject, createDocument } from 'zod-openapi';
import * as fs from 'fs';
import * as path from 'path';

import { type OpenAPIObject, OpenApiRouter, type SecuritySchemeObject } from '../types';
import { getOpenApiPathsObject, mergePaths } from './paths';

export interface GenerateOpenApiDocumentOptions {
  title: string;
  description?: string;
  version: string;
  openApiVersion?: ZodOpenApiObject['openapi'];
  baseUrl: string;
  docsUrl?: string;
  tags?: string[];
  securitySchemes?: Record<string, SecuritySchemeObject>;
  paths?: ZodOpenApiPathsObject;
  saveToFile?: string;
}

export const generateOpenApiDocument = (
  appRouter: OpenApiRouter,
  opts: GenerateOpenApiDocumentOptions,
): OpenAPIObject => {
  const securitySchemes = opts.securitySchemes ?? {
    Authorization: {
      type: 'http',
      scheme: 'bearer',
    },
  };
  const document =  createDocument({
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
      
      fs.writeFileSync(
        opts.saveToFile, 
        JSON.stringify(document, null, 2), 
        { encoding: 'utf8' }
      );
      console.log(`OpenAPI document saved to: ${opts.saveToFile}`);
    } catch (error) {
      console.error('Failed to save OpenAPI document:', error);
    }
  }

  return document;
};
