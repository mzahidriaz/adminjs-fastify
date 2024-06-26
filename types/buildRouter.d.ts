import AdminJS from 'adminjs';
import { FastifyInstance } from 'fastify';
export declare const buildRouter: (admin: AdminJS, fastifyApp: FastifyInstance, registerModules?: {
    registerFormBody: boolean;
    registerMultipart: boolean;
}) => Promise<void>;
