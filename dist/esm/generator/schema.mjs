import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { extendZodWithOpenApi, } from 'zod-openapi';
import { HTTP_STATUS_TRPC_ERROR_CODE, TRPC_ERROR_CODE_HTTP_STATUS, TRPC_ERROR_CODE_MESSAGE, } from '../adapters/index.mjs';
import { instanceofZodType, instanceofZodTypeCoercible, instanceofZodTypeKind, instanceofZodTypeLikeString, instanceofZodTypeLikeVoid, instanceofZodTypeOptional, unwrapZodType, zodSupportsCoerce, } from '../utils/index.mjs';
import { HttpMethods } from './paths.mjs';
import { queryPlaceholder } from '../utils/queryPlaceholder.mjs';
extendZodWithOpenApi(z);
export const getParameterObjects = (schema, required, pathParameters, headersSchema, inType) => {
    const shape = schema.shape;
    const shapeKeys = Object.keys(shape);
    for (const pathParameter of pathParameters) {
        if (!shapeKeys.includes(pathParameter)) {
            throw new TRPCError({
                message: `Input parser expects key from path: "${pathParameter}"`,
                code: 'INTERNAL_SERVER_ERROR',
            });
        }
    }
    const { path, query } = shapeKeys
        .filter((shapeKey) => {
        const isPathParameter = pathParameters.includes(shapeKey);
        if (inType === 'path') {
            return isPathParameter;
        }
        else if (inType === 'query') {
            return !isPathParameter;
        }
        return true;
    })
        .map((shapeKey) => {
        let shapeSchema = shape[shapeKey];
        const isShapeRequired = !shapeSchema.isOptional();
        const isPathParameter = pathParameters.includes(shapeKey);
        if (!instanceofZodTypeLikeString(shapeSchema)) {
            if (zodSupportsCoerce) {
                if (!instanceofZodTypeCoercible(shapeSchema)) {
                    throw new TRPCError({
                        message: `Input parser key: "${shapeKey}" must be ZodString, ZodNumber, ZodBoolean, ZodBigInt or ZodDate`,
                        code: 'INTERNAL_SERVER_ERROR',
                    });
                }
            }
            else {
                throw new TRPCError({
                    message: `Input parser key: "${shapeKey}" must be ZodString`,
                    code: 'INTERNAL_SERVER_ERROR',
                });
            }
        }
        if (instanceofZodTypeOptional(shapeSchema)) {
            if (isPathParameter) {
                throw new TRPCError({
                    message: `Path parameter: "${shapeKey}" must not be optional`,
                    code: 'INTERNAL_SERVER_ERROR',
                });
            }
            shapeSchema = shapeSchema.unwrap();
        }
        return {
            name: shapeKey,
            paramType: isPathParameter ? 'path' : 'query',
            required: isPathParameter || (required && isShapeRequired),
            schema: shapeSchema,
        };
    })
        .reduce(({ path, query }, { name, paramType, schema, required }) => paramType === 'path'
        ? { path: { ...path, [name]: required ? schema : schema.optional() }, query }
        : { path, query: { ...query, [name]: required ? schema : schema.optional() } }, { path: {}, query: {} });
    const placeholder = queryPlaceholder(z.object(query));
    const querySchema = z.object({
        input: z.string().default(JSON.stringify(placeholder))
    });
    return {
        header: headersSchema,
        path: z.object(path),
        query: querySchema,
    };
};
export const getRequestBodyObject = (schema, required, pathParameters, contentTypes) => {
    // remove path parameters
    const mask = {};
    pathParameters.forEach((pathParameter) => {
        mask[pathParameter] = true;
    });
    const o = schema._def.zodOpenApi?.openapi;
    const dedupedSchema = schema.omit(mask).openapi({
        ...(o?.title ? { title: o?.title } : {}),
        ...(o?.description ? { description: o?.description } : {}),
    });
    // if all keys are path parameters
    if (pathParameters.length > 0 && Object.keys(dedupedSchema.shape).length === 0) {
        return undefined;
    }
    const content = {};
    for (const contentType of contentTypes) {
        content[contentType] = {
            schema: dedupedSchema,
        };
    }
    return {
        required,
        content,
    };
};
export const hasInputs = (schema) => instanceofZodType(schema) && !instanceofZodTypeLikeVoid(unwrapZodType(schema, true));
const errorResponseObjectByCode = {};
export const errorResponseObject = (code = 'INTERNAL_SERVER_ERROR', message, issues) => {
    if (!errorResponseObjectByCode[code]) {
        errorResponseObjectByCode[code] = {
            description: message ?? 'An error response',
            content: {
                'application/json': {
                    schema: z
                        .object({
                        message: z.string().openapi({
                            description: 'The error message',
                            example: message ?? 'Internal server error',
                        }),
                        code: z.string().openapi({
                            description: 'The error code',
                            example: code ?? 'INTERNAL_SERVER_ERROR',
                        }),
                        issues: z
                            .array(z.object({ message: z.string() }))
                            .optional()
                            .openapi({
                            description: 'An array of issues that were responsible for the error',
                            example: issues ?? [],
                        }),
                    })
                        .openapi({
                        title: `${message ?? 'Internal server'} error (${TRPC_ERROR_CODE_HTTP_STATUS[code] ?? 500})`,
                        description: 'The error information',
                        example: {
                            code: code ?? 'INTERNAL_SERVER_ERROR',
                            message: message ?? 'Internal server error',
                            issues: issues ?? [],
                        },
                        ref: `error.${code}`,
                    }),
                },
            },
        };
    }
    return errorResponseObjectByCode[code];
};
export const errorResponseFromStatusCode = (status) => {
    const code = HTTP_STATUS_TRPC_ERROR_CODE[status];
    const message = code && TRPC_ERROR_CODE_MESSAGE[code];
    return errorResponseObject(code, message ?? 'Unknown error');
};
export const errorResponseFromMessage = (status, message) => errorResponseObject(HTTP_STATUS_TRPC_ERROR_CODE[status], message);
export const getResponsesObject = (schema, httpMethod, headers, isProtected, hasInputs, successDescription, errorResponses) => ({
    200: {
        description: successDescription ?? 'Successful response',
        headers: headers,
        content: {
            'application/json': {
                schema: instanceofZodTypeKind(schema, z.ZodFirstPartyTypeKind.ZodVoid)
                    ? {}
                    : instanceofZodTypeKind(schema, z.ZodFirstPartyTypeKind.ZodNever) ||
                        instanceofZodTypeKind(schema, z.ZodFirstPartyTypeKind.ZodUndefined)
                        ? { not: {} }
                        : schema,
            },
        },
    },
    ...(errorResponses !== undefined
        ? Object.fromEntries(Array.isArray(errorResponses)
            ? errorResponses.map((x) => [x, errorResponseFromStatusCode(x)])
            : Object.entries(errorResponses).map(([k, v]) => [
                k,
                errorResponseFromMessage(Number(k), v),
            ]))
        : {
            ...(isProtected
                ? {
                    401: errorResponseObject('UNAUTHORIZED', 'Authorization not provided'),
                    403: errorResponseObject('FORBIDDEN', 'Insufficient access'),
                }
                : {}),
            ...(hasInputs
                ? {
                    400: errorResponseObject('BAD_REQUEST', 'Invalid input data'),
                    ...(httpMethod !== HttpMethods.POST
                        ? {
                            404: errorResponseObject('NOT_FOUND', 'Not found'),
                        }
                        : {}),
                }
                : {}),
            500: errorResponseObject('INTERNAL_SERVER_ERROR', 'Internal server error'),
        }),
});
//# sourceMappingURL=schema.js.map