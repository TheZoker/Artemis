import { defineConfig } from 'cypress';
import { registerMultilanguageCoveragePlugin } from '@heddendorp/cypress-plugin-multilanguage-coverage';
import path from 'path';

export default defineConfig({
    clientCertificates: [
        {
            url: 'https://artemis-nginx',
            ca: ['certs/rootCA.pem'],
            certs: [
                {
                    cert: 'certs/artemis-nginx+4.pem',
                    key: 'certs/artemis-nginx+4-key.pem',
                },
            ],
        },
        {
            url: 'https://artemis.example',
            ca: ['certs/rootCA.pem'],
            certs: [
                {
                    cert: 'certs/artemis-nginx+4.pem',
                    key: 'certs/artemis-nginx+4-key.pem',
                },
            ],
        },
        {
            url: 'https://localhost',
            ca: ['certs/rootCA.pem'],
            certs: [
                {
                    cert: 'certs/artemis-nginx+4.pem',
                    key: 'certs/artemis-nginx+4-key.pem',
                },
            ],
        },
    ],
    fixturesFolder: 'fixtures',
    screenshotsFolder: 'screenshots',
    videosFolder: 'videos',
    video: true,
    screenshotOnRunFailure: false,
    viewportWidth: 1920,
    viewportHeight: 1080,
    defaultCommandTimeout: 20000,
    responseTimeout: 120000,
    reporter: 'junit',
    reporterOptions: {
        mochaFile: 'build/cypress/test-reports/test-results.[hash].xml',
        toConsole: true,
    },
    e2e: {
        setupNodeEvents(on, config) {
            on('task', {
                error(message: string) {
                    console.error('\x1b[31m', 'ERROR: ', message, '\x1b[0m');
                    return null;
                },
                warn(message: string) {
                    console.error('\x1b[33m', 'WARNING: ', message, '\x1b[0m');
                    return null;
                },
                log(message: string) {
                    console.log('\x1b[37m', 'LOG: ', message, '\x1b[0m');
                    return null;
                },
            });
            on('before:browser:launch', (browser, launchOptions) => {
                launchOptions.args.push('--lang=en');
                return launchOptions;
            });
            process.env.CYPRESS_COLLECT_COVERAGE === 'true' && registerMultilanguageCoveragePlugin({ workingDirectory: path.join(__dirname) })(on, config);
        },
        specPattern: ['init/ImportUsers.cy.ts', 'e2e/**/*.cy.{js,jsx,ts,tsx}'],
        supportFile: 'support/index.ts',
        baseUrl: 'http://localhost:8080',
    },
});
