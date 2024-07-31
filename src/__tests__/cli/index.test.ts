import { afterEach, describe, expect, test, vi } from 'vitest';

import version from '../../cli/version';
import main from '../../cli/index';
import build from '../../cli/build';
import newCmd from '../../cli/new';
import preview from '../../cli/preview';
import { transports as loggerTransports } from '../../core/logger';

vi.mock('../../cli/version', () => ({
    default: vi.fn(() => Promise.resolve())
}));

vi.mock('../../cli/build', () => ({
    default: vi.fn(() => Promise.resolve()),
    options: {},
    usage: 'Expected build command usage message',
}));

vi.mock('../../cli/new', () => ({
    default: vi.fn(() => Promise.resolve()),
    options: {},
    usage: 'Expected new command usage message'
}));

vi.mock('../../cli/preview', () => ({
    default: vi.fn(() => Promise.resolve()),
    options: {},
    usage: 'Expected preview command usage message'
}));

const initialArgs = [ 'node', 'iceforge' ];

afterEach(() => {
    vi.resetAllMocks();
});

describe('main() tests', () => {
    test('Calls version if --version option is given', async () => {
        const logMock = vi.spyOn(console, 'log').mockImplementation(() => { return; });
        const testArgv = [ ...initialArgs, '--version' ];

        await main(testArgv);

        expect(vi.mocked(version)).toHaveBeenCalled();

        logMock.mockRestore();
    });

    test('Calls version if -V option is given', async () => {
        const logMock = vi.spyOn(console, 'log').mockImplementation(() => { return; });
        const testArgv = [ ...initialArgs, '-V' ];

        await main(testArgv);

        expect(vi.mocked(version)).toHaveBeenCalled();

        logMock.mockRestore();
    });

    test('Prints usage message and exits if invalid command is given', async () => {
        const logMock = vi.spyOn(console, 'log').mockImplementation(() => { return; });
        const errorMock = vi.spyOn(console, 'error').mockImplementation(() => { return; });
        const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        const testArgv = [ ...initialArgs, 'notAValidCommand' ];

        await main(testArgv);

        expect(logMock).toHaveBeenCalled();
        expect(logMock.mock.lastCall?.[0].startsWith('\nUsage:')).toBeTruthy();
        expect(exitMock).toHaveBeenCalledOnce();
        expect(exitMock).toHaveBeenLastCalledWith(1);

        logMock.mockRestore();
        errorMock.mockRestore();
        exitMock.mockRestore();
    });

    test('Runs correct command if build command is given', async () => {
        const testArgv = [ ...initialArgs, 'build' ];

        await main(testArgv);

        expect(build).toHaveBeenCalledOnce();
    });

    test('Runs correct command if new command is given', async () => {
        const testArgv = [ ...initialArgs, 'new' ];

        await main(testArgv);

        expect(newCmd).toHaveBeenCalledOnce();
    });

    test('Runs correct command if preview command is given', async () => {
        const testArgv = [ ...initialArgs, 'preview' ];

        await main(testArgv);

        expect(preview).toHaveBeenCalledOnce();
    });

    test('Prints usage message and exits if plugin command is given', async () => {
        const logMock = vi.spyOn(console, 'log').mockImplementation(() => { return; });
        const errorMock = vi.spyOn(console, 'error').mockImplementation(() => { return; });
        const exitMock = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        const testArgv = [ ...initialArgs, 'plugin' ];

        await main(testArgv);

        expect(logMock).toHaveBeenCalled();
        expect(logMock.mock.lastCall?.[0].startsWith('\nUsage:')).toBeTruthy();
        expect(exitMock).toHaveBeenCalledOnce();
        expect(exitMock).toHaveBeenLastCalledWith(1);

        logMock.mockRestore();
        errorMock.mockRestore();
        exitMock.mockRestore();
    });
    
    describe('Prints usage message for command if --help option is given...', () => {
        test('...for the build command', async () => {
            const logMock = vi.spyOn(console, 'log').mockImplementation(() => { return; });
            const testArgv = [ ...initialArgs, 'build', '--help' ];

            await main(testArgv);

            expect(logMock).toHaveBeenCalled();
            expect(logMock).toHaveBeenLastCalledWith('Expected build command usage message');
            expect(build).not.toHaveBeenCalled();

            logMock.mockRestore();
        });

        test('...for the new command', async () => {
            const logMock = vi.spyOn(console, 'log').mockImplementation(() => { return; });
            const testArgv = [ ...initialArgs, 'new', '--help' ];

            await main(testArgv);

            expect(logMock).toHaveBeenCalled();
            expect(logMock).toHaveBeenLastCalledWith('Expected new command usage message');
            expect(newCmd).not.toHaveBeenCalled();

            logMock.mockRestore();
        });

        test('...for the preview command', async () => {
            const logMock = vi.spyOn(console, 'log').mockImplementation(() => { return; });
            const testArgv = [ ...initialArgs, 'preview', '--help' ];

            await main(testArgv);

            expect(logMock).toHaveBeenCalled();
            expect(logMock).toHaveBeenLastCalledWith('Expected preview command usage message');
            expect(preview).not.toHaveBeenCalled();

            logMock.mockRestore();
        });
    });

    describe('Sets logger transport level to verbose if --verbose option is given...', () => {
        test('...for the build command', async () => {
            const testArgv = [ ...initialArgs, 'build', '--verbose' ];

            await main(testArgv);

            expect(loggerTransports[0].level).toBe('verbose');
        });

        test('...for the new command', async () => {
            const testArgv = [ ...initialArgs, 'new', '--verbose' ];

            await main(testArgv);

            expect(loggerTransports[0].level).toBe('verbose');
        });
        
        test('...for the preview command', async () => {
            const testArgv = [ ...initialArgs, 'preview', '--verbose' ];

            await main(testArgv);

            expect(loggerTransports[0].level).toBe('verbose');
        });
    });

    describe('Sets logger transport level to critical if --quiet option is given...', () => {
        test('...for the build command', async () => {
            const testArgv = [ ...initialArgs, 'build', '--quiet' ];

            await main(testArgv);

            expect(loggerTransports[0].level).toBe('critical');
        });

        test('...for the new command', async () => {
            const testArgv = [ ...initialArgs, 'new', '--quiet' ];

            await main(testArgv);

            expect(loggerTransports[0].level).toBe('critical');
        });

        test('...for the preview command', async () => {
            const testArgv = [ ...initialArgs, 'preview', '--quiet' ];

            await main(testArgv);

            expect(loggerTransports[0].level).toBe('critical');
        });
    });

    describe('Sets logger transport level to critical if --verbose --quiet options are given...', () => {
        test('...for the build command', async () => {
            const testArgv = [ ...initialArgs, 'build', '--verbose', '--quiet' ];

            await main(testArgv);

            expect(loggerTransports[0].level).toBe('critical');
        });

        test('...for the new command', async () => {
            const testArgv = [ ...initialArgs, 'new', '--verbose', '--quiet' ];

            await main(testArgv);

            expect(loggerTransports[0].level).toBe('critical');
        });

        test('...for the preview command', async () => {
            const testArgv = [ ...initialArgs, 'preview', '--verbose', '--quiet' ];

            await main(testArgv);

            expect(loggerTransports[0].level).toBe('critical');
        });
    });

    describe('Sets logger transport level to critical if --quiet --verbose options are given...', () => {
        test('...for the build command', async () => {
            const testArgv = [ ...initialArgs, 'build', '--quiet', '--verbose' ];

            await main(testArgv);

            expect(loggerTransports[0].level).toBe('critical');
        });

        test('...for the new command', async () => {
            const testArgv = [ ...initialArgs, 'build', '--quiet', '--verbose' ];

            await main(testArgv);

            expect(loggerTransports[0].level).toBe('critical');
        });

        test('...for the preview command', async () => {
            const testArgv = [ ...initialArgs, 'build', '--quiet', '--verbose' ];

            await main(testArgv);

            expect(loggerTransports[0].level).toBe('critical');
        });
    });

    describe('Passes correct options to command...', () => {
        test('...for the build command', async () => {
            const testArgv = [ ...initialArgs, 'build', '-o', 'testOutput', '-X', '-C', 'workDir', '--ignore', '*.jpg,*.png' ];
            const expectedResult = {
                o: 'testOutput',
                X: true,
                C: 'workDir',
                ignore: '*.jpg,*.png',
                help: false,
                h: false,
                verbose: false,
                v: false,
                version: false,
                V: false,
                quiet: false,
                q: false,
                _: [ 'node', 'iceforge', 'build' ]
            };

            await main(testArgv);

            expect(vi.mocked(build).mock.lastCall?.[0]).toEqual(expectedResult);
        });

        test('...for the new command', async () => {
            const testArgv = [ ...initialArgs, 'new', '-T', 'exampleTemplate', '-f', '-C', 'workDir', '--verbose' ];
            const expectedResult = {
                T: 'exampleTemplate',
                C: 'workDir',
                f: true,
                help: false,
                h: false,
                verbose: true,
                v: true,
                version: false,
                V: false,
                quiet: false,
                q: false,
                _: [ 'node', 'iceforge', 'new' ]
            };

            await main(testArgv);

            expect(vi.mocked(newCmd).mock.lastCall?.[0]).toEqual(expectedResult);
        });
        
        test('...for the preview command', async () => {
            const testArgv = [ ...initialArgs, 'preview', '-p', '4468', '-C', 'workDir', '-H', 'example.com' ];
            const expectedResult = {
                p: 4468,
                H: 'example.com',
                C: 'workDir',
                help: false,
                h: false,
                verbose: false,
                v: false,
                version: false,
                V: false,
                quiet: false,
                q: false,
                _: [ 'node', 'iceforge', 'preview' ]
            };

            await main(testArgv);

            expect(vi.mocked(preview).mock.lastCall?.[0]).toEqual(expectedResult);
        });
    });
});
