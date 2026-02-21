import { config } from './config';

export function getGcpCredentials() {
    if (!config.gcp.projectId || !config.gcp.clientEmail || !config.gcp.privateKey) {
        return null;
    }

    return {
        projectId: config.gcp.projectId,
        credentials: {
            client_email: config.gcp.clientEmail,
            private_key: config.gcp.privateKey,
        },
    };
}
