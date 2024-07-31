import { afterEach, describe, expect, test, vi } from 'vitest';

import createSite, { options, siteTemplates, usage } from '../../cli/new';
import logger from '../../core/logger';
import { ChildProcess, spawn, SpawnOptionsWithoutStdio } from 'child_process';
import FakeProcess from './fakes/FakeProcess';
import { copy } from 'fs-extra';

// Together the mocks for fileExists(), readdir() and stat() defined here will populate siteTemplates
// with the following templates on import:
//
// - basic     -- These two point to the real files in the source
// - blog      --
// - test1     -- These two are mock templates; their supposed locations do not exist
// - example2  --
//
// The mocks must be specified here so they are set up before the module under test is imported.
vi.mock('../../core/utils', () => ({
    default: {},
    fileExists: async () => true
}));
vi.mock('fs/promises', async (imp) => {
    const orig = await imp<typeof import('fs/promises')>();
    return {
        default: {},
        readdir: vi.fn(async (d) => {
            if (d.endsWith('examples')) {
                return await orig.readdir(d);
            }
            return [ 'test1', 'example2' ];
        }),
        stat: vi.fn(async () => ({ isDirectory: () => true }))
    };
});
vi.mock('../../core/logger');
vi.mock('node:child_process');
vi.mock('fs-extra');

const initialArgs = [ 'node', 'iceforge', 'new' ];

afterEach(() => {
    vi.restoreAllMocks();
});

describe('siteTemplates tests', () => {
    test('siteTemplates contains shipped templates', () => {
        expect(Object.keys(siteTemplates)).toContain('basic');
        expect(Object.keys(siteTemplates)).toContain('blog');
    });

    test('siteTemplates contains user templates', () => {
        expect(Object.keys(siteTemplates)).toContain('test1');
        expect(Object.keys(siteTemplates)).toContain('example2');
    });
});

describe('options and usage tests', () => {
    test('options is defined', () => {
        expect(options).toBeTruthy();
    });

    test('usage is defined', () => {
        expect(usage).toBeTruthy();
        expect(usage.startsWith('\nUsage:')).toBeTruthy();
    });

    test('usage lists site templates', () => {
        for (const template in siteTemplates) {
            expect(usage).toContain(template);
        }
    });
});

describe('createSite() tests', () => {
    test('createSite() logs error if no location is given', async () => {
        const testArgs = { _: [...initialArgs] };

        await createSite(testArgs);

        expect(vi.mocked(logger.error)).toHaveBeenCalledWith('You must specify a location.');
    });

    test('createSite() logs error if specified template is not present in siteTemplates', async () => {
        const testArgs = {
            template: 'wrongTemplate',
            _: [ ...initialArgs, 'testDestination', '-T', 'wrongTemplate' ]
        };

        await createSite(testArgs);

        expect(vi.mocked(logger.error)).toHaveBeenCalledWith('Unknown template wrongTemplate');
    });

    describe('If destination directory exists...', () => {
        test('createSite() throws error and exits if --force is not set', async () => {
            const testArgs = {
                template: 'test1',
                _: [ ...initialArgs, 'testDestination', '-T', 'test1' ]
            };

            await expect(async () => await createSite(testArgs)).rejects.toThrowErrorMatchingSnapshot();
            expect(vi.mocked(logger.error).mock.lastCall?.[0]).toMatch(
                //eslint-disable-next-line no-regex-spaces
                /Target path '.*testDestination' already exists\.  Use the --force option to force installation into it\./
            );
        });

        test('createSite() does not throw error if --force is set', async () => {
            vi.mocked(spawn).mockImplementation((cmd, args, opts) => {
                const process = new FakeProcess(cmd, args, opts as SpawnOptionsWithoutStdio, '', '', 0.3);
                process.run();
                return process as unknown as ChildProcess;
            });
            vi.mocked(copy).mockImplementation(() => Promise.resolve());
            const testArgs = {
                template: 'test1',
                force: true,
                _: [ ...initialArgs, 'testDestination', '-T', 'test1', '--force' ]
            };

            await createSite(testArgs);

            expect(vi.mocked(copy)).toHaveBeenCalled();
        });
    });

    test('createSite() copies template from template folder to location', async () => {
        vi.mocked(spawn).mockImplementation((cmd, args, opts) => {
            const process = new FakeProcess(cmd, args, opts as SpawnOptionsWithoutStdio, '', '', 0.3);
            process.run();
            return process as unknown as ChildProcess;
        });
        vi.mocked(copy).mockImplementation(() => Promise.resolve());
        const testArgs = {
            template: 'test1',
            force: true,
            _: [ ...initialArgs, 'testDestination', '-T', 'test1', '--force' ]
        };

        await createSite(testArgs);

        expect(vi.mocked(copy)).toHaveBeenCalled();
        expect(vi.mocked(copy).mock.lastCall?.[0]).toMatch(/test1$/);
        expect(vi.mocked(copy).mock.lastCall?.[1]).toMatch(/testDestination$/);
    });

    test('createSite() runs npm install in location', async () => {
        vi.mocked(spawn).mockImplementation((cmd, args, opts) => {
            const process = new FakeProcess(cmd, args, opts as SpawnOptionsWithoutStdio, '', '', 0.3);
            process.run();
            return process as unknown as ChildProcess;
        });
        vi.mocked(copy).mockImplementation(() => Promise.resolve());
        const testArgs = {
            template: 'test1',
            force: true,
            _: [ ...initialArgs, 'testDestination', '-T', 'test1', '--force' ]
        };

        await createSite(testArgs);

        expect(vi.mocked(spawn)).toHaveBeenCalledOnce();
        expect(vi.mocked(spawn).mock.lastCall?.[0]).toBe('npm');
        expect(vi.mocked(spawn).mock.lastCall?.[1]).toStrictEqual([ 'install' ]);
        expect((vi.mocked(spawn).mock.lastCall?.[2] as SpawnOptionsWithoutStdio).cwd).toMatch(/testDestination$/);
        expect((vi.mocked(spawn).mock.lastCall?.[2] as SpawnOptionsWithoutStdio).shell).toBeTruthy();
    });

    test('createSite() logs warning messages from npm install at warn level', async () => {
        vi.mocked(spawn).mockImplementation((cmd, args, opts) => {
            const process = new FakeProcess(cmd, args, opts as SpawnOptionsWithoutStdio, 'npm warn I have a bad feeling about this', '', 0.3);
            process.run();
            return process as unknown as ChildProcess;
        });
        vi.mocked(copy).mockImplementation(() => Promise.resolve());
        const testArgs = {
            template: 'test1',
            force: true,
            _: [ ...initialArgs, 'testDestination', '-T', 'test1', '--force' ]
        };

        await createSite(testArgs);

        expect(vi.mocked(logger.warn)).toHaveBeenCalledWith('npm warn I have a bad feeling about this');
    });

    test('createSite() logs error messages from npm install at warn level', async () => {
        vi.mocked(spawn).mockImplementation((cmd, args, opts) => {
            const process = new FakeProcess(cmd, args, opts as SpawnOptionsWithoutStdio, 'Something worked', 'Something else went wrong', 0.3);
            process.run();
            return process as unknown as ChildProcess;
        });
        vi.mocked(copy).mockImplementation(() => Promise.resolve());
        const testArgs = {
            template: 'test1',
            force: true,
            _: [ ...initialArgs, 'testDestination', '-T', 'test1', '--force' ]
        };

        await createSite(testArgs);

        expect(vi.mocked(logger.warn)).toHaveBeenCalledWith('Something else went wrong');
    });

    test('createSite() logs other output from npm install at verbose level', async () => {
        vi.mocked(spawn).mockImplementation((cmd, args, opts) => {
            const process = new FakeProcess(cmd, args, opts as SpawnOptionsWithoutStdio, 'Something worked', 'Something else went wrong', 0.3);
            process.run();
            return process as unknown as ChildProcess;
        });
        vi.mocked(copy).mockImplementation(() => Promise.resolve());
        const testArgs = {
            template: 'test1',
            force: true,
            _: [ ...initialArgs, 'testDestination', '-T', 'test1', '--force' ]
        };

        await createSite(testArgs);

        expect(vi.mocked(logger.verbose)).toHaveBeenCalledWith('Something worked');
    });
});
