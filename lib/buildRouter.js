import fastifyMultipart from '@fastify/multipart';
import { Router as AdminRouter } from 'adminjs';
import { readFile } from 'fs/promises';
import fromPairs from 'lodash/fromPairs.js';
import * as mime from 'mime-types';
import path from 'path';
import { WrongArgumentError } from './errors.js';
import { log } from './logger.js';
const INVALID_ADMIN_JS_INSTANCE = 'You have to pass an instance of AdminJS to the buildRouter() function';
const getFile = (fileField) => {
    if (!fileField?.file) {
        return null;
    }
    const { file, filename } = fileField;
    file.name = filename;
    return file;
};
export const buildRouter = async (admin, fastifyApp, registerModules) => {
    const { assets } = AdminRouter;
    if (admin?.constructor?.name !== 'AdminJS') {
        throw new WrongArgumentError(INVALID_ADMIN_JS_INSTANCE);
    }
    if (registerModules?.registerMultipart) {
        await fastifyApp.register(fastifyMultipart, { attachFieldsToBody: true });
    }
    admin.initialize().then(() => {
        log.debug('AdminJS: bundle ready');
    });
    const { routes } = AdminRouter;
    routes.forEach(route => {
        // we have to change routes defined in AdminJS from {recordId} to :recordId
        const path = route.path.replace(/{/g, ':').replace(/}/g, '');
        const handler = async (request, reply) => {
            const controller = new route.Controller({ admin }, request.session?.adminUser);
            const { params, query } = request;
            const method = request.method.toLowerCase();
            const body = request.body;
            const fields = fromPairs(Object.keys((body ?? {})).map(key => [
                key,
                getFile(body[key]) ?? body[key].value ?? body[key],
            ]));
            const html = await controller[route.action]({
                ...request,
                params,
                query,
                payload: fields ?? {},
                method,
            }, reply);
            if (route.contentType) {
                reply.type(route.contentType);
            }
            else if (typeof html === 'string') {
                reply.type('text/html');
            }
            if (html) {
                return reply.send(html);
            }
        };
        if (route.method === 'GET') {
            fastifyApp.get(`${admin.options.rootPath}${path}`, handler);
        }
        if (route.method === 'POST') {
            fastifyApp.post(`${admin.options.rootPath}${path}`, handler);
        }
    });
    assets.forEach(asset => {
        fastifyApp.get(`${admin.options.rootPath}${asset.path}`, async (_req, reply) => {
            const mimeType = mime.lookup(asset.src);
            const file = await readFile(path.resolve(asset.src));
            if (mimeType) {
                return reply.type(mimeType).send(file);
            }
            return reply.send(file);
        });
    });
};
