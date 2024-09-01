import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import * as path from 'node:path';
import { readFile } from 'node:fs/promises';
import { Marked, MarkedExtension } from 'marked';
import { markedHighlight } from 'marked-highlight';
import { mangle } from 'marked-mangle';
import { markedSmartypants } from 'marked-smartypants';
import { gfmHeadingId } from 'marked-gfm-heading-id';

import registerPlugin, { MarkdownPage, JsonPage, linkRenderer, imageRenderer } from '../../../plugins/markdown';
import Environment from '../../../core/environment';
import { defaultConfig } from '../../../core/config';
import { testLogger } from '../../testUtils';
import { FakeEnvironment } from '../../core/fakes/fakeEnvironment';
import { FakePlugin } from '../../core/fakes/fakePlugin';
import ContentTree from '../../../core/contentTree';

vi.mock('node:fs/promises');
vi.mock('marked');
vi.mock('marked-highlight');
vi.mock('marked-mangle');
vi.mock('marked-smartypants');
vi.mock('marked-gfm-heading-id');

beforeAll(() => {
    Marked.prototype.parse = vi.fn(() => '' as string & Promise<string>);
    vi.mocked(readFile).mockImplementation(async () => Buffer.from(''));
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('MarkdownPage tests', () => {
    describe('Constructor tests', () => {
        test('Constructor sets filepath property', () => {
            const mockFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const mockMetadata = {};
            const mockMarkdown = 'Markdown text of page';

            const testOutput = new MarkdownPage(mockFilepath, mockMetadata, mockMarkdown);

            expect(testOutput.filepath).toStrictEqual(mockFilepath);
        });

        test('Constructor sets metadata property', () => {
            const mockFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const mockMetadata = { key: 'value' };
            const mockMarkdown = 'Markdown text of page';

            const testOutput = new MarkdownPage(mockFilepath, mockMetadata, mockMarkdown);

            expect(testOutput.metadata).toStrictEqual(mockMetadata);
        });

        test('Constructor sets markdown property', () => {
            const mockFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const mockMetadata = {};
            const mockMarkdown = 'Markdown text of page';

            const testOutput = new MarkdownPage(mockFilepath, mockMetadata, mockMarkdown);

            expect(testOutput.markdown).toStrictEqual(mockMarkdown);
        });
    });

    describe('name tests', () => {
        test('name returns MarkdownPage', () => {
            const mockFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const mockMetadata = {};
            const mockMarkdown = 'Markdown text of page';
            const testObject = new MarkdownPage(mockFilepath, mockMetadata, mockMarkdown);

            const testOutput = testObject.name;

            expect(testOutput).toBe('MarkdownPage');
        });
    });

    describe('getLocation() tests', () => {
        describe('getLocation() without parameter returns the url property from its start up to but not including the final slash...', () => {
            describe('...if baseUrl is set in config and...', () => {
                test('...url does not end in slash', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.jpg' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: '/testBase/' });
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getLocation();

                    expect(testOutput).toBe('/testBase/content');
                });

                test('...url ends in slash', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: '/testBase/' });
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getLocation();

                    expect(testOutput).toBe('/testBase/content');
                });
            });

            describe('...if baseUrl is not set and...', () => {
                test('...url does not end in slash', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.jpg' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getLocation();

                    expect(testOutput).toBe('/content');
                });

                test('...url ends in slash', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getLocation();

                    expect(testOutput).toBe('/content');
                });
            });
        });

        describe('getLocation() with parameter returns the output of getUrl() with the same parameter up to and including the final slash...', () => {
            test('...if output of getUrl() with the same parameter does not end in slash', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.jpg' };
                const testMetadata = { filename: ':basename' };
                const fakeEnvironment = new FakeEnvironment();
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                testObject.__env = fakeEnvironment;

                const testOutput = testObject.getLocation('/testBase');

                expect(testOutput).toBe('/testBase/content');
            });

            test('...if output of getUrl() with the same parameter ends in slash', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = { filename: ':basename' };
                const fakeEnvironment = new FakeEnvironment();
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                testObject.__env = fakeEnvironment;

                const testOutput = testObject.getLocation('/testBase');

                expect(testOutput).toBe('/testBase/content');
            });
        });
    });
    
    describe('getHtml() and html tests', () => {
        describe('When getHtml() is called with parameter...', () => {
            describe('...and Markdown config is not set...', () => {
                test('...Marked instance is created correctly', () => {
                    const mockHighlighter = vi.fn() as MarkedExtension;
                    vi.mocked(markedHighlight).mockImplementation(() => mockHighlighter);
                    const mockMangler = vi.fn() as MarkedExtension;
                    vi.mocked(mangle).mockImplementation(() => mockMangler);
                    const mockTypographer = vi.fn() as MarkedExtension;
                    vi.mocked(markedSmartypants).mockImplementation(() => mockTypographer);
                    const mockHeadingExtension = vi.fn() as MarkedExtension;
                    vi.mocked(gfmHeadingId).mockImplementation(() => mockHeadingExtension);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;
                    const expectedOptions = {
                        renderer: {
                            link: expect.any(Function),
                            image: expect.any(Function)
                        },
                        useNewRenderer: true
                    };

                    testObject.getHtml('/testBase');

                    expect(vi.mocked(Marked)).toHaveBeenCalledOnce();
                    expect(vi.mocked(Marked).mock.lastCall?.[0]).toEqual(expectedOptions);
                    expect(vi.mocked(Marked).mock.lastCall?.[1]).toBe(mockHighlighter);
                    expect(vi.mocked(Marked).mock.lastCall?.[2]).toBe(mockMangler);
                    expect(vi.mocked(Marked).mock.lastCall?.[3]).toBe(mockTypographer);
                    expect(vi.mocked(Marked).mock.lastCall?.[4]).toBe(mockHeadingExtension);
                    expect(gfmHeadingId).toHaveBeenLastCalledWith({
                        prefix: 'iceforge-'
                    });
                });

                test('...Marked.parse() is called', () => {
                    const mockMarked = {
                        parse: vi.fn(() => '')
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    testObject.getHtml('/testBase');

                    expect(mockMarked.parse).toHaveBeenCalledOnce();
                    expect(mockMarked.parse).toHaveBeenLastCalledWith(testMarkdown);
                });

                test('...Result of Marked.parse() is returned', () => {
                    const expectedResult = 'This is the rendered page';
                    const mockMarked = {
                        parse: vi.fn(() => expectedResult)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getHtml('/testBase');

                    expect(testOutput).toBe(expectedResult);
                });
            });

            describe('...and Markdown config is set', () => {
                test('...Marked instance is created correctly', () => {
                    const mockHighlighter = vi.fn() as MarkedExtension;
                    vi.mocked(markedHighlight).mockImplementation(() => mockHighlighter);
                    const mockMangler = vi.fn() as MarkedExtension;
                    vi.mocked(mangle).mockImplementation(() => mockMangler);
                    const mockTypographer = vi.fn() as MarkedExtension;
                    vi.mocked(markedSmartypants).mockImplementation(() => mockTypographer);
                    const mockHeadingExtension = vi.fn() as MarkedExtension;
                    vi.mocked(gfmHeadingId).mockImplementation(() => mockHeadingExtension);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;
                    const expectedOptions = {
                        someSetting: 'value',
                        renderer: {
                            link: expect.any(Function),
                            image: expect.any(Function)
                        },
                        useNewRenderer: true
                    };

                    testObject.getHtml('/testBase');

                    expect(vi.mocked(Marked)).toHaveBeenCalledOnce();
                    expect(vi.mocked(Marked).mock.lastCall?.[0]).toEqual(expectedOptions);
                    expect(vi.mocked(Marked).mock.lastCall?.[1]).toBe(mockHighlighter);
                    expect(vi.mocked(Marked).mock.lastCall?.[2]).toBe(mockMangler);
                    expect(vi.mocked(Marked).mock.lastCall?.[3]).toBe(mockTypographer);
                    expect(vi.mocked(Marked).mock.lastCall?.[4]).toBe(mockHeadingExtension);
                    expect(gfmHeadingId).toHaveBeenLastCalledWith({
                        prefix: 'iceforge-'
                    });
                });

                test('...Marked.parse() is called', () => {
                    const mockMarked = {
                        parse: vi.fn(() => '')
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    testObject.getHtml('/testBase');

                    expect(mockMarked.parse).toHaveBeenCalledOnce();
                    expect(mockMarked.parse).toHaveBeenLastCalledWith(testMarkdown);
                });

                test('...Result of Marked.parse() is returned', () => {
                    const expectedResult = 'This is the rendered page';
                    const mockMarked = {
                        parse: vi.fn(() => expectedResult)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getHtml('/testBase');

                    expect(testOutput).toBe(expectedResult);
                });
            });
        });

        describe('When getHtml() is called without parameter...', () => {
            describe('...and Markdown config is not set...', () => {
                test('...Marked instance is created correctly', () => {
                    const mockHighlighter = vi.fn() as MarkedExtension;
                    vi.mocked(markedHighlight).mockImplementation(() => mockHighlighter);
                    const mockMangler = vi.fn() as MarkedExtension;
                    vi.mocked(mangle).mockImplementation(() => mockMangler);
                    const mockTypographer = vi.fn() as MarkedExtension;
                    vi.mocked(markedSmartypants).mockImplementation(() => mockTypographer);
                    const mockHeadingExtension = vi.fn() as MarkedExtension;
                    vi.mocked(gfmHeadingId).mockImplementation(() => mockHeadingExtension);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;
                    const expectedOptions = {
                        renderer: {
                            link: expect.any(Function),
                            image: expect.any(Function)
                        },
                        useNewRenderer: true
                    };

                    testObject.getHtml();

                    expect(vi.mocked(Marked)).toHaveBeenCalledOnce();
                    expect(vi.mocked(Marked).mock.lastCall?.[0]).toEqual(expectedOptions);
                    expect(vi.mocked(Marked).mock.lastCall?.[1]).toBe(mockHighlighter);
                    expect(vi.mocked(Marked).mock.lastCall?.[2]).toBe(mockMangler);
                    expect(vi.mocked(Marked).mock.lastCall?.[3]).toBe(mockTypographer);
                    expect(vi.mocked(Marked).mock.lastCall?.[4]).toBe(mockHeadingExtension);
                    expect(gfmHeadingId).toHaveBeenLastCalledWith({
                        prefix: 'iceforge-'
                    });
                });

                test('...Marked.parse() is called', () => {
                    const mockMarked = {
                        parse: vi.fn(() => '')
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    testObject.getHtml();

                    expect(mockMarked.parse).toHaveBeenCalledOnce();
                    expect(mockMarked.parse).toHaveBeenLastCalledWith(testMarkdown);
                });

                test('...Result of Marked.parse() is returned', () => {
                    const expectedResult = 'This is the rendered page';
                    const mockMarked = {
                        parse: vi.fn(() => expectedResult)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getHtml();

                    expect(testOutput).toBe(expectedResult);
                });
            });

            describe('...and Markdown config is set...', () => {
                test('...Marked instance is created correctly', () => {
                    const mockHighlighter = vi.fn() as MarkedExtension;
                    vi.mocked(markedHighlight).mockImplementation(() => mockHighlighter);
                    const mockMangler = vi.fn() as MarkedExtension;
                    vi.mocked(mangle).mockImplementation(() => mockMangler);
                    const mockTypographer = vi.fn() as MarkedExtension;
                    vi.mocked(markedSmartypants).mockImplementation(() => mockTypographer);
                    const mockHeadingExtension = vi.fn() as MarkedExtension;
                    vi.mocked(gfmHeadingId).mockImplementation(() => mockHeadingExtension);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;
                    const expectedOptions = {
                        someSetting: 'value',
                        renderer: {
                            link: expect.any(Function),
                            image: expect.any(Function)
                        },
                        useNewRenderer: true
                    };

                    testObject.getHtml();

                    expect(vi.mocked(Marked)).toHaveBeenCalledOnce();
                    expect(vi.mocked(Marked).mock.lastCall?.[0]).toEqual(expectedOptions);
                    expect(vi.mocked(Marked).mock.lastCall?.[1]).toBe(mockHighlighter);
                    expect(vi.mocked(Marked).mock.lastCall?.[2]).toBe(mockMangler);
                    expect(vi.mocked(Marked).mock.lastCall?.[3]).toBe(mockTypographer);
                    expect(vi.mocked(Marked).mock.lastCall?.[4]).toBe(mockHeadingExtension);
                    expect(gfmHeadingId).toHaveBeenLastCalledWith({
                        prefix: 'iceforge-'
                    });
                });

                test('...Marked.parse() is called', () => {
                    const mockMarked = {
                        parse: vi.fn(() => '')
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    testObject.getHtml();

                    expect(mockMarked.parse).toHaveBeenCalledOnce();
                    expect(mockMarked.parse).toHaveBeenLastCalledWith(testMarkdown);
                });

                test('...Result of Marked.parse() is returned', () => {
                    const expectedResult = 'This is the rendered page';
                    const mockMarked = {
                        parse: vi.fn(() => expectedResult)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getHtml();

                    expect(testOutput).toBe(expectedResult);
                });
            });
        });

        describe('When html getter is called...', () => {
            describe('...and Markdown config is not set...', () => {
                test('...Marked instance is created correctly', () => {
                    const mockHighlighter = vi.fn() as MarkedExtension;
                    vi.mocked(markedHighlight).mockImplementation(() => mockHighlighter);
                    const mockMangler = vi.fn() as MarkedExtension;
                    vi.mocked(mangle).mockImplementation(() => mockMangler);
                    const mockTypographer = vi.fn() as MarkedExtension;
                    vi.mocked(markedSmartypants).mockImplementation(() => mockTypographer);
                    const mockHeadingExtension = vi.fn() as MarkedExtension;
                    vi.mocked(gfmHeadingId).mockImplementation(() => mockHeadingExtension);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;
                    const expectedOptions = {
                        renderer: {
                            link: expect.any(Function),
                            image: expect.any(Function)
                        },
                        useNewRenderer: true
                    };

                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const testOutput = testObject.html;

                    expect(vi.mocked(Marked)).toHaveBeenCalledOnce();
                    expect(vi.mocked(Marked).mock.lastCall?.[0]).toEqual(expectedOptions);
                    expect(vi.mocked(Marked).mock.lastCall?.[1]).toBe(mockHighlighter);
                    expect(vi.mocked(Marked).mock.lastCall?.[2]).toBe(mockMangler);
                    expect(vi.mocked(Marked).mock.lastCall?.[3]).toBe(mockTypographer);
                    expect(vi.mocked(Marked).mock.lastCall?.[4]).toBe(mockHeadingExtension);
                    expect(gfmHeadingId).toHaveBeenLastCalledWith({
                        prefix: 'iceforge-'
                    });
                });

                test('...Marked.parse() is called', () => {
                    const mockMarked = {
                        parse: vi.fn(() => '')
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const testOutput = testObject.html;

                    expect(mockMarked.parse).toHaveBeenCalledOnce();
                    expect(mockMarked.parse).toHaveBeenLastCalledWith(testMarkdown);
                });

                test('...Result of Marked.parse() is returned', () => {
                    const expectedResult = 'This is the rendered page';
                    const mockMarked = {
                        parse: vi.fn(() => expectedResult)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.html;

                    expect(testOutput).toBe(expectedResult);
                });
            });

            describe('...and Markdown config is set...', () => {
                test('...Marked instance is created correctly', () => {
                    const mockHighlighter = vi.fn() as MarkedExtension;
                    vi.mocked(markedHighlight).mockImplementation(() => mockHighlighter);
                    const mockMangler = vi.fn() as MarkedExtension;
                    vi.mocked(mangle).mockImplementation(() => mockMangler);
                    const mockTypographer = vi.fn() as MarkedExtension;
                    vi.mocked(markedSmartypants).mockImplementation(() => mockTypographer);
                    const mockHeadingExtension = vi.fn() as MarkedExtension;
                    vi.mocked(gfmHeadingId).mockImplementation(() => mockHeadingExtension);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;
                    const expectedOptions = {
                        someSetting: 'value',
                        renderer: {
                            link: expect.any(Function),
                            image: expect.any(Function)
                        },
                        useNewRenderer: true
                    };

                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const testOutput = testObject.html;

                    expect(vi.mocked(Marked)).toHaveBeenCalledOnce();
                    expect(vi.mocked(Marked).mock.lastCall?.[0]).toEqual(expectedOptions);
                    expect(vi.mocked(Marked).mock.lastCall?.[1]).toBe(mockHighlighter);
                    expect(vi.mocked(Marked).mock.lastCall?.[2]).toBe(mockMangler);
                    expect(vi.mocked(Marked).mock.lastCall?.[3]).toBe(mockTypographer);
                    expect(vi.mocked(Marked).mock.lastCall?.[4]).toBe(mockHeadingExtension);
                    expect(gfmHeadingId).toHaveBeenLastCalledWith({
                        prefix: 'iceforge-'
                    });
                });

                test('...Marked.parse() is called', () => {
                    const mockMarked = {
                        parse: vi.fn(() => '')
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const testOutput = testObject.html;

                    expect(mockMarked.parse).toHaveBeenCalledOnce();
                    expect(mockMarked.parse).toHaveBeenLastCalledWith(testMarkdown);
                });

                test('...Result of Marked.parse() is returned', () => {
                    const expectedResult = 'This is the rendered page';
                    const mockMarked = {
                        parse: vi.fn(() => expectedResult)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.html;

                    expect(testOutput).toBe(expectedResult);
                });
            });
        });
    });

    describe('getIntro() and intro tests', () => {
        describe('When getIntro() is called with parameter...', () => {
            describe('...and Markdown config is not set...', () => {
                test('...Marked instance is created correctly', () => {
                    const mockHighlighter = vi.fn() as MarkedExtension;
                    vi.mocked(markedHighlight).mockImplementation(() => mockHighlighter);
                    const mockMangler = vi.fn() as MarkedExtension;
                    vi.mocked(mangle).mockImplementation(() => mockMangler);
                    const mockTypographer = vi.fn() as MarkedExtension;
                    vi.mocked(markedSmartypants).mockImplementation(() => mockTypographer);
                    const mockHeadingExtension = vi.fn() as MarkedExtension;
                    vi.mocked(gfmHeadingId).mockImplementation(() => mockHeadingExtension);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;
                    const expectedOptions = {
                        renderer: {
                            link: expect.any(Function),
                            image: expect.any(Function)
                        },
                        useNewRenderer: true
                    };

                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const testOutput = testObject.getIntro('/testBase');

                    expect(vi.mocked(Marked)).toHaveBeenCalledOnce();
                    expect(vi.mocked(Marked).mock.lastCall?.[0]).toEqual(expectedOptions);
                    expect(vi.mocked(Marked).mock.lastCall?.[1]).toBe(mockHighlighter);
                    expect(vi.mocked(Marked).mock.lastCall?.[2]).toBe(mockMangler);
                    expect(vi.mocked(Marked).mock.lastCall?.[3]).toBe(mockTypographer);
                    expect(vi.mocked(Marked).mock.lastCall?.[4]).toBe(mockHeadingExtension);
                    expect(gfmHeadingId).toHaveBeenLastCalledWith({
                        prefix: 'iceforge-'
                    });
                });

                test('...Marked.parse() is called', () => {
                    const testHtml = 'This is the rendered HTML';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    testObject.getIntro('/testBase');

                    expect(mockMarked.parse).toHaveBeenCalledOnce();
                    expect(mockMarked.parse).toHaveBeenLastCalledWith(testMarkdown);
                });

                test('...and the result of Marked.parse() contains a class=more <span> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <span class="more">but not this</span> or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro('/testBase');

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains an <h2> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <h2>but not this</h2> or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro('/testBase');

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains an <hr> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <hr>but not this or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro('/testBase');

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains no cutoff elements, the entire parse output is returned', () => {
                    const testHtml = 'In this test, we will receive the entire parse output';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro('/testBase');

                    expect(testOutput).toBe('In this test, we will receive the entire parse output');
                });

                test('...and the result of Marked.parse() contains multiple cutoff elements, the parse output up to the first cutoff element is returned', () => {
                    const testHtml = 'In this test, we will only see this,<hr>not this,<h2>or this..</h2>Not this part, <span class="more">and definitely not this</span>';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro('/testBase');

                    expect(testOutput).toBe('In this test, we will only see this,');
                });
            });

            describe('...and Markdown config is set...', () => {
                test('...Marked instance is created correctly', () => {
                    const mockHighlighter = vi.fn() as MarkedExtension;
                    vi.mocked(markedHighlight).mockImplementation(() => mockHighlighter);
                    const mockMangler = vi.fn() as MarkedExtension;
                    vi.mocked(mangle).mockImplementation(() => mockMangler);
                    const mockTypographer = vi.fn() as MarkedExtension;
                    vi.mocked(markedSmartypants).mockImplementation(() => mockTypographer);
                    const mockHeadingExtension = vi.fn() as MarkedExtension;
                    vi.mocked(gfmHeadingId).mockImplementation(() => mockHeadingExtension);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;
                    const expectedOptions = {
                        someSetting: 'value',
                        renderer: {
                            link: expect.any(Function),
                            image: expect.any(Function)
                        },
                        useNewRenderer: true
                    };

                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const testOutput = testObject.getIntro('/testBase');

                    expect(vi.mocked(Marked)).toHaveBeenCalledOnce();
                    expect(vi.mocked(Marked).mock.lastCall?.[0]).toEqual(expectedOptions);
                    expect(vi.mocked(Marked).mock.lastCall?.[1]).toBe(mockHighlighter);
                    expect(vi.mocked(Marked).mock.lastCall?.[2]).toBe(mockMangler);
                    expect(vi.mocked(Marked).mock.lastCall?.[3]).toBe(mockTypographer);
                    expect(vi.mocked(Marked).mock.lastCall?.[4]).toBe(mockHeadingExtension);
                    expect(gfmHeadingId).toHaveBeenLastCalledWith({
                        prefix: 'iceforge-'
                    });
                });

                test('...Marked.parse() is called', () => {
                    const testHtml = 'This is the rendered HTML';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    testObject.getIntro('/testBase');

                    expect(mockMarked.parse).toHaveBeenCalledOnce();
                    expect(mockMarked.parse).toHaveBeenLastCalledWith(testMarkdown);
                });

                test('...and the result of Marked.parse() contains a class=more <span> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <span class="more">but not this</span> or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro('/testBase');

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains an <h2> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <h2>but not this</h2> or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro('/testBase');

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains an <hr> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <hr>but not this or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro('/testBase');

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains no cutoff elements, the entire parse output is returned', () => {
                    const testHtml = 'In this test, we will receive the entire parse output';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro('/testBase');

                    expect(testOutput).toBe('In this test, we will receive the entire parse output');
                });

                test('...and the result of Marked.parse() contains multiple cutoff elements, the parse output up to the first cutoff element is returned', () => {
                    const testHtml = 'In this test, we will only see this,<hr>not this,<h2>or this..</h2>Not this part, <span class="more">and definitely not this</span>';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro('/testBase');

                    expect(testOutput).toBe('In this test, we will only see this,');
                });
            });
        });

        describe('When getIntro() is called without parameter...', () => {
            describe('...and Markdown config is not set...', () => {
                test('...Marked instance is created correctly', () => {
                    const mockHighlighter = vi.fn() as MarkedExtension;
                    vi.mocked(markedHighlight).mockImplementation(() => mockHighlighter);
                    const mockMangler = vi.fn() as MarkedExtension;
                    vi.mocked(mangle).mockImplementation(() => mockMangler);
                    const mockTypographer = vi.fn() as MarkedExtension;
                    vi.mocked(markedSmartypants).mockImplementation(() => mockTypographer);
                    const mockHeadingExtension = vi.fn() as MarkedExtension;
                    vi.mocked(gfmHeadingId).mockImplementation(() => mockHeadingExtension);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;
                    const expectedOptions = {
                        renderer: {
                            link: expect.any(Function),
                            image: expect.any(Function)
                        },
                        useNewRenderer: true
                    };

                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const testOutput = testObject.getIntro();

                    expect(vi.mocked(Marked)).toHaveBeenCalledOnce();
                    expect(vi.mocked(Marked).mock.lastCall?.[0]).toEqual(expectedOptions);
                    expect(vi.mocked(Marked).mock.lastCall?.[1]).toBe(mockHighlighter);
                    expect(vi.mocked(Marked).mock.lastCall?.[2]).toBe(mockMangler);
                    expect(vi.mocked(Marked).mock.lastCall?.[3]).toBe(mockTypographer);
                    expect(vi.mocked(Marked).mock.lastCall?.[4]).toBe(mockHeadingExtension);
                    expect(gfmHeadingId).toHaveBeenLastCalledWith({
                        prefix: 'iceforge-'
                    });
                });

                test('...Marked.parse() is called', () => {
                    const testHtml = 'This is the rendered HTML';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    testObject.getIntro();

                    expect(mockMarked.parse).toHaveBeenCalledOnce();
                    expect(mockMarked.parse).toHaveBeenLastCalledWith(testMarkdown);
                });

                test('...and the result of Marked.parse() contains a class=more <span> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <span class="more">but not this</span> or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro();

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains an <h2> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <h2>but not this</h2> or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro();

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains an <hr> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <hr>but not this or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro();

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains no cutoff elements, the entire parse output is returned', () => {
                    const testHtml = 'In this test, we will receive the entire parse output';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro();

                    expect(testOutput).toBe('In this test, we will receive the entire parse output');
                });

                test('...and the result of Marked.parse() contains multiple cutoff elements, the parse output up to the first cutoff element is returned', () => {
                    const testHtml = 'In this test, we will only see this,<hr>not this,<h2>or this..</h2>Not this part, <span class="more">and definitely not this</span>';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro();

                    expect(testOutput).toBe('In this test, we will only see this,');
                });
            });

            describe('...and Markdown config is set...', () => {
                test('...Marked instance is created correctly', () => {
                    const mockHighlighter = vi.fn() as MarkedExtension;
                    vi.mocked(markedHighlight).mockImplementation(() => mockHighlighter);
                    const mockMangler = vi.fn() as MarkedExtension;
                    vi.mocked(mangle).mockImplementation(() => mockMangler);
                    const mockTypographer = vi.fn() as MarkedExtension;
                    vi.mocked(markedSmartypants).mockImplementation(() => mockTypographer);
                    const mockHeadingExtension = vi.fn() as MarkedExtension;
                    vi.mocked(gfmHeadingId).mockImplementation(() => mockHeadingExtension);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;
                    const expectedOptions = {
                        someSetting: 'value',
                        renderer: {
                            link: expect.any(Function),
                            image: expect.any(Function)
                        },
                        useNewRenderer: true
                    };

                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const testOutput = testObject.getIntro();

                    expect(vi.mocked(Marked)).toHaveBeenCalledOnce();
                    expect(vi.mocked(Marked).mock.lastCall?.[0]).toEqual(expectedOptions);
                    expect(vi.mocked(Marked).mock.lastCall?.[1]).toBe(mockHighlighter);
                    expect(vi.mocked(Marked).mock.lastCall?.[2]).toBe(mockMangler);
                    expect(vi.mocked(Marked).mock.lastCall?.[3]).toBe(mockTypographer);
                    expect(vi.mocked(Marked).mock.lastCall?.[4]).toBe(mockHeadingExtension);
                    expect(gfmHeadingId).toHaveBeenLastCalledWith({
                        prefix: 'iceforge-'
                    });
                });

                test('...Marked.parse() is called', () => {
                    const testHtml = 'This is the rendered HTML';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    testObject.getIntro();

                    expect(mockMarked.parse).toHaveBeenCalledOnce();
                    expect(mockMarked.parse).toHaveBeenLastCalledWith(testMarkdown);
                });

                test('...and the result of Marked.parse() contains a class=more <span> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <span class="more">but not this</span> or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro();

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains an <h2> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <h2>but not this</h2> or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro();

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains an <hr> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <hr>but not this or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro();

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains no cutoff elements, the entire parse output is returned', () => {
                    const testHtml = 'In this test, we will receive the entire parse output';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro();

                    expect(testOutput).toBe('In this test, we will receive the entire parse output');
                });

                test('...and the result of Marked.parse() contains multiple cutoff elements, the parse output up to the first cutoff element is returned', () => {
                    const testHtml = 'In this test, we will only see this,<hr>not this,<h2>or this..</h2>Not this part, <span class="more">and definitely not this</span>';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getIntro();

                    expect(testOutput).toBe('In this test, we will only see this,');
                });
            });
        });

        describe('When intro getter is called...', () => {
            describe('...and Markdown config is not set...', () => {
                test('...Marked instance is created correctly', () => {
                    const mockHighlighter = vi.fn() as MarkedExtension;
                    vi.mocked(markedHighlight).mockImplementation(() => mockHighlighter);
                    const mockMangler = vi.fn() as MarkedExtension;
                    vi.mocked(mangle).mockImplementation(() => mockMangler);
                    const mockTypographer = vi.fn() as MarkedExtension;
                    vi.mocked(markedSmartypants).mockImplementation(() => mockTypographer);
                    const mockHeadingExtension = vi.fn() as MarkedExtension;
                    vi.mocked(gfmHeadingId).mockImplementation(() => mockHeadingExtension);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;
                    const expectedOptions = {
                        renderer: {
                            link: expect.any(Function),
                            image: expect.any(Function)
                        },
                        useNewRenderer: true
                    };

                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const testOutput = testObject.intro;

                    expect(vi.mocked(Marked)).toHaveBeenCalledOnce();
                    expect(vi.mocked(Marked).mock.lastCall?.[0]).toEqual(expectedOptions);
                    expect(vi.mocked(Marked).mock.lastCall?.[1]).toBe(mockHighlighter);
                    expect(vi.mocked(Marked).mock.lastCall?.[2]).toBe(mockMangler);
                    expect(vi.mocked(Marked).mock.lastCall?.[3]).toBe(mockTypographer);
                    expect(vi.mocked(Marked).mock.lastCall?.[4]).toBe(mockHeadingExtension);
                    expect(gfmHeadingId).toHaveBeenLastCalledWith({
                        prefix: 'iceforge-'
                    });
                });

                test('...Marked.parse() is called', () => {
                    const testHtml = 'This is the rendered HTML';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const _ = testObject.intro;

                    expect(mockMarked.parse).toHaveBeenCalledOnce();
                    expect(mockMarked.parse).toHaveBeenLastCalledWith(testMarkdown);
                });

                test('...and the result of Marked.parse() contains a class=more <span> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <span class="more">but not this</span> or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.intro;

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains an <h2> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <h2>but not this</h2> or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.intro;

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains an <hr> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <hr>but not this or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.intro;

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains no cutoff elements, the entire parse output is returned', () => {
                    const testHtml = 'In this test, we will receive the entire parse output';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.intro;

                    expect(testOutput).toBe('In this test, we will receive the entire parse output');
                });

                test('...and the result of Marked.parse() contains multiple cutoff elements, the parse output up to the first cutoff element is returned', () => {
                    const testHtml = 'In this test, we will only see this,<hr>not this,<h2>or this..</h2>Not this part, <span class="more">and definitely not this</span>';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment();
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.intro;

                    expect(testOutput).toBe('In this test, we will only see this,');
                });
            });

            describe('...and Markdown config is set...', () => {
                test('...Marked instance is created correctly', () => {
                    const mockHighlighter = vi.fn() as MarkedExtension;
                    vi.mocked(markedHighlight).mockImplementation(() => mockHighlighter);
                    const mockMangler = vi.fn() as MarkedExtension;
                    vi.mocked(mangle).mockImplementation(() => mockMangler);
                    const mockTypographer = vi.fn() as MarkedExtension;
                    vi.mocked(markedSmartypants).mockImplementation(() => mockTypographer);
                    const mockHeadingExtension = vi.fn() as MarkedExtension;
                    vi.mocked(gfmHeadingId).mockImplementation(() => mockHeadingExtension);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;
                    const expectedOptions = {
                        someSetting: 'value',
                        renderer: {
                            link: expect.any(Function),
                            image: expect.any(Function)
                        },
                        useNewRenderer: true
                    };

                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const testOutput = testObject.intro;

                    expect(vi.mocked(Marked)).toHaveBeenCalledOnce();
                    expect(vi.mocked(Marked).mock.lastCall?.[0]).toEqual(expectedOptions);
                    expect(vi.mocked(Marked).mock.lastCall?.[1]).toBe(mockHighlighter);
                    expect(vi.mocked(Marked).mock.lastCall?.[2]).toBe(mockMangler);
                    expect(vi.mocked(Marked).mock.lastCall?.[3]).toBe(mockTypographer);
                    expect(vi.mocked(Marked).mock.lastCall?.[4]).toBe(mockHeadingExtension);
                    expect(gfmHeadingId).toHaveBeenLastCalledWith({
                        prefix: 'iceforge-'
                    });
                });

                test('...Marked.parse() is called', () => {
                    const testHtml = 'This is the rendered HTML';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const _ = testObject.intro;

                    expect(mockMarked.parse).toHaveBeenCalledOnce();
                    expect(mockMarked.parse).toHaveBeenLastCalledWith(testMarkdown);
                });

                test('...and the result of Marked.parse() contains a class=more <span> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <span class="more">but not this</span> or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.intro;

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains an <h2> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <h2>but not this</h2> or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.intro;

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains an <hr> element, the parse output up to that element is returned', () => {
                    const testHtml = 'This is<br>what we will see <hr>but not this or this';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.intro;

                    expect(testOutput).toBe('This is<br>what we will see ');
                });

                test('...and the result of Marked.parse() contains no cutoff elements, the entire parse output is returned', () => {
                    const testHtml = 'In this test, we will receive the entire parse output';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.intro;

                    expect(testOutput).toBe('In this test, we will receive the entire parse output');
                });

                test('...and the result of Marked.parse() contains multiple cutoff elements, the parse output up to the first cutoff element is returned', () => {
                    const testHtml = 'In this test, we will only see this,<hr>not this,<h2>or this..</h2>Not this part, <span class="more">and definitely not this</span>';
                    const mockMarked = {
                        parse: vi.fn(() => testHtml)
                    };
                    vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = {};
                    const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                    const testMarkdown = 'This is our page\'s content';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.intro;

                    expect(testOutput).toBe('In this test, we will only see this,');
                });
            });
        });
    });

    describe('When hasmore getter is called...', () => {
        describe('...and Markdown config is not set', () => {
            test('...Marked instance is created correctly', () => {
                const mockHighlighter = vi.fn() as MarkedExtension;
                vi.mocked(markedHighlight).mockImplementation(() => mockHighlighter);
                const mockMangler = vi.fn() as MarkedExtension;
                vi.mocked(mangle).mockImplementation(() => mockMangler);
                const mockTypographer = vi.fn() as MarkedExtension;
                vi.mocked(markedSmartypants).mockImplementation(() => mockTypographer);
                const mockHeadingExtension = vi.fn() as MarkedExtension;
                vi.mocked(gfmHeadingId).mockImplementation(() => mockHeadingExtension);
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = {};
                const fakeEnvironment = new FakeEnvironment();
                const testMarkdown = 'This is our page\'s content';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                testObject.__env = fakeEnvironment;
                const expectedOptions = {
                    renderer: {
                        link: expect.any(Function),
                        image: expect.any(Function)
                    },
                    useNewRenderer: true
                };

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const testOutput = testObject.hasMore;

                expect(vi.mocked(Marked)).toHaveBeenCalled();
                for (const call of vi.mocked(Marked).mock.calls) {
                    expect(call[0]).toEqual(expectedOptions);
                    expect(call[1]).toBe(mockHighlighter);
                    expect(call[2]).toBe(mockMangler);
                    expect(call[3]).toBe(mockTypographer);
                    expect(call[4]).toBe(mockHeadingExtension);
                }
                expect(gfmHeadingId).toHaveBeenLastCalledWith({
                    prefix: 'iceforge-'
                });
            });

            test('...Marked.parse() is called', () => {
                const testHtml = 'This is the rendered HTML';
                const mockMarked = {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    parse: vi.fn((x) => testHtml)
                };
                vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = {};
                const fakeEnvironment = new FakeEnvironment();
                const testMarkdown = 'This is our page\'s content';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                testObject.__env = fakeEnvironment;

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const testOutput = testObject.hasMore;

                for (const call of mockMarked.parse.mock.calls) {
                    expect(call[0]).toBe(testMarkdown);
                }
            });

            test('...and the result of Marked.parse() contains a class=more <span> element, true is returned', () => {
                const testHtml = 'This is<br>what we will see <span class="more">but not this</span> or this';
                const mockMarked = {
                    parse: vi.fn(() => testHtml)
                };
                vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = {};
                const fakeEnvironment = new FakeEnvironment();
                const testMarkdown = 'This is our page\'s content';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                testObject.__env = fakeEnvironment;

                const testOutput = testObject.hasMore;

                expect(testOutput).toBeTruthy();
            });

            test('...and the result of Marked.parse() contains an <h2> element, true is returned', () => {
                const testHtml = 'This is<br>what we will see <h2>but not this</h2> or this';
                const mockMarked = {
                    parse: vi.fn(() => testHtml)
                };
                vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = {};
                const fakeEnvironment = new FakeEnvironment();
                const testMarkdown = 'This is our page\'s content';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                testObject.__env = fakeEnvironment;
                
                const testOutput = testObject.hasMore;

                expect(testOutput).toBeTruthy();
            });

            test('...and the result of Marked.parse() contains an <hr> element, true is returned', () => {
                const testHtml = 'This is<br>what we will see <hr>but not this or this';
                const mockMarked = {
                    parse: vi.fn(() => testHtml)
                };
                vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = {};
                const fakeEnvironment = new FakeEnvironment();
                const testMarkdown = 'This is our page\'s content';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                testObject.__env = fakeEnvironment;

                const testOutput = testObject.hasMore;

                expect(testOutput).toBeTruthy();
            });

            test('...and the result of Marked.parse() contains no cutoff elements, false is returned', () => {
                const testHtml = 'In this test, we will receive the entire parse output';
                const mockMarked = {
                    parse: vi.fn(() => testHtml)
                };
                vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = {};
                const fakeEnvironment = new FakeEnvironment();
                const testMarkdown = 'This is our page\'s content';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                testObject.__env = fakeEnvironment;

                const testOutput = testObject.hasMore;

                expect(testOutput).toBeFalsy();
            });

            test('...and the result of Marked.parse() contains multiple cutoff elements, true is returned', () => {
                const testHtml = 'In this test, we will only see this,<hr>not this,<h2>or this..</h2>Not this part, <span class="more">and definitely not this</span>';
                const mockMarked = {
                    parse: vi.fn(() => testHtml)
                };
                vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = {};
                const fakeEnvironment = new FakeEnvironment();
                const testMarkdown = 'This is our page\'s content';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                testObject.__env = fakeEnvironment;

                const testOutput = testObject.hasMore;

                expect(testOutput).toBeTruthy();
            });
        });
        
        describe('...and Markdown config is set', () => {
            test('...Marked instance is created correctly', () => {
                const mockHighlighter = vi.fn() as MarkedExtension;
                vi.mocked(markedHighlight).mockImplementation(() => mockHighlighter);
                const mockMangler = vi.fn() as MarkedExtension;
                vi.mocked(mangle).mockImplementation(() => mockMangler);
                const mockTypographer = vi.fn() as MarkedExtension;
                vi.mocked(markedSmartypants).mockImplementation(() => mockTypographer);
                const mockHeadingExtension = vi.fn() as MarkedExtension;
                vi.mocked(gfmHeadingId).mockImplementation(() => mockHeadingExtension);
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = {};
                const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                const testMarkdown = 'This is our page\'s content';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                testObject.__env = fakeEnvironment;
                const expectedOptions = {
                    someSetting: 'value',
                    renderer: {
                        link: expect.any(Function),
                        image: expect.any(Function)
                    },
                    useNewRenderer: true
                };

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const testOutput = testObject.hasMore;

                expect(vi.mocked(Marked)).toHaveBeenCalled();
                for (const call of vi.mocked(Marked).mock.calls) {
                    expect(call[0]).toEqual(expectedOptions);
                    expect(call[1]).toBe(mockHighlighter);
                    expect(call[2]).toBe(mockMangler);
                    expect(call[3]).toBe(mockTypographer);
                    expect(call[4]).toBe(mockHeadingExtension);
                }
                expect(gfmHeadingId).toHaveBeenLastCalledWith({
                    prefix: 'iceforge-'
                });
            });

            test('...Marked.parse() is called', () => {
                const testHtml = 'This is the rendered HTML';
                const mockMarked = {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    parse: vi.fn((x) => testHtml)
                };
                vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = {};
                const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                const testMarkdown = 'This is our page\'s content';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                testObject.__env = fakeEnvironment;

                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const testOutput = testObject.hasMore;

                for (const call of mockMarked.parse.mock.calls) {
                    expect(call[0]).toBe(testMarkdown);
                }
            });

            test('...and the result of Marked.parse() contains a class=more <span> element, true is returned', () => {
                const testHtml = 'This is<br>what we will see <span class="more">but not this</span> or this';
                const mockMarked = {
                    parse: vi.fn(() => testHtml)
                };
                vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = {};
                const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                const testMarkdown = 'This is our page\'s content';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                testObject.__env = fakeEnvironment;

                const testOutput = testObject.hasMore;

                expect(testOutput).toBeTruthy();
            });

            test('...and the result of Marked.parse() contains an <h2> element, true is returned', () => {
                const testHtml = 'This is<br>what we will see <h2>but not this</h2> or this';
                const mockMarked = {
                    parse: vi.fn(() => testHtml)
                };
                vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = {};
                const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                const testMarkdown = 'This is our page\'s content';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                testObject.__env = fakeEnvironment;
                
                const testOutput = testObject.hasMore;

                expect(testOutput).toBeTruthy();
            });

            test('...and the result of Marked.parse() contains an <hr> element, true is returned', () => {
                const testHtml = 'This is<br>what we will see <hr>but not this or this';
                const mockMarked = {
                    parse: vi.fn(() => testHtml)
                };
                vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = {};
                const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                const testMarkdown = 'This is our page\'s content';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                testObject.__env = fakeEnvironment;

                const testOutput = testObject.hasMore;

                expect(testOutput).toBeTruthy();
            });

            test('...and the result of Marked.parse() contains no cutoff elements, false is returned', () => {
                const testHtml = 'In this test, we will receive the entire parse output';
                const mockMarked = {
                    parse: vi.fn(() => testHtml)
                };
                vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = {};
                const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                const testMarkdown = 'This is our page\'s content';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                testObject.__env = fakeEnvironment;

                const testOutput = testObject.hasMore;

                expect(testOutput).toBeFalsy();
            });

            test('...and the result of Marked.parse() contains multiple cutoff elements, true is returned', () => {
                const testHtml = 'In this test, we will only see this,<hr>not this,<h2>or this..</h2>Not this part, <span class="more">and definitely not this</span>';
                const mockMarked = {
                    parse: vi.fn(() => testHtml)
                };
                vi.mocked(Marked).mockImplementation(() => mockMarked as unknown as Marked);
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = {};
                const fakeEnvironment = new FakeEnvironment({ markdown: { someSetting: 'value' }});
                const testMarkdown = 'This is our page\'s content';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                testObject.__env = fakeEnvironment;

                const testOutput = testObject.hasMore;

                expect(testOutput).toBeTruthy();
            });
        });
    });

    describe('fromFile() tests', () => {
        test('fromFile() reads filepath.full from filesystem', async () => {
            const expectedFileParam = '/full/file.path';
            const testParam = { full: expectedFileParam, relative: 'file.path' };

            await MarkdownPage.fromFile(testParam);

            expect(readFile).toHaveBeenCalledOnce();
            expect(readFile).toHaveBeenLastCalledWith(expectedFileParam);
        });

        describe('If file has YAML-format metadata...', () => {
            test('...correct metadata is passed to new instance', async () => {
                const expectedResult = {
                    title: 'Page Title',
                    categories: ['a', 'b', 'c']
                };
                vi.mocked(readFile).mockImplementation(async () => Buffer.from(`---
title: Page Title
categories: [a, b, c]
---
This is the page Markdown text.
`));
                const testParam = { full: '/full/file.path', relative: 'file.path' };

                const testOutput = await MarkdownPage.fromFile(testParam);

                expect(testOutput.metadata).toStrictEqual(expectedResult);
            });

            test('...correct content is passed to new instance', async () => {
                const expectedResult = '\nThis is the page Markdown text.\n';
                vi.mocked(readFile).mockImplementation(async () => Buffer.from(`---
title: Page Title
categories: [a, b, c]
---
This is the page Markdown text.
`));
                const testParam = { full: '/full/file.path', relative: 'file.path' };
                    
                const testOutput = await MarkdownPage.fromFile(testParam);
                    
                expect(testOutput.markdown).toStrictEqual(expectedResult);
            });
        });

        describe('If file has Wintersmith-format metadata...', () => {
            test('...correct metadata is passed to new instance', async () => {
                const expectedResult = {
                    title: 'Page Title',
                    categories: ['a', 'b', 'c']
                };
                vi.mocked(readFile).mockImplementation(async () => Buffer.from(`\`\`\`metadata
title: Page Title
categories: [a, b, c]
\`\`\`
This is the page Markdown text.
`));
                const testParam = { full: '/full/file.path', relative: 'file.path' };

                const testOutput = await MarkdownPage.fromFile(testParam);

                expect(testOutput.metadata).toStrictEqual(expectedResult);
            });

            test('...correct content is passed to new instance', async () => {
                const expectedResult = 'This is the page Markdown text.\n';
                vi.mocked(readFile).mockImplementation(async () => Buffer.from(`\`\`\`metadata
title: Page Title
categories: [a, b, c]
\`\`\`
This is the page Markdown text.
`));
                const testParam = { full: '/full/file.path', relative: 'file.path' };
                    
                const testOutput = await MarkdownPage.fromFile(testParam);
                    
                expect(testOutput.markdown).toStrictEqual(expectedResult);
            });
        });

        describe('If file has no metadata...', () => {
            test('...empty metadata object is passed to new instance', async () => {
                const expectedResult = {};
                vi.mocked(readFile).mockImplementation(async () => Buffer.from('This is the page Markdown text.\n'));
                const testParam = { full: '/full/file.path', relative: 'file.path' };
                    
                const testOutput = await MarkdownPage.fromFile(testParam);
                    
                expect(testOutput.metadata).toStrictEqual(expectedResult);
            });

            test('...correct content is passed to new instance', async () => {
                const expectedResult = 'This is the page Markdown text.\n';
                vi.mocked(readFile).mockImplementation(async () => Buffer.from('This is the page Markdown text.\n'));
                const testParam = { full: '/full/file.path', relative: 'file.path' };
                    
                const testOutput = await MarkdownPage.fromFile(testParam);
                    
                expect(testOutput.markdown).toStrictEqual(expectedResult);
            });
        });

        describe('If file has no content...', () => {
            test('...correct metadata is passed to new instance', async () => {
                const expectedResult = {
                    title: 'Page Title',
                    categories: ['a', 'b', 'c']
                };
                vi.mocked(readFile).mockImplementation(async () => Buffer.from(`---
title: Page Title
categories: [a, b, c]
---`));
                const testParam = { full: '/full/file.path', relative: 'file.path' };

                const testOutput = await MarkdownPage.fromFile(testParam);

                expect(testOutput.metadata).toStrictEqual(expectedResult);
            });

            test('...empty string is passed as content to new instance', async () => {
                vi.mocked(readFile).mockImplementation(async () => Buffer.from(`---
title: Page Title
categories: [a, b, c]
---`));
                const testParam = { full: '/full/file.path', relative: 'file.path' };
                    
                const testOutput = await MarkdownPage.fromFile(testParam);
                    
                expect(testOutput.markdown).toBe('');
            });
        });
    });

    describe('filenameTemplate tests', () => {
        test('filenameTemplate equals metadata.filename property if that is set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedValue = 'a-special-template';
            const testMetadata = { filename: expectedValue };
            const testMarkdown = 'This is the unrendered page content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
        
            const testOutput = testObject.filenameTemplate;

            expect(testOutput).toBe(expectedValue);
        });

        test('filenameTemplate equals __env.config.filenameTemplate if metadata.filename is not set', async () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedValue = 'a-special-template';
            const testMetadata = {};
            const testConfig = { ...defaultConfig, filenameTemplate: expectedValue };
            const testEnvironment = await Environment.factory(testConfig, 'dir', testLogger);
            const testMarkdown = 'This is the unrendered page content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
            testObject.__env = testEnvironment;

            const testOutput = testObject.filenameTemplate;

            expect(testOutput).toBe(expectedValue);
        });

        test('filenameTemplate equals :file.html if neither _env.config.filenameTemplate nor metadata.filename are set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedValue = ':file.html';
            const testMetadata = {};
            const fakeEnvironment = new FakeEnvironment({ filenameTemplate: '' });
            const testMarkdown = 'This is the unrendered page content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
            testObject.__env = fakeEnvironment;

            const testOutput = testObject.filenameTemplate;

            expect(testOutput).toBe(expectedValue);
        });
    });

    describe('filename tests', () => {
        test('With no replacements, filename is made from filepath directory and filename template', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const testMetadata = { filename: 'expected', date: '2024-07-02 19:36:00Z' };
            const testMarkdown = 'This is our page\'s content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

            const testOutput = testObject.filename;

            expect(testOutput).toBe(`content${path.sep}expected`);
        });

        describe('filename replaces :year with value from metadata.date...', () => {
            describe('...if date is set and...', () => {
                test('...if template is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':year', date: '2024-07-02 19:36:00Z' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}2024`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:yearpost', date: '2024-07-02 19:36:00Z' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}pre2024post`);
                });
            });

            describe('...if date is not set and...', () => {
                test('...if template is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':year' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}1970`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:yearpost' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}pre1970post`);
                });
            });
        });

        describe('filename replaces :month with value from metadata.date...', () => {
            describe('...if date is in October, November or December and', () => {
                test('...if replacement is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':month', date: '2023-10-14 19:36:00Z' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}10`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:monthpost', date: '2023-10-14 19:36:00Z' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}pre10post`);
                });
            });

            describe('...if date is from January to September and...', () => {
                test('...if replacement is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':month', date: '2023-05-14 19:36:00Z' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}05`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:monthpost', date: '2023-05-14 19:36:00Z' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}pre05post`);
                });
            });

            describe('...if date is not set and...', () => {
                test('...if replacement is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':month' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}01`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:monthpost' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}pre01post`);
                });
            });
        });

        describe('filename replaces :day with value from metadata.date...', () => {
            describe('...if date is from the 11th to the end of the month and...', () => {
                test('...if replacement is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':day', date: '2023-10-14 19:36:00Z' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}14`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:daypost', date: '2023-10-14 19:36:00Z' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}pre14post`);
                });
            });

            describe('...if date is from the start of the month to the 10th and...', () => {
                test('...if replacement is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':day', date: '2023-10-08 19:36:00Z' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}08`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:daypost', date: '2023-10-08 19:36:00Z' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}pre08post`);
                });
            });

            describe('...if date is not set and...', () => {
                test('...if replacement is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':day' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}01`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:daypost' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}pre01post`);
                });
            });
        });

        describe('filename replaces :title...', () => {
            describe('...with slugified value of metadata.title if that is set', () => {
                test('...if replacement is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':title', title: 'This is your page title' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}this-is-your-page-title`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:titlepost', title: 'This is your page title' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}prethis-is-your-page-titlepost`);
                });
            });

            describe('...with "untitled" if metadata.title is not set', () => {
                test('...if replacement is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':title' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}untitled`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:titlepost' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}preuntitledpost`);
                });
            });
        });

        describe('filename replaces :file with filepath basename without extension...', () => {
            describe('...if filepath has extension and...', () => {
                test('...if replacement is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':file' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}file`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:filepost' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}prefilepost`);
                });
            });

            describe('...if filepath has no extension and...', () => {
                test('...if replacement is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file' };
                    const testMetadata = { filename: ':file' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}file`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file' };
                    const testMetadata = { filename: 'pre:filepost' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}prefilepost`);
                });
            });
        });

        describe('filename replaces :ext with filepath extension if filepath has extension and...', () => {
            test('...if replacement is otherwise empty', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: ':ext' };
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}.page`);
            });

            test('...if replacement is in the middle of the template', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: 'pre:extpost' };
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}pre.pagepost`);
            });
        });

        describe('filename replaces :ext with empty string if filepath does not have extension and...', () => {
            test('...if replacement is otherwise empty', () => {
                const testFilepath = { full: '/www/content/file', relative: 'content/file' };
                const testMetadata = { filename: ':ext' };
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                const testOutput = testObject.filename;

                expect(testOutput).toBe('content');
            });

            test('...if replacement is in the middle of the template', () => {
                const testFilepath = { full: '/www/content/file', relative: 'content/file' };
                const testMetadata = { filename: 'pre:extpost' };
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}prepost`);
            });
        });

        describe('filename replaces :basename with filepath basename', () => {
            test('...if replacement is otherwise empty', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: ':basename' };
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}file.page`);
            });

            test('...if replacement is in the middle of the template', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: 'pre:basenamepost' };
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}prefile.pagepost`);
            });
        });

        describe('filename replaces :dirname with filepath directory name', () => {
            test('...if replacement is otherwise empty', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: ':dirname' };
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}content`);
            });

            test('...if replacement is in the middle of the template', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: 'pre:dirnamepost' };
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}precontentpost`);
            });
        });

        describe('filename replaces {{...}} with result of executing brace contents', () => {
            test('...if replacement is otherwise empty', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: '{{"longword".substring(2, 5)}}' };
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}ngw`);
            });

            test('...if replacement is in the middle of the template', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: 'pre{{"longword".substring(2, 5)}}post' };
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}prengwpost`);
            });
        });

        test('filename removes any initial path separator character from replacement result', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const testMetadata = { filename: ':basename' };
            const testMarkdown = 'This is our page\'s content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

            const testOutput = testObject.filename;

            expect(testOutput).toBe(`content${path.sep}file.page`);
        });
    });

    describe('getUrl() and url tests', () => {
        describe('If baseUrl is not set or passed in...', () => {
            describe('...getUrl()...', () => {
                test('...returns filename prepended by /', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('/content/file.page');
                });

                test('...returns filename without index.html on the end, if present', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = { filename: ':basename' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('/content/');
                });

                // This test is really only meaningful when run on Windows; on other platforms filename will
                // already have been normalised before getUrl() accesses it.
                test('...only uses / as a path separator', () => {
                    const testFilepath = { full: 'C:\\www\\content\\file.page', relative: `content${path.sep}file.page` };
                    const testMetadata = { filename: ':basename' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('/content/file.page');
                });
            });

            describe('...url property...', () => {
                test('...returns filename prepended by /', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.url;

                    expect(testOutput).toBe('/content/file.page');
                });

                test('...returns filename without index.html on the end, if present', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = { filename: ':basename' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.url;

                    expect(testOutput).toBe('/content/');
                });

                // This test is really only meaningful when run on Windows; on other platforms filename will
                // already have been normalised before getUrl() accesses it.
                test('...only uses / as a path separator', () => {
                    const testFilepath = { full: 'C:\\www\\content\\file.page', relative: `content${path.sep}file.page` };
                    const testMetadata = { filename: ':basename' };
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                    const testOutput = testObject.url;

                    expect(testOutput).toBe('/content/file.page');
                });
            });
        });

        describe('If baseUrl is set in config...', () => {
            describe('...getUrl()...', () => {
                test('...returns filename prepended by baseUrl', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: '/testBase/' });
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('/testBase/content/file.page');
                });

                test('...prepends baseUrl with a slash if it is not an absolute URL but does not start with a slash', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: 'testBase/' });
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('/testBase/content/file.page');
                });

                test('...does not alter baseUrl if it is an absolute URL', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: 'https://example.com/testBase/' });
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('https://example.com/testBase/content/file.page');
                });

                test('...separates baseUrl and filename with a slash if baseUrl does not end with one', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: '/testBase' });
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('/testBase/content/file.page');
                });

                test('...returns preprended filename without index.html on the end, if present', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: '/testBase/' });
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('/testBase/content/');
                });

                test('...only uses / as a path separator', () => {
                    const testFilepath = { full: 'C:\\www\\content\\file.page', relative: `content${path.sep}file.page` };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: '/testBase/' });
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('/testBase/content/file.page');
                });
            });

            describe('...url property...', () => {
                test('...returns filename prepended by baseUrl', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: '/testBase/' });
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.url;

                    expect(testOutput).toBe('/testBase/content/file.page');
                });

                test('...prepends baseUrl with a slash if it is not an absolute URL but does not start with a slash', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: 'testBase/' });
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.url;

                    expect(testOutput).toBe('/testBase/content/file.page');
                });

                test('...does not alter baseUrl if it is an absolute URL', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: 'https://example.com/testBase/' });
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.url;

                    expect(testOutput).toBe('https://example.com/testBase/content/file.page');
                });

                test('...separates baseUrl and filename with a slash if baseUrl does not end with one', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: '/testBase' });
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.url;

                    expect(testOutput).toBe('/testBase/content/file.page');
                });

                test('...returns preprended filename without index.html on the end, if present', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: '/testBase/' });
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.url;

                    expect(testOutput).toBe('/testBase/content/');
                });

                test('...only uses / as a path separator', () => {
                    const testFilepath = { full: 'C:\\www\\content\\file.page', relative: `content${path.sep}file.page` };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: '/testBase/' });
                    const testMarkdown = 'This is our page\'s content.';
                    const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.url;

                    expect(testOutput).toBe('/testBase/content/file.page');
                });
            });
        });

        describe('If baseUrl is passed in to getUrl() as a parameter, it...', () => {
            test('...returns filename prepended by baseUrl', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: ':basename' };
                const testBaseUrl = '/testBase/';
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                const testOutput = testObject.getUrl(testBaseUrl);

                expect(testOutput).toBe('/testBase/content/file.page');
            });

            test('...prepends baseUrl with a slash if it is not an absolute URL but does not start with a slash', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: ':basename' };
                const testBaseUrl = 'testBase/';
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                const testOutput = testObject.getUrl(testBaseUrl);

                expect(testOutput).toBe('/testBase/content/file.page');
            });

            test('...does not alter baseUrl if it is an absolute URL', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: ':basename' };
                const testBaseUrl = 'https://example.com/testBase/';
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                const testOutput = testObject.getUrl(testBaseUrl);

                expect(testOutput).toBe('https://example.com/testBase/content/file.page');
            });

            test('...separates baseUrl and filename with a slash if baseUrl does not end with one', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: ':basename' };
                const testBaseUrl = '/testBase';
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                const testOutput = testObject.getUrl(testBaseUrl);

                expect(testOutput).toBe('/testBase/content/file.page');
            });

            test('...returns preprended filename without index.html on the end, if present', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = { filename: ':basename' };
                const testBaseUrl = '/testBase/';
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                const testOutput = testObject.getUrl(testBaseUrl);

                expect(testOutput).toBe('/testBase/content/');
            });

            test('...only uses / as a path separator', () => {
                const testFilepath = { full: '\\www\\content\\file.page', relative: `content${path.sep}file.page` };
                const testMetadata = { filename: ':basename' };
                const testBaseUrl = '/testBase/';
                const testMarkdown = 'This is our page\'s content.';
                const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

                const testOutput = testObject.getUrl(testBaseUrl);

                expect(testOutput).toBe('/testBase/content/file.page');
            });
        });

        test('If baseUrl is set in config and is also passed in to getUrl() as a parameter, it uses the parameter in preference to the config value', async () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const testMetadata = { filename: ':basename' };
            const testConfig = { ...defaultConfig, baseUrl: '/unexpectedTestBase/' };
            const testBaseUrl = '/expectedTestBase/';
            const testEnvironment = await Environment.factory(testConfig, 'testDir', testLogger);
            const testMarkdown = 'This is our page\'s content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
            testObject.__env = testEnvironment;

            const testOutput = testObject.getUrl(testBaseUrl);

            expect(testOutput).toBe('/expectedTestBase/content/file.page');
        });
    });

    describe('template tests', () => {
        test('template equals metadata.template property if that is set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = 'specialTemplate';
            const testMetadata = { template: expectedResult };
            const testMarkdown = 'This is our page\'s content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

            expect(testObject.template).toBe(expectedResult);
        });

        test('template equals __env.config.defaultTemplate if metadata.template is not set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = 'specialTemplate';
            const testMetadata = { };
            const fakeEnvironment = new FakeEnvironment({ defaultTemplate: expectedResult });
            const testMarkdown = 'This is our page\'s content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
            testObject.__env = fakeEnvironment;

            expect(testObject.template).toBe(expectedResult);
        });

        test('template equals none if neither __env.config.defaultTemplate nor metadata.template are set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const testMetadata = {};
            const fakeEnvironment = new FakeEnvironment({ defaultTemplate: undefined });
            const testMarkdown = 'This is our page\'s content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);
            testObject.__env = fakeEnvironment;

            expect(testObject.template).toBe('none');
        });
    });

    describe('title tests', () => {
        test('title equals metadata.title property if that is set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = 'Our custom page title';
            const testMetadata = { title: expectedResult };
            const testMarkdown = 'This is our page\'s content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

            expect(testObject.title).toBe(expectedResult);
        });

        test('title equals Untitled if metadata.title property is not set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = 'Untitled';
            const testMetadata = { };
            const testMarkdown = 'This is our page\'s content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

            expect(testObject.title).toBe(expectedResult);
        });
    });

    describe('date, rfc2822date and rfc822date tests', () => {
        test('date equals metadata.date property if that is set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = new Date(2024, 6, 6, 8, 4);
            const testMetadata = { date: '2024-07-06 08:04:00' };
            const testMarkdown = 'This is our page\'s content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

            expect(testObject.date).toStrictEqual(expectedResult);
        });

        test('date equals 1st January 1970 if metadata.date is not set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = new Date(0);
            const testMetadata = { };
            const testMarkdown = 'This is our page\'s content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

            expect(testObject.date).toStrictEqual(expectedResult);
        });

        test('rfc2822date equals metadata.date property if that is set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = 'Sat, 06 Jul 2024 08:04:00 +0000';
            const testMetadata = { date: '2024-07-06 08:04:00' };
            const testMarkdown = 'This is our page\'s content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

            expect(testObject.rfc2822date).toStrictEqual(expectedResult);
        });

        test('rfc2822date equals 1st January 1970 if metadata.date is not set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = 'Thu, 01 Jan 1970 00:00:00 +0000';
            const testMetadata = { };
            const testMarkdown = 'This is our page\'s content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

            expect(testObject.rfc2822date).toStrictEqual(expectedResult);
        });

        test('rfc822date equals metadata.date property if that is set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = 'Sat, 06 Jul 2024 08:04:00 +0000';
            const testMetadata = { date: '2024-07-06 08:04:00' };
            const testMarkdown = 'This is our page\'s content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

            expect(testObject.rfc822date).toStrictEqual(expectedResult);
        });

        test('rfc822date equals 1st January 1970 if metadata.date is not set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = 'Thu, 01 Jan 1970 00:00:00 +0000';
            const testMetadata = { };
            const testMarkdown = 'This is our page\'s content.';
            const testObject = new MarkdownPage(testFilepath, testMetadata, testMarkdown);

            expect(testObject.rfc822date).toStrictEqual(expectedResult);
        });
    });
});

describe('Plugin registration tests', () => {
    test('Registration function registers MarkdownPage correctly with environment', async () => {
        const fakeEnvironment = new FakeEnvironment();
        vi.spyOn(fakeEnvironment, 'registerContentPlugin');

        await registerPlugin(fakeEnvironment);

        expect(fakeEnvironment.registerContentPlugin).toHaveBeenCalledWith('pages', '**/*.*(markdown|mkd|md)', MarkdownPage);
    });

    test('Registration function registers JsonPage correctly with environment', async () => {
        const fakeEnvironment = new FakeEnvironment();
        vi.spyOn(fakeEnvironment, 'registerContentPlugin');

        await registerPlugin(fakeEnvironment);

        expect(fakeEnvironment.registerContentPlugin).toHaveBeenCalledWith('pages', '**/*.json', JsonPage);
    });
});

describe('linkRenderer() tests', () => {
    describe('Returns valid link...', () => {
        test('...if the third parameter is an absolute URI', () => {
            const fakePlugin = new FakePlugin('test.file');
            const testBaseUrl = 'https://example.com';
            const testHref = 'http://another.example.com/file.link';
            const testTitle = 'Title of the test link';
            const testText = 'Content to display as text in the page';

            const testOutput = linkRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<a [^>]*>.*<\/a>/);
        });

        test('...if the third parameter starts with #', () => {
            const fakePlugin = new FakePlugin('test.file');
            const testBaseUrl = 'https://example.com';
            const testHref = '#somewhereInsideThePage';
            const testTitle = 'Title of the test link';
            const testText = 'Content to display as text in the page';

            const testOutput = linkRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<a [^>]*>.*<\/a>/);
        });

        test('...if the third parameter is the filename of an item in the same node of the tree as the first parmeter', () => {
            const expectedOutput = '/finaltarget';
            const rootTree = new ContentTree('testDir');
            const fakePlugin = new FakePlugin('test.file', undefined, rootTree);
            rootTree['test.file'] = fakePlugin;
            const targetPlugin = new FakePlugin('target.file', undefined, rootTree, expectedOutput);
            rootTree['target.file'] = targetPlugin;
            const testBaseUrl = 'https://example.com';
            const testHref = 'target.file';
            const testTitle = 'Title of the test link';
            const testText = 'Content to display as text in the page';

            const testOutput = linkRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<a [^>]*>.*<\/a>/);
        });

        test('...if the third parameter is the filename of an item in an ancestral node of the tree compared to the first parameter', () => {
            const expectedOutput = '/finaltarget';
            const rootTree = new ContentTree('testDir');
            const subDir = new ContentTree('subDir');
            rootTree['subDir'] = subDir;
            subDir.parent = rootTree;
            const fakePlugin = new FakePlugin('test.file', undefined, subDir);
            subDir['test.file'] = fakePlugin;
            const targetPlugin = new FakePlugin('target.file', undefined, rootTree, expectedOutput);
            rootTree['target.file'] = targetPlugin;
            const testBaseUrl = 'https://example.com';
            const testHref = '../target.file';
            const testTitle = 'Title of the link';
            const testText = 'Content to display as link text';

            const testOutput = linkRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<a [^>]*>.*<\/a>/);
        });

        test('...if the third parameter is the filename of an item in a descendent node of the tree compared to the node containing the first parameter', () => {
            const expectedOutput = '/finalTarget';
            const rootTree = new ContentTree('testDir');
            const subDir = new ContentTree('subDir');
            rootTree['subDir'] = subDir;
            subDir.parent = rootTree;
            const fakePlugin = new FakePlugin('test.file', undefined, rootTree);
            rootTree['test.file'] = fakePlugin;
            const targetPlugin = new FakePlugin('target.file', undefined, subDir, expectedOutput);
            subDir['target.file'] = targetPlugin;
            const testBaseUrl = 'https://example.com';
            const testHref = 'subDir/target.file';
            const testTitle = 'Title of the link';
            const testText = 'Content to display as link text';

            const testOutput = linkRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<a [^>]*>.*<\/a>/);
        });

        test('...if the third parameter is the filename of an item in a "cousin" node of the tree compared to the node containing the first parameter', () => {
            const expectedOutput = '/finaltarget';
            const rootTree = new ContentTree('testDir');
            const firstSubDir = new ContentTree('firstSubDir');
            rootTree['firstSubDir'] = firstSubDir;
            firstSubDir.parent = rootTree;
            const secondSubDir = new ContentTree('secondSubDir');
            rootTree['secondSubDir'] = secondSubDir;
            secondSubDir.parent = rootTree;
            const fakePlugin = new FakePlugin('test.file', undefined, firstSubDir);
            firstSubDir['test.file'] = fakePlugin;
            const targetPlugin = new FakePlugin('target.file', undefined, secondSubDir, expectedOutput);
            secondSubDir['target.file'] = targetPlugin;
            const testBaseUrl = 'https://example.com';
            const testHref = '../secondSubDir/target.file';
            const testTitle = 'Title of the link';
            const testText = 'Content to display as link text';

            const testOutput = linkRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<a [^>]*>.*<\/a>/);
        });
    });

    test('Returns link containing fourth parameter in correct place if fourth parameter is provided', () => {
        const fakePlugin = new FakePlugin('test.file');
        const testBaseUrl = 'https://example.com';
        const testHref = 'http://another.example.com/file.link';
        const testTitle = 'Title of the test link';
        const testText = 'Content to display as text in the page';

        const testOutput = linkRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

        expect(testOutput).toMatch(/<a [^>]*title="Title of the test link">.*<\/a>/);
    });

    test('Returns link not containing a title attribute if fourth parameter is empty string', () => {
        const fakePlugin = new FakePlugin('test.file');
        const testBaseUrl = 'https://example.com';
        const testHref = 'http://another.example.com/file.link';
        const testTitle = '';
        const testText = 'Content to display as text in the page';

        const testOutput = linkRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

        expect(testOutput).toMatch(/<a [^>]*>.*<\/a>/);
        expect(testOutput).not.toMatch(/title=/);
    });

    test('Returns link containing fifth parameter in correct place', () => {
        const fakePlugin = new FakePlugin('test.file');
        const testBaseUrl = 'https://example.com';
        const testHref = 'http://another.example.com/file.link';
        const testTitle = 'Title of the test link';
        const testText = 'Content to display as text in the page';

        const testOutput = linkRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

        expect(testOutput).toMatch(/<a [^>]*>Content to display as text in the page<\/a>/);
    });

    test('Returns link pointing to third parameter, if that is an absolute URI', () => {
        const fakePlugin = new FakePlugin('test.file');
        const testBaseUrl = 'https://example.com';
        const testHref = 'http://another.example.com/file.link';
        const testTitle = 'Title of the test link';
        const testText = 'Content to display as text in the page';

        const testOutput = linkRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

        expect(testOutput).toMatch(/<a [^>]*href="http:\/\/another.example.com\/file.link"[^>]*>.*<\/a>/);
    });

    test('Returns link pointing to third parameter, if that starts with #', () => {
        const fakePlugin = new FakePlugin('test.file');
        const testBaseUrl = 'https://example.com';
        const testHref = '#somewhere';
        const testTitle = 'Title of the test link';
        const testText = 'Content to display as text in the page';

        const testOutput = linkRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

        expect(testOutput).toMatch(/<a [^>]*href="#somewhere"[^>]*>.*<\/a>/);
    });

    describe('Returns link pointing to URL of an item in the content tree...', () => {
        test('...if the third parameter is the filename of an item in the same node of the tree as the first parmeter', () => {
            const expectedOutput = '/finaltarget';
            const rootTree = new ContentTree('testDir');
            const fakePlugin = new FakePlugin('test.file', undefined, rootTree);
            rootTree['test.file'] = fakePlugin;
            const targetPlugin = new FakePlugin('target.file', undefined, rootTree, expectedOutput);
            rootTree['target.file'] = targetPlugin;
            const testBaseUrl = 'https://example.com';
            const testHref = 'target.file';
            const testTitle = 'Title of the test link';
            const testText = 'Content to display as text in the page';

            const testOutput = linkRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<a [^>]*href="\/finaltarget" [^>]*>.*<\/a>/);
        });

        test('...if the third parameter is the filename of an item in an ancestral node of the tree compared to the first parameter', () => {
            const expectedOutput = '/finaltarget';
            const rootTree = new ContentTree('testDir');
            const subDir = new ContentTree('subDir');
            rootTree['subDir'] = subDir;
            subDir.parent = rootTree;
            const fakePlugin = new FakePlugin('test.file', undefined, subDir);
            subDir['test.file'] = fakePlugin;
            const targetPlugin = new FakePlugin('target.file', undefined, rootTree, expectedOutput);
            rootTree['target.file'] = targetPlugin;
            const testBaseUrl = 'https://example.com';
            const testHref = '../target.file';
            const testTitle = 'Title of the link';
            const testText = 'Content to display as link text';

            const testOutput = linkRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<a [^>]*href="\/finaltarget" [^>]*>.*<\/a>/);
        });

        test('...if the third parameter is the filename of an item in a descendent node of the tree compared to the node containing the first parameter', () => {
            const expectedOutput = '/finaltarget';
            const rootTree = new ContentTree('testDir');
            const subDir = new ContentTree('subDir');
            rootTree['subDir'] = subDir;
            subDir.parent = rootTree;
            const fakePlugin = new FakePlugin('test.file', undefined, rootTree);
            rootTree['test.file'] = fakePlugin;
            const targetPlugin = new FakePlugin('target.file', undefined, subDir, expectedOutput);
            subDir['target.file'] = targetPlugin;
            const testBaseUrl = 'https://example.com';
            const testHref = 'subDir/target.file';
            const testTitle = 'Title of the link';
            const testText = 'Content to display as link text';

            const testOutput = linkRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<a [^>]*href="\/finaltarget" [^>]*>.*<\/a>/);
        });

        test('...if the third parameter is the filename of an item in a "cousin" node of the tree compared to the node containing the first parameter', () => {
            const expectedOutput = '/finaltarget';
            const rootTree = new ContentTree('testDir');
            const firstSubDir = new ContentTree('firstSubDir');
            rootTree['firstSubDir'] = firstSubDir;
            firstSubDir.parent = rootTree;
            const secondSubDir = new ContentTree('secondSubDir');
            rootTree['secondSubDir'] = secondSubDir;
            secondSubDir.parent = rootTree;
            const fakePlugin = new FakePlugin('test.file', undefined, firstSubDir);
            firstSubDir['test.file'] = fakePlugin;
            const targetPlugin = new FakePlugin('target.file', undefined, secondSubDir, expectedOutput);
            secondSubDir['target.file'] = targetPlugin;
            const testBaseUrl = 'https://example.com';
            const testHref = '../secondSubDir/target.file';
            const testTitle = 'Title of the link';
            const testText = 'Content to display as link text';

            const testOutput = linkRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<a [^>]*href="\/finaltarget" [^>]*>.*<\/a>/);
        });
    });

    test('Returns link pointing to a combination of the third and second parameters if the third parameter is not the filename of an item in the content tree.', () => {
        const rootTree = new ContentTree('testDir');
        const fakePlugin = new FakePlugin('test.file', undefined, rootTree);
        rootTree['test.file'] = fakePlugin;
        const testBaseUrl = 'https://example.com';
        const testHref = 'target.file';
        const testTitle = 'Title of the test image';
        const testText = 'Content to display as alt text';

        const testOutput = linkRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

        expect(testOutput).toMatch(/<a [^>]*href="https:\/\/example.com\/target.file"[^>]*>.*<\/a>/);
    });
});

describe('imageRenderer() tests', () => {
    describe('Returns valid img element', () => {
        test('...if the third parameter is an absolute URI', () => {
            const fakePlugin = new FakePlugin('test.file');
            const testBaseUrl = 'https://example.com';
            const testHref = 'http://another.example.com/file.link';
            const testTitle = 'Title of the test image';
            const testText = 'Content to display as the alt text for the image';

            const testOutput = imageRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<img [^>]*src=[^>]*\/>/);
        });

        test('...if the third parameter starts with #', () => {
            const fakePlugin = new FakePlugin('test.file');
            const testBaseUrl = 'https://example.com';
            const testHref = '#somewhere';
            const testTitle = 'Title of the test image';
            const testText = 'Content to display as the alt text for the image';

            const testOutput = imageRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<img [^>]*src=[^>]*\/>/);
        });

        test('...if the third parameter is the filename of an item in the same node of the tree as the first parmeter', () => {
            const expectedOutput = '/finaltarget';
            const rootTree = new ContentTree('testDir');
            const fakePlugin = new FakePlugin('test.file', undefined, rootTree);
            rootTree['test.file'] = fakePlugin;
            const targetPlugin = new FakePlugin('target.file', undefined, rootTree, expectedOutput);
            rootTree['target.file'] = targetPlugin;
            const testBaseUrl = 'https://example.com';
            const testHref = 'target.file';
            const testTitle = 'Title of the test image';
            const testText = 'Content to display as alt text';

            const testOutput = imageRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<img [^>]*src=[^>]*\/>/);
        });

        test('...if the third parameter is the filename of an item in an ancestral node of the tree compared to the first parameter', () => {
            const expectedOutput = '/finaltarget';
            const rootTree = new ContentTree('testDir');
            const subDir = new ContentTree('subDir');
            rootTree['subDir'] = subDir;
            subDir.parent = rootTree;
            const fakePlugin = new FakePlugin('test.file', undefined, subDir);
            subDir['test.file'] = fakePlugin;
            const targetPlugin = new FakePlugin('target.file', undefined, rootTree, expectedOutput);
            rootTree['target.file'] = targetPlugin;
            const testBaseUrl = 'https://example.com';
            const testHref = '../target.file';
            const testTitle = 'Title of the test image';
            const testText = 'Content to display as alt text';

            const testOutput = imageRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<img [^>]*src=[^>]*\/>/);
        });

        test('...if the third parameter is the filename of an item in a descendent node of the tree compared to the node containing the first parameter', () => {
            const expectedOutput = '/finaltarget';
            const rootTree = new ContentTree('testDir');
            const subDir = new ContentTree('subDir');
            rootTree['subDir'] = subDir;
            subDir.parent = rootTree;
            const fakePlugin = new FakePlugin('test.file', undefined, rootTree);
            rootTree['test.file'] = fakePlugin;
            const targetPlugin = new FakePlugin('target.file', undefined, subDir, expectedOutput);
            subDir['target.file'] = targetPlugin;
            const testBaseUrl = 'https://example.com';
            const testHref = 'subDir/target.file';
            const testTitle = 'Title of the image';
            const testText = 'Content to display as alt text';

            const testOutput = imageRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<img [^>]*src=[^>]*\/>/);
        });

        test('...if the third parameter is the filename of an item in a "cousin" node of the tree compared to the node containing the first parameter', () => {
            const expectedOutput = '/finalTarget';
            const rootTree = new ContentTree('testDir');
            const firstSubDir = new ContentTree('firstSubDir');
            rootTree['firstSubDir'] = firstSubDir;
            firstSubDir.parent = rootTree;
            const secondSubDir = new ContentTree('secondSubDir');
            rootTree['secondSubDir'] = secondSubDir;
            secondSubDir.parent = rootTree;
            const fakePlugin = new FakePlugin('test.file', undefined, firstSubDir);
            firstSubDir['test.file'] = fakePlugin;
            const targetPlugin = new FakePlugin('target.file', undefined, secondSubDir, expectedOutput);
            secondSubDir['target.file'] = targetPlugin;
            const testBaseUrl = 'https://example.com';
            const testHref = '../secondSubDir/target.file';
            const testTitle = 'Title of the image';
            const testText = 'Content to display as alt text';

            const testOutput = imageRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<img [^>]*src=[^>]*\/>/);
        });
    });

    test('Returns img element containing fourth parameter in correct place if it is provided', () => {
        const fakePlugin = new FakePlugin('test.file');
        const testBaseUrl = 'https://example.com';
        const testHref = 'http://another.example.com/file.link';
        const testTitle = 'Title of the test image';
        const testText = 'Content to display as alt text for the image';

        const testOutput = imageRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

        expect(testOutput).toMatch(/<img [^>]*title="Title of the test image"[^>]*\/>/);
    });

    test('Returns img element without title attribute if the fourth parameter is empty string', () => {
        const fakePlugin = new FakePlugin('test.file');
        const testBaseUrl = 'https://example.com';
        const testHref = 'http://another.example.com/file.link';
        const testTitle = '';
        const testText = 'Content to display as alt text for the image';

        const testOutput = imageRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

        expect(testOutput).toMatch(/<img [^>]*src=[^>]*\/>/);
        expect(testOutput).not.toMatch(/title="/);
    });

    test('Returns img element containing fifth parameter as alt attribute', () => {
        const fakePlugin = new FakePlugin('test.file');
        const testBaseUrl = 'https://example.com';
        const testHref = 'http://another.example.com/file.link';
        const testTitle = 'Title of the test image';
        const testText = 'Content to display as alt text for the image';

        const testOutput = imageRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

        expect(testOutput).toMatch(/<img [^>]*alt="Content to display as alt text for the image"[^>]*\/>/);
    });

    test('Returns img element pointing to third parameter, if that is an absolute URI', () => {
        const fakePlugin = new FakePlugin('test.file');
        const testBaseUrl = 'https://example.com';
        const testHref = 'http://another.example.com/file.link';
        const testTitle = 'Title of the test image';
        const testText = 'Content to display as alt text for the image';

        const testOutput = imageRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

        expect(testOutput).toMatch(/<img [^>]*src="http:\/\/another.example.com\/file.link"[^>]*\/>/);
    });

    test('Returns img element pointing to third parameter, if that starts with #', () => {
        const fakePlugin = new FakePlugin('test.file');
        const testBaseUrl = 'https://example.com';
        const testHref = '#onThePage';
        const testTitle = 'Title of the test image';
        const testText = 'Content to display as alt text for the image';

        const testOutput = imageRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

        expect(testOutput).toMatch(/<img [^>]*src="#onThePage"[^>]*\/>/);
    });

    describe('Returns img element pointing to URL of an item in the content tree...', () => {
        test('...if the third parameter is the filename of an item in the same node of the tree as the first parmeter', () => {
            const expectedOutput = '/finaltarget';
            const rootTree = new ContentTree('testDir');
            const fakePlugin = new FakePlugin('test.file', undefined, rootTree);
            rootTree['test.file'] = fakePlugin;
            const targetPlugin = new FakePlugin('target.file', undefined, rootTree, expectedOutput);
            rootTree['target.file'] = targetPlugin;
            const testBaseUrl = 'https://example.com';
            const testHref = 'target.file';
            const testTitle = 'Title of the test image';
            const testText = 'Content to display as alt text';

            const testOutput = imageRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<img [^>]*src="\/finaltarget"[^>]*\/>/);
        });

        test('...if the third parameter is the filename of an item in an ancestral node of the tree compared to the first parameter', () => {
            const expectedOutput = '/finaltarget';
            const rootTree = new ContentTree('testDir');
            const subDir = new ContentTree('subDir');
            rootTree['subDir'] = subDir;
            subDir.parent = rootTree;
            const fakePlugin = new FakePlugin('test.file', undefined, subDir);
            subDir['test.file'] = fakePlugin;
            const targetPlugin = new FakePlugin('target.file', undefined, rootTree, expectedOutput);
            rootTree['target.file'] = targetPlugin;
            const testBaseUrl = 'https://example.com';
            const testHref = '../target.file';
            const testTitle = 'Title of the test image';
            const testText = 'Content to display as alt text';

            const testOutput = imageRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<img [^>]*src="\/finaltarget"[^>]*\/>/);
        });

        test('...if the third parameter is the filename of an item in a descendent node of the tree compared to the node containing the first parameter', () => {
            const expectedOutput = '/finaltarget';
            const rootTree = new ContentTree('testDir');
            const subDir = new ContentTree('subDir');
            rootTree['subDir'] = subDir;
            subDir.parent = rootTree;
            const fakePlugin = new FakePlugin('test.file', undefined, rootTree);
            rootTree['test.file'] = fakePlugin;
            const targetPlugin = new FakePlugin('target.file', undefined, subDir, expectedOutput);
            subDir['target.file'] = targetPlugin;
            const testBaseUrl = 'https://example.com';
            const testHref = 'subDir/target.file';
            const testTitle = 'Title of the image';
            const testText = 'Content to display as alt text';

            const testOutput = imageRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<img [^>]*src="\/finaltarget"[^>]*\/>/);
        });

        test('...if the third parameter is the filename of an item in a "cousin" node of the tree compared to the node containing the first parameter', () => {
            const expectedOutput = '/finaltarget';
            const rootTree = new ContentTree('testDir');
            const firstSubDir = new ContentTree('firstSubDir');
            rootTree['firstSubDir'] = firstSubDir;
            firstSubDir.parent = rootTree;
            const secondSubDir = new ContentTree('secondSubDir');
            rootTree['secondSubDir'] = secondSubDir;
            secondSubDir.parent = rootTree;
            const fakePlugin = new FakePlugin('test.file', undefined, firstSubDir);
            firstSubDir['test.file'] = fakePlugin;
            const targetPlugin = new FakePlugin('target.file', undefined, secondSubDir, expectedOutput);
            secondSubDir['target.file'] = targetPlugin;
            const testBaseUrl = 'https://example.com';
            const testHref = '../secondSubDir/target.file';
            const testTitle = 'Title of the image';
            const testText = 'Content to display as alt text';

            const testOutput = imageRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

            expect(testOutput).toMatch(/<img [^>]*src="\/finaltarget"[^>]*\/>/);
        });
    });

    test('Returns img element pointing to a combination of the third and second parameters if the third parameter is not the filename of an item in the content tree.', () => {
        const rootTree = new ContentTree('testDir');
        const fakePlugin = new FakePlugin('test.file', undefined, rootTree);
        rootTree['test.file'] = fakePlugin;
        const testBaseUrl = 'https://example.com';
        const testHref = 'target.file';
        const testTitle = 'Title of the test image';
        const testText = 'Content to display as alt text';

        const testOutput = imageRenderer(fakePlugin, testBaseUrl, testHref, testTitle, testText);

        expect(testOutput).toMatch(/<img [^>]*src="https:\/\/example.com\/target.file"[^>]*\/>/);
    });
});
