import { describe, expect, test, vi } from 'vitest';
import path from 'path';

import registerPlugin, { Page, templateView } from '../../plugins/page';
import ContentTree from '../../core/contentTree';
import FakeTemplate from '../core/fakes/fakeTemplate';
import { FakeEnvironment } from '../core/fakes/fakeEnvironment';

describe('Page tests', () => {
    describe('Constructor tests', () => {
        test('Constructor sets filepath property', () => {
            const mockFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const mockMetadata = {};

            const testOutput = new Page(mockFilepath, mockMetadata);

            expect(testOutput.filepath).toStrictEqual(mockFilepath);
        });

        test('Constructor sets metadata property', () => {
            const mockFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const mockMetadata = { key: 'value' };

            const testOutput = new Page(mockFilepath, mockMetadata);

            expect(testOutput.metadata).toStrictEqual(mockMetadata);
        });
    });

    test('name returns Page', () => {
        const mockFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
        const mockMetadata = {};
        const testObject = new Page(mockFilepath, mockMetadata);

        const testOutput = testObject.name;

        expect(testOutput).toBe('Page');
    });

    describe('filenameTemplate tests', () => {
        test('filenameTemplate equals metadata.filename property if that is set', () => {
            const mockFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedValue = 'a-special-template';
            const mockMetadata = { filename: expectedValue };
            const testObject = new Page(mockFilepath, mockMetadata);
        
            const testOutput = testObject.filenameTemplate;

            expect(testOutput).toBe(expectedValue);
        });

        test('filenameTemplate equals __env.config.filenameTemplate if metadata.filename is not set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedValue = 'a-special-template';
            const testMetadata = {};
            const fakeEnvironment = new FakeEnvironment({ filenameTemplate: expectedValue });
            const testObject = new Page(testFilepath, testMetadata);
            testObject.__env = fakeEnvironment;

            const testOutput = testObject.filenameTemplate;

            expect(testOutput).toBe(expectedValue);
        });

        test('filenameTemplate equals :file.html if neither _env.config.filenameTemplate nor metadata.filename are set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedValue = ':file.html';
            const testMetadata = {};
            const fakeEnvironment = new FakeEnvironment({ filenameTemplate: '' });
            const testObject = new Page(testFilepath, testMetadata);
            testObject.__env = fakeEnvironment;

            const testOutput = testObject.filenameTemplate;

            expect(testOutput).toBe(expectedValue);
        });
    });

    describe('filename tests', () => {
        test('With no replacements, filename is made from filepath directory and filename template', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const testMetadata = { filename: 'expected', date: '2024-07-02 19:36:00Z' };
            const testObject = new Page(testFilepath, testMetadata);

            const testOutput = testObject.filename;

            expect(testOutput).toBe(`content${path.sep}expected`);
        });

        describe('filename replaces :year with value from metadata.date...', () => {
            describe('...if date is set and...', () => {
                test('...if template is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':year', date: '2024-07-02 19:36:00Z' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}2024`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:yearpost', date: '2024-07-02 19:36:00Z' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}pre2024post`);
                });
            });

            describe('...if date is not set and...', () => {
                test('...if template is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':year' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}1970`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:yearpost' };
                    const testObject = new Page(testFilepath, testMetadata);

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
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}10`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:monthpost', date: '2023-10-14 19:36:00Z' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}pre10post`);
                });
            });

            describe('...if date is from January to September and...', () => {
                test('...if replacement is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':month', date: '2023-05-14 19:36:00Z' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}05`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:monthpost', date: '2023-05-14 19:36:00Z' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}pre05post`);
                });
            });

            describe('...if date is not set and...', () => {
                test('...if replacement is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':month' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}01`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:monthpost' };
                    const testObject = new Page(testFilepath, testMetadata);

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
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}14`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:daypost', date: '2023-10-14 19:36:00Z' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}pre14post`);
                });
            });

            describe('...if date is from the start of the month to the 10th and...', () => {
                test('...if replacement is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':day', date: '2023-10-08 19:36:00Z' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}08`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:daypost', date: '2023-10-08 19:36:00Z' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}pre08post`);
                });
            });

            describe('...if date is not set and...', () => {
                test('...if replacement is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':day' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}01`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:daypost' };
                    const testObject = new Page(testFilepath, testMetadata);

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
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}this-is-your-page-title`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:titlepost', title: 'This is your page title' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}prethis-is-your-page-titlepost`);
                });
            });

            describe('...with "untitled" if metadata.title is not set', () => {
                test('...if replacement is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':title' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}untitled`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:titlepost' };
                    const testObject = new Page(testFilepath, testMetadata);

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
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}file`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: 'pre:filepost' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}prefilepost`);
                });
            });

            describe('...if filepath has no extension and...', () => {
                test('...if replacement is otherwise empty', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file' };
                    const testMetadata = { filename: ':file' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}file`);
                });

                test('...if replacement is in the middle of the template', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file' };
                    const testMetadata = { filename: 'pre:filepost' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.filename;

                    expect(testOutput).toBe(`content${path.sep}prefilepost`);
                });
            });
        });

        describe('filename replaces :ext with filepath extension if filepath has extension and...', () => {
            test('...if replacement is otherwise empty', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: ':ext' };
                const testObject = new Page(testFilepath, testMetadata);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}.page`);
            });

            test('...if replacement is in the middle of the template', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: 'pre:extpost' };
                const testObject = new Page(testFilepath, testMetadata);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}pre.pagepost`);
            });
        });

        describe('filename replaces :ext with empty string if filepath does not have extension and...', () => {
            test('...if replacement is otherwise empty', () => {
                const testFilepath = { full: '/www/content/file', relative: 'content/file' };
                const testMetadata = { filename: ':ext' };
                const testObject = new Page(testFilepath, testMetadata);

                const testOutput = testObject.filename;

                expect(testOutput).toBe('content');
            });

            test('...if replacement is in the middle of the template', () => {
                const testFilepath = { full: '/www/content/file', relative: 'content/file' };
                const testMetadata = { filename: 'pre:extpost' };
                const testObject = new Page(testFilepath, testMetadata);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}prepost`);
            });
        });

        describe('filename replaces :basename with filepath basename', () => {
            test('...if replacement is otherwise empty', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: ':basename' };
                const testObject = new Page(testFilepath, testMetadata);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}file.page`);
            });

            test('...if replacement is in the middle of the template', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: 'pre:basenamepost' };
                const testObject = new Page(testFilepath, testMetadata);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}prefile.pagepost`);
            });
        });

        describe('filename replaces :dirname with filepath directory name', () => {
            test('...if replacement is otherwise empty', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: ':dirname' };
                const testObject = new Page(testFilepath, testMetadata);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}content`);
            });

            test('...if replacement is in the middle of the template', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: 'pre:dirnamepost' };
                const testObject = new Page(testFilepath, testMetadata);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}precontentpost`);
            });
        });

        describe('filename replaces {{...}} with result of executing brace contents', () => {
            test('...if replacement is otherwise empty', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: '{{"longword".substring(2, 5)}}' };
                const testObject = new Page(testFilepath, testMetadata);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}ngw`);
            });

            test('...if replacement is in the middle of the template', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: 'pre{{"longword".substring(2, 5)}}post' };
                const testObject = new Page(testFilepath, testMetadata);

                const testOutput = testObject.filename;

                expect(testOutput).toBe(`content${path.sep}prengwpost`);
            });
        });

        test('filename removes any initial path separator character from replacement result', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const testMetadata = { filename: ':basename' };
            const testObject = new Page(testFilepath, testMetadata);

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
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('/content/file.page');
                });

                test('...returns filename without index.html on the end, if present', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = { filename: ':basename' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('/content/');
                });

                // This test is really only meaningful when run on Windows; on other platforms filename will
                // already have been normalised before getUrl() accesses it.
                test('...only uses / as a path separator', () => {
                    const testFilepath = { full: 'C:\\www\\content\\file.page', relative: `content${path.sep}file.page` };
                    const testMetadata = { filename: ':basename' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('/content/file.page');
                });
            });

            describe('...url property...', () => {
                test('...returns filename prepended by /', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.url;

                    expect(testOutput).toBe('/content/file.page');
                });

                test('...returns filename without index.html on the end, if present', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = { filename: ':basename' };
                    const testObject = new Page(testFilepath, testMetadata);

                    const testOutput = testObject.url;

                    expect(testOutput).toBe('/content/');
                });

                // This test is really only meaningful when run on Windows; on other platforms filename will
                // already have been normalised before getUrl() accesses it.
                test('...only uses / as a path separator', () => {
                    const testFilepath = { full: 'C:\\www\\content\\file.page', relative: `content${path.sep}file.page` };
                    const testMetadata = { filename: ':basename' };
                    const testObject = new Page(testFilepath, testMetadata);

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
                    const testObject = new Page(testFilepath, testMetadata);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('/testBase/content/file.page');
                });

                test('...prepends baseUrl with a slash if it is not an absolute URL but does not start with a slash', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: 'testBase/' });
                    const testObject = new Page(testFilepath, testMetadata);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('/testBase/content/file.page');
                });

                test('...does not alter baseUrl if it is an absolute URL', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: 'https://example.com/testBase/' });
                    const testObject = new Page(testFilepath, testMetadata);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('https://example.com/testBase/content/file.page');
                });

                test('...separates baseUrl and filename with a slash if baseUrl does not end with one', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: '/testBase' });
                    const testObject = new Page(testFilepath, testMetadata);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('/testBase/content/file.page');
                });

                test('...returns preprended filename without index.html on the end, if present', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: '/testBase/' });
                    const testObject = new Page(testFilepath, testMetadata);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.getUrl();

                    expect(testOutput).toBe('/testBase/content/');
                });

                test('...only uses / as a path separator', () => {
                    const testFilepath = { full: 'C:\\www\\content\\file.page', relative: `content${path.sep}file.page` };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: '/testBase/'});
                    const testObject = new Page(testFilepath, testMetadata);
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
                    const testObject = new Page(testFilepath, testMetadata);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.url;

                    expect(testOutput).toBe('/testBase/content/file.page');
                });

                test('...prepends baseUrl with a slash if it is not an absolute URL but does not start with a slash', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: 'testBase/' });
                    const testObject = new Page(testFilepath, testMetadata);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.url;

                    expect(testOutput).toBe('/testBase/content/file.page');
                });

                test('...does not alter baseUrl if it is an absolute URL', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: 'https://example.com/testBase/' });
                    const testObject = new Page(testFilepath, testMetadata);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.url;

                    expect(testOutput).toBe('https://example.com/testBase/content/file.page');
                });

                test('...separates baseUrl and filename with a slash if baseUrl does not end with one', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: '/testBase' });
                    const testObject = new Page(testFilepath, testMetadata);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.url;

                    expect(testOutput).toBe('/testBase/content/file.page');
                });

                test('...returns preprended filename without index.html on the end, if present', () => {
                    const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: '/testBase/' });
                    const testObject = new Page(testFilepath, testMetadata);
                    testObject.__env = fakeEnvironment;

                    const testOutput = testObject.url;

                    expect(testOutput).toBe('/testBase/content/');
                });

                test('...only uses / as a path separator', () => {
                    const testFilepath = { full: 'C:\\www\\content\\file.page', relative: `content${path.sep}file.page` };
                    const testMetadata = { filename: ':basename' };
                    const fakeEnvironment = new FakeEnvironment({ baseUrl: '/testBase' });
                    const testObject = new Page(testFilepath, testMetadata);
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
                const testObject = new Page(testFilepath, testMetadata);

                const testOutput = testObject.getUrl(testBaseUrl);

                expect(testOutput).toBe('/testBase/content/file.page');
            });

            test('...prepends baseUrl with a slash if it is not an absolute URL but does not start with a slash', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: ':basename' };
                const testBaseUrl = 'testBase/';
                const testObject = new Page(testFilepath, testMetadata);

                const testOutput = testObject.getUrl(testBaseUrl);

                expect(testOutput).toBe('/testBase/content/file.page');
            });

            test('...does not alter baseUrl if it is an absolute URL', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: ':basename' };
                const testBaseUrl = 'https://example.com/testBase/';
                const testObject = new Page(testFilepath, testMetadata);

                const testOutput = testObject.getUrl(testBaseUrl);

                expect(testOutput).toBe('https://example.com/testBase/content/file.page');
            });

            test('...separates baseUrl and filename with a slash if baseUrl does not end with one', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
                const testMetadata = { filename: ':basename' };
                const testBaseUrl = '/testBase';
                const testObject = new Page(testFilepath, testMetadata);

                const testOutput = testObject.getUrl(testBaseUrl);

                expect(testOutput).toBe('/testBase/content/file.page');
            });

            test('...returns preprended filename without index.html on the end, if present', () => {
                const testFilepath = { full: '/www/content/file.page', relative: 'content/index.html' };
                const testMetadata = { filename: ':basename' };
                const testBaseUrl = '/testBase/';
                const testObject = new Page(testFilepath, testMetadata);

                const testOutput = testObject.getUrl(testBaseUrl);

                expect(testOutput).toBe('/testBase/content/');
            });

            test('...only uses / as a path separator', () => {
                const testFilepath = { full: '\\www\\content\\file.page', relative: `content${path.sep}file.page` };
                const testMetadata = { filename: ':basename' };
                const testBaseUrl = '/testBase/';
                const testObject = new Page(testFilepath, testMetadata);

                const testOutput = testObject.getUrl(testBaseUrl);

                expect(testOutput).toBe('/testBase/content/file.page');
            });
        });

        test('If baseUrl is set in config and is also passed in to getUrl() as a parameter, it uses the parameter in preference to the config value', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const testMetadata = { filename: ':basename' };
            const testBaseUrl = '/expectedTestBase/';
            const fakeEnvironment = new FakeEnvironment({ baseUrl: '/unexpectedTestBase/' });
            const testObject = new Page(testFilepath, testMetadata);
            testObject.__env = fakeEnvironment;

            const testOutput = testObject.getUrl(testBaseUrl);

            expect(testOutput).toBe('/expectedTestBase/content/file.page');
        });
    });

    describe('Abstract properties and functions', () => {
        test('getHtml() throws error with no parameter', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const testMetadata = {};
            const testObject = new Page(testFilepath, testMetadata);

            expect(() => testObject.getHtml()).toThrowError();
        });

        test('getHtml() throws error with parameter', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const testMetadata = {};
            const testBase = '/testBase/';
            const testObject = new Page(testFilepath, testMetadata);

            expect(() => testObject.getHtml(testBase)).toThrowError();
        });

        test('html throws error', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const testMetadata = {};
            const testObject = new Page(testFilepath, testMetadata);

            expect(() => testObject.html).toThrowError();
        });

        test('getIntro() throws error with no parameter', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const testMetadata = {};
            const testObject = new Page(testFilepath, testMetadata);

            expect(() => testObject.getIntro()).toThrowError();
        });

        test('getIntro() throws error with parameter', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const testMetadata = {};
            const testBase = '/testBase/';
            const testObject = new Page(testFilepath, testMetadata);

            expect(() => testObject.getIntro(testBase)).toThrowError();
        });

        test('intro throws error', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const testMetadata = {};
            const testObject = new Page(testFilepath, testMetadata);

            expect(() => testObject.intro).toThrowError();
        });

        test('hasMore throws error', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const testMetadata = {};
            const testObject = new Page(testFilepath, testMetadata);

            expect(() => testObject.hasMore).toThrowError();
        });
    });

    describe('template tests', () => {
        test('template equals metadata.template property if that is set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = 'specialTemplate';
            const testMetadata = { template: expectedResult };
            const testObject = new Page(testFilepath, testMetadata);

            expect(testObject.template).toBe(expectedResult);
        });

        test('template equals __env.config.defaultTemplate if metadata.template is not set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = 'specialTemplate';
            const testMetadata = { };
            const fakeEnvironment = new FakeEnvironment({ defaultTemplate: expectedResult });
            const testObject = new Page(testFilepath, testMetadata);
            testObject.__env = fakeEnvironment;

            expect(testObject.template).toBe(expectedResult);
        });

        test('template equals none if neither __env.config.defaultTemplate nor metadata.template are set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const testMetadata = {};
            const fakeEnvironment = new FakeEnvironment({ defaultTemplate: undefined });
            const testObject = new Page(testFilepath, testMetadata);
            testObject.__env = fakeEnvironment;

            expect(testObject.template).toBe('none');
        });
    });

    describe('title tests', () => {
        test('title equals metadata.title property if that is set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = 'Our custom page title';
            const testMetadata = { title: expectedResult };
            const testObject = new Page(testFilepath, testMetadata);

            expect(testObject.title).toBe(expectedResult);
        });

        test('title equals Untitled if metadata.title property is not set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = 'Untitled';
            const testMetadata = { };
            const testObject = new Page(testFilepath, testMetadata);

            expect(testObject.title).toBe(expectedResult);
        });
    });

    describe('date, rfc2822date and rfc822date tests', () => {
        test('date equals metadata.date property if that is set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = new Date(2024, 6, 6, 8, 4);
            const testMetadata = { date: '2024-07-06 08:04:00' };
            const testObject = new Page(testFilepath, testMetadata);

            expect(testObject.date).toStrictEqual(expectedResult);
        });

        test('date equals 1st January 1970 if metadata.date is not set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = new Date(0);
            const testMetadata = { };
            const testObject = new Page(testFilepath, testMetadata);

            expect(testObject.date).toStrictEqual(expectedResult);
        });

        test('rfc2822date equals metadata.date property if that is set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = 'Sat, 06 Jul 2024 08:04:00 +0000';
            const testMetadata = { date: '2024-07-06 08:04:00' };
            const testObject = new Page(testFilepath, testMetadata);

            expect(testObject.rfc2822date).toStrictEqual(expectedResult);
        });

        test('rfc2822date equals 1st January 1970 if metadata.date is not set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = 'Thu, 01 Jan 1970 00:00:00 +0000';
            const testMetadata = { };
            const testObject = new Page(testFilepath, testMetadata);

            expect(testObject.rfc2822date).toStrictEqual(expectedResult);
        });

        test('rfc822date equals metadata.date property if that is set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = 'Sat, 06 Jul 2024 08:04:00 +0000';
            const testMetadata = { date: '2024-07-06 08:04:00' };
            const testObject = new Page(testFilepath, testMetadata);

            expect(testObject.rfc822date).toStrictEqual(expectedResult);
        });

        test('rfc822date equals 1st January 1970 if metadata.date is not set', () => {
            const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
            const expectedResult = 'Thu, 01 Jan 1970 00:00:00 +0000';
            const testMetadata = { };
            const testObject = new Page(testFilepath, testMetadata);

            expect(testObject.rfc822date).toStrictEqual(expectedResult);
        });
    });
});

describe('Template view function tests', () => {
    test('templateView() returns void if page template is none', async () => {
        const fakeEnvironment = new FakeEnvironment({ defaultTemplate: undefined });
        const testLocals = { someLocalsKey: 'value' };
        const testTree = new ContentTree('testDir');
        const testTemplateMap = {};
        const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
        const testPageMetadata = {};
        const testContent = new Page(testFilepath, testPageMetadata);
        testContent.__env = fakeEnvironment;

        const testOutput = await templateView(fakeEnvironment, testLocals, testTree, testTemplateMap, testContent);

        expect(testOutput).toBeUndefined();
    });

    test('templateView() throws error if page template is not in template map', async () => {
        const fakeEnvironment = new FakeEnvironment({ defaultTemplate: undefined });
        const testLocals = { someLocalsKey: 'value' };
        const testTree = new ContentTree('testDir');
        const testTemplateMap = {};
        const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
        const testPageMetadata = { template: 'brokenTemplate'};
        const testContent = new Page(testFilepath, testPageMetadata);
        testContent.__env = fakeEnvironment;

        await expect(async () => await templateView(fakeEnvironment, testLocals, testTree, testTemplateMap, testContent)).rejects.toThrowError();
    });

    test('templateView() calls render method of correct template in template map', async () => {
        const testTemplate = new FakeTemplate();
        testTemplate.render = vi.fn(() => Promise.resolve(Buffer.from('')));
        const fakeEnvironment = new FakeEnvironment({ defaultTemplate: undefined });
        const testLocals = { someLocalsKey: 'value' };
        const testTree = new ContentTree('testDir');
        const testTemplateMap = { testTemplate: testTemplate, aDifferentTemplate: new FakeTemplate() };
        const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
        const testPageMetadata = { template: 'testTemplate' };
        const testContent = new Page(testFilepath, testPageMetadata);
        testContent.__env = fakeEnvironment;

        await templateView(fakeEnvironment, testLocals, testTree, testTemplateMap, testContent);

        expect(testTemplate.render).toHaveBeenCalledOnce();
    });

    test('templateView() passes correct parameters to render function', async () => {
        const testTemplate = new FakeTemplate();
        testTemplate.render = vi.fn(() => Promise.resolve(Buffer.from('')));
        const fakeEnvironment = new FakeEnvironment({ defaultTemplate: undefined });
        const testLocals = { someLocalsKey: 'value' };
        const testTree = new ContentTree('testDir');
        const testTemplateMap = { testTemplate: testTemplate, aDifferentTemplate: new FakeTemplate() };
        const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
        const testPageMetadata = { template: 'testTemplate' };
        const testContent = new Page(testFilepath, testPageMetadata);
        testContent.__env = fakeEnvironment;

        await templateView(fakeEnvironment, testLocals, testTree, testTemplateMap, testContent);

        const testResult = vi.mocked(testTemplate.render).mock.lastCall;
        expect(testResult?.length).toBe(1);
        expect(testResult?.[0].page).toBe(testContent);
        expect(testResult?.[0].someLocalsKey).toBe('value');
    });

    test('templateView() returns value returned by render function', async () => {
        const expectedOutput = 'This is the rendered content';
        const testTemplate = new FakeTemplate();
        testTemplate.render = vi.fn(() => Promise.resolve(Buffer.from(expectedOutput)));
        const fakeEnvironment = new FakeEnvironment({ defaultTemplate: undefined });
        const testLocals = { someLocalsKey: 'value' };
        const testTree = new ContentTree('testDir');
        const testTemplateMap = { testTemplate: testTemplate, aDifferentTemplate: new FakeTemplate() };
        const testFilepath = { full: '/www/content/file.page', relative: 'content/file.page' };
        const testPageMetadata = { template: 'testTemplate' };
        const testContent = new Page(testFilepath, testPageMetadata);
        testContent.__env = fakeEnvironment;

        const testOutput = (await templateView(fakeEnvironment, testLocals, testTree, testTemplateMap, testContent) as Buffer).toString();

        expect(testOutput).toBe(expectedOutput);
    });
});

describe('Plugin registration tests', () => {
    test('registerPlugin adds Page to Environment.plugins', async () => {
        const fakeEnvironment = new FakeEnvironment();
       
        await registerPlugin(fakeEnvironment);

        expect(fakeEnvironment.plugins.Page).toBeTruthy();
        expect(fakeEnvironment.plugins.Page).toBe(Page);
    });

    test('registerPlugin() calls Environment.registerView() with correct parameters', async () => {
        const fakeEnvironment = new FakeEnvironment();
        fakeEnvironment.registerView = vi.fn();
       
        await registerPlugin(fakeEnvironment);

        expect(fakeEnvironment.registerView).toHaveBeenCalledOnce();
        expect(fakeEnvironment.registerView).toHaveBeenLastCalledWith('template', templateView);
    });
});
