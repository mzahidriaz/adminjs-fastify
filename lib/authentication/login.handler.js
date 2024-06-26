const getLoginPath = (admin) => {
    const { loginPath } = admin.options;
    return loginPath.startsWith('/') ? loginPath : `/${loginPath}`;
};
export const withLogin = (fastifyInstance, admin, auth) => {
    const { rootPath } = admin.options;
    const loginPath = getLoginPath(admin);
    const { provider } = auth;
    const providerProps = provider?.getUiProps?.() ?? {};
    fastifyInstance.get(loginPath, async (req, reply) => {
        const baseProps = {
            action: admin.options.loginPath,
            errorMessage: null,
        };
        const login = await admin.renderLogin({
            ...baseProps,
            ...providerProps,
        });
        reply.type('text/html');
        return reply.send(login);
    });
    fastifyInstance.post(loginPath, async (req, reply) => {
        const context = { request: req, reply };
        let adminUser;
        if (provider) {
            adminUser = await provider.handleLogin({
                headers: req.headers,
                query: req.query ?? {},
                params: req.params ?? {},
                data: req.body ?? {},
            }, context);
        }
        else {
            const { email, password } = req.body;
            // "auth.authenticate" must always be defined if "auth.provider" isn't
            adminUser = await auth.authenticate(email, password, context);
        }
        if (adminUser) {
            req.session.set('adminUser', adminUser);
            if (req.session.redirectTo) {
                return reply.redirect(302, req.session.redirectTo);
            }
            else {
                return reply.redirect(302, rootPath);
            }
        }
        else {
            const login = await admin.renderLogin({
                action: admin.options.loginPath,
                errorMessage: 'invalidCredentials',
                ...providerProps,
            });
            reply.type('text/html');
            return reply.send(login);
        }
    });
};
